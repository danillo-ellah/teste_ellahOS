import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { handleCors } from '../_shared/cors.ts';
import { getAuthContext } from '../_shared/auth.ts';
import { error, fromAppError } from '../_shared/response.ts';
import { AppError } from '../_shared/errors.ts';

import { handleCommunicationsList } from './handlers/communications-list.ts';
import { handleCommunicationsCreate } from './handlers/communications-create.ts';
import { handleCommunicationsUpdate } from './handlers/communications-update.ts';
import { handleCommunicationsDelete } from './handlers/communications-delete.ts';
import { handleScopeItemsList } from './handlers/scope-items-list.ts';
import { handleScopeItemsCreate } from './handlers/scope-items-create.ts';
import { handleScopeItemsDecide } from './handlers/scope-items-decide.ts';
import { handleLogisticsList } from './handlers/logistics-list.ts';
import { handleLogisticsCreate } from './handlers/logistics-create.ts';
import { handleLogisticsUpdate } from './handlers/logistics-update.ts';
import { handleInternalApprovalGet } from './handlers/internal-approval-get.ts';
import { handleInternalApprovalUpsert } from './handlers/internal-approval-upsert.ts';
import { handleInternalApprovalApprove } from './handlers/internal-approval-approve.ts';
import { handleMilestonesList } from './handlers/milestones-list.ts';
import { handleMilestonesCreate } from './handlers/milestones-create.ts';
import { handleMilestonesUpdate } from './handlers/milestones-update.ts';
import { handleDashboardCounts } from './handlers/dashboard-counts.ts';
import { handlePendingExtras } from './handlers/pending-extras.ts';

// Rotas nomeadas — verificadas antes de interpretar segment1 como :id
const NAMED_ROUTES = new Set([
  'communications',
  'scope-items',
  'logistics',
  'internal-approval',
  'milestones',
  'dashboard-counts',
  'pending-extras',
]);

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const auth = await getAuthContext(req);
    const url = new URL(req.url);
    const method = req.method;

    // Extrair segmentos do path apos /attendance
    const pathSegments = url.pathname.split('/').filter(Boolean);
    const fnIndex = pathSegments.findIndex((s) => s === 'attendance');
    const segment1 = fnIndex >= 0 && pathSegments.length > fnIndex + 1
      ? pathSegments[fnIndex + 1]
      : null;
    const segment2 = fnIndex >= 0 && pathSegments.length > fnIndex + 2
      ? pathSegments[fnIndex + 2]
      : null;
    const segment3 = fnIndex >= 0 && pathSegments.length > fnIndex + 3
      ? pathSegments[fnIndex + 3]
      : null;

    // -------------------------------------------------------
    // GET /attendance/dashboard-counts
    // -------------------------------------------------------
    if (segment1 === 'dashboard-counts' && !segment2 && method === 'GET') {
      return await handleDashboardCounts(req, auth);
    }

    // -------------------------------------------------------
    // GET /attendance/pending-extras
    // -------------------------------------------------------
    if (segment1 === 'pending-extras' && !segment2 && method === 'GET') {
      return await handlePendingExtras(req, auth);
    }

    // -------------------------------------------------------
    // /attendance/communications
    // -------------------------------------------------------
    if (segment1 === 'communications') {
      // GET /attendance/communications
      if (!segment2 && method === 'GET') {
        return await handleCommunicationsList(req, auth);
      }
      // POST /attendance/communications
      if (!segment2 && method === 'POST') {
        return await handleCommunicationsCreate(req, auth);
      }
      // PATCH /attendance/communications/:id
      if (segment2 && !segment3 && method === 'PATCH') {
        return await handleCommunicationsUpdate(req, auth, segment2);
      }
      // DELETE /attendance/communications/:id
      if (segment2 && !segment3 && method === 'DELETE') {
        return await handleCommunicationsDelete(req, auth, segment2);
      }
    }

    // -------------------------------------------------------
    // /attendance/scope-items
    // -------------------------------------------------------
    if (segment1 === 'scope-items') {
      // GET /attendance/scope-items
      if (!segment2 && method === 'GET') {
        return await handleScopeItemsList(req, auth);
      }
      // POST /attendance/scope-items
      if (!segment2 && method === 'POST') {
        return await handleScopeItemsCreate(req, auth);
      }
      // PATCH /attendance/scope-items/:id/decide
      if (segment2 && segment3 === 'decide' && method === 'PATCH') {
        return await handleScopeItemsDecide(req, auth, segment2);
      }
    }

    // -------------------------------------------------------
    // /attendance/logistics
    // -------------------------------------------------------
    if (segment1 === 'logistics') {
      // GET /attendance/logistics
      if (!segment2 && method === 'GET') {
        return await handleLogisticsList(req, auth);
      }
      // POST /attendance/logistics
      if (!segment2 && method === 'POST') {
        return await handleLogisticsCreate(req, auth);
      }
      // PATCH /attendance/logistics/:id
      if (segment2 && !segment3 && method === 'PATCH') {
        return await handleLogisticsUpdate(req, auth, segment2);
      }
    }

    // -------------------------------------------------------
    // /attendance/internal-approval
    // -------------------------------------------------------
    if (segment1 === 'internal-approval') {
      // GET /attendance/internal-approval
      if (!segment2 && method === 'GET') {
        return await handleInternalApprovalGet(req, auth);
      }
      // PUT /attendance/internal-approval
      if (!segment2 && method === 'PUT') {
        return await handleInternalApprovalUpsert(req, auth);
      }
      // POST /attendance/internal-approval/:id/approve
      if (segment2 && segment3 === 'approve' && method === 'POST') {
        return await handleInternalApprovalApprove(req, auth, segment2);
      }
    }

    // -------------------------------------------------------
    // /attendance/milestones
    // -------------------------------------------------------
    if (segment1 === 'milestones') {
      // GET /attendance/milestones
      if (!segment2 && method === 'GET') {
        return await handleMilestonesList(req, auth);
      }
      // POST /attendance/milestones
      if (!segment2 && method === 'POST') {
        return await handleMilestonesCreate(req, auth);
      }
      // PATCH /attendance/milestones/:id
      if (segment2 && !segment3 && method === 'PATCH') {
        return await handleMilestonesUpdate(req, auth, segment2);
      }
    }

    return error('METHOD_NOT_ALLOWED', 'Metodo ou rota nao permitido', 405, undefined, req);
  } catch (err) {
    if (err instanceof AppError) return fromAppError(err, req);
    console.error('[attendance] erro nao tratado:', err);
    return error('INTERNAL_ERROR', 'Erro interno do servidor', 500, undefined, req);
  }
});
