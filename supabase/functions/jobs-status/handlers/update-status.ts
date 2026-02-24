import { getSupabaseClient, getServiceClient } from '../../_shared/supabase-client.ts';
import { success } from '../../_shared/response.ts';
import { AppError } from '../../_shared/errors.ts';
import { validate, UpdateStatusSchema } from '../../_shared/validation.ts';
import { mapApiToDb } from '../../_shared/column-map.ts';
import { insertHistory } from '../../_shared/history.ts';
import { notifyJobTeam } from '../../_shared/notification-helper.ts';
import { enqueueEvent } from '../../_shared/integration-client.ts';
import type { AuthContext } from '../../_shared/auth.ts';

export async function updateStatus(
  req: Request,
  auth: AuthContext,
  jobId: string,
): Promise<Response> {
  const supabase = getSupabaseClient(auth.token);

  // 1. Buscar job atual
  const { data: job, error: fetchError } = await supabase
    .from('jobs')
    .select('id, status, closed_value, approval_date, actual_delivery_date')
    .eq('id', jobId)
    .is('deleted_at', null)
    .single();

  if (fetchError || !job) {
    throw new AppError('NOT_FOUND', 'Job nao encontrado', 404);
  }

  // 2. Validar payload
  const body = await req.json();
  const validated = validate(UpdateStatusSchema, body);
  const newStatus = validated.status;
  const oldStatus = job.status;

  if (newStatus === oldStatus) {
    return success({ id: job.id, status: oldStatus, message: 'Status inalterado' });
  }

  // 3. Validacoes de regra de negocio
  if (newStatus === 'aprovado_selecao_diretor') {
    if (!job.approval_date || !job.closed_value) {
      throw new AppError(
        'BUSINESS_RULE_VIOLATION',
        'Para aprovar o job, approval_date e closed_value devem estar preenchidos',
        422,
      );
    }
  }

  if (newStatus === 'cancelado') {
    if (!validated.cancellation_reason) {
      throw new AppError(
        'BUSINESS_RULE_VIOLATION',
        'Motivo de cancelamento e obrigatorio',
        422,
      );
    }
  }

  if (newStatus === 'finalizado') {
    if (!job.actual_delivery_date) {
      throw new AppError(
        'BUSINESS_RULE_VIOLATION',
        'Data de entrega real (actual_delivery_date) deve estar preenchida para finalizar',
        422,
      );
    }
  }

  if (newStatus === 'entregue') {
    const { count } = await supabase
      .from('job_deliverables')
      .select('id', { count: 'exact', head: true })
      .eq('job_id', jobId)
      .eq('status', 'entregue')
      .is('deleted_at', null);

    if (!count || count === 0) {
      throw new AppError(
        'BUSINESS_RULE_VIOLATION',
        'Pelo menos 1 entregavel deve ter status "entregue"',
        422,
      );
    }
  }

  if (newStatus === 'pausado' && (oldStatus === 'finalizado' || oldStatus === 'cancelado')) {
    throw new AppError(
      'BUSINESS_RULE_VIOLATION',
      `Nao e possivel pausar um job com status "${oldStatus}"`,
      422,
    );
  }

  // 4. Montar update
  const dbPayload = mapApiToDb({
    status: newStatus,
    status_updated_at: new Date().toISOString(),
    status_updated_by: auth.userId,
    ...(validated.sub_status !== undefined ? { sub_status: validated.sub_status } : {}),
    ...(validated.cancellation_reason ? { cancellation_reason: validated.cancellation_reason } : {}),
  });

  const { data: updatedJob, error: updateError } = await supabase
    .from('jobs')
    .update(dbPayload)
    .eq('id', jobId)
    .select('id, status, pos_sub_status, status_updated_at, status_updated_by')
    .single();

  if (updateError) {
    throw new AppError('INTERNAL_ERROR', updateError.message, 500);
  }

  // 5. Registrar no historico
  await insertHistory(supabase, {
    tenantId: auth.tenantId,
    jobId,
    eventType: 'status_change',
    userId: auth.userId,
    dataBefore: { status: oldStatus },
    dataAfter: { status: newStatus },
    description: `Status alterado de ${oldStatus} para ${newStatus}`,
  });

  // 6. Notificar equipe e disparar integracoes (fire-and-forget)
  try {
    const serviceClient = getServiceClient();

    // 6a. Notificacao in-app para equipe do job
    await notifyJobTeam(serviceClient, jobId, {
      tenant_id: auth.tenantId,
      type: 'status_changed',
      priority: 'normal',
      title: `Status alterado: ${newStatus}`,
      body: `O job mudou de "${oldStatus}" para "${newStatus}"`,
      metadata: { old_status: oldStatus, new_status: newStatus },
      action_url: `/jobs/${jobId}`,
      job_id: jobId,
    });

    // 6b. Enfileirar webhook n8n para status change (WhatsApp + orquestracao)
    await enqueueEvent(serviceClient, {
      tenant_id: auth.tenantId,
      event_type: 'n8n_webhook',
      payload: {
        workflow: 'wf-status-change',
        job_id: jobId,
        old_status: oldStatus,
        new_status: newStatus,
        changed_by: auth.email,
      },
      idempotency_key: `wf-status:${jobId}:${oldStatus}:${newStatus}`,
    });
  } catch (notifError) {
    console.error('[update-status] falha ao notificar equipe/integracoes:', notifError);
    // Nao bloqueia a operacao principal (ADR-003)
  }

  return success({
    id: updatedJob.id,
    status: updatedJob.status,
    sub_status: updatedJob.pos_sub_status,
    status_updated_at: updatedJob.status_updated_at,
    status_updated_by: updatedJob.status_updated_by,
  });
}
