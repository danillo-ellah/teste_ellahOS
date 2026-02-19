import type { AuthContext } from '../../_shared/auth.ts';
import { getSupabaseClient } from '../../_shared/supabase-client.ts';
import { paginated } from '../../_shared/response.ts';
import { parsePagination, getOffset, buildMeta } from '../../_shared/pagination.ts';

export async function listLogs(
  req: Request,
  auth: AuthContext,
): Promise<Response> {
  const url = new URL(req.url);
  const pagination = parsePagination(url);
  const offset = getOffset(pagination);

  const client = getSupabaseClient(auth.token);

  // Contar total
  let countQuery = client
    .from('integration_events')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', auth.tenantId);

  // Filtro por tipo de evento (opcional)
  const eventType = url.searchParams.get('event_type');
  if (eventType) {
    countQuery = countQuery.eq('event_type', eventType);
  }

  // Filtro por status (opcional)
  const status = url.searchParams.get('status');
  if (status) {
    countQuery = countQuery.eq('status', status);
  }

  const { count, error: countError } = await countQuery;

  if (countError) {
    console.error('Erro ao contar logs:', countError.message);
  }

  const total = count ?? 0;
  const meta = buildMeta(total, pagination);

  // Buscar logs paginados
  let dataQuery = client
    .from('integration_events')
    .select('id, event_type, status, attempts, payload, result, error_message, created_at, processed_at')
    .eq('tenant_id', auth.tenantId)
    .order('created_at', { ascending: false })
    .range(offset, offset + pagination.perPage - 1);

  if (eventType) {
    dataQuery = dataQuery.eq('event_type', eventType);
  }

  if (status) {
    dataQuery = dataQuery.eq('status', status);
  }

  const { data: logs, error: fetchError } = await dataQuery;

  if (fetchError) {
    console.error('Erro ao buscar logs:', fetchError.message);
  }

  return paginated(logs ?? [], meta);
}
