import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { handleCors } from './_shared/cors.ts';
import { getAuthContext } from './_shared/auth.ts';
import { error, fromAppError } from './_shared/response.ts';
import { AppError } from './_shared/errors.ts';
import { handleAnalyze } from './handlers/analyze.ts';
import { handleHistory } from './handlers/history.ts';

// Roteamento:
// POST /ai-dailies-analysis/analyze         -> Analisa dados de diarias (Claude Haiku)
// GET  /ai-dailies-analysis/history?job_id=X -> Lista analises anteriores de um job

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
    const fnIndex = pathSegments.findIndex((s) => s === 'ai-dailies-analysis');

    const segment1 =
      fnIndex >= 0 && pathSegments.length > fnIndex + 1
        ? pathSegments[fnIndex + 1]
        : null;

    const method = req.method;

    // POST /analyze
    if (method === 'POST' && segment1 === 'analyze') {
      return await handleAnalyze(req, auth);
    }

    // GET /history
    if (method === 'GET' && segment1 === 'history') {
      return await handleHistory(req, auth);
    }

    return error('NOT_FOUND', 'Rota nao encontrada', 404);
  } catch (err) {
    if (err instanceof AppError) return fromAppError(err);
    console.error('Erro nao tratado em ai-dailies-analysis:', err);
    return error('INTERNAL_ERROR', 'Erro interno do servidor', 500);
  }
});
