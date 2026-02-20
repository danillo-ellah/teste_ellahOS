import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { handleCors } from './_shared/cors.ts';
import { getAuthContext } from './_shared/auth.ts';
import { error, fromAppError } from './_shared/response.ts';
import { AppError } from './_shared/errors.ts';
import { listByJob } from './handlers/list-by-job.ts';
import { listPending } from './handlers/list-pending.ts';
import { createApproval } from './handlers/create.ts';
import { resend } from './handlers/resend.ts';
import { approveInternal } from './handlers/approve-internal.ts';
import { rejectInternal } from './handlers/reject-internal.ts';
import { getLogs } from './handlers/get-logs.ts';
import { getByToken } from './handlers/get-by-token.ts';
import { respond } from './handlers/respond.ts';

// Roteamento:
// --- PUBLICAS (sem auth) ---
// GET  /approvals/public/:token          -> get-by-token
// POST /approvals/public/:token/respond  -> respond
//
// --- AUTENTICADAS ---
// GET  /approvals?job_id=X               -> list-by-job
// GET  /approvals/pending                -> list-pending
// POST /approvals                        -> create
// GET  /approvals/:id/logs               -> get-logs
// POST /approvals/:id/resend             -> resend
// POST /approvals/:id/approve            -> approve-internal
// POST /approvals/:id/reject             -> reject-internal

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const url = new URL(req.url);
    const pathSegments = url.pathname.split('/').filter(Boolean);
    const fnIndex = pathSegments.findIndex(s => s === 'approvals');

    const segment1 = pathSegments[fnIndex + 1] ?? null;
    const segment2 = pathSegments[fnIndex + 2] ?? null;
    const segment3 = pathSegments[fnIndex + 3] ?? null;

    // --- ROTAS PUBLICAS (sem auth) ---
    if (segment1 === 'public' && segment2) {
      const token = segment2;
      if (req.method === 'GET' && !segment3) {
        return await getByToken(req, token);
      }
      if (req.method === 'POST' && segment3 === 'respond') {
        return await respond(req, token);
      }
      return error('NOT_FOUND', 'Rota publica nao encontrada', 404);
    }

    // --- ROTAS AUTENTICADAS ---
    const auth = await getAuthContext(req);

    if (req.method === 'GET' && segment1 === 'pending') {
      return await listPending(req, auth);
    }
    if (req.method === 'GET' && !segment1) {
      return await listByJob(req, auth);
    }
    if (req.method === 'POST' && !segment1) {
      return await createApproval(req, auth);
    }
    if (req.method === 'GET' && segment1 && segment2 === 'logs') {
      return await getLogs(req, auth, segment1);
    }
    if (req.method === 'POST' && segment1 && segment2 === 'resend') {
      return await resend(req, auth, segment1);
    }
    if (req.method === 'POST' && segment1 && segment2 === 'approve') {
      return await approveInternal(req, auth, segment1);
    }
    if (req.method === 'POST' && segment1 && segment2 === 'reject') {
      return await rejectInternal(req, auth, segment1);
    }

    return error('METHOD_NOT_ALLOWED', 'Metodo nao permitido', 405);
  } catch (err) {
    if (err instanceof AppError) return fromAppError(err);
    console.error('Erro nao tratado em approvals:', err);
    return error('INTERNAL_ERROR', 'Erro interno do servidor', 500);
  }
});
