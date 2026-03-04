import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { handleCors } from '../_shared/cors.ts';
import { getAuthContext } from '../_shared/auth.ts';
import { error, fromAppError } from '../_shared/response.ts';
import { AppError } from '../_shared/errors.ts';
import { handleList } from './handlers/list.ts';
import { handleCreate } from './handlers/create.ts';
import { handleUpdate } from './handlers/update.ts';
import { handleDelete } from './handlers/delete.ts';
import { handleAutoFill } from './handlers/auto-fill.ts';
import { handlePreview } from './handlers/preview.ts';
import { handleShare } from './handlers/share.ts';

// Rotas nomeadas que nao devem ser interpretadas como :id
const NAMED_ROUTES = new Set(['auto-fill', 'preview', 'share']);

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
    // Formato esperado: /functions/v1/shooting-day-order[/segment1[/segment2]]
    const pathSegments = url.pathname.split('/').filter(Boolean);
    const fnIndex = pathSegments.findIndex((s) => s === 'shooting-day-order');
    const segment1 =
      fnIndex >= 0 && pathSegments.length > fnIndex + 1
        ? pathSegments[fnIndex + 1]
        : null;
    const segment2 =
      fnIndex >= 0 && pathSegments.length > fnIndex + 2
        ? pathSegments[fnIndex + 2]
        : null;

    console.log('[shooting-day-order/index] request recebido', {
      method,
      segment1,
      segment2,
      userId: auth.userId,
      tenantId: auth.tenantId,
    });

    // GET /shooting-day-order?job_id=X — listar ordens do dia de um job
    if (!segment1 && method === 'GET') {
      return await handleList(req, auth);
    }

    // POST /shooting-day-order — criar ordem do dia
    if (!segment1 && method === 'POST') {
      return await handleCreate(req, auth);
    }

    // Rotas por :id (apenas quando nao e rota nomeada)
    if (segment1 && !NAMED_ROUTES.has(segment1)) {
      // PATCH /shooting-day-order/:id — atualizar ordem do dia
      if (method === 'PATCH' && !segment2) {
        return await handleUpdate(req, auth, segment1);
      }

      // DELETE /shooting-day-order/:id — deletar ordem do dia
      if (method === 'DELETE' && !segment2) {
        return await handleDelete(req, auth, segment1);
      }

      // POST /shooting-day-order/:id/auto-fill
      if (segment2 === 'auto-fill' && method === 'POST') {
        return await handleAutoFill(req, auth, segment1);
      }

      // GET /shooting-day-order/:id/preview
      if (segment2 === 'preview' && method === 'GET') {
        return await handlePreview(req, auth, segment1);
      }

      // POST /shooting-day-order/:id/share
      if (segment2 === 'share' && method === 'POST') {
        return await handleShare(req, auth, segment1);
      }
    }

    return error('METHOD_NOT_ALLOWED', 'Metodo ou rota nao permitido', 405, undefined, req);
  } catch (err) {
    if (err instanceof AppError) return fromAppError(err, req);
    console.error('[shooting-day-order] erro nao tratado:', err);
    return error('INTERNAL_ERROR', 'Erro interno do servidor', 500, undefined, req);
  }
});
