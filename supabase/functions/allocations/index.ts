import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { handleCors } from './_shared/cors.ts';
import { getAuthContext } from './_shared/auth.ts';
import { error, fromAppError } from './_shared/response.ts';
import { AppError } from './_shared/errors.ts';
import { listByJob } from './handlers/list-by-job.ts';
import { listByPerson } from './handlers/list-by-person.ts';
import { createAllocation } from './handlers/create.ts';
import { updateAllocation } from './handlers/update.ts';
import { softDelete } from './handlers/soft-delete.ts';
import { getConflicts } from './handlers/get-conflicts.ts';

// Roteamento:
// GET  /allocations?job_id=X                 -> list-by-job
// GET  /allocations?people_id=X&from=Y&to=Z  -> list-by-person
// GET  /allocations/conflicts?from=Y&to=Z    -> get-conflicts
// POST /allocations                          -> create
// PUT  /allocations/:id                      -> update
// DELETE /allocations/:id                    -> soft-delete

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const auth = await getAuthContext(req);
    const url = new URL(req.url);
    const pathSegments = url.pathname.split('/').filter(Boolean);
    const fnIndex = pathSegments.findIndex(s => s === 'allocations');

    const segment1 = fnIndex >= 0 && pathSegments.length > fnIndex + 1 ? pathSegments[fnIndex + 1] : null;

    const method = req.method;

    // GET /allocations/conflicts?from=&to=
    if (method === 'GET' && segment1 === 'conflicts') {
      return await getConflicts(req, auth);
    }

    // PUT /allocations/:id
    if (method === 'PUT' && segment1) {
      return await updateAllocation(req, auth, segment1);
    }

    // DELETE /allocations/:id
    if (method === 'DELETE' && segment1) {
      return await softDelete(req, auth, segment1);
    }

    // GET /allocations?job_id= ou ?people_id=
    if (method === 'GET' && !segment1) {
      const jobId = url.searchParams.get('job_id');
      const peopleId = url.searchParams.get('people_id');

      if (jobId) return await listByJob(req, auth, jobId);
      if (peopleId) return await listByPerson(req, auth, peopleId);
      return error('VALIDATION_ERROR', 'Informe job_id ou people_id como query param', 400);
    }

    // POST /allocations
    if (method === 'POST' && !segment1) {
      return await createAllocation(req, auth);
    }

    return error('METHOD_NOT_ALLOWED', 'Metodo nao permitido', 405);
  } catch (err) {
    if (err instanceof AppError) return fromAppError(err);
    console.error('Erro nao tratado em allocations:', err);
    return error('INTERNAL_ERROR', 'Erro interno do servidor', 500);
  }
});
