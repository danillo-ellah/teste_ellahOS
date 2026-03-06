import type { AuthContext } from '../../_shared/auth.ts';
import { AppError } from '../../_shared/errors.ts';
import { success } from '../../_shared/response.ts';
import { getSupabaseClient } from '../../_shared/supabase-client.ts';

// Roles autorizados para ver projecao de fluxo de caixa
const ALLOWED_ROLES = ['admin', 'ceo', 'financeiro', 'produtor_executivo'];

// Granularidades suportadas
type Granularity = 'daily' | 'weekly' | 'monthly';

// Receivable retornado do banco
interface Receivable {
  id: string;
  job_id: string;
  description: string;
  amount: number;
  due_date: string;
  status: string;
  installment_number: number;
}

// CostItem retornado do banco
interface CostItem {
  id: string;
  job_id: string | null;
  service_description: string;
  amount: number;
  due_date: string | null;
  status: string;
}

// Dado de job para enriquecer detalhes
interface JobRef {
  id: string;
  code: string;
  title: string;
}

// Item de detalhe dentro de cada periodo
interface FlowDetail {
  id: string;
  job_id: string | null;
  job_code: string | null;
  description: string;
  amount: number;
  due_date: string;
  status: string;
  installment_number?: number;
}

// Um periodo da serie temporal
interface CashflowPeriod {
  period_start: string;
  period_end: string;
  period_label: string;
  inflows: number;
  outflows: number;
  net: number;
  cumulative_balance: number;
  inflow_details: FlowDetail[];
  outflow_details: FlowDetail[];
}

// KPIs do fluxo de caixa
interface CashflowKpis {
  total_inflows: number;
  total_outflows: number;
  net_cashflow: number;
  min_balance: number;
  min_balance_date: string | null;
  is_danger: boolean;
  days_until_danger: number | null;
  overdue_receivables: number;
  overdue_payables: number;
}

// Resposta final do handler
interface CashflowData {
  opening_balance: number;
  series: CashflowPeriod[];
  kpis: CashflowKpis;
}

// Retorna data no formato YYYY-MM-DD
function toDateStr(date: Date): string {
  return date.toISOString().split('T')[0];
}

