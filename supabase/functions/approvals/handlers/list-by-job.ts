import { getSupabaseClient } from '../../_shared/supabase-client.ts';
import { success } from '../../_shared/response.ts';
import { AppError } from '../../_shared/errors.ts';
import type { AuthContext } from '../../_shared/auth.ts';

// GET /approvals?job_id=X — lista aprovacoes de um job
export async function listByJob(
  req: Request,
  auth: AuthContext,
): Promise<Response> {
  const url = new URL(req.url);
  const jobId = url.searchParams.get('job_id');

  if (!jobId) {
    throw new AppError('VALIDATION_ERROR', 'job_id e obrigatorio', 400);
  }

  const supabase = getSupabaseClient(auth.token);

  const { data, error } = await supabase
    .from('approval_requests')
    .select('*, people:approver_people_id(id, full_name), creator:created_by(id, full_name)')
    .eq('job_id', jobId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[approvals/list-by-job] erro:', error.message);
    throw new AppError('INTERNAL_ERROR', error.message, 500);
  }

  return success(data ?? []);
}
