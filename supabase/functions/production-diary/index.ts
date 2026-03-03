import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { handleCors } from '../_shared/cors.ts';
import { getAuthContext } from '../_shared/auth.ts';
import { error, fromAppError } from '../_shared/response.ts';
import { AppError } from '../_shared/errors.ts';

import { handleList } from './handlers/list.ts';
import { handleGet } from './handlers/get.ts';
import { handleCreate } from './handlers/create.ts';
import { handleUpdate } from './handlers/update.ts';
import { handleDelete } from './handlers/delete.ts';
import { handlePhotos } from './handlers/photos.ts';

// Rotas nomeadas que devem ser verificadas antes do :id
const NAMED_ROUTES = new Set(['photos']);

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const auth = await getAuthContext(req);
    const url = new URL(req.url);
    const method = req.method;

    // Extrair segmentos do path apos /production-diary
    const pathSegments = url.pathname.split('/').filter(Boolean);
    const fnIndex = pathSegments.findIndex((s) => s === 'production-diary');
    const segment1 = fnIndex >= 0 && pathSegments.length > fnIndex + 1
      ? pathSegments[fnIndex + 1]
      : null;
    const segment2 = fnIndex >= 0 && pathSegments.length > fnIndex + 2
      ? pathSegments[fnIndex + 2]
      : null;

    // GET /production-diary?job_id=X
    if (!segment1 && method === 'GET') {
      return await handleList(req, auth);
    }

    // POST /production-diary
    if (!segment1 && method === 'POST') {
      return await handleCreate(req, auth);
    }

    // Rotas com :id (segment1 eh UUID, nao uma rota nomeada)
    if (segment1 && !NAMED_ROUTES.has(segment1)) {
      const id = segment1;

      // GET /production-diary/:id
      if (!segment2 && method === 'GET') {
        return await handleGet(req, auth, id);
      }

      // PATCH /production-diary/:id
      if (!segment2 && method === 'PATCH') {
        return await handleUpdate(req, auth, id);
      }

      // DELETE /production-diary/:id
      if (!segment2 && method === 'DELETE') {
        return await handleDelete(req, auth, id);
      }

      // POST /production-diary/:id/photos
      if (segment2 === 'photos' && method === 'POST') {
        return await handlePhotos(req, auth, id);
      }
    }

    return error('METHOD_NOT_ALLOWED', 'Metodo ou rota nao permitido', 405, undefined, req);
  } catch (err) {
    if (err instanceof AppError) return fromAppError(err, req);
    console.error('[production-diary] erro nao tratado:', err);
    return error('INTERNAL_ERROR', 'Erro interno do servidor', 500, undefined, req);
  }
});
