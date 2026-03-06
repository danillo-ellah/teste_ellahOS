import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { handleCors } from '../_shared/cors.ts';
import { getAuthContext } from '../_shared/auth.ts';
import { error, fromAppError } from '../_shared/response.ts';
import { AppError } from '../_shared/errors.ts';

import { handleList } from './handlers/list.ts';
import { handleCreate } from './handlers/create.ts';
import { handleUpdate } from './handlers/update.ts';
import { handleDelete } from './handlers/delete.ts';
import { handleSummary } from './handlers/summary.ts';

// Rotas nomeadas que devem ser verificadas antes do :id
const NAMED_ROUTES = new Set([
  'summary',
]);

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const auth = await getAuthContext(req);
    const url = new URL(req.url);
    const method = req.method;

    // Extrair segmentos do path apos /receivables
    const pathSegments = url.pathname.split('/').filter(Boolean);
    const fnIndex = pathSegments.findIndex((s) => s === 'receivables');
    const segment1 = fnIndex >= 0 && pathSegments.length > fnIndex + 1
      ? pathSegments[fnIndex + 1]
      : null;
    const segment2 = fnIndex >= 0 && pathSegments.length > fnIndex + 2
      ? pathSegments[fnIndex + 2]
      : null;

    // GET /receivables
    if (!segment1 && method === 'GET') {
      return await handleList(req, auth);
    }

    // POST /receivables
    if (!segment1 && method === 'POST') {
      return await handleCreate(req, auth);
    }

    // GET /receivables/summary/:jobId
    if (segment1 === 'summary' && segment2 && method === 'GET') {
      return await handleSummary(req, auth, segment2);
    }

    // Rotas com :id (segment1 eh UUID, nao uma rota nomeada)
    if (segment1 && !NAMED_ROUTES.has(segment1)) {
      const id = segment1;

      // PATCH /receivables/:id
      if (!segment2 && method === 'PATCH') {
        return await handleUpdate(req, auth, id);
      }

      // DELETE /receivables/:id
      if (!segment2 && method === 'DELETE') {
        return await handleDelete(req, auth, id);
      }
    }

    return error('METHOD_NOT_ALLOWED', 'Metodo ou rota nao permitido', 405, undefined, req);
  } catch (err) {
    if (err instanceof AppError) return fromAppError(err, req);
    console.error('[receivables] erro nao tratado:', err);
    return error('INTERNAL_ERROR', 'Erro interno do servidor', 500, undefined, req);
  }
});
