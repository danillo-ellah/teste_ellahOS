import { getSupabaseClient } from '../../_shared/supabase-client.ts';
import { success } from '../../_shared/response.ts';
import type { AuthContext } from '../../_shared/auth.ts';

// GET /allocations?job_id=X — lista alocacoes de um job
export async function listByJob(
  _req: Request,
  auth: AuthContext,
  jobId: string,
): Promise<Response> {
  const supabase = getSupabaseClient(auth.token);

  const { data, error } = await supabase
    .from('allocations')
    .select('*, people(id, full_name), jobs(id, code, title, status)')
    .eq('job_id', jobId)
    .is('deleted_at', null)
    .order('allocation_start', { ascending: true });

  if (error) {
    console.error('[allocations/list-by-job] erro:', error.message);
    throw new Error(error.message);
  }

  return success(data ?? []);
}
