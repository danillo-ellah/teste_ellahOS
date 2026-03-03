import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { handleCors } from '../_shared/cors.ts';
import { getAuthContext } from '../_shared/auth.ts';
import { error, fromAppError } from '../_shared/response.ts';
import { AppError } from '../_shared/errors.ts';

import { handleList } from './handlers/list.ts';
import { handleCreate } from './handlers/create.ts';
import { handleUpdate } from './handlers/update.ts';
import { handleDelete } from './handlers/delete.ts';
import { handleApprove } from './handlers/approve.ts';
import { handleSummary } from './handlers/summary.ts';

// ========================================================
// overtime — Controle de horas extras por job
// Rotas:
//   GET    /overtime?job_id=X              -> lista lancamentos por job
//   GET    /overtime/summary?job_id=X      -> resumo agregado por membro
//   POST   /overtime                       -> registrar ponto
//   PATCH  /overtime/:id                   -> atualizar lancamento
//   DELETE /overtime/:id                   -> soft delete
//   POST   /overtime/:id/approve           -> aprovar HE
// ========================================================

const NAMED_ROUTES = new Set(['summary']);

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const auth = await getAuthContext(req);
    const url = new URL(req.url);
    const method = req.method;

    // Extrair segmentos do path apos /overtime
    const pathSegments = url.pathname.split('/').filter(Boolean);
    const fnIndex = pathSegments.findIndex((s) => s === 'overtime');
    const segment1 = fnIndex >= 0 && pathSegments.length > fnIndex + 1
      ? pathSegments[fnIndex + 1]
      : null;
    const segment2 = fnIndex >= 0 && pathSegments.length > fnIndex + 2
      ? pathSegments[fnIndex + 2]
      : null;

    // GET /overtime?job_id=X
    if (!segment1 && method === 'GET') {
      return await handleList(req, auth);
    }

    // POST /overtime
    if (!segment1 && method === 'POST') {
      return await handleCreate(req, auth);
    }

    // GET /overtime/summary?job_id=X
    if (segment1 === 'summary' && method === 'GET') {
      return await handleSummary(req, auth);
    }

    // Rotas com :id (segment1 eh UUID)
    if (segment1 && !NAMED_ROUTES.has(segment1)) {
      const id = segment1;

      // PATCH /overtime/:id
      if (!segment2 && method === 'PATCH') {
        return await handleUpdate(req, auth, id);
      }

      // DELETE /overtime/:id
      if (!segment2 && method === 'DELETE') {
        return await handleDelete(req, auth, id);
      }

      // POST /overtime/:id/approve
      if (segment2 === 'approve' && method === 'POST') {
        return await handleApprove(req, auth, id);
      }
    }

    return error('METHOD_NOT_ALLOWED', 'Metodo ou rota nao permitido', 405, undefined, req);
  } catch (err) {
    if (err instanceof AppError) return fromAppError(err, req);
    console.error('[overtime] erro nao tratado:', err);
    return error('INTERNAL_ERROR', 'Erro interno do servidor', 500, undefined, req);
  }
});
