import { getSupabaseClient } from '../../_shared/supabase-client.ts';
import { success } from '../../_shared/response.ts';
import { AppError } from '../../_shared/errors.ts';
import { validate, UpdateDeliverableSchema } from '../../_shared/validation.ts';
import { insertHistory } from '../../_shared/history.ts';
import type { AuthContext } from '../../_shared/auth.ts';

export async function updateDeliverable(
  req: Request,
  auth: AuthContext,
  jobId: string,
  deliverableId: string,
): Promise<Response> {
  const supabase = getSupabaseClient(auth.token);

  const { data: current, error: fetchError } = await supabase
    .from('job_deliverables')
    .select('*')
    .eq('id', deliverableId)
    .eq('job_id', jobId)
    .is('deleted_at', null)
    .single();

  if (fetchError || !current) {
    throw new AppError('NOT_FOUND', 'Entregavel nao encontrado neste job', 404);
  }

  const body = await req.json();
  const validated = validate(UpdateDeliverableSchema, body);

  const { data: updated, error: updateError } = await supabase
    .from('job_deliverables')
    .update(validated)
    .eq('id', deliverableId)
    .select()
    .single();

  if (updateError) throw new AppError('INTERNAL_ERROR', updateError.message, 500);

  await insertHistory(supabase, {
    tenantId: auth.tenantId,
    jobId,
    eventType: 'field_update',
    userId: auth.userId,
    dataBefore: { status: current.status, version: current.version },
    dataAfter: validated,
    description: `Entregavel "${current.description}" atualizado`,
  });

  return success(updated);
}
