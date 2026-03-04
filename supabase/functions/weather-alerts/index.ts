import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { handleCors } from '../_shared/cors.ts';
import { getAuthContext } from '../_shared/auth.ts';
import { error, fromAppError } from '../_shared/response.ts';
import { AppError } from '../_shared/errors.ts';

import { handleCheck } from './handlers/check.ts';

// ========================================================
// weather-alerts — Alertas meteorologicos para datas de filmagem externas
// Rotas:
//   GET /weather-alerts?job_id=X   -> retorna previsao para proximas datas de filmagem
// ========================================================

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const auth = await getAuthContext(req);
    const url = new URL(req.url);
    const method = req.method;

    // Extrair segmentos do path apos /weather-alerts
    const pathSegments = url.pathname.split('/').filter(Boolean);
    const fnIndex = pathSegments.findIndex((s) => s === 'weather-alerts');
    const segment1 = fnIndex >= 0 && pathSegments.length > fnIndex + 1
      ? pathSegments[fnIndex + 1]
      : null;

    console.log('[weather-alerts/index] request recebido', {
      method,
      segment1,
      userId: auth.userId,
      tenantId: auth.tenantId,
    });

    // GET /weather-alerts?job_id=X
    if (!segment1 && method === 'GET') {
      return await handleCheck(req, auth);
    }

    return error('METHOD_NOT_ALLOWED', 'Metodo ou rota nao permitido', 405, undefined, req);
  } catch (err) {
    if (err instanceof AppError) return fromAppError(err, req);
    console.error('[weather-alerts] erro nao tratado:', err);
    return error('INTERNAL_ERROR', 'Erro interno do servidor', 500, undefined, req);
  }
});
