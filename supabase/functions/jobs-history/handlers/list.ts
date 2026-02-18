import { getSupabaseClient } from '../../_shared/supabase-client.ts';
import { paginated } from '../../_shared/response.ts';
import { AppError } from '../../_shared/errors.ts';
import { parsePagination, getOffset, buildMeta } from '../../_shared/pagination.ts';
import type { AuthContext } from '../../_shared/auth.ts';

export async function listHistory(
  req: Request,
  auth: AuthContext,
  jobId: string,
): Promise<Response> {
  const url = new URL(req.url);
  const params = parsePagination(url);
  const supabase = getSupabaseClient(auth.token);

  // Query base com JOIN para buscar nome do usuario
  let query = supabase
    .from('job_history')
    .select('*, profiles(full_name)', { count: 'exact' })
    .eq('job_id', jobId);

  // Filtro por tipo de evento
  const eventTypeFilter = url.searchParams.get('event_type');
  if (eventTypeFilter) {
    const types = eventTypeFilter.split(',').map(s => s.trim());
    query = query.in('event_type', types);
  }

  // Ordenacao e paginacao
  query = query
    .order('created_at', { ascending: false })
    .range(getOffset(params), getOffset(params) + params.perPage - 1);

  const { data: history, count, error: dbError } = await query;

  if (dbError) throw new AppError('INTERNAL_ERROR', dbError.message, 500);

  // Mapear nomes do banco para API (data_before->previous_data, data_after->new_data)
  const mapped = (history ?? []).map((h) => ({
    id: h.id,
    event_type: h.event_type,
    user_id: h.user_id,
    user_name: (h as any).profiles?.full_name ?? null,
    previous_data: h.data_before,
    new_data: h.data_after,
    description: h.description,
    created_at: h.created_at,
  }));

  return paginated(mapped, buildMeta(count ?? 0, params));
}
