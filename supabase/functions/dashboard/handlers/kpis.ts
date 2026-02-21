import { getSupabaseClient } from '../_shared/supabase-client.ts';
import { success } from '../_shared/response.ts';
import { AppError } from '../_shared/errors.ts';
import type { AuthContext } from '../_shared/auth.ts';

// GET /dashboard/kpis
// Chama a RPC get_dashboard_kpis(p_tenant_id) e retorna os KPIs agregados do tenant.
// Campos retornados:
//   active_jobs, total_jobs_month, total_revenue, revenue_month,
//   avg_margin, avg_health_score, pending_approvals, overdue_deliverables, team_allocated
export async function getKpis(
  _req: Request,
  auth: AuthContext,
): Promise<Response> {
  console.log('[dashboard/kpis] tenant:', auth.tenantId);

  const supabase = getSupabaseClient(auth.token);

  const { data, error } = await supabase.rpc('get_dashboard_kpis');

  if (error) {
    console.error('[dashboard/kpis] erro RPC:', error.message);
    throw new AppError('INTERNAL_ERROR', error.message, 500);
  }

  return success(data ?? {});
}
