import { getSupabaseClient } from '../../_shared/supabase-client.ts';
import { paginated } from '../../_shared/response.ts';
import { AppError } from '../../_shared/errors.ts';
import { mapDbToApi } from '../../_shared/column-map.ts';
import {
  parsePagination,
  getOffset,
  buildMeta,
} from '../../_shared/pagination.ts';
import type { AuthContext } from '../../_shared/auth.ts';

export async function listJobs(
  req: Request,
  auth: AuthContext,
): Promise<Response> {
  const url = new URL(req.url);
  const params = parsePagination(url);
  const supabase = getSupabaseClient(auth.token);

  // Query base: jobs nao deletados
  let query = supabase
    .from('jobs')
    .select('*, clients!inner(id, name)', { count: 'exact' })
    .is('deleted_at', null);

  // === Filtros ===

  // Status (multi-valor separado por virgula)
  const statusFilter = url.searchParams.get('status');
  if (statusFilter) {
    const statuses = statusFilter.split(',').map((s) => s.trim());
    query = query.in('status', statuses);
  }

  // Client
  const clientId = url.searchParams.get('client_id');
  if (clientId) {
    query = query.eq('client_id', clientId);
  }

  // Agency
  const agencyId = url.searchParams.get('agency_id');
  if (agencyId) {
    query = query.eq('agency_id', agencyId);
  }

  // Tipo de projeto
  const projectType = url.searchParams.get('job_type');
  if (projectType) {
    query = query.eq('project_type', projectType);
  }

  // Prioridade
  const priority = url.searchParams.get('priority');
  if (priority) {
    query = query.eq('priority', priority);
  }

  // Segmento
  const segment = url.searchParams.get('segment');
  if (segment) {
    query = query.eq('segment', segment);
  }

  // Arquivado
  const isArchived = url.searchParams.get('is_archived');
  query = query.eq('is_archived', isArchived === 'true');

  // Busca textual
  const search = url.searchParams.get('search');
  if (search) {
    query = query.or(
      `title.ilike.%${search}%,code.ilike.%${search}%,brand.ilike.%${search}%`,
    );
  }

  // Tags (overlap - job tem pelo menos uma das tags)
  const tags = url.searchParams.get('tags');
  if (tags) {
    const tagArray = tags.split(',').map((t) => t.trim());
    query = query.overlaps('tags', tagArray);
  }

  // Periodo de entrega
  const dateFrom = url.searchParams.get('date_from');
  if (dateFrom) {
    query = query.gte('expected_delivery_date', dateFrom);
  }
  const dateTo = url.searchParams.get('date_to');
  if (dateTo) {
    query = query.lte('expected_delivery_date', dateTo);
  }

  // Margem
  const marginMin = url.searchParams.get('margin_min');
  if (marginMin) {
    query = query.gte('margin_percentage', parseFloat(marginMin));
  }
  const marginMax = url.searchParams.get('margin_max');
  if (marginMax) {
    query = query.lte('margin_percentage', parseFloat(marginMax));
  }

  // Health score
  const healthMin = url.searchParams.get('health_score_min');
  if (healthMin) {
    query = query.gte('health_score', parseInt(healthMin));
  }
  const healthMax = url.searchParams.get('health_score_max');
  if (healthMax) {
    query = query.lte('health_score', parseInt(healthMax));
  }

  // Sub-jobs de um pai
  const parentJobId = url.searchParams.get('parent_job_id');
  if (parentJobId) {
    query = query.eq('parent_job_id', parentJobId);
  }

  // === Ordenacao e paginacao ===
  const ascending = params.sortOrder === 'asc';
  query = query
    .order(params.sortBy, { ascending })
    .range(getOffset(params), getOffset(params) + params.perPage - 1);

  // Executar query
  const { data: jobs, count, error: dbError } = await query;

  if (dbError) {
    throw new AppError('INTERNAL_ERROR', dbError.message, 500);
  }

  // Mapear resultados banco -> API
  const mappedJobs = (jobs ?? []).map((job) => mapDbToApi(job));

  return paginated(mappedJobs, buildMeta(count ?? 0, params));
}
