import type { AuthContext } from '../../_shared/auth.ts';
import { AppError } from '../../_shared/errors.ts';
import { getSupabaseClient } from '../../_shared/supabase-client.ts';
import { parsePagination, getOffset, buildMeta } from '../../_shared/pagination.ts';
import { getCorsHeaders } from '../../_shared/cors.ts';

const ALLOWED_SORT_COLS = [
  'created_at',
  'updated_at',
  'title',
  'estimated_value',
  'probability',
  'expected_close_date',
  'stage',
];

/**
 * GET /crm/opportunities
 * Lista oportunidades com filtros e paginacao.
 * Filtros: stage, assigned_to, client_id, source, search (titulo)
 */
export async function handleListOpportunities(req: Request, auth: AuthContext): Promise<Response> {
  console.log('[crm/list-opportunities] listando oportunidades', {
    userId: auth.userId,
    tenantId: auth.tenantId,
  });

  const url = new URL(req.url);
  const client = getSupabaseClient(auth.token);
  const pagination = parsePagination(url, ALLOWED_SORT_COLS);

  // Filtros
  const stage = url.searchParams.get('stage');
  const assignedTo = url.searchParams.get('assigned_to');
  const clientId = url.searchParams.get('client_id');
  const source = url.searchParams.get('source');
  const search = url.searchParams.get('search');
  const includeDeleted = url.searchParams.get('include_deleted') === 'true';

  let query = client
    .from('opportunities')
    .select(
      `
      id,
      title,
      stage,
      estimated_value,
      probability,
      expected_close_date,
      actual_close_date,
      source,
      project_type,
      loss_reason,
      notes,
      created_at,
      updated_at,
      client_id,
      agency_id,
      assigned_to,
      job_id,
      clients(id, name),
      agencies(id, name),
      assigned_profile:profiles!opportunities_assigned_to_fkey(id, full_name, avatar_url)
    `,
      { count: 'exact' },
    )
    .eq('tenant_id', auth.tenantId);

  if (!includeDeleted) {
    query = query.is('deleted_at', null);
  }

  if (stage) query = query.eq('stage', stage);
  if (assignedTo) query = query.eq('assigned_to', assignedTo);
  if (clientId) query = query.eq('client_id', clientId);
  if (source) query = query.eq('source', source);
  if (search?.trim()) query = query.ilike('title', `%${search.trim()}%`);

  const ascending = pagination.sortOrder === 'asc';
  query = query
    .order(pagination.sortBy, { ascending })
    .range(getOffset(pagination), getOffset(pagination) + pagination.perPage - 1);

  const { data: items, error: listError, count } = await query;

  if (listError) {
    console.error('[crm/list-opportunities] erro na query:', listError.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao listar oportunidades', 500, {
      detail: listError.message,
    });
  }

  const meta = buildMeta(count ?? 0, pagination);

  return new Response(
    JSON.stringify({ data: items, meta }),
    {
      status: 200,
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
    },
  );
}
