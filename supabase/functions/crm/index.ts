import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { handleCors } from '../_shared/cors.ts';
import { getAuthContext } from '../_shared/auth.ts';
import { error, fromAppError } from '../_shared/response.ts';
import { AppError } from '../_shared/errors.ts';

import { handleGetPipeline } from './handlers/get-pipeline.ts';
import { handleListOpportunities } from './handlers/list-opportunities.ts';
import { handleGetOpportunity } from './handlers/get-opportunity.ts';
import { handleCreateOpportunity } from './handlers/create-opportunity.ts';
import { handleUpdateOpportunity } from './handlers/update-opportunity.ts';
import { handleAddProposal } from './handlers/add-proposal.ts';
import { handleListActivities } from './handlers/list-activities.ts';
import { handleAddActivity } from './handlers/add-activity.ts';
import { handleGetStats } from './handlers/get-stats.ts';
import { handleConvertToJob } from './handlers/convert-to-job.ts';

// Rotas nomeadas que devem ser verificadas antes de interpretar segment1 como :id
const NAMED_ROUTES_SEGMENT1 = new Set([
  'pipeline',
  'opportunities',
  'stats',
]);

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const auth = await getAuthContext(req);
    const url = new URL(req.url);
    const method = req.method;

    // Extrair segmentos do path apos /crm
    // Ex: /crm/pipeline -> ['pipeline']
    // Ex: /crm/opportunities -> ['opportunities']
    // Ex: /crm/opportunities/uuid -> ['opportunities', 'uuid']
    // Ex: /crm/opportunities/uuid/proposals -> ['opportunities', 'uuid', 'proposals']
    const pathSegments = url.pathname.split('/').filter(Boolean);
    const fnIndex = pathSegments.findIndex((s) => s === 'crm');
    const segment1 = fnIndex >= 0 && pathSegments.length > fnIndex + 1
      ? pathSegments[fnIndex + 1]
      : null;
    const segment2 = fnIndex >= 0 && pathSegments.length > fnIndex + 2
      ? pathSegments[fnIndex + 2]
      : null;
    const segment3 = fnIndex >= 0 && pathSegments.length > fnIndex + 3
      ? pathSegments[fnIndex + 3]
      : null;

    // GET /crm/pipeline
    if (segment1 === 'pipeline' && !segment2 && method === 'GET') {
      return await handleGetPipeline(req, auth);
    }

    // GET /crm/stats
    if (segment1 === 'stats' && !segment2 && method === 'GET') {
      return await handleGetStats(req, auth);
    }

    // GET /crm/opportunities
    if (segment1 === 'opportunities' && !segment2 && method === 'GET') {
      return await handleListOpportunities(req, auth);
    }

    // POST /crm/opportunities
    if (segment1 === 'opportunities' && !segment2 && method === 'POST') {
      return await handleCreateOpportunity(req, auth);
    }

    // Rotas com /crm/opportunities/:id/*
    if (segment1 === 'opportunities' && segment2) {
      const id = segment2;

      // GET /crm/opportunities/:id
      if (!segment3 && method === 'GET') {
        return await handleGetOpportunity(req, auth, id);
      }

      // PATCH /crm/opportunities/:id
      if (!segment3 && method === 'PATCH') {
        return await handleUpdateOpportunity(req, auth, id);
      }

      // POST /crm/opportunities/:id/proposals
      if (segment3 === 'proposals' && method === 'POST') {
        return await handleAddProposal(req, auth, id);
      }

      // GET /crm/opportunities/:id/activities
      if (segment3 === 'activities' && method === 'GET') {
        return await handleListActivities(req, auth, id);
      }

      // POST /crm/opportunities/:id/activities
      if (segment3 === 'activities' && method === 'POST') {
        return await handleAddActivity(req, auth, id);
      }

      // POST /crm/opportunities/:id/convert-to-job
      if (segment3 === 'convert-to-job' && method === 'POST') {
        return await handleConvertToJob(req, auth, id);
      }
    }

    return error('METHOD_NOT_ALLOWED', 'Metodo ou rota nao permitido', 405, undefined, req);
  } catch (err) {
    if (err instanceof AppError) return fromAppError(err, req);
    console.error('[crm] erro nao tratado:', err);
    return error('INTERNAL_ERROR', 'Erro interno do servidor', 500, undefined, req);
  }
});
