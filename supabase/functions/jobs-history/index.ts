import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { handleCors } from '../_shared/cors.ts';
import { getAuthContext } from '../_shared/auth.ts';
import { error, fromAppError } from '../_shared/response.ts';
import { AppError } from '../_shared/errors.ts';
import { listHistory } from './handlers/list.ts';

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const auth = await getAuthContext(req);
    const url = new URL(req.url);
    const pathSegments = url.pathname.split('/').filter(Boolean);

    // Rota: /jobs-history/:jobId
    const fnIndex = pathSegments.findIndex(s => s === 'jobs-history');
    const jobId = fnIndex >= 0 && pathSegments.length > fnIndex + 1 ? pathSegments[fnIndex + 1] : null;

    if (!jobId) {
      return error('VALIDATION_ERROR', 'job_id e obrigatorio na URL', 400);
    }

    if (req.method === 'GET') return await listHistory(req, auth, jobId);

    return error('METHOD_NOT_ALLOWED', 'Metodo nao permitido. Historico e somente leitura.', 405);
  } catch (err) {
    if (err instanceof AppError) return fromAppError(err);
    console.error('Erro nao tratado:', err);
    return error('INTERNAL_ERROR', 'Erro interno do servidor', 500);
  }
});
