import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { handleCors } from '../_shared/cors.ts';
import { getAuthContext } from '../_shared/auth.ts';
import { error, fromAppError } from '../_shared/response.ts';
import { AppError } from '../_shared/errors.ts';

import { handleGenerate } from './handlers/generate.ts';

// ========================================================
// call-sheet — Gerador de ordem do dia (Call Sheet)
// Rotas:
//   POST /call-sheet/generate   -> gera call sheet estruturado de um job
// ========================================================

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const auth = await getAuthContext(req);
    const url = new URL(req.url);
    const method = req.method;

    // Extrair segmentos do path apos /call-sheet
    const pathSegments = url.pathname.split('/').filter(Boolean);
    const fnIndex = pathSegments.findIndex((s) => s === 'call-sheet');
    const segment1 = fnIndex >= 0 && pathSegments.length > fnIndex + 1
      ? pathSegments[fnIndex + 1]
      : null;

    console.log('[call-sheet/index] request recebido', {
      method,
      segment1,
      userId: auth.userId,
      tenantId: auth.tenantId,
    });

    // POST /call-sheet/generate
    if (segment1 === 'generate' && method === 'POST') {
      return await handleGenerate(req, auth);
    }

    return error('METHOD_NOT_ALLOWED', 'Metodo ou rota nao permitido', 405, undefined, req);
  } catch (err) {
    if (err instanceof AppError) return fromAppError(err, req);
    console.error('[call-sheet] erro nao tratado:', err);
    return error('INTERNAL_ERROR', 'Erro interno do servidor', 500, undefined, req);
  }
});
