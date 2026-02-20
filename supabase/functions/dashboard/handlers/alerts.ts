import { getSupabaseClient } from '../_shared/supabase-client.ts';
import { success } from '../_shared/response.ts';
import { AppError } from '../_shared/errors.ts';
import type { AuthContext } from '../_shared/auth.ts';

// Limite padrao de alertas retornados
const DEFAULT_LIMIT = 20;

// GET /dashboard/alerts?limit=20
// Chama a RPC get_alerts(p_tenant_id, p_limit) e retorna alertas urgentes.
// Tipos de alerta:
//   margin_alert       — jobs com margem < 15%
//   overdue_deliverable — entregaveis com due_date < now() e status != aprovado/entregue
//   low_health_score   — jobs com health_score < 50
//   approval_expiring  — approval_requests pendentes com expiracao em < 7 dias
// Ordenado por alert_date ASC (mais urgente primeiro).
export async function getAlerts(
  req: Request,
  auth: AuthContext,
): Promise<Response> {
  const url = new URL(req.url);

  // Validar e parsear query param limit
  const limitParam = url.searchParams.get('limit');
  let limit = DEFAULT_LIMIT;
  if (limitParam !== null) {
    const parsed = parseInt(limitParam, 10);
    if (isNaN(parsed) || parsed < 1 || parsed > 100) {
      throw new AppError(
        'VALIDATION_ERROR',
        'Parametro limit deve ser um inteiro entre 1 e 100',
        400,
      );
    }
    limit = parsed;
  }

  console.log('[dashboard/alerts] tenant:', auth.tenantId, 'limit:', limit);

  const supabase = getSupabaseClient(auth.token);

  const { data, error } = await supabase.rpc('get_alerts', {
    p_tenant_id: auth.tenantId,
    p_limit: limit,
  });

  if (error) {
    console.error('[dashboard/alerts] erro RPC:', error.message);
    throw new AppError('INTERNAL_ERROR', error.message, 500);
  }

  return success(data ?? []);
}
