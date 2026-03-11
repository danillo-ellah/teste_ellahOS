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
import { handleGetAgencyHistory } from './handlers/get-agency-history.ts';
import { handleGetAlerts } from './handlers/get-alerts.ts';
import { handleGetDashboard } from './handlers/get-dashboard.ts';
import { handleGetDirectorRanking } from './handlers/get-director-ranking.ts';
import { handleProcessAlerts } from './handlers/process-alerts.ts';
import { handleGenerateReport } from './handlers/generate-report.ts';
import { handleIngestEmail } from './handlers/ingest-email.ts';
import { handleListBudgetVersions } from './handlers/budget/list-versions.ts';
import { handleUpsertBudgetVersion } from './handlers/budget/upsert-version.ts';
import { handleActivateBudgetVersion } from './handlers/budget/activate-version.ts';
import { handleGetLossAnalytics } from './handlers/get-loss-analytics.ts';

// Rotas nomeadas que devem ser verificadas antes de interpretar segment1 como :id
const NAMED_ROUTES_SEGMENT1 = new Set([
  'dashboard',
  'pipeline',
  'opportunities',
  'stats',
  'agency-history',
  'alerts',
  'director-ranking',
  'process-alerts',
  'report',
  'ingest-email',
  'loss-analytics',
]);

// Rotas CRON — autenticadas via x-cron-secret, nao via JWT
const CRON_ROUTES = new Set(['process-alerts', 'ingest-email']);

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const url = new URL(req.url);
    const method = req.method;

    // Extrair segmentos do path apos /crm
    // Ex: /crm/pipeline -> ['pipeline']
    // Ex: /crm/opportunities -> ['opportunities']
    // Ex: /crm/opportunities/uuid -> ['opportunities', 'uuid']
    // Ex: /crm/opportunities/uuid/proposals -> ['opportunities', 'uuid', 'proposals']
    // Ex: /crm/report/monthly -> ['report', 'monthly']
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
    // Segmentos extras para rotas de budget (ate 6 niveis)
    // Ex: /crm/opportunities/:id/budget/versions/:versionId/activate
    const segment4 = fnIndex >= 0 && pathSegments.length > fnIndex + 4
      ? pathSegments[fnIndex + 4]
      : null;
    const segment5 = fnIndex >= 0 && pathSegments.length > fnIndex + 5
      ? pathSegments[fnIndex + 5]
      : null;
    const segment6 = fnIndex >= 0 && pathSegments.length > fnIndex + 6
      ? pathSegments[fnIndex + 6]
      : null;

    // ----------------------------------------------------------------
    // Rotas CRON — autenticadas via x-cron-secret (sem JWT)
    // Devem ser tratadas ANTES de getAuthContext()
    // ----------------------------------------------------------------

    // POST /crm/process-alerts
    if (segment1 === 'process-alerts' && !segment2 && method === 'POST') {
      return await handleProcessAlerts(req);
    }

    // POST /crm/ingest-email
    if (segment1 === 'ingest-email' && !segment2 && method === 'POST') {
      return await handleIngestEmail(req);
    }

    // ----------------------------------------------------------------
    // Rotas autenticadas — requerem JWT valido
    // ----------------------------------------------------------------
    const auth = await getAuthContext(req);

    // GET /crm/loss-analytics
    if (segment1 === 'loss-analytics' && !segment2 && method === 'GET') {
      return await handleGetLossAnalytics(req, auth);
    }

    // GET /crm/dashboard
    if (segment1 === 'dashboard' && !segment2 && method === 'GET') {
      return await handleGetDashboard(req, auth);
    }

    // GET /crm/pipeline
    if (segment1 === 'pipeline' && !segment2 && method === 'GET') {
      return await handleGetPipeline(req, auth);
    }

    // GET /crm/stats
    if (segment1 === 'stats' && !segment2 && method === 'GET') {
      return await handleGetStats(req, auth);
    }

    // GET /crm/alerts
    if (segment1 === 'alerts' && !segment2 && method === 'GET') {
      return await handleGetAlerts(req, auth);
    }

    // GET /crm/director-ranking
    if (segment1 === 'director-ranking' && !segment2 && method === 'GET') {
      return await handleGetDirectorRanking(req, auth);
    }

    // GET /crm/report/monthly
    if (segment1 === 'report' && segment2 === 'monthly' && !segment3 && method === 'GET') {
      return await handleGenerateReport(req, auth);
    }

    // GET /crm/agency-history/:agencyId
    if (segment1 === 'agency-history' && segment2 && !segment3 && method === 'GET') {
      return await handleGetAgencyHistory(req, auth, segment2);
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

      // Rotas de orcamento (budget) — segmentos 4+
      // GET /crm/opportunities/:id/budget/versions
      if (segment3 === 'budget' && segment4 === 'versions' && !segment5 && method === 'GET') {
        return await handleListBudgetVersions(req, auth, id);
      }

      // POST /crm/opportunities/:id/budget/versions
      if (segment3 === 'budget' && segment4 === 'versions' && !segment5 && method === 'POST') {
        return await handleUpsertBudgetVersion(req, auth, id, null);
      }

      // PATCH /crm/opportunities/:id/budget/versions/:versionId
      if (segment3 === 'budget' && segment4 === 'versions' && segment5 && !segment6 && method === 'PATCH') {
        return await handleUpsertBudgetVersion(req, auth, id, segment5);
      }

      // POST /crm/opportunities/:id/budget/versions/:versionId/activate
      if (segment3 === 'budget' && segment4 === 'versions' && segment5 && segment6 === 'activate' && method === 'POST') {
        return await handleActivateBudgetVersion(req, auth, id, segment5);
      }
    }

    return error('METHOD_NOT_ALLOWED', 'Metodo ou rota nao permitido', 405, undefined, req);
  } catch (err) {
    if (err instanceof AppError) return fromAppError(err, req);
    console.error('[crm] erro nao tratado:', err);
    return error('INTERNAL_ERROR', 'Erro interno do servidor', 500, undefined, req);
  }
});
