import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { handleCors } from '../_shared/cors.ts';
import { getAuthContext } from '../_shared/auth.ts';
import { error, fromAppError } from '../_shared/response.ts';
import { AppError } from '../_shared/errors.ts';

import { handleUpdateStage } from './handlers/update-stage.ts';
import { handleUpdateAssignee } from './handlers/update-assignee.ts';
import { handleUpdateBriefing } from './handlers/update-briefing.ts';
import { handleUpdateDriveUrl } from './handlers/update-drive-url.ts';
import { handleListCutVersions } from './handlers/list-cut-versions.ts';
import { handleCreateCutVersion } from './handlers/create-cut-version.ts';
import { handleUpdateCutVersion } from './handlers/update-cut-version.ts';
import { handleDashboard } from './handlers/dashboard.ts';

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const auth = await getAuthContext(req);
    const url = new URL(req.url);
    const method = req.method;

    // Extrair segmentos apos /pos-producao
    const pathSegments = url.pathname.split('/').filter(Boolean);
    const fnIndex = pathSegments.findIndex((s) => s === 'pos-producao');
    const seg1 = fnIndex >= 0 && pathSegments.length > fnIndex + 1
      ? pathSegments[fnIndex + 1] : null;
    const seg2 = fnIndex >= 0 && pathSegments.length > fnIndex + 2
      ? pathSegments[fnIndex + 2] : null;
    const seg3 = fnIndex >= 0 && pathSegments.length > fnIndex + 3
      ? pathSegments[fnIndex + 3] : null;
    const seg4 = fnIndex >= 0 && pathSegments.length > fnIndex + 4
      ? pathSegments[fnIndex + 4] : null;

    // GET /pos-producao/dashboard
    if (seg1 === 'dashboard' && !seg2 && method === 'GET') {
      return await handleDashboard(req, auth);
    }

    // Rotas com :deliverableId (seg1 != 'dashboard')
    if (seg1 && seg1 !== 'dashboard') {
      const deliverableId = seg1;

      // PATCH /pos-producao/:deliverableId/stage
      if (seg2 === 'stage' && !seg3 && method === 'PATCH') {
        return await handleUpdateStage(req, auth, deliverableId);
      }

      // PATCH /pos-producao/:deliverableId/assignee
      if (seg2 === 'assignee' && !seg3 && method === 'PATCH') {
        return await handleUpdateAssignee(req, auth, deliverableId);
      }

      // PATCH /pos-producao/:deliverableId/briefing
      if (seg2 === 'briefing' && !seg3 && method === 'PATCH') {
        return await handleUpdateBriefing(req, auth, deliverableId);
      }

      // PATCH /pos-producao/:deliverableId/drive-url
      if (seg2 === 'drive-url' && !seg3 && method === 'PATCH') {
        return await handleUpdateDriveUrl(req, auth, deliverableId);
      }

      // GET /pos-producao/:deliverableId/cut-versions
      if (seg2 === 'cut-versions' && !seg3 && method === 'GET') {
        return await handleListCutVersions(req, auth, deliverableId);
      }

      // POST /pos-producao/:deliverableId/cut-versions
      if (seg2 === 'cut-versions' && !seg3 && method === 'POST') {
        return await handleCreateCutVersion(req, auth, deliverableId);
      }

      // PATCH /pos-producao/:deliverableId/cut-versions/:versionId
      if (seg2 === 'cut-versions' && seg3 && !seg4 && method === 'PATCH') {
        return await handleUpdateCutVersion(req, auth, deliverableId, seg3);
      }
    }

    return error('METHOD_NOT_ALLOWED', 'Metodo ou rota nao permitido', 405, undefined, req);
  } catch (err) {
    if (err instanceof AppError) return fromAppError(err, req);
    console.error('[pos-producao] erro nao tratado:', err);
    return error('INTERNAL_ERROR', 'Erro interno do servidor', 500, undefined, req);
  }
});
