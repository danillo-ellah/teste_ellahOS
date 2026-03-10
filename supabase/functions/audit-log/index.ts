import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { handleCors } from '../_shared/cors.ts';
import { getAuthContext } from '../_shared/auth.ts';
import { error, fromAppError, paginated } from '../_shared/response.ts';
import { AppError } from '../_shared/errors.ts';
import { getSupabaseClient } from '../_shared/supabase-client.ts';
import { parsePagination, getOffset, buildMeta } from '../_shared/pagination.ts';

// Labels legiveis para tabelas auditadas
const TABLE_LABELS: Record<string, string> = {
  tenants: 'Tenant',
  profiles: 'Usuario',
  clients: 'Cliente',
  agencies: 'Agencia',
  contacts: 'Contato',
  people: 'Pessoa',
  jobs: 'Job',
  job_team: 'Equipe do Job',
  job_deliverables: 'Entregavel',
  job_budgets: 'Orcamento',
  financial_records: 'Registro Financeiro',
  cost_items: 'Item de Custo',
  job_receivables: 'Recebivel',
  opportunities: 'Oportunidade CRM',
  job_files: 'Arquivo',
  tenant_invitations: 'Convite',
  payment_approval_rules: 'Regra de Aprovacao',
};

// Roles com acesso ao audit log
const ALLOWED_ROLES = ['admin', 'ceo'];

// Colunas permitidas para ordenacao
const ALLOWED_SORT_COLUMNS = ['created_at'];

Deno.serve(async (req: Request) => {
  // CORS pre-flight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    // Apenas GET permitido
    if (req.method !== 'GET') {
      return error('METHOD_NOT_ALLOWED', 'Apenas GET permitido', 405, undefined, req);
    }

    // Autenticacao
    const auth = await getAuthContext(req);

    // Verificar role (somente admin e CEO)
    if (!ALLOWED_ROLES.includes(auth.role)) {
      return error('FORBIDDEN', 'Acesso restrito a administradores', 403, undefined, req);
    }

    const url = new URL(req.url);
    const pagination = parsePagination(url, ALLOWED_SORT_COLUMNS);

    // Filtros opcionais via query params
    const filterTable = url.searchParams.get('table_name');
    const filterAction = url.searchParams.get('action');
    const filterUserId = url.searchParams.get('user_id');
    const filterDateFrom = url.searchParams.get('date_from');  // ISO 8601
    const filterDateTo = url.searchParams.get('date_to');      // ISO 8601
    const filterSearch = url.searchParams.get('search');       // busca em record_id ou changed_fields

    // Validar filtros
    if (filterAction && !['INSERT', 'UPDATE', 'DELETE'].includes(filterAction)) {
      return error('VALIDATION_ERROR', 'action deve ser INSERT, UPDATE ou DELETE', 400, undefined, req);
    }

    if (filterTable && !Object.keys(TABLE_LABELS).includes(filterTable)) {
      return error('VALIDATION_ERROR', `table_name invalido: ${filterTable}`, 400, undefined, req);
    }

    // Montar query
    const client = getSupabaseClient(auth.token);

    // Query para total (count)
    let countQuery = client
      .from('audit_log')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', auth.tenantId);

    // Query para dados
    let dataQuery = client
      .from('audit_log')
      .select('id, tenant_id, table_name, record_id, action, user_id, old_data, new_data, changed_fields, created_at')
      .eq('tenant_id', auth.tenantId)
      .order('created_at', { ascending: false })
      .range(getOffset(pagination), getOffset(pagination) + pagination.perPage - 1);

    // Aplicar filtros em ambas queries
    if (filterTable) {
      countQuery = countQuery.eq('table_name', filterTable);
      dataQuery = dataQuery.eq('table_name', filterTable);
    }
    if (filterAction) {
      countQuery = countQuery.eq('action', filterAction);
      dataQuery = dataQuery.eq('action', filterAction);
    }
    if (filterUserId) {
      countQuery = countQuery.eq('user_id', filterUserId);
      dataQuery = dataQuery.eq('user_id', filterUserId);
    }
    if (filterDateFrom) {
      countQuery = countQuery.gte('created_at', filterDateFrom);
      dataQuery = dataQuery.gte('created_at', filterDateFrom);
    }
    if (filterDateTo) {
      countQuery = countQuery.lte('created_at', filterDateTo);
      dataQuery = dataQuery.lte('created_at', filterDateTo);
    }
    if (filterSearch) {
      // Busca por record_id (se for UUID) ou por campo nos changed_fields
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(filterSearch)) {
        countQuery = countQuery.eq('record_id', filterSearch);
        dataQuery = dataQuery.eq('record_id', filterSearch);
      } else {
        countQuery = countQuery.contains('changed_fields', [filterSearch]);
        dataQuery = dataQuery.contains('changed_fields', [filterSearch]);
      }
    }

    // Executar em paralelo
    const [countResult, dataResult] = await Promise.all([countQuery, dataQuery]);

    if (countResult.error) {
      throw new AppError('INTERNAL_ERROR', countResult.error.message, 500);
    }
    if (dataResult.error) {
      throw new AppError('INTERNAL_ERROR', dataResult.error.message, 500);
    }

    const total = countResult.count ?? 0;

    // Enriquecer com user names (batch)
    const userIds = [...new Set(
      (dataResult.data ?? [])
        .map((r: { user_id: string | null }) => r.user_id)
        .filter(Boolean)
    )] as string[];

    let userMap: Record<string, string> = {};
    if (userIds.length > 0) {
      const { data: profiles } = await client
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds);
      if (profiles) {
        userMap = Object.fromEntries(
          profiles.map((p: { id: string; full_name: string }) => [p.id, p.full_name])
        );
      }
    }

    // Montar response enriquecida
    const enriched = (dataResult.data ?? []).map((row: Record<string, unknown>) => ({
      ...row,
      table_label: TABLE_LABELS[row.table_name as string] ?? row.table_name,
      user_name: row.user_id ? (userMap[row.user_id as string] ?? 'Sistema') : 'Sistema',
    }));

    const meta = buildMeta(total, pagination);
    return paginated(enriched, meta, req);

  } catch (err) {
    if (err instanceof AppError) {
      return fromAppError(err, req);
    }
    console.error('audit-log error:', err);
    return error('INTERNAL_ERROR', 'Erro interno ao consultar audit log', 500, undefined, req);
  }
});
