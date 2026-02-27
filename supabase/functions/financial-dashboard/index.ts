import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { handleCors } from '../_shared/cors.ts';
import { getAuthContext } from '../_shared/auth.ts';
import { error, fromAppError } from '../_shared/response.ts';
import { AppError } from '../_shared/errors.ts';

import { handleJobDashboard } from './handlers/job-dashboard.ts';
import { handleTenantDashboard } from './handlers/tenant-dashboard.ts';

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const auth = await getAuthContext(req);
    const url = new URL(req.url);
    const method = req.method;

    // Extrair segmentos do path apos /financial-dashboard
    const pathSegments = url.pathname.split('/').filter(Boolean);
    const fnIndex = pathSegments.findIndex((s) => s === 'financial-dashboard');
    const segment1 = fnIndex >= 0 && pathSegments.length > fnIndex + 1
      ? pathSegments[fnIndex + 1]
      : null;
    const segment2 = fnIndex >= 0 && pathSegments.length > fnIndex + 2
      ? pathSegments[fnIndex + 2]
      : null;

    // GET /financial-dashboard/job/:jobId
    if (segment1 === 'job' && segment2 && method === 'GET') {
      return await handleJobDashboard(req, auth, segment2);
    }

    // GET /financial-dashboard/tenant
    if (segment1 === 'tenant' && !segment2 && method === 'GET') {
      return await handleTenantDashboard(req, auth);
    }

    return error('METHOD_NOT_ALLOWED', 'Metodo ou rota nao permitido', 405);
  } catch (err) {
    if (err instanceof AppError) return fromAppError(err);
    console.error('[financial-dashboard] erro nao tratado:', err);
    return error('INTERNAL_ERROR', 'Erro interno do servidor', 500);
  }
});
