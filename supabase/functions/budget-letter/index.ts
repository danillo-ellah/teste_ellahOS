import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { handleCors, getCorsHeaders } from '../_shared/cors.ts';
import { getAuthContext } from '../_shared/auth.ts';
import { error, fromAppError } from '../_shared/response.ts';
import { AppError } from '../_shared/errors.ts';
import { generateHandler } from './handlers/generate.ts';
import { listHandler } from './handlers/list.ts';
import { updateHandler } from './handlers/update.ts';
import { exportPdfHandler } from './handlers/export-pdf.ts';

// ========================================================
// budget-letter — Geracao de Carta Orcamento com IA (Groq)
//
// Endpoints:
//   GET  /budget-letter?job_id=X      — Lista versoes de carta orcamento do job
//   POST /budget-letter/generate      — Gera carta orcamento via Groq (Llama 3.3 70B)
//   PATCH /budget-letter/:id          — Atualiza conteudo (edicao manual pos-IA)
//   POST /budget-letter/:id/export    — Exporta markdown como HTML para impressao/PDF
// ========================================================

Deno.serve(async (req: Request) => {
  // CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const url = new URL(req.url);
  const pathParts = url.pathname.split('/').filter(Boolean);
  // pathParts[0] = 'budget-letter' | pathParts[1] = acao ou :id | pathParts[2] = 'export'
  const fnIndex = pathParts.findIndex((s) => s === 'budget-letter');
  const segment1 = fnIndex >= 0 && pathParts.length > fnIndex + 1
    ? pathParts[fnIndex + 1]
    : null;
  const segment2 = fnIndex >= 0 && pathParts.length > fnIndex + 2
    ? pathParts[fnIndex + 2]
    : null;

  const method = req.method;

  try {
    // Autenticacao JWT (todos os endpoints requerem autenticacao)
    const auth = await getAuthContext(req);

    // GET /budget-letter?job_id=X — lista versoes
    if (method === 'GET' && !segment1) {
      return await listHandler(req, auth);
    }

    // POST /budget-letter/generate — gera carta orcamento via IA
    if (method === 'POST' && segment1 === 'generate' && !segment2) {
      return await generateHandler(req, auth);
    }

    // POST /budget-letter/:id/export — exporta HTML para impressao
    if (method === 'POST' && segment1 && segment2 === 'export') {
      return await exportPdfHandler(req, auth, segment1);
    }

    // PATCH /budget-letter/:id — atualiza conteudo da carta (edicao manual)
    if (method === 'PATCH' && segment1 && !segment2) {
      return await updateHandler(req, auth, segment1);
    }

    return error(
      'NOT_FOUND',
      `Rota nao encontrada: ${method} /budget-letter${segment1 ? `/${segment1}` : ''}${segment2 ? `/${segment2}` : ''}`,
      404,
      undefined,
      req,
    );
  } catch (err) {
    if (err instanceof AppError) return fromAppError(err, req);

    console.error('[budget-letter] erro inesperado:', err);
    return new Response(
      JSON.stringify({ error: { code: 'INTERNAL_ERROR', message: 'Erro interno no budget-letter' } }),
      {
        status: 500,
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      },
    );
  }
});
