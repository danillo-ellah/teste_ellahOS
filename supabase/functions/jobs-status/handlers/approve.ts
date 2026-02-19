import { getSupabaseClient, getServiceClient } from '../../_shared/supabase-client.ts';
import { success } from '../../_shared/response.ts';
import { AppError } from '../../_shared/errors.ts';
import { validate, ApproveJobSchema } from '../../_shared/validation.ts';
import { insertHistory } from '../../_shared/history.ts';
import { notifyJobTeam } from '../../_shared/notification-helper.ts';
import { enqueueEvent } from '../../_shared/integration-client.ts';
import type { AuthContext } from '../../_shared/auth.ts';

// Mapa de approval_type API -> banco
const APPROVAL_TYPE_MAP: Record<string, string> = {
  internal: 'interna',
  external: 'externa_cliente',
};

export async function approveJob(
  req: Request,
  auth: AuthContext,
  jobId: string,
): Promise<Response> {
  const supabase = getSupabaseClient(auth.token);

  // 1. Buscar job atual
  const { data: job, error: fetchError } = await supabase
    .from('jobs')
    .select('id, status, title, code')
    .eq('id', jobId)
    .is('deleted_at', null)
    .single();

  if (fetchError || !job) {
    throw new AppError('NOT_FOUND', 'Job nao encontrado', 404);
  }

  // 2. Validar payload
  const body = await req.json();
  const validated = validate(ApproveJobSchema, body);

  // 3. Atualizar job com dados de aprovacao
  const { data: updatedJob, error: updateError } = await supabase
    .from('jobs')
    .update({
      status: 'aprovado_selecao_diretor',
      approval_type: APPROVAL_TYPE_MAP[validated.approval_type] ?? validated.approval_type,
      approved_by_name: auth.email,
      approval_date: validated.approval_date,
      closed_value: validated.closed_value,
      internal_approval_doc_url: validated.approval_document_url ?? null,
      status_updated_at: new Date().toISOString(),
      status_updated_by: auth.userId,
    })
    .eq('id', jobId)
    .select('id, status, approval_type, approved_by_name, approval_date, closed_value, internal_approval_doc_url')
    .single();

  if (updateError) {
    throw new AppError('INTERNAL_ERROR', updateError.message, 500);
  }

  // 4. Registrar no historico
  await insertHistory(supabase, {
    tenantId: auth.tenantId,
    jobId,
    eventType: 'approval',
    userId: auth.userId,
    dataBefore: { status: job.status },
    dataAfter: {
      status: 'aprovado_selecao_diretor',
      approval_type: validated.approval_type,
      closed_value: validated.closed_value,
    },
    description: `Job "${job.title}" aprovado (${validated.approval_type}) com valor R$ ${validated.closed_value.toLocaleString('pt-BR')}`,
  });

  // 5. Disparar notificacoes e eventos de integracao (fire-and-forget)
  try {
    const serviceClient = getServiceClient();

    // 5a. Notificacao in-app para equipe do job
    await notifyJobTeam(serviceClient, jobId, {
      tenant_id: auth.tenantId,
      type: 'job_approved',
      priority: 'high',
      title: `Job aprovado!`,
      body: `"${job.title}" foi aprovado com valor R$ ${validated.closed_value.toLocaleString('pt-BR')}`,
      metadata: {
        approval_type: validated.approval_type,
        closed_value: validated.closed_value,
      },
      action_url: `/jobs/${jobId}`,
      job_id: jobId,
    });

    // 5b. Enfileirar criacao de pastas no Drive
    await enqueueEvent(serviceClient, {
      tenant_id: auth.tenantId,
      event_type: 'drive_create_structure',
      payload: { job_id: jobId, job_title: job.title },
      idempotency_key: `drive:${jobId}`,
    });

    // 5c. Enfileirar webhook n8n (WhatsApp + orquestracao)
    await enqueueEvent(serviceClient, {
      tenant_id: auth.tenantId,
      event_type: 'n8n_webhook',
      payload: {
        workflow: 'wf-job-approved',
        job_id: jobId,
        job_title: job.title,
        closed_value: validated.closed_value,
        approval_type: validated.approval_type,
        approved_by: auth.email,
      },
      idempotency_key: `wf-approved:${jobId}`,
    });

  } catch (notifError) {
    console.error('[approve] falha ao disparar notificacoes/integracoes:', notifError);
    // Nao bloqueia a operacao principal (ADR-003)
  }

  return success({
    id: updatedJob.id,
    status: updatedJob.status,
    approval_type: validated.approval_type,
    approved_by_name: updatedJob.approved_by_name,
    approval_date: updatedJob.approval_date,
    closed_value: updatedJob.closed_value,
    approval_document_url: updatedJob.internal_approval_doc_url,
  });
}
