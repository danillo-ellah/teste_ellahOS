import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { handleCors } from '../_shared/cors.ts';
import { getAuthContext } from '../_shared/auth.ts';
import { error, fromAppError } from '../_shared/response.ts';
import { AppError } from '../_shared/errors.ts';
import { listLocations } from './handlers/list.ts';
import { getLocation } from './handlers/get.ts';
import { createLocation } from './handlers/create.ts';
import { updateLocation } from './handlers/update.ts';
import { deleteLocation } from './handlers/delete.ts';
import {
  listJobLocations,
  linkJobLocation,
  unlinkJobLocation,
  updateJobLocation,
} from './handlers/job-locations.ts';
import { addLocationPhoto, deleteLocationPhoto } from './handlers/photos.ts';

Deno.serve(async (req: Request) => {
  // CORS pre-flight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    // Autenticacao JWT
    const auth = await getAuthContext(req);

    // Parsear URL para roteamento
    const url = new URL(req.url);
    const pathSegments = url.pathname.split('/').filter(Boolean);

    // Encontrar indice do segmento 'locations' na URL
    // Formato esperado: /functions/v1/locations[/segment1[/segment2[/segment3]]]
    const fnIndex = pathSegments.findIndex((s) => s === 'locations');
    const segment1 =
      fnIndex >= 0 && pathSegments.length > fnIndex + 1
        ? pathSegments[fnIndex + 1]
        : null;
    const segment2 =
      fnIndex >= 0 && pathSegments.length > fnIndex + 2
        ? pathSegments[fnIndex + 2]
        : null;
    const segment3 =
      fnIndex >= 0 && pathSegments.length > fnIndex + 3
        ? pathSegments[fnIndex + 3]
        : null;

    const method = req.method;

    console.log('[locations/index] request recebido', {
      method,
      segment1,
      segment2,
      segment3,
      userId: auth.userId,
      tenantId: auth.tenantId,
    });

    // === Rotas estaticas (ANTES do :id para evitar conflito) ===

    // GET /locations/job/:jobId — lista locacoes de um job
    if (method === 'GET' && segment1 === 'job' && segment2) {
      return await listJobLocations(req, auth, segment2);
    }

    // POST /locations/job-link — vincular locacao a job
    if (method === 'POST' && segment1 === 'job-link' && !segment2) {
      return await linkJobLocation(req, auth);
    }

    // DELETE /locations/job-link/:id — desvincular locacao de job
    if (method === 'DELETE' && segment1 === 'job-link' && segment2) {
      return await unlinkJobLocation(req, auth, segment2);
    }

    // PATCH /locations/job-link/:id — atualizar vinculo (datas, notas, custo)
    if (method === 'PATCH' && segment1 === 'job-link' && segment2) {
      return await updateJobLocation(req, auth, segment2);
    }

    // === Rotas de locations base ===

    // GET /locations
    if (method === 'GET' && !segment1) {
      return await listLocations(req, auth);
    }

    // POST /locations
    if (method === 'POST' && !segment1) {
      return await createLocation(req, auth);
    }

    // GET /locations/:id
    if (method === 'GET' && segment1 && !segment2) {
      return await getLocation(req, auth, segment1);
    }

    // PATCH /locations/:id
    if (method === 'PATCH' && segment1 && !segment2) {
      return await updateLocation(req, auth, segment1);
    }

    // DELETE /locations/:id
    if (method === 'DELETE' && segment1 && !segment2) {
      return await deleteLocation(req, auth, segment1);
    }

    // === Sub-recursos de locacao ===

    // POST /locations/:id/photos
    if (method === 'POST' && segment1 && segment2 === 'photos' && !segment3) {
      return await addLocationPhoto(req, auth, segment1);
    }

    // DELETE /locations/:id/photos/:photoId
    if (method === 'DELETE' && segment1 && segment2 === 'photos' && segment3) {
      return await deleteLocationPhoto(req, auth, segment1, segment3);
    }

    return error('METHOD_NOT_ALLOWED', 'Metodo nao permitido', 405, undefined, req);
  } catch (err) {
    if (err instanceof AppError) return fromAppError(err, req);
    console.error('[locations] erro nao tratado:', err);
    return error('INTERNAL_ERROR', 'Erro interno do servidor', 500, undefined, req);
  }
});
