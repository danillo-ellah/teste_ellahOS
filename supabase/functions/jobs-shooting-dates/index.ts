import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { handleCors } from '../_shared/cors.ts';
import { getAuthContext } from '../_shared/auth.ts';
import { error, fromAppError } from '../_shared/response.ts';
import { AppError } from '../_shared/errors.ts';
import { listShootingDates } from './handlers/list.ts';
import { createShootingDate } from './handlers/create.ts';
import { updateShootingDate } from './handlers/update.ts';
import { deleteShootingDate } from './handlers/delete.ts';

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const auth = await getAuthContext(req);
    const url = new URL(req.url);
    const pathSegments = url.pathname.split('/').filter(Boolean);

    const fnIndex = pathSegments.findIndex(s => s === 'jobs-shooting-dates');
    const jobId = fnIndex >= 0 && pathSegments.length > fnIndex + 1 ? pathSegments[fnIndex + 1] : null;
    const dateId = fnIndex >= 0 && pathSegments.length > fnIndex + 2 ? pathSegments[fnIndex + 2] : null;

    if (!jobId) {
      return error('VALIDATION_ERROR', 'job_id e obrigatorio na URL', 400);
    }

    const method = req.method;

    if (method === 'GET' && !dateId) return await listShootingDates(req, auth, jobId);
    if (method === 'POST' && !dateId) return await createShootingDate(req, auth, jobId);
    if (method === 'PATCH' && dateId) return await updateShootingDate(req, auth, jobId, dateId);
    if (method === 'DELETE' && dateId) return await deleteShootingDate(req, auth, jobId, dateId);

    return error('METHOD_NOT_ALLOWED', 'Metodo nao permitido', 405);
  } catch (err) {
    if (err instanceof AppError) return fromAppError(err);
    console.error('Erro nao tratado:', err);
    return error('INTERNAL_ERROR', 'Erro interno do servidor', 500);
  }
});
