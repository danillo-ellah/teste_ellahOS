import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { handleCors } from '../_shared/cors.ts';
import { getAuthContext } from '../_shared/auth.ts';
import { error, fromAppError } from '../_shared/response.ts';
import { AppError } from '../_shared/errors.ts';
import { getMyWeek } from './handlers/get.ts';

// Roteamento:
// GET /my-week              -> dados consolidados da semana do usuario
// GET /my-week?week_start=  -> semana especifica (default: segunda atual)

Deno.serve(async (req: Request) => {
  // CORS pre-flight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const auth = await getAuthContext(req);

    if (req.method !== 'GET') {
      return error('METHOD_NOT_ALLOWED', 'Metodo nao permitido', 405, undefined, req);
    }

    return await getMyWeek(req, auth);
  } catch (err) {
    if (err instanceof AppError) return fromAppError(err, req);
    console.error('Erro nao tratado em my-week:', err);
    return error('INTERNAL_ERROR', 'Erro interno do servidor', 500, undefined, req);
  }
});
