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
import { handleBulkCreate } from './handlers/bulk-create.ts';
import { handleExportData } from './handlers/export-data.ts';

// Rotas nomeadas que nao devem ser interpretadas como :phaseId
const NAMED_SEGMENT2_ROUTES = new Set(['reorder', 'bulk', 'export']);

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
    // Formato esperado: /functions/v1/job-timeline/:jobId/phases[/:phaseId | /reorder | /bulk | /export]
    const pathSegments = url.pathname.split('/').filter(Boolean);
    const fnIndex = pathSegments.findIndex((s) => s === 'job-timeline');

    // segment1 = :jobId
    const segment1 =
      fnIndex >= 0 && pathSegments.length > fnIndex + 1
        ? pathSegments[fnIndex + 1]
        : null;

    // segment2 = "phases"
    const segment2 =
      fnIndex >= 0 && pathSegments.length > fnIndex + 2
        ? pathSegments[fnIndex + 2]
        : null;

    // segment3 = :phaseId | "reorder" | "bulk" | "export"
    const segment3 =
      fnIndex >= 0 && pathSegments.length > fnIndex + 3
        ? pathSegments[fnIndex + 3]
        : null;

    console.log('[job-timeline/index] request recebido', {
      method,
      segment1,
      segment2,
      segment3,
      userId: auth.userId,
      tenantId: auth.tenantId,
    });

    // Todas as rotas exigem :jobId e o segmento "phases"
    if (!segment1 || segment2 !== 'phases') {
      return error('METHOD_NOT_ALLOWED', 'Rota invalida. Use /:jobId/phases', 404, undefined, req);
    }

    const jobId = segment1;

    // GET /:jobId/phases — listar fases
    if (!segment3 && method === 'GET') {
      return await handleList(req, auth, jobId);
    }

    // POST /:jobId/phases — criar fase individual
    if (!segment3 && method === 'POST') {
      return await handleCreate(req, auth, jobId);
    }

    // Rotas nomeadas (nao sao :phaseId)
    if (segment3 && NAMED_SEGMENT2_ROUTES.has(segment3)) {
      // PUT /:jobId/phases/reorder — reordenar fases
      if (segment3 === 'reorder' && method === 'PUT') {
        return await handleReorder(req, auth, jobId);
      }

      // POST /:jobId/phases/bulk — criar fases default em lote
      if (segment3 === 'bulk' && method === 'POST') {
        return await handleBulkCreate(req, auth, jobId);
      }

      // GET /:jobId/phases/export — exportar dados para PDF
      if (segment3 === 'export' && method === 'GET') {
        return await handleExportData(req, auth, jobId);
      }
    }

    // Rotas por :phaseId
    if (segment3 && !NAMED_SEGMENT2_ROUTES.has(segment3)) {
      const phaseId = segment3;

      // PATCH /:jobId/phases/:phaseId — atualizar fase
      if (method === 'PATCH') {
        return await handleUpdate(req, auth, jobId, phaseId);
      }

      // DELETE /:jobId/phases/:phaseId — soft delete de fase
      if (method === 'DELETE') {
        return await handleDelete(req, auth, jobId, phaseId);
      }
    }

    return error('METHOD_NOT_ALLOWED', 'Metodo ou rota nao permitido', 405, undefined, req);
  } catch (err) {
    if (err instanceof AppError) return fromAppError(err, req);
    console.error('[job-timeline] erro nao tratado:', err);
    return error('INTERNAL_ERROR', 'Erro interno do servidor', 500, undefined, req);
  }
});
