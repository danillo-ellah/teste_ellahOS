import { getSupabaseClient } from '../_shared/supabase-client.ts';
import { success } from '../_shared/response.ts';
import { AppError } from '../_shared/errors.ts';
import type { AuthContext } from '../_shared/auth.ts';

// Numero padrao de meses e limite maximo
const DEFAULT_MONTHS = 12;
const MAX_MONTHS = 24;

// GET /dashboard/revenue?months=12
// Chama a RPC get_revenue_by_month(p_tenant_id, p_months).
// Retorna serie temporal de faturamento para grafico de area.
// Campos por item: month (YYYY-MM), job_count, revenue, cost, profit
// Ordenado por month ASC.
export async function getRevenueChart(
  req: Request,
  auth: AuthContext,
): Promise<Response> {
  const url = new URL(req.url);

  // Validar e parsear months
  const monthsParam = url.searchParams.get('months');
  let months = DEFAULT_MONTHS;
  if (monthsParam !== null) {
    const parsed = parseInt(monthsParam, 10);
    if (isNaN(parsed) || parsed < 1 || parsed > MAX_MONTHS) {
      throw new AppError(
        'VALIDATION_ERROR',
        `Parametro months deve ser um inteiro entre 1 e ${MAX_MONTHS}`,
        400,
      );
    }
    months = parsed;
  }

  console.log('[dashboard/revenue-chart] tenant:', auth.tenantId, 'months:', months);

  const supabase = getSupabaseClient(auth.token);

  const { data, error } = await supabase.rpc('get_revenue_by_month', {
    p_tenant_id: auth.tenantId,
    p_months: months,
  });

  if (error) {
    console.error('[dashboard/revenue-chart] erro RPC:', error.message);
    throw new AppError('INTERNAL_ERROR', error.message, 500);
  }

  return success(data ?? []);
}
