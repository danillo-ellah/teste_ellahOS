import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { handleCors } from '../_shared/cors.ts';
import { getAuthContext } from '../_shared/auth.ts';
import { error, fromAppError } from '../_shared/response.ts';
import { AppError } from '../_shared/errors.ts';
import { listTeam } from './handlers/list.ts';
import { addMember } from './handlers/add-member.ts';
import { updateMember } from './handlers/update-member.ts';
import { removeMember } from './handlers/remove-member.ts';

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const auth = await getAuthContext(req);
    const url = new URL(req.url);
    const pathSegments = url.pathname.split('/').filter(Boolean);

    // Rota: /jobs-team/:jobId ou /jobs-team/:jobId/:memberId
    const fnIndex = pathSegments.findIndex(s => s === 'jobs-team');
    const jobId = fnIndex >= 0 && pathSegments.length > fnIndex + 1 ? pathSegments[fnIndex + 1] : null;
    const memberId = fnIndex >= 0 && pathSegments.length > fnIndex + 2 ? pathSegments[fnIndex + 2] : null;

    if (!jobId) {
      return error('VALIDATION_ERROR', 'job_id e obrigatorio na URL', 400);
    }

    const method = req.method;

    if (method === 'GET' && !memberId) return await listTeam(req, auth, jobId);
    if (method === 'POST' && !memberId) return await addMember(req, auth, jobId);
    if (method === 'PATCH' && memberId) return await updateMember(req, auth, jobId, memberId);
    if (method === 'DELETE' && memberId) return await removeMember(req, auth, jobId, memberId);

    return error('METHOD_NOT_ALLOWED', 'Metodo nao permitido', 405);
  } catch (err) {
    if (err instanceof AppError) return fromAppError(err);
    console.error('Erro nao tratado:', err);
    return error('INTERNAL_ERROR', 'Erro interno do servidor', 500);
  }
});
