import type { AuthContext } from '../../_shared/auth.ts';
import { AppError } from '../../_shared/errors.ts';
import { success } from '../../_shared/response.ts';
import { getSupabaseClient } from '../../_shared/supabase-client.ts';

// Roles autorizados para ver dashboard financeiro do job
const ALLOWED_ROLES = ['financeiro', 'produtor_executivo', 'admin', 'ceo'];

// Tipos internos para aggregacao
interface CostItemRaw {
  item_number: number | null;
  service_description: string | null;
  is_category_header: boolean | null;
  total_with_overtime: number | null;
  actual_paid_value: number | null;
  item_status: string | null;
  payment_status: string | null;
  payment_date: string | null;
  payment_due_date: string | null;
  vendor_id: string | null;
  vendor_name_snapshot: string | null;
  created_at: string;
}

interface SpendingPeriod {
  period: string;
  period_label: string;
  estimated_cumulative: number;
  paid_cumulative: number;
  paid_in_period: number;
  items_paid_in_period: number;
}

interface PaymentStatusBreakdown {
  status: string;
  count: number;
  total: number;
}

interface ItemStatusBreakdown {
  status: string;
  count: number;
  total: number;
}

interface TopVendor {
  vendor_id: string;
  vendor_name: string;
  total: number;
  items_count: number;
  pct_of_total: number;
}

interface BudgetVsActual {
  item_number: number;
  item_name: string;
  budgeted: number;
  actual_paid: number;
  actual_estimated: number;
  variance_pct: number;
}

