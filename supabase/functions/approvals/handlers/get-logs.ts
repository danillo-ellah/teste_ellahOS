import { getSupabaseClient } from '../../_shared/supabase-client.ts';
import { success } from '../../_shared/response.ts';
import { AppError } from '../../_shared/errors.ts';
import type { AuthContext } from '../../_shared/auth.ts';

// GET /approvals/:id/logs — lista logs de uma aprovacao
export async function getLogs(
  _req: Request,
  auth: AuthContext,
  approvalId: string,
): Promise<Response> {
  const supabase = getSupabaseClient(auth.token);

  // Verificar que a aprovacao existe
  const { data: approval, error: fetchError } = await supabase
    .from('approval_requests')
    .select('id')
    .eq('id', approvalId)
    .is('deleted_at', null)
    .single();

  if (fetchError || !approval) {
    throw new AppError('NOT_FOUND', 'Solicitacao de aprovacao nao encontrada', 404);
  }

  // Buscar logs
  const { data: logs, error: logsError } = await supabase
    .from('approval_logs')
    .select('*, actor:actor_id(id, full_name)')
    .eq('approval_request_id', approvalId)
    .order('created_at', { ascending: true });

  if (logsError) {
    console.error('[approvals/get-logs] erro:', logsError.message);
    throw new AppError('INTERNAL_ERROR', logsError.message, 500);
  }

  return success(logs ?? []);
}
