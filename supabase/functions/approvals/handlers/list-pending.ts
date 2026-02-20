import { getSupabaseClient } from '../_shared/supabase-client.ts';
import { success } from '../_shared/response.ts';
import { AppError } from '../_shared/errors.ts';
import type { AuthContext } from '../_shared/auth.ts';

// GET /approvals/pending — lista todas aprovacoes pendentes do tenant
export async function listPending(
  _req: Request,
  auth: AuthContext,
): Promise<Response> {
  const supabase = getSupabaseClient(auth.token);

  const { data, error } = await supabase
    .from('approval_requests')
    .select('*, jobs(id, code, title), people:approver_people_id(id, full_name), creator:created_by(id, full_name)')
    .eq('status', 'pending')
    .is('deleted_at', null)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[approvals/list-pending] erro:', error.message);
    throw new AppError('INTERNAL_ERROR', error.message, 500);
  }

  return success(data ?? []);
}