// Converte data para chave de periodo (YYYY-MM ou YYYY-Wnn)
function toPeriodKey(dateStr: string, period: 'monthly' | 'weekly'): string {
  const d = new Date(dateStr);
  if (period === 'weekly') {
    const jan1 = new Date(d.getFullYear(), 0, 1);
    const days = Math.floor((d.getTime() - jan1.getTime()) / 86400000);
    const week = Math.ceil((days + jan1.getDay() + 1) / 7);
    return `${d.getFullYear()}-W${String(week).padStart(2, '0')}`;
  }
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// Formata chave de periodo para label legivel
function formatPeriodLabel(key: string): string {
  if (key.includes('-W')) {
    return key; // "2026-W08"
  }
  const [year, month] = key.split('-');
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${months[parseInt(month, 10) - 1]}/${year.slice(2)}`;
}

// Arredonda para 2 casas decimais
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// Agrega spending timeline por periodo
function aggregateSpendingTimeline(
  items: CostItemRaw[],
  period: 'monthly' | 'weekly',
): SpendingPeriod[] {
  // Filtra itens nao-header e nao-cancelados
  const eligible = items.filter(
    (item) => !item.is_category_header && item.item_status !== 'cancelado',
  );

  // Mapa para acumular estimado por periodo (usa payment_due_date ou created_at)
  const estimatedByPeriod = new Map<string, number>();
  for (const item of eligible) {
    const dateRef = item.payment_due_date ?? item.created_at;
    if (!dateRef) continue;
    const key = toPeriodKey(dateRef, period);
    estimatedByPeriod.set(key, (estimatedByPeriod.get(key) ?? 0) + (item.total_with_overtime ?? 0));
  }

  // Mapa para acumular pago por periodo (usa payment_date, apenas itens pagos)
  const paidByPeriod = new Map<string, { total: number; count: number }>();
  for (const item of eligible) {
    if (item.payment_status !== 'pago' || !item.payment_date) continue;
    const key = toPeriodKey(item.payment_date, period);
    const existing = paidByPeriod.get(key) ?? { total: 0, count: 0 };
    const paidValue = item.actual_paid_value != null
      ? item.actual_paid_value
      : (item.total_with_overtime ?? 0);
    paidByPeriod.set(key, { total: existing.total + paidValue, count: existing.count + 1 });
  }

  // Uniao de todos os periodos encontrados
  const allPeriods = new Set([...estimatedByPeriod.keys(), ...paidByPeriod.keys()]);
  const sortedPeriods = [...allPeriods].sort();

  // Calcular acumulados
  let estimatedCumulative = 0;
  let paidCumulative = 0;
  const result: SpendingPeriod[] = [];

  for (const p of sortedPeriods) {
    const estimatedInPeriod = estimatedByPeriod.get(p) ?? 0;
    const paidData = paidByPeriod.get(p) ?? { total: 0, count: 0 };

    estimatedCumulative += estimatedInPeriod;
    paidCumulative += paidData.total;

    result.push({
      period: p,
      period_label: formatPeriodLabel(p),
      estimated_cumulative: round2(estimatedCumulative),
      paid_cumulative: round2(paidCumulative),
      paid_in_period: round2(paidData.total),
      items_paid_in_period: paidData.count,
    });
  }

  return result;
}

// Agrega breakdown por payment_status
function aggregatePaymentStatusBreakdown(items: CostItemRaw[]): PaymentStatusBreakdown[] {
  const map = new Map<string, { count: number; total: number }>();

  for (const item of items) {
    if (item.is_category_header) continue;
    const status = item.payment_status ?? 'sem_status';
    const existing = map.get(status) ?? { count: 0, total: 0 };
    map.set(status, {
      count: existing.count + 1,
      total: existing.total + (item.total_with_overtime ?? 0),
    });
  }

  return [...map.entries()]
    .map(([status, { count, total }]) => ({ status, count, total: round2(total) }))
    .sort((a, b) => b.total - a.total);
}

// Agrega breakdown por item_status
function aggregateItemStatusBreakdown(items: CostItemRaw[]): ItemStatusBreakdown[] {
  const map = new Map<string, { count: number; total: number }>();

  for (const item of items) {
    if (item.is_category_header) continue;
    const status = item.item_status ?? 'sem_status';
    const existing = map.get(status) ?? { count: 0, total: 0 };
    map.set(status, {
      count: existing.count + 1,
      total: existing.total + (item.total_with_overtime ?? 0),
    });
  }

  return [...map.entries()]
    .map(([status, { count, total }]) => ({ status, count, total: round2(total) }))
    .sort((a, b) => b.total - a.total);
}

// Agrega top 10 vendors por total
function aggregateTopVendors(items: CostItemRaw[]): TopVendor[] {
  const map = new Map<string, { name: string; total: number; count: number }>();

  // Grand total para calculo de percentual (exclui headers e cancelados)
  let grandTotal = 0;
  for (const item of items) {
    if (item.is_category_header || item.item_status === 'cancelado') continue;
    grandTotal += item.total_with_overtime ?? 0;
  }

  for (const item of items) {
    if (item.is_category_header) continue;
    if (!item.vendor_id) continue;
    if (item.item_status === 'cancelado') continue;

    const existing = map.get(item.vendor_id) ?? {
      name: item.vendor_name_snapshot ?? item.vendor_id,
      total: 0,
      count: 0,
    };
    map.set(item.vendor_id, {
      name: existing.name,
      total: existing.total + (item.total_with_overtime ?? 0),
      count: existing.count + 1,
    });
  }

  return [...map.entries()]
    .map(([vendorId, { name, total, count }]) => ({
      vendor_id: vendorId,
      vendor_name: name,
      total: round2(total),
      items_count: count,
      pct_of_total: grandTotal > 0 ? round2((total / grandTotal) * 100) : 0,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);
}

// Agrega budget vs actual por categoria (item_number de header)
function aggregateBudgetVsActual(items: CostItemRaw[]): BudgetVsActual[] {
  // Identifica headers para obter nomes de categoria
  const headers = new Map<number, string>();
  for (const item of items) {
    if (item.is_category_header && item.item_number != null) {
      headers.set(item.item_number, item.service_description ?? `Categoria ${item.item_number}`);
    }
  }

  // Agrupa itens nao-header por item_number (categoria pai)
  const categoryMap = new Map<
    number,
    { estimated: number; paid: number }
  >();

  for (const item of items) {
    if (item.is_category_header || item.item_number == null) continue;
    if (item.item_status === 'cancelado') continue;

    const existing = categoryMap.get(item.item_number) ?? { estimated: 0, paid: 0 };

    const estimatedValue = item.total_with_overtime ?? 0;
    const paidValue = item.payment_status === 'pago'
      ? (item.actual_paid_value != null ? item.actual_paid_value : estimatedValue)
      : 0;

    categoryMap.set(item.item_number, {
      estimated: existing.estimated + estimatedValue,
      paid: existing.paid + paidValue,
    });
  }

  // Monta resultado — budgeted = estimated (bottom-up, sem budget_items separados)
  const result: BudgetVsActual[] = [];

  for (const [itemNumber, { estimated, paid }] of categoryMap.entries()) {
    const budgeted = estimated; // bottom-up: orcamento = estimado
    const variancePct = budgeted > 0 ? round2(((estimated - budgeted) / budgeted) * 100) : 0;

    result.push({
      item_number: itemNumber,
      item_name: headers.get(itemNumber) ?? `Categoria ${itemNumber}`,
      budgeted: round2(budgeted),
      actual_paid: round2(paid),
      actual_estimated: round2(estimated),
      variance_pct: variancePct,
    });
  }

  return result.sort((a, b) => a.item_number - b.item_number);
}

export async function handleJobDashboardCharts(
  req: Request,
  auth: AuthContext,
  jobId: string,
): Promise<Response> {
  const url = new URL(req.url);
  const periodParam = url.searchParams.get('period') ?? 'monthly';

  if (periodParam !== 'monthly' && periodParam !== 'weekly') {
    throw new AppError('VALIDATION_ERROR', 'Parametro period deve ser monthly ou weekly', 400);
  }

  const period = periodParam as 'monthly' | 'weekly';

  console.log('[financial-dashboard/job-dashboard-charts] iniciando charts do job', {
    userId: auth.userId,
    tenantId: auth.tenantId,
    jobId,
    role: auth.role,
    period,
  });

  // Validacao de role
  if (!ALLOWED_ROLES.includes(auth.role)) {
    throw new AppError('FORBIDDEN', 'Permissao insuficiente para acessar dashboard financeiro', 403);
  }

  const client = getSupabaseClient(auth.token);

  // Buscar todos os cost_items do job e o closed_value em paralelo
  const [allItemsResult, jobResult] = await Promise.all([
    client
      .from('cost_items')
      .select(`
        item_number, service_description, is_category_header,
        total_with_overtime, actual_paid_value,
        item_status, payment_status,
        payment_date, payment_due_date,
        vendor_id, vendor_name_snapshot,
        created_at
      `)
      .eq('job_id', jobId)
      .eq('tenant_id', auth.tenantId)
      .is('deleted_at', null)
      .order('item_number')
      .order('sub_item_number'),

    client
      .from('jobs')
      .select('closed_value')
      .eq('id', jobId)
      .eq('tenant_id', auth.tenantId)
      .single(),
  ]);

  if (jobResult.error || !jobResult.data) {
    throw new AppError('NOT_FOUND', 'Job nao encontrado', 404);
  }

  if (allItemsResult.error) {
    console.error('[financial-dashboard/job-dashboard-charts] erro ao buscar cost_items:', allItemsResult.error.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao buscar itens de custo', 500);
  }

  const items = (allItemsResult.data ?? []) as CostItemRaw[];
  const budgetReferenceLine = jobResult.data.closed_value ?? 0;

  // Calcular os 5 datasets em memoria
  const spendingTimeline = aggregateSpendingTimeline(items, period);
  const paymentStatusBreakdown = aggregatePaymentStatusBreakdown(items);
  const itemStatusBreakdown = aggregateItemStatusBreakdown(items);
  const topVendors = aggregateTopVendors(items);
  const budgetVsActual = aggregateBudgetVsActual(items);

  console.log('[financial-dashboard/job-dashboard-charts] charts calculados', {
    jobId,
    period,
    timelinePeriods: spendingTimeline.length,
    paymentStatuses: paymentStatusBreakdown.length,
    itemStatuses: itemStatusBreakdown.length,
    topVendorsCount: topVendors.length,
    categoriesCount: budgetVsActual.length,
  });

  return success({
    spending_timeline: spendingTimeline,
    budget_reference_line: round2(budgetReferenceLine),
    payment_status_breakdown: paymentStatusBreakdown,
    item_status_breakdown: itemStatusBreakdown,
    top_vendors: topVendors,
    budget_vs_actual: budgetVsActual,
  });
}
