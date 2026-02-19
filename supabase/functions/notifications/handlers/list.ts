import { getSupabaseClient } from '../../_shared/supabase-client.ts';
import { paginated } from '../../_shared/response.ts';
import { AppError } from '../../_shared/errors.ts';
import {
  parsePagination,
  getOffset,
  buildMeta,
} from '../../_shared/pagination.ts';
import type { AuthContext } from '../../_shared/auth.ts';

// Lista notificacoes do usuario autenticado com filtros e paginacao
export async function listNotifications(
  req: Request,
  auth: AuthContext,
): Promise<Response> {
  const url = new URL(req.url);
  const params = parsePagination(url);
  const supabase = getSupabaseClient(auth.token);

  // Query base: notificacoes do usuario autenticado, nao deletadas
  let query = supabase
    .from('notifications')
    .select('*', { count: 'exact' })
    .eq('user_id', auth.userId);

  // === Filtros opcionais ===

  // Tipo de notificacao (ex: job_status_changed, mention, deadline)
  const typeFilter = url.searchParams.get('type');
  if (typeFilter) {
    query = query.eq('type', typeFilter);
  }

  // Apenas nao lidas (read_at IS NULL)
  const unreadOnly = url.searchParams.get('unread_only');
  if (unreadOnly === 'true') {
    query = query.is('read_at', null);
  }

  // Filtrar por job especifico
  const jobId = url.searchParams.get('job_id');
  if (jobId) {
    query = query.eq('job_id', jobId);
  }

  // === Ordenacao e paginacao (sempre por created_at DESC) ===
  query = query
    .order('created_at', { ascending: false })
    .range(getOffset(params), getOffset(params) + params.perPage - 1);

  const { data: notifications, count, error: dbError } = await query;

  if (dbError) {
    throw new AppError('INTERNAL_ERROR', dbError.message, 500);
  }

  return paginated(notifications ?? [], buildMeta(count ?? 0, params));
}
