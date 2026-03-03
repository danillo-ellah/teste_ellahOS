import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { handleCors } from '../_shared/cors.ts';
import { getAuthContext } from '../_shared/auth.ts';
import { error, fromAppError } from '../_shared/response.ts';
import { AppError } from '../_shared/errors.ts';

import { handleList } from './handlers/list.ts';
import { handleCreate } from './handlers/create.ts';
import { handleUpdate } from './handlers/update.ts';
import { handleDelete } from './handlers/delete.ts';

// ========================================================
// wardrobe — CRUD de fichas de figurino/arte por job
// Rotas:
//   GET    /wardrobe?job_id=X              -> lista por job
//   POST   /wardrobe                       -> criar ficha
//   PATCH  /wardrobe/:id                   -> atualizar ficha
//   DELETE /wardrobe/:id                   -> soft delete
// ========================================================

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const auth = await getAuthContext(req);
    const url = new URL(req.url);
    const method = req.method;

    // Extrair segmentos do path apos /wardrobe
    const pathSegments = url.pathname.split('/').filter(Boolean);
    const fnIndex = pathSegments.findIndex((s) => s === 'wardrobe');
    const segment1 = fnIndex >= 0 && pathSegments.length > fnIndex + 1
      ? pathSegments[fnIndex + 1]
      : null;

    // GET /wardrobe?job_id=X
    if (!segment1 && method === 'GET') {
      return await handleList(req, auth);
    }

    // POST /wardrobe
    if (!segment1 && method === 'POST') {
      return await handleCreate(req, auth);
    }

    // Rotas com :id
    if (segment1) {
      const id = segment1;

      // PATCH /wardrobe/:id
      if (method === 'PATCH') {
        return await handleUpdate(req, auth, id);
      }

      // DELETE /wardrobe/:id
      if (method === 'DELETE') {
        return await handleDelete(req, auth, id);
      }
    }

    return error('METHOD_NOT_ALLOWED', 'Metodo ou rota nao permitido', 405, undefined, req);
  } catch (err) {
    if (err instanceof AppError) return fromAppError(err, req);
    console.error('[wardrobe] erro nao tratado:', err);
    return error('INTERNAL_ERROR', 'Erro interno do servidor', 500, undefined, req);
  }
});
