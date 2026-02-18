import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { handleCors } from '../_shared/cors.ts';
import { getAuthContext } from '../_shared/auth.ts';
import { error, fromAppError } from '../_shared/response.ts';
import { AppError } from '../_shared/errors.ts';
import { listDeliverables } from './handlers/list.ts';
import { createDeliverable } from './handlers/create.ts';
import { updateDeliverable } from './handlers/update.ts';
import { deleteDeliverable } from './handlers/delete.ts';

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const auth = await getAuthContext(req);
    const url = new URL(req.url);
    const pathSegments = url.pathname.split('/').filter(Boolean);

    // Rota: /jobs-deliverables/:jobId ou /jobs-deliverables/:jobId/:deliverableId
    const fnIndex = pathSegments.findIndex(s => s === 'jobs-deliverables');
    const jobId = fnIndex >= 0 && pathSegments.length > fnIndex + 1 ? pathSegments[fnIndex + 1] : null;
    const deliverableId = fnIndex >= 0 && pathSegments.length > fnIndex + 2 ? pathSegments[fnIndex + 2] : null;

    if (!jobId) {
      return error('VALIDATION_ERROR', 'job_id e obrigatorio na URL', 400);
    }

    const method = req.method;

    if (method === 'GET' && !deliverableId) return await listDeliverables(req, auth, jobId);
    if (method === 'POST' && !deliverableId) return await createDeliverable(req, auth, jobId);
    if (method === 'PATCH' && deliverableId) return await updateDeliverable(req, auth, jobId, deliverableId);
    if (method === 'DELETE' && deliverableId) return await deleteDeliverable(req, auth, jobId, deliverableId);

    return error('METHOD_NOT_ALLOWED', 'Metodo nao permitido', 405);
  } catch (err) {
    if (err instanceof AppError) return fromAppError(err);
    console.error('Erro nao tratado:', err);
    return error('INTERNAL_ERROR', 'Erro interno do servidor', 500);
  }
});
