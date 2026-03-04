import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { handleCors } from '../_shared/cors.ts';
import { getAuthContext } from '../_shared/auth.ts';
import { error, fromAppError } from '../_shared/response.ts';
import { AppError } from '../_shared/errors.ts';
import { handleList } from './handlers/list.ts';
import { handleCreate } from './handlers/create.ts';
import { handleUpdate } from './handlers/update.ts';
import { handleDelete } from './handlers/delete.ts';
import { handleReorder } from './handlers/reorder.ts';

// Rotas nomeadas que nao devem ser interpretadas como :id
const NAMED_ROUTES = new Set(['reorder']);

Deno.serve(async (req: Request) => {
  // CORS pre-flight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    // Autenticacao JWT
    const auth = await getAuthContext(req);

    const url = new URL(req.url);
    const method = req.method;

    // Parsear URL para roteamento
    // Formato esperado: /functions/v1/storyboard[/segment1]
    const pathSegments = url.pathname.split('/').filter(Boolean);
    const fnIndex = pathSegments.findIndex((s) => s === 'storyboard');
    const segment1 =
      fnIndex >= 0 && pathSegments.length > fnIndex + 1
        ? pathSegments[fnIndex + 1]
        : null;

    console.log('[storyboard/index] request recebido', {
      method,
      segment1,
      userId: auth.userId,
      tenantId: auth.tenantId,
    });

    // POST /storyboard/reorder — reordenar cenas em lote
    if (segment1 === 'reorder' && method === 'POST') {
      return await handleReorder(req, auth);
    }

    // GET /storyboard?job_id=X — listar cenas de um job
    if (!segment1 && method === 'GET') {
      return await handleList(req, auth);
    }

    // POST /storyboard — criar cena
    if (!segment1 && method === 'POST') {
      return await handleCreate(req, auth);
    }

    // Rotas por :id (apenas quando nao e rota nomeada)
    if (segment1 && !NAMED_ROUTES.has(segment1)) {
      // PATCH /storyboard/:id — atualizar cena
      if (method === 'PATCH') {
        return await handleUpdate(req, auth, segment1);
      }

      // DELETE /storyboard/:id — deletar cena
      if (method === 'DELETE') {
        return await handleDelete(req, auth, segment1);
      }
    }

    return error('METHOD_NOT_ALLOWED', 'Metodo ou rota nao permitido', 405, undefined, req);
  } catch (err) {
    if (err instanceof AppError) return fromAppError(err, req);
    console.error('[storyboard] erro nao tratado:', err);
    return error('INTERNAL_ERROR', 'Erro interno do servidor', 500, undefined, req);
  }
});
