import { getSupabaseClient } from '../../_shared/supabase-client.ts';
import { success } from '../../_shared/response.ts';
import { AppError } from '../../_shared/errors.ts';
import { insertHistory } from '../../_shared/history.ts';
import type { AuthContext } from '../../_shared/auth.ts';

export async function deleteDeliverable(
  _req: Request,
  auth: AuthContext,
  jobId: string,
  deliverableId: string,
): Promise<Response> {
  const supabase = getSupabaseClient(auth.token);

  const { data: deliverable, error: fetchError } = await supabase
    .from('job_deliverables')
    .select('id, description')
    .eq('id', deliverableId)
    .eq('job_id', jobId)
    .is('deleted_at', null)
    .single();

  if (fetchError || !deliverable) {
    throw new AppError('NOT_FOUND', 'Entregavel nao encontrado', 404);
  }

  const { data: deleted, error: deleteError } = await supabase
    .from('job_deliverables')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', deliverableId)
    .select('id, deleted_at')
    .single();

  if (deleteError) throw new AppError('INTERNAL_ERROR', deleteError.message, 500);

  await insertHistory(supabase, {
    tenantId: auth.tenantId,
    jobId,
    eventType: 'field_update',
    userId: auth.userId,
    dataBefore: { deliverable_id: deliverable.id, description: deliverable.description },
    dataAfter: { action: 'removed' },
    description: `Entregavel "${deliverable.description}" removido`,
  });

  return success({ id: deleted.id, deleted_at: deleted.deleted_at });
}
