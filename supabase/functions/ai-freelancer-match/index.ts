import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { handleCors } from './_shared/cors.ts';
import { getAuthContext } from './_shared/auth.ts';
import { error, fromAppError } from './_shared/response.ts';
import { AppError } from './_shared/errors.ts';
import { handleSuggest } from './handlers/suggest.ts';

// Roteamento:
// POST /ai-freelancer-match/suggest -> Sugere freelancers para um job (Claude Sonnet)

Deno.serve(async (req: Request) => {
  // CORS pre-flight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    // Todos os endpoints sao autenticados
    const auth = await getAuthContext(req);

    // Parsear URL para roteamento
    const url = new URL(req.url);
    const pathSegments = url.pathname.split('/').filter(Boolean);
    const fnIndex = pathSegments.findIndex((s) => s === 'ai-freelancer-match');

    const segment1 =
      fnIndex >= 0 && pathSegments.length > fnIndex + 1
        ? pathSegments[fnIndex + 1]
        : null;

    const method = req.method;

    // POST /suggest
    if (method === 'POST' && segment1 === 'suggest') {
      return await handleSuggest(req, auth);
    }

    return error('NOT_FOUND', 'Rota nao encontrada', 404);
  } catch (err) {
    if (err instanceof AppError) return fromAppError(err);
    console.error('Erro nao tratado em ai-freelancer-match:', err);
    return error('INTERNAL_ERROR', 'Erro interno do servidor', 500);
  }
});
