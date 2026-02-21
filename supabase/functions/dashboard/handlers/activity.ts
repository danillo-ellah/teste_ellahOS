import { getSupabaseClient } from '../_shared/supabase-client.ts';
import { success } from '../_shared/response.ts';
import { AppError } from '../_shared/errors.ts';
import type { AuthContext } from '../_shared/auth.ts';

// Defaults dos parametros de atividade
const DEFAULT_HOURS = 48;
const DEFAULT_LIMIT = 30;

// GET /dashboard/activity?hours=48&limit=30
// Chama a RPC get_recent_activity(p_tenant_id, p_hours, p_limit).
// Retorna eventos de job_history das ultimas N horas, join com profiles e jobs.
// Campos por item: id, event_type, description, created_at, user_id, user_name,
//                  job_id, job_code, job_title
// Ordenado por created_at DESC.
export async function getActivity(
  req: Request,
  auth: AuthContext,
): Promise<Response> {
  const url = new URL(req.url);

  // Validar e parsear hours
  const hoursParam = url.searchParams.get('hours');
  let hours = DEFAULT_HOURS;
  if (hoursParam !== null) {
    const parsed = parseInt(hoursParam, 10);
    if (isNaN(parsed) || parsed < 1 || parsed > 720) {
      throw new AppError(
        'VALIDATION_ERROR',
        'Parametro hours deve ser um inteiro entre 1 e 720',
        400,
      );
    }
    hours = parsed;
  }

  // Validar e parsear limit
  const limitParam = url.searchParams.get('limit');
  let limit = DEFAULT_LIMIT;
  if (limitParam !== null) {
    const parsed = parseInt(limitParam, 10);
    if (isNaN(parsed) || parsed < 1 || parsed > 200) {
      throw new AppError(
        'VALIDATION_ERROR',
        'Parametro limit deve ser um inteiro entre 1 e 200',
        400,
      );
    }
    limit = parsed;
  }

  console.log('[dashboard/activity] tenant:', auth.tenantId, 'hours:', hours, 'limit:', limit);

  const supabase = getSupabaseClient(auth.token);

  const { data, error } = await supabase.rpc('get_recent_activity', {
    p_hours: hours,
    p_limit: limit,
  });

  if (error) {
    console.error('[dashboard/activity] erro RPC:', error.message);
    throw new AppError('INTERNAL_ERROR', error.message, 500);
  }

  return success(data ?? []);
}