// Formata data YYYY-MM-DD para DD/MM
function formatDateBR(dateStr: string): string {
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}`;
}

// Calcula o inicio do periodo ao qual a data pertence
function getPeriodStart(dateStr: string, granularity: Granularity): string {
  const date = new Date(dateStr + 'T00:00:00Z');

  if (granularity === 'daily') {
    return dateStr;
  }

  if (granularity === 'weekly') {
    // Semana comeca na segunda-feira
    const dayOfWeek = date.getUTCDay(); // 0=domingo
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(date);
    monday.setUTCDate(date.getUTCDate() + mondayOffset);
    return toDateStr(monday);
  }

  // monthly: primeiro dia do mes
  return `${dateStr.slice(0, 7)}-01`;
}

// Calcula o fim do periodo (inclusivo)
function getPeriodEnd(periodStart: string, granularity: Granularity): string {
  const date = new Date(periodStart + 'T00:00:00Z');

  if (granularity === 'daily') {
    return periodStart;
  }

  if (granularity === 'weekly') {
    const sunday = new Date(date);
    sunday.setUTCDate(date.getUTCDate() + 6);
    return toDateStr(sunday);
  }

  // monthly: ultimo dia do mes
  const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0));
  return toDateStr(lastDay);
}

// Monta label legivel para o periodo
function buildPeriodLabel(periodStart: string, periodEnd: string, granularity: Granularity): string {
  if (granularity === 'daily') {
    return formatDateBR(periodStart);
  }

  if (granularity === 'weekly') {
    return `${formatDateBR(periodStart)} - ${formatDateBR(periodEnd)}`;
  }

  // monthly: "Mar/26"
  const [year, month] = periodStart.split('-');
  const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const monthLabel = monthNames[parseInt(month, 10) - 1] ?? month;
  return `${monthLabel}/${year.slice(2)}`;
}

// Monta lista de chaves de periodo entre start_date e end_date
function buildPeriodKeys(startDate: string, endDate: string, granularity: Granularity): string[] {
  const keys: string[] = [];
  const end = new Date(endDate + 'T00:00:00Z');

  let cursor = new Date(getPeriodStart(startDate, granularity) + 'T00:00:00Z');

  while (cursor <= end) {
    keys.push(toDateStr(cursor));

    if (granularity === 'daily') {
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    } else if (granularity === 'weekly') {
      cursor.setUTCDate(cursor.getUTCDate() + 7);
    } else {
      // Proximo mes
      cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1));
    }
  }

  return keys;
}

export async function handleCashflow(
  req: Request,
  auth: AuthContext,
): Promise<Response> {
  console.log('[financial-dashboard/cashflow] iniciando projecao de fluxo de caixa', {
    userId: auth.userId,
    tenantId: auth.tenantId,
    role: auth.role,
  });

  // Validacao de role
  if (!ALLOWED_ROLES.includes(auth.role)) {
    throw new AppError('FORBIDDEN', 'Permissao insuficiente para acessar fluxo de caixa', 403);
  }

  // Extrair e validar parametros da query string
  const url = new URL(req.url);
  const today = new Date();
  const todayStr = toDateStr(today);

  const defaultEndDate = new Date(today);
  defaultEndDate.setDate(defaultEndDate.getDate() + 90);
  const defaultEndStr = toDateStr(defaultEndDate);

  const startDate = url.searchParams.get('start_date') ?? todayStr;
  const endDate = url.searchParams.get('end_date') ?? defaultEndStr;
  const granularityParam = url.searchParams.get('granularity') ?? 'weekly';

  // Validar formato de data (YYYY-MM-DD)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(startDate)) {
    throw new AppError('VALIDATION_ERROR', 'Parametro start_date invalido. Use formato YYYY-MM-DD', 400);
  }
  if (!dateRegex.test(endDate)) {
    throw new AppError('VALIDATION_ERROR', 'Parametro end_date invalido. Use formato YYYY-MM-DD', 400);
  }
  if (startDate > endDate) {
    throw new AppError('VALIDATION_ERROR', 'start_date deve ser anterior ou igual a end_date', 400);
  }

  // Validar granularity
  const validGranularities: Granularity[] = ['daily', 'weekly', 'monthly'];
  if (!validGranularities.includes(granularityParam as Granularity)) {
    throw new AppError(
      'VALIDATION_ERROR',
      `Granularity invalida. Valores aceitos: ${validGranularities.join(', ')}`,
      400,
    );
  }
  const granularity = granularityParam as Granularity;

  const client = getSupabaseClient(auth.token);

  // Executar todas as queries em paralelo
  const [
    receivablesResult,
    costItemsResult,
    openingReceivablesResult,
    openingCostItemsResult,
    overdueReceivablesResult,
    overduePayablesResult,
    jobsResult,
  ] = await Promise.all([
    // Recebiveis pendentes/faturados no range do periodo
    client
      .from('job_receivables')
      .select('id, job_id, description, amount, due_date, status, installment_number')
      .eq('tenant_id', auth.tenantId)
      .is('deleted_at', null)
      .in('status', ['pendente', 'faturado'])
      .not('due_date', 'is', null)
      .gte('due_date', startDate)
      .lte('due_date', endDate)
      .order('due_date', { ascending: true }),

    // Custos pendentes no range do periodo (excluindo cabecalhos de categoria)
    client
      .from('cost_items')
      .select('id, job_id, service_description, total_with_overtime, payment_due_date, payment_status')
      .eq('tenant_id', auth.tenantId)
      .is('deleted_at', null)
      .eq('payment_status', 'pendente')
      .eq('is_category_header', false)
      .not('payment_due_date', 'is', null)
      .gte('payment_due_date', startDate)
      .lte('payment_due_date', endDate)
      .order('payment_due_date', { ascending: true }),

    // Recebiveis recebidos ANTES do start_date (para calcular saldo inicial)
    client
      .from('job_receivables')
      .select('amount')
      .eq('tenant_id', auth.tenantId)
      .is('deleted_at', null)
      .eq('status', 'recebido')
      .not('received_date', 'is', null)
      .lt('received_date', startDate),

    // Custos pagos ANTES do start_date (para calcular saldo inicial)
    client
      .from('cost_items')
      .select('total_with_overtime, actual_paid_value')
      .eq('tenant_id', auth.tenantId)
      .is('deleted_at', null)
      .eq('payment_status', 'pago')
      .eq('is_category_header', false)
      .not('payment_date', 'is', null)
      .lt('payment_date', startDate),

    // Recebiveis vencidos (overdue: status pendente/faturado/atrasado com due_date < hoje)
    client
      .from('job_receivables')
      .select('amount')
      .eq('tenant_id', auth.tenantId)
      .is('deleted_at', null)
      .in('status', ['pendente', 'faturado', 'atrasado'])
      .lt('due_date', todayStr),

    // Custos vencidos (overdue: payment_status pendente com payment_due_date < hoje)
    client
      .from('cost_items')
      .select('total_with_overtime, actual_paid_value')
      .eq('tenant_id', auth.tenantId)
      .is('deleted_at', null)
      .eq('payment_status', 'pendente')
      .eq('is_category_header', false)
      .lt('payment_due_date', todayStr),

    // Jobs do tenant para enriquecer detalhes (code + title)
    client
      .from('jobs')
      .select('id, code, title')
      .eq('tenant_id', auth.tenantId)
      .is('deleted_at', null),
  ]);

  // Verificar erros criticos
  if (receivablesResult.error) {
    console.error('[financial-dashboard/cashflow] erro ao buscar recebiveis:', receivablesResult.error.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao buscar recebiveis', 500);
  }
  if (costItemsResult.error) {
    console.error('[financial-dashboard/cashflow] erro ao buscar custos:', costItemsResult.error.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao buscar custos', 500);
  }

  // Erros nao criticos — logar e usar zero como fallback
  if (openingReceivablesResult.error) {
    console.warn(
      '[financial-dashboard/cashflow] erro ao buscar recebiveis historicos (saldo inicial):',
      openingReceivablesResult.error.message,
    );
  }
  if (openingCostItemsResult.error) {
    console.warn(
      '[financial-dashboard/cashflow] erro ao buscar custos historicos (saldo inicial):',
      openingCostItemsResult.error.message,
    );
  }
  if (overdueReceivablesResult.error) {
    console.warn(
      '[financial-dashboard/cashflow] erro ao buscar recebiveis vencidos:',
      overdueReceivablesResult.error.message,
    );
  }
  if (overduePayablesResult.error) {
    console.warn(
      '[financial-dashboard/cashflow] erro ao buscar custos vencidos:',
      overduePayablesResult.error.message,
    );
  }
  if (jobsResult.error) {
    console.warn('[financial-dashboard/cashflow] erro ao buscar jobs (enriquecimento):',
      jobsResult.error.message,
    );
  }

  // Montar mapa de jobs para lookup rapido
  const jobMap = new Map<string, JobRef>();
  for (const job of (jobsResult.data ?? [])) {
    jobMap.set(job.id, { id: job.id, code: job.code, title: job.title });
  }

  // Calcular saldo inicial: total_recebido - total_pago antes do periodo
  const totalReceivedBefore = (openingReceivablesResult.data ?? []).reduce(
    (acc, r) => acc + ((r.amount as number) ?? 0),
    0,
  );
  const totalPaidBefore = (openingCostItemsResult.data ?? []).reduce(
    (acc, i) => acc + (
      i.actual_paid_value != null
        ? (i.actual_paid_value as number)
        : ((i.total_with_overtime as number) ?? 0)
    ),
    0,
  );
  const openingBalance = round2(totalReceivedBefore - totalPaidBefore);

  // Normalizar recebiveis para FlowDetail
  const receivables: Receivable[] = (receivablesResult.data ?? []).map((r) => ({
    id: r.id as string,
    job_id: r.job_id as string,
    description: r.description as string,
    amount: (r.amount as number) ?? 0,
    due_date: r.due_date as string,
    status: r.status as string,
    installment_number: (r.installment_number as number) ?? 0,
  }));

  // Normalizar cost_items para CostItem
  const costItems: CostItem[] = (costItemsResult.data ?? []).map((c) => ({
    id: c.id as string,
    job_id: c.job_id as string | null,
    service_description: c.service_description as string,
    amount: (c.total_with_overtime as number) ?? 0,
    due_date: c.payment_due_date as string | null,
    status: c.payment_status as string,
  }));

  // Construir mapa de periodos
  const periodKeys = buildPeriodKeys(startDate, endDate, granularity);
  const periodMap = new Map<string, CashflowPeriod>();

  for (const key of periodKeys) {
    const periodEnd = getPeriodEnd(key, granularity);
    periodMap.set(key, {
      period_start: key,
      period_end: periodEnd,
      period_label: buildPeriodLabel(key, periodEnd, granularity),
      inflows: 0,
      outflows: 0,
      net: 0,
      cumulative_balance: 0,
      inflow_details: [],
      outflow_details: [],
    });
  }

  // Distribuir recebiveis nos periodos
  for (const r of receivables) {
    if (!r.due_date) continue;
    const periodKey = getPeriodStart(r.due_date, granularity);
    const period = periodMap.get(periodKey);
    if (!period) continue; // Fora do range gerado

    const job = r.job_id ? jobMap.get(r.job_id) : null;
    period.inflows = round2(period.inflows + r.amount);
    period.inflow_details.push({
      id: r.id,
      job_id: r.job_id ?? null,
      job_code: job?.code ?? null,
      description: r.description,
      amount: r.amount,
      due_date: r.due_date,
      status: r.status,
      installment_number: r.installment_number,
    });
  }

  // Distribuir custos nos periodos
  for (const c of costItems) {
    if (!c.due_date) continue;
    const periodKey = getPeriodStart(c.due_date, granularity);
    const period = periodMap.get(periodKey);
    if (!period) continue;

    const job = c.job_id ? jobMap.get(c.job_id) : null;
    period.outflows = round2(period.outflows + c.amount);
    period.outflow_details.push({
      id: c.id,
      job_id: c.job_id ?? null,
      job_code: job?.code ?? null,
      description: c.service_description,
      amount: c.amount,
      due_date: c.due_date,
      status: c.status,
    });
  }

  // Calcular net e saldo acumulado em ordem cronologica
  let cumulative = openingBalance;
  const series: CashflowPeriod[] = [];

  for (const key of periodKeys) {
    const period = periodMap.get(key);
    if (!period) continue;

    period.net = round2(period.inflows - period.outflows);
    cumulative = round2(cumulative + period.net);
    period.cumulative_balance = cumulative;
    series.push(period);
  }

  // Calcular KPIs
  const totalInflows = round2(series.reduce((acc, p) => acc + p.inflows, 0));
  const totalOutflows = round2(series.reduce((acc, p) => acc + p.outflows, 0));
  const netCashflow = round2(totalInflows - totalOutflows);

  // Ponto de saldo minimo
  let minBalance = openingBalance;
  let minBalanceDate: string | null = null;

  for (const period of series) {
    if (period.cumulative_balance < minBalance) {
      minBalance = period.cumulative_balance;
      minBalanceDate = period.period_start;
    }
  }

  // Detectar se saldo fica negativo e quando (dias ate o perigo)
  const isDanger = minBalance < 0;
  let daysUntilDanger: number | null = null;

  if (isDanger && minBalanceDate) {
    // Encontrar o PRIMEIRO periodo em que o saldo fica negativo
    for (const period of series) {
      if (period.cumulative_balance < 0) {
        const dangerDate = new Date(period.period_start + 'T00:00:00Z');
        const todayMs = new Date(todayStr + 'T00:00:00Z').getTime();
        const dangerMs = dangerDate.getTime();
        daysUntilDanger = Math.max(0, Math.round((dangerMs - todayMs) / (1000 * 60 * 60 * 24)));
        break;
      }
    }
  }

  // Calcular overdue: recebiveis vencidos
  const overdueReceivables = round2(
    (overdueReceivablesResult.data ?? []).reduce((acc, r) => acc + ((r.amount as number) ?? 0), 0),
  );

  // Calcular overdue: custos vencidos
  const overduePayables = round2(
    (overduePayablesResult.data ?? []).reduce(
      (acc, i) => acc + (
        i.actual_paid_value != null
          ? (i.actual_paid_value as number)
          : ((i.total_with_overtime as number) ?? 0)
      ),
      0,
    ),
  );

  const kpis: CashflowKpis = {
    total_inflows: totalInflows,
    total_outflows: totalOutflows,
    net_cashflow: netCashflow,
    min_balance: round2(minBalance),
    min_balance_date: minBalanceDate,
    is_danger: isDanger,
    days_until_danger: daysUntilDanger,
    overdue_receivables: overdueReceivables,
    overdue_payables: overduePayables,
  };

  console.log('[financial-dashboard/cashflow] projecao calculada', {
    tenantId: auth.tenantId,
    startDate,
    endDate,
    granularity,
    periodsCount: series.length,
    openingBalance,
    totalInflows,
    totalOutflows,
    isDanger,
  });

  const responseData: CashflowData = {
    opening_balance: openingBalance,
    series,
    kpis,
  };

  return success(responseData);
}

// Arredonda para 2 casas decimais, evitando imprecisao de ponto flutuante
function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
