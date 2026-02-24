import { getSupabaseClient, getServiceClient } from '../../_shared/supabase-client.ts';
import { success } from '../../_shared/response.ts';
import { AppError } from '../../_shared/errors.ts';
import { validate, UpdateJobSchema } from '../../_shared/validation.ts';
import {
  mapApiToDb,
  mapDbToApi,
  removeImmutableFields,
} from '../../_shared/column-map.ts';
import {
  insertHistory,
  describeFieldChange,
} from '../../_shared/history.ts';
import { enqueueEvent } from '../../_shared/integration-client.ts';
import type { AuthContext } from '../../_shared/auth.ts';

export async function updateJob(
  req: Request,
  auth: AuthContext,
  jobId: string,
): Promise<Response> {
  const supabase = getSupabaseClient(auth.token);

  // 1. Verificar que o job existe
  const { data: currentJob, error: fetchError } = await supabase
    .from('jobs')
    .select('*')
    .eq('id', jobId)
    .is('deleted_at', null)
    .single();

  if (fetchError || !currentJob) {
    throw new AppError('NOT_FOUND', 'Job nao encontrado', 404);
  }

  // 2. Parsear e validar body
  const body = await req.json();
  const validated = validate(UpdateJobSchema, body);

  // 3. Mapear API -> banco e remover campos imutaveis
  const dbPayload = removeImmutableFields(mapApiToDb(validated));

  if (Object.keys(dbPayload).length === 0) {
    throw new AppError(
      'VALIDATION_ERROR',
      'Nenhum campo valido para atualizacao',
      400,
    );
  }

  // 4. Executar update
  const { data: updatedJob, error: updateError } = await supabase
    .from('jobs')
    .update(dbPayload)
    .eq('id', jobId)
    .select()
    .single();

  if (updateError) {
    if (updateError.code === '23503') {
      throw new AppError(
        'VALIDATION_ERROR',
        'Referencia invalida: verifique client_id ou agency_id',
        400,
      );
    }
    throw new AppError('INTERNAL_ERROR', updateError.message, 500);
  }

  // 5. Registrar mudancas no historico
  const changedFields: Record<string, unknown> = {};
  const previousFields: Record<string, unknown> = {};

  for (const [key, newValue] of Object.entries(dbPayload)) {
    const oldValue = currentJob[key as keyof typeof currentJob];
    if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      changedFields[key] = newValue;
      previousFields[key] = oldValue;
    }
  }

  if (Object.keys(changedFields).length > 0) {
    // Gerar descricao das mudancas
    const descriptions = Object.keys(changedFields).map((field) =>
      describeFieldChange(field, previousFields[field], changedFields[field]),
    );

    await insertHistory(supabase, {
      tenantId: auth.tenantId,
      jobId,
      eventType: 'field_update',
      userId: auth.userId,
      dataBefore: previousFields,
      dataAfter: changedFields,
      description: descriptions.join('; '),
    });
  }

  // 6. Verificar se margem caiu abaixo de 15% e disparar alerta (fire-and-forget)
  try {
    const oldMargin = currentJob.margin_percentage as number | null;
    const newMargin = updatedJob.margin_percentage as number | null;

    // Disparar alerta apenas quando a margem CRUZA abaixo de 15%
    // (evita alertas repetidos se ja estava baixa)
    if (
      newMargin !== null &&
      newMargin < 15 &&
      (oldMargin === null || oldMargin >= 15)
    ) {
      const serviceClient = getServiceClient();
      await enqueueEvent(serviceClient, {
        tenant_id: auth.tenantId,
        event_type: 'n8n_webhook',
        payload: {
          workflow: 'wf-margin-alert',
          job_id: jobId,
          job_code: updatedJob.code,
          job_title: updatedJob.title,
          margin_percentage: newMargin,
          closed_value: updatedJob.closed_value,
          production_cost: updatedJob.production_cost,
        },
        idempotency_key: `wf-margin:${jobId}:${new Date().toISOString().split('T')[0]}`,
      });
      console.log(`[jobs/update] margem alerta: job ${jobId} margem ${newMargin}% (era ${oldMargin}%)`);
    }
  } catch (marginErr) {
    console.error('[jobs/update] falha ao disparar margin alert:', marginErr);
    // Nao bloqueia a operacao principal (ADR-003)
  }

  // 7. Retornar job atualizado
  return success(mapDbToApi(updatedJob));
}
