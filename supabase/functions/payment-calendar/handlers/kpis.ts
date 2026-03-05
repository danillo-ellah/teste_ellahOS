import { z } from 'https://esm.sh/zod@3.22.4';
import type { AuthContext } from '../../_shared/auth.ts';
import { getSupabaseClient } from '../../_shared/supabase-client.ts';
import { success, error } from '../../_shared/response.ts';
import { AppError } from '../../_shared/errors.ts';

// Schema de validacao dos query params
const QuerySchema = z.object({
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'start_date deve estar no formato YYYY-MM-DD'),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'end_date deve estar no formato YYYY-MM-DD'),
  job_id: z.string().uuid('job_id deve ser um UUID valido').optional(),
});

// Handler GET /payment-calendar/kpis
// Calcula KPIs financeiros do periodo: a pagar, a receber, saldo, atrasados, vencendo na semana
export async function kpisHandler(req: Request, auth: AuthContext): Promise<Response> {
  const url = new URL(req.url);

  // Validar query params
  const parseResult = QuerySchema.safeParse({
    start_date: url.searchParams.get('start_date'),
    end_date: url.searchParams.get('end_date'),
    job_id: url.searchParams.get('job_id') ?? undefined,
  });

  if (!parseResult.success) {
    const firstError = parseResult.error.errors[0];
    return error('VALIDATION_ERROR', firstError.message, 400, undefined, req);
  }

  const { start_date, end_date, job_id } = parseResult.data;

  // Validar que start_date <= end_date
  if (start_date > end_date) {
    return error(
      'VALIDATION_ERROR',
      'start_date deve ser menor ou igual a end_date',
      400,
      undefined,
      req,
    );
  }

  const client = getSupabaseClient(auth.token);
  const today = new Date().toISOString().split('T')[0];

  // Data limite para "vence esta semana": hoje + 7 dias
  const weekLimit = new Date();
  weekLimit.setDate(weekLimit.getDate() + 7);
  const weekLimitStr = weekLimit.toISOString().split('T')[0];

  console.log(`[payment-calendar/kpis] tenant=${auth.tenantId} range=${start_date}..${end_date} job_id=${job_id ?? 'all'}`);

  try {
    // Executar todas as queries em paralelo para minimizar latencia
    const [
      pendingCostItemsResult,
      paidCostItemsResult,
      jobsResult,
      invoicesResult,
    ] = await Promise.all([
      // 1. Cost items pendentes no range (base para total_payable, overdue, due_this_week)
      (() => {
        let q = client
          .from('cost_items')
          .select('id, payment_due_date, total_value, payment_status')
          .eq('tenant_id', auth.tenantId)
          .is('deleted_at', null)
          .eq('is_category_header', false)
          .eq('payment_status', 'pendente')
          .gte('payment_due_date', start_date)
          .lte('payment_due_date', end_date);
        if (job_id) q = q.eq('job_id', job_id);
        return q;
      })(),

      // 2. Cost items pagos no range (base para paid_in_period)
      (() => {
        let q = client
          .from('cost_items')
          .select('id, total_value, payment_status')
          .eq('tenant_id', auth.tenantId)
          .is('deleted_at', null)
          .eq('is_category_header', false)
          .eq('payment_status', 'pago')
          .gte('payment_due_date', start_date)
          .lte('payment_due_date', end_date);
        if (job_id) q = q.eq('job_id', job_id);
        return q;
      })(),

      // 3. Jobs com payment_date no range (receita esperada do cliente)
      (() => {
        let q = client
          .from('jobs')
          .select('id, closed_value')
          .eq('tenant_id', auth.tenantId)
          .is('deleted_at', null)
          .gte('payment_date', start_date)
          .lte('payment_date', end_date);
        if (job_id) q = q.eq('id', job_id);
        return q;
      })(),

      // 4. Invoices nao canceladas no range (receita via NF emitida)
      (() => {
        let q = client
          .from('invoices')
          .select('id, amount')
          .eq('tenant_id', auth.tenantId)
          .is('deleted_at', null)
          .neq('status', 'cancelada')
          .gte('due_date', start_date)
          .lte('due_date', end_date);
        if (job_id) q = q.eq('job_id', job_id);
        return q;
      })(),
    ]);

    // Checar erros das queries
    if (pendingCostItemsResult.error) {
      console.error('[payment-calendar/kpis] erro cost_items pendentes:', pendingCostItemsResult.error.message);
      throw new AppError('INTERNAL_ERROR', 'Erro ao buscar pagamentos pendentes', 500);
    }
    if (paidCostItemsResult.error) {
      console.error('[payment-calendar/kpis] erro cost_items pagos:', paidCostItemsResult.error.message);
      throw new AppError('INTERNAL_ERROR', 'Erro ao buscar pagamentos realizados', 500);
    }
    if (jobsResult.error) {
      console.error('[payment-calendar/kpis] erro jobs:', jobsResult.error.message);
      throw new AppError('INTERNAL_ERROR', 'Erro ao buscar receitas de jobs', 500);
    }
    if (invoicesResult.error) {
      console.error('[payment-calendar/kpis] erro invoices:', invoicesResult.error.message);
      throw new AppError('INTERNAL_ERROR', 'Erro ao buscar invoices', 500);
    }

    const pendingItems = pendingCostItemsResult.data ?? [];
    const paidItems = paidCostItemsResult.data ?? [];
    const jobs = jobsResult.data ?? [];
    const invoices = invoicesResult.data ?? [];

    // Calcular KPIs em memoria (volume baixo por range mensal)

    // Total a pagar: soma de cost_items pendentes no range
    const total_payable = pendingItems.reduce(
      (sum: number, item: Record<string, unknown>) => sum + ((item.total_value as number) ?? 0),
      0,
    );

    // Atrasados: pendentes com payment_due_date antes de hoje
    const overdueItems = pendingItems.filter(
      (item: Record<string, unknown>) => (item.payment_due_date as string) < today,
    );
    const overdue_count = overdueItems.length;
    const overdue_amount = overdueItems.reduce(
      (sum: number, item: Record<string, unknown>) => sum + ((item.total_value as number) ?? 0),
      0,
    );

    // Vencendo esta semana: pendentes com payment_due_date entre hoje e hoje+7
    const due_this_week = pendingItems
      .filter(
        (item: Record<string, unknown>) => {
          const due = item.payment_due_date as string;
          return due >= today && due <= weekLimitStr;
        },
      )
      .reduce(
        (sum: number, item: Record<string, unknown>) => sum + ((item.total_value as number) ?? 0),
        0,
      );

    // Pagos no periodo
    const paid_in_period = paidItems.reduce(
      (sum: number, item: Record<string, unknown>) => sum + ((item.total_value as number) ?? 0),
      0,
    );

    // Total a receber: soma dos closed_value dos jobs + soma dos amounts das invoices
    const jobs_receivable = jobs.reduce(
      (sum: number, job: Record<string, unknown>) => sum + ((job.closed_value as number) ?? 0),
      0,
    );
    const invoices_receivable = invoices.reduce(
      (sum: number, inv: Record<string, unknown>) => sum + ((inv.amount as number) ?? 0),
      0,
    );
    const total_receivable = jobs_receivable + invoices_receivable;

    // Saldo liquido do periodo
    const net_balance = total_receivable - total_payable;

    console.log(`[payment-calendar/kpis] total_payable=${total_payable} total_receivable=${total_receivable} overdue=${overdue_count}`);

    return success(
      {
        total_payable,
        total_receivable,
        net_balance,
        overdue_count,
        overdue_amount,
        due_this_week,
        paid_in_period,
      },
      200,
      req,
    );
  } catch (err) {
    if (err instanceof AppError) throw err;
    console.error('[payment-calendar/kpis] erro inesperado:', err);
    throw new AppError('INTERNAL_ERROR', 'Erro interno ao calcular KPIs do calendario', 500);
  }
}
