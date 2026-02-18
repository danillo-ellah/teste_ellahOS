import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { handleCors } from '../_shared/cors.ts';
import { getAuthContext } from '../_shared/auth.ts';
import { error, fromAppError } from '../_shared/response.ts';
import { AppError } from '../_shared/errors.ts';
import { updateStatus } from './handlers/update-status.ts';
import { approveJob } from './handlers/approve.ts';

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const auth = await getAuthContext(req);
    const url = new URL(req.url);
    const pathSegments = url.pathname.split('/').filter(Boolean);

    // Rota: /jobs-status/:jobId/status ou /jobs-status/:jobId/approve
    // pathSegments: [..., "jobs-status", ":jobId", "status"|"approve"]
    const fnIndex = pathSegments.findIndex(s => s === 'jobs-status');
    const jobId = fnIndex >= 0 && pathSegments.length > fnIndex + 1 ? pathSegments[fnIndex + 1] : null;
    const action = fnIndex >= 0 && pathSegments.length > fnIndex + 2 ? pathSegments[fnIndex + 2] : null;

    if (!jobId) {
      return error('VALIDATION_ERROR', 'job_id e obrigatorio na URL', 400);
    }

    if (req.method === 'PATCH' && (!action || action === 'status')) {
      return await updateStatus(req, auth, jobId);
    }
    if (req.method === 'POST' && action === 'approve') {
      return await approveJob(req, auth, jobId);
    }

    return error('METHOD_NOT_ALLOWED', 'Metodo nao permitido', 405);
  } catch (err) {
    if (err instanceof AppError) return fromAppError(err);
    console.error('Erro nao tratado:', err);
    return error('INTERNAL_ERROR', 'Erro interno do servidor', 500);
  }
});
