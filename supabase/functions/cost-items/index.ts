import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { handleCors } from '../_shared/cors.ts';
import { getAuthContext } from '../_shared/auth.ts';
import { error, fromAppError } from '../_shared/response.ts';
import { AppError } from '../_shared/errors.ts';

import { handleCreate } from './handlers/create.ts';
import { handleList } from './handlers/list.ts';
import { handleGet } from './handlers/get.ts';
import { handleUpdate } from './handlers/update.ts';
import { handleDelete } from './handlers/delete.ts';
import { handleBatch } from './handlers/batch.ts';
import { handleCopy } from './handlers/copy.ts';
import { handleBudgetSummary } from './handlers/budget-summary.ts';
import { handleBudgetMode } from './handlers/budget-mode.ts';
import { handleApplyTemplate } from './handlers/apply-template.ts';
import { handleReferenceJobs } from './handlers/reference-jobs.ts';
import { handleExport } from './handlers/export.ts';

// Rotas nomeadas que devem ser verificadas antes do :id
const NAMED_ROUTES = new Set([
  'batch',
  'budget-summary',
  'budget-mode',
  'apply-template',
  'reference-jobs',
  'export',
]);

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const auth = await getAuthContext(req);
    const url = new URL(req.url);
    const method = req.method;

    // Extrair segmentos do path apos /cost-items
    const pathSegments = url.pathname.split('/').filter(Boolean);
    const fnIndex = pathSegments.findIndex((s) => s === 'cost-items');
    const segment1 = fnIndex >= 0 && pathSegments.length > fnIndex + 1
      ? pathSegments[fnIndex + 1]
      : null;
    const segment2 = fnIndex >= 0 && pathSegments.length > fnIndex + 2
      ? pathSegments[fnIndex + 2]
      : null;

    // POST /cost-items
    if (!segment1 && method === 'POST') {
      return await handleCreate(req, auth);
    }

    // GET /cost-items
    if (!segment1 && method === 'GET') {
      return await handleList(req, auth);
    }

    // POST /cost-items/batch
    if (segment1 === 'batch' && !segment2 && method === 'POST') {
      return await handleBatch(req, auth);
    }

    // GET /cost-items/budget-summary/:jobId
    if (segment1 === 'budget-summary' && segment2 && method === 'GET') {
      return await handleBudgetSummary(req, auth, segment2);
    }

    // PATCH /cost-items/budget-mode/:jobId
    if (segment1 === 'budget-mode' && segment2 && method === 'PATCH') {
      return await handleBudgetMode(req, auth, segment2);
    }

    // POST /cost-items/apply-template/:jobId
    if (segment1 === 'apply-template' && segment2 && method === 'POST') {
      return await handleApplyTemplate(req, auth, segment2);
    }

    // GET /cost-items/reference-jobs/:jobId
    if (segment1 === 'reference-jobs' && segment2 && method === 'GET') {
      return await handleReferenceJobs(req, auth, segment2);
    }

    // GET /cost-items/export/:jobId
    if (segment1 === 'export' && segment2 && method === 'GET') {
      return await handleExport(req, auth, segment2);
    }

    // Rotas com :id (segment1 eh UUID, nao uma rota nomeada)
    if (segment1 && !NAMED_ROUTES.has(segment1)) {
      const id = segment1;

      // POST /cost-items/:id/copy-to-job
      if (segment2 === 'copy-to-job' && method === 'POST') {
        return await handleCopy(req, auth, id);
      }

      // GET /cost-items/:id
      if (!segment2 && method === 'GET') {
        return await handleGet(req, auth, id);
      }

      // PATCH /cost-items/:id
      if (!segment2 && method === 'PATCH') {
        return await handleUpdate(req, auth, id);
      }

      // DELETE /cost-items/:id
      if (!segment2 && method === 'DELETE') {
        return await handleDelete(req, auth, id);
      }
    }

    return error('METHOD_NOT_ALLOWED', 'Metodo ou rota nao permitido', 405);
  } catch (err) {
    if (err instanceof AppError) return fromAppError(err);
    console.error('[cost-items] erro nao tratado:', err);
    return error('INTERNAL_ERROR', 'Erro interno do servidor', 500);
  }
});
