import { getSupabaseClient } from '../../_shared/supabase-client.ts';
import { success } from '../../_shared/response.ts';
import { AppError } from '../../_shared/errors.ts';
import { insertHistory } from '../../_shared/history.ts';
import type { AuthContext } from '../../_shared/auth.ts';

export async function deleteShootingDate(
  _req: Request,
  auth: AuthContext,
  jobId: string,
  dateId: string,
): Promise<Response> {
  const supabase = getSupabaseClient(auth.token);

  const { data: shootingDate, error: fetchError } = await supabase
    .from('job_shooting_dates')
    .select('id, shooting_date, description')
    .eq('id', dateId)
    .eq('job_id', jobId)
    .is('deleted_at', null)
    .single();

  if (fetchError || !shootingDate) {
    throw new AppError('NOT_FOUND', 'Diaria de filmagem nao encontrada', 404);
  }

  const { data: deleted, error: deleteError } = await supabase
    .from('job_shooting_dates')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', dateId)
    .select('id, deleted_at')
    .single();

  if (deleteError) throw new AppError('INTERNAL_ERROR', deleteError.message, 500);

  await insertHistory(supabase, {
    tenantId: auth.tenantId,
    jobId,
    eventType: 'field_update',
    userId: auth.userId,
    dataBefore: { shooting_date: shootingDate.shooting_date },
    dataAfter: { action: 'removed' },
    description: `Diaria ${shootingDate.shooting_date} removida`,
  });

  return success({ id: deleted.id, deleted_at: deleted.deleted_at });
}
