import { getSupabaseClient } from '../../_shared/supabase-client.ts';
import { success } from '../../_shared/response.ts';
import { AppError } from '../../_shared/errors.ts';
import type { AuthContext } from '../../_shared/auth.ts';

export async function listShootingDates(
  _req: Request,
  auth: AuthContext,
  jobId: string,
): Promise<Response> {
  const supabase = getSupabaseClient(auth.token);

  const { data, error: dbError } = await supabase
    .from('job_shooting_dates')
    .select('*')
    .eq('job_id', jobId)
    .is('deleted_at', null)
    .order('shooting_date', { ascending: true });

  if (dbError) throw new AppError('INTERNAL_ERROR', dbError.message, 500);

  return success(data ?? []);
}
