import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { handleCors } from '../_shared/cors.ts';
import { getAuthContext } from '../_shared/auth.ts';
import { error, fromAppError } from '../_shared/response.ts';
import { AppError } from '../_shared/errors.ts';

import { handleListSteps } from './handlers/list-steps.ts';
import { handleUpdateStep } from './handlers/update-step.ts';
import { handleInitialize } from './handlers/initialize.ts';
import { handleListEvidence } from './handlers/list-evidence.ts';
import { handleAddEvidence } from './handlers/add-evidence.ts';

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const auth = await getAuthContext(req);
    const url = new URL(req.url);
    const method = req.method;

    // Extrair segmentos apos /job-workflow
    const pathSegments = url.pathname.split('/').filter(Boolean);
    const fnIndex = pathSegments.findIndex((s) => s === 'job-workflow');
    const seg1 = fnIndex >= 0 && pathSegments.length > fnIndex + 1
      ? pathSegments[fnIndex + 1] : null;
    const seg2 = fnIndex >= 0 && pathSegments.length > fnIndex + 2
      ? pathSegments[fnIndex + 2] : null;
    const seg3 = fnIndex >= 0 && pathSegments.length > fnIndex + 3
      ? pathSegments[fnIndex + 3] : null;

    // POST /job-workflow/initialize?job_id=xxx
    if (seg1 === 'initialize' && !seg2 && method === 'POST') {
      const jobId = url.searchParams.get('job_id');
      if (!jobId) throw new AppError('VALIDATION_ERROR', 'job_id e obrigatorio', 400);
      return await handleInitialize(req, auth, jobId);
    }

    // GET /job-workflow/steps?job_id=xxx
    if (seg1 === 'steps' && !seg2 && method === 'GET') {
      const jobId = url.searchParams.get('job_id');
      if (!jobId) throw new AppError('VALIDATION_ERROR', 'job_id e obrigatorio', 400);
      return await handleListSteps(req, auth, jobId);
    }

    // PATCH /job-workflow/steps/:stepId
    if (seg1 === 'steps' && seg2 && !seg3 && method === 'PATCH') {
      return await handleUpdateStep(req, auth, seg2);
    }

    // GET /job-workflow/steps/:stepId/evidence
    if (seg1 === 'steps' && seg2 && seg3 === 'evidence' && method === 'GET') {
      return await handleListEvidence(req, auth, seg2);
    }

    // POST /job-workflow/steps/:stepId/evidence
    if (seg1 === 'steps' && seg2 && seg3 === 'evidence' && method === 'POST') {
      return await handleAddEvidence(req, auth, seg2);
    }

    return error('METHOD_NOT_ALLOWED', 'Metodo ou rota nao permitido', 405, undefined, req);
  } catch (err) {
    if (err instanceof AppError) return fromAppError(err, req);
    console.error('[job-workflow] erro nao tratado:', err);
    return error('INTERNAL_ERROR', 'Erro interno do servidor', 500, undefined, req);
  }
});
