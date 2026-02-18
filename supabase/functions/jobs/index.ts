import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { handleCors } from '../_shared/cors.ts';
import { getAuthContext } from '../_shared/auth.ts';
import { error, fromAppError } from '../_shared/response.ts';
import { AppError } from '../_shared/errors.ts';
import { createJob } from './handlers/create.ts';
import { listJobs } from './handlers/list.ts';
import { getJobById } from './handlers/get-by-id.ts';
import { updateJob } from './handlers/update.ts';
import { deleteJob } from './handlers/delete.ts';

Deno.serve(async (req: Request) => {
  // CORS pre-flight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    // Autenticacao
    const auth = await getAuthContext(req);

    // Parsear URL para roteamento
    const url = new URL(req.url);
    const pathSegments = url.pathname.split('/').filter(Boolean);
    // Formato: /jobs ou /jobs/:id
    // pathSegments apos filtro: [..., "jobs"] ou [..., "jobs", ":id"]
    const jobsIndex = pathSegments.indexOf('jobs');
    const jobId =
      jobsIndex >= 0 && pathSegments.length > jobsIndex + 1
        ? pathSegments[jobsIndex + 1]
        : null;

    const method = req.method;

    // Roteamento
    if (method === 'POST' && !jobId) {
      return await createJob(req, auth);
    }
    if (method === 'GET' && !jobId) {
      return await listJobs(req, auth);
    }
    if (method === 'GET' && jobId) {
      return await getJobById(req, auth, jobId);
    }
    if (method === 'PATCH' && jobId) {
      return await updateJob(req, auth, jobId);
    }
    if (method === 'DELETE' && jobId) {
      return await deleteJob(req, auth, jobId);
    }

    return error('METHOD_NOT_ALLOWED', 'Metodo nao permitido', 405);
  } catch (err) {
    if (err instanceof AppError) {
      return fromAppError(err);
    }
    console.error('Erro nao tratado:', err);
    return error('INTERNAL_ERROR', 'Erro interno do servidor', 500);
  }
});
