import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { handleCors, getCorsHeaders } from '../_shared/cors.ts';
import { getAuthContext } from '../_shared/auth.ts';
import { error } from '../_shared/response.ts';
import { listHandler } from './handlers/list.ts';
import { getHandler } from './handlers/get.ts';
import { createHandler } from './handlers/create.ts';
import { updateHandler } from './handlers/update.ts';
import { deleteHandler } from './handlers/delete.ts';
import { previewHandler } from './handlers/preview.ts';

// ========================================================
// claquete-generator — CRUD + geracao de PDF/PNG de claquetes ANCINE
// Endpoints:
//   GET    /claquete-generator/list?job_id=xxx      — Lista claquetes do job
//   GET    /claquete-generator/:id                   — Detalhe de uma claquete
//   POST   /claquete-generator                       — Cria claquete (+ gera PDF/PNG)
//   PATCH  /claquete-generator/:id                   — Atualiza claquete
//   DELETE /claquete-generator/:id                   — Soft delete
//   GET    /claquete-generator/preview/:id           — Preview HTML da claquete
// ========================================================

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const url = new URL(req.url);
  const pathParts = url.pathname.split('/').filter(Boolean);
  // pathParts: ['claquete-generator', ...rest]
  const action = pathParts[1] ?? '';

  try {
    const auth = await getAuthContext(req);

    // GET /claquete-generator/list?job_id=xxx
    if (req.method === 'GET' && action === 'list') {
      return await listHandler(req, auth);
    }

    // GET /claquete-generator/preview/:id
    if (req.method === 'GET' && action === 'preview') {
      const claqueteId = pathParts[2] ?? null;
      return await previewHandler(req, auth, claqueteId);
    }

    // GET /claquete-generator/:id
    if (req.method === 'GET' && action && action !== 'list' && action !== 'preview') {
      return await getHandler(req, auth, action);
    }

    // POST /claquete-generator
    if (req.method === 'POST' && !action) {
      return await createHandler(req, auth);
    }

    // PATCH /claquete-generator/:id
    if (req.method === 'PATCH' && action) {
      return await updateHandler(req, auth, action);
    }

    // DELETE /claquete-generator/:id
    if (req.method === 'DELETE' && action) {
      return await deleteHandler(req, auth, action);
    }

    return error('NOT_FOUND', `Rota nao encontrada: ${req.method} /${action}`, 404, undefined, req);
  } catch (err) {
    if (err && typeof err === 'object' && 'statusCode' in err) {
      const appErr = err as { code: string; message: string; statusCode: number };
      return new Response(
        JSON.stringify({ error: { code: appErr.code, message: appErr.message } }),
        { status: appErr.statusCode, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } },
      );
    }
    console.error('[claquete-generator] erro inesperado:', err);
    return error('INTERNAL_ERROR', 'Erro interno no claquete-generator', 500, undefined, req);
  }
});
