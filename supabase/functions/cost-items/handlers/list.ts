import type { AuthContext } from '../../_shared/auth.ts';
import { AppError } from '../../_shared/errors.ts';
import { getSupabaseClient } from '../../_shared/supabase-client.ts';
import { parsePagination, getOffset, buildMeta } from '../../_shared/pagination.ts';
import { corsHeaders } from '../../_shared/cors.ts';

// Colunas permitidas para ordenacao
const ALLOWED_SORT_COLS = [
  'item_number',
  'sub_item_number',
  'created_at',
  'payment_due_date',
  'total_with_overtime',
  'sort_order',
];

export async function handleList(req: Request, auth: AuthContext): Promise<Response> {
  console.log('[cost-items/list] listando itens de custo', {
    userId: auth.userId,
    tenantId: auth.tenantId,
  });

  const url = new URL(req.url);
  const client = getSupabaseClient(auth.token);

  // Parametros de paginacao e ordenacao
  const pagination = parsePagination(url, ALLOWED_SORT_COLS);

  // Filtros da query
  const jobId = url.searchParams.get('job_id');
  const periodMonthFrom = url.searchParams.get('period_month_from');
  const periodMonthTo = url.searchParams.get('period_month_to');
  const itemStatus = url.searchParams.get('item_status');
  const paymentStatus = url.searchParams.get('payment_status');
  const nfRequestStatus = url.searchParams.get('nf_request_status');
  const vendorId = url.searchParams.get('vendor_id');
  const search = url.searchParams.get('search');

  // Construir query principal
  let query = client
    .from('cost_items')
    .select('*, vendors(id, full_name, email)', { count: 'exact' })
    .eq('tenant_id', auth.tenantId)
    .is('deleted_at', null);

  // Filtro por job ou por periodo (custos fixos)
  if (jobId) {
    query = query.eq('job_id', jobId);
  } else if (periodMonthFrom || periodMonthTo) {
    query = query.is('job_id', null);
    if (periodMonthFrom) query = query.gte('period_month', periodMonthFrom);
    if (periodMonthTo) query = query.lte('period_month', periodMonthTo);
  }

  // Filtros adicionais
  if (itemStatus) query = query.eq('item_status', itemStatus);
  if (paymentStatus) query = query.eq('payment_status', paymentStatus);
  if (nfRequestStatus) query = query.eq('nf_request_status', nfRequestStatus);
  if (vendorId) query = query.eq('vendor_id', vendorId);
  if (search) {
    query = query.ilike('service_description', `%${search}%`);
  }

  // Ordenacao: item_number ASC, sub_item_number ASC por padrao
  // Se o sort_by nao foi especificado (default created_at), usar item_number ASC
  const isDefault = pagination.sortBy === 'created_at' && !url.searchParams.has('sort_by');
  const sortBy = isDefault ? 'item_number' : pagination.sortBy;
  const ascending = isDefault ? true : pagination.sortOrder === 'asc';

  query = query
    .order(sortBy, { ascending })
    .order('sub_item_number', { ascending: true })
    .order('sort_order', { ascending: true });

  // Paginacao
  const offset = getOffset(pagination);
  query = query.range(offset, offset + pagination.perPage - 1);

  const { data: items, error: listError, count } = await query;

  if (listError) {
    console.error('[cost-items/list] erro na query:', listError.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao listar itens de custo', 500, {
      detail: listError.message,
    });
  }

  const total = count ?? 0;
  const meta = buildMeta(total, pagination);

  // Query de agregacao para meta adicional
  let aggQuery = client
    .from('cost_items')
    .select('item_status, total_with_overtime, actual_paid_value, payment_status')
    .eq('tenant_id', auth.tenantId)
    .is('deleted_at', null);

  if (jobId) {
    aggQuery = aggQuery.eq('job_id', jobId);
  } else if (periodMonthFrom || periodMonthTo) {
    aggQuery = aggQuery.is('job_id', null);
    if (periodMonthFrom) aggQuery = aggQuery.gte('period_month', periodMonthFrom);
    if (periodMonthTo) aggQuery = aggQuery.lte('period_month', periodMonthTo);
  }

  const { data: aggData } = await aggQuery;

  // Calcular meta adicional
  const byStatus: Record<string, number> = {};
  let totalBudgeted = 0;
  let totalPaid = 0;

  for (const row of aggData ?? []) {
    const status = row.item_status as string;
    byStatus[status] = (byStatus[status] ?? 0) + 1;
    totalBudgeted += Number(row.total_with_overtime ?? 0);
    if (row.payment_status === 'pago') {
      totalPaid += Number(row.actual_paid_value ?? 0);
    }
  }

  const extendedMeta = {
    ...meta,
    by_status: byStatus,
    total_budgeted: totalBudgeted,
    total_paid: totalPaid,
  };

  return new Response(
    JSON.stringify({ data: items, meta: extendedMeta }),
    {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    },
  );
}
