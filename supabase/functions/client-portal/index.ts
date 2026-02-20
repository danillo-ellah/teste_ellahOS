import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { handleCors } from './_shared/cors.ts';
import { getAuthContext } from './_shared/auth.ts';
import { error, fromAppError } from './_shared/response.ts';
import { AppError } from './_shared/errors.ts';
import { getByToken } from './handlers/get-by-token.ts';
import { sendMessage } from './handlers/send-message.ts';
import { listSessions } from './handlers/list-sessions.ts';
import { createSession } from './handlers/create-session.ts';
import { updateSession } from './handlers/update-session.ts';
import { deleteSession } from './handlers/delete-session.ts';
import { listMessages } from './handlers/list-messages.ts';
import { replyMessage } from './handlers/reply-message.ts';

// Roteamento:
// --- PUBLICAS (sem auth, service_role) ---
// GET  /client-portal/public/:token                -> get-by-token (timeline + docs + approvals + messages)
// POST /client-portal/public/:token/message        -> send-message (cliente envia mensagem)
//
// --- AUTENTICADAS (Bearer token) ---
// GET    /client-portal/sessions?job_id=X          -> list-sessions
// POST   /client-portal/sessions                   -> create-session
// PATCH  /client-portal/sessions/:id               -> update-session
// DELETE /client-portal/sessions/:id               -> delete-session
// GET    /client-portal/sessions/:id/messages      -> list-messages
// POST   /client-portal/sessions/:id/messages      -> reply-message

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const url = new URL(req.url);
    const pathSegments = url.pathname.split('/').filter(Boolean);
    const fnIndex = pathSegments.findIndex(s => s === 'client-portal');

    const segment1 = pathSegments[fnIndex + 1] ?? null; // 'public' | 'sessions'
    const segment2 = pathSegments[fnIndex + 2] ?? null; // :token | :id
    const segment3 = pathSegments[fnIndex + 3] ?? null; // 'message' | 'messages'

    // --- ROTAS PUBLICAS (sem auth, sem JWT) ---
    if (segment1 === 'public' && segment2) {
      const token = segment2;
      // GET /client-portal/public/:token
      if (req.method === 'GET' && !segment3) {
        return await getByToken(req, token);
      }
      // POST /client-portal/public/:token/message
      if (req.method === 'POST' && segment3 === 'message') {
        return await sendMessage(req, token);
      }
      return error('NOT_FOUND', 'Rota publica nao encontrada', 404);
    }

    // --- ROTAS AUTENTICADAS ---
    const auth = await getAuthContext(req);

    // GET /client-portal/sessions
    if (req.method === 'GET' && segment1 === 'sessions' && !segment2) {
      return await listSessions(req, auth);
    }
    // POST /client-portal/sessions
    if (req.method === 'POST' && segment1 === 'sessions' && !segment2) {
      return await createSession(req, auth);
    }
    // PATCH /client-portal/sessions/:id
    if (req.method === 'PATCH' && segment1 === 'sessions' && segment2 && !segment3) {
      return await updateSession(req, auth, segment2);
    }
    // DELETE /client-portal/sessions/:id
    if (req.method === 'DELETE' && segment1 === 'sessions' && segment2 && !segment3) {
      return await deleteSession(req, auth, segment2);
    }
    // GET /client-portal/sessions/:id/messages
    if (req.method === 'GET' && segment1 === 'sessions' && segment2 && segment3 === 'messages') {
      return await listMessages(req, auth, segment2);
    }
    // POST /client-portal/sessions/:id/messages
    if (req.method === 'POST' && segment1 === 'sessions' && segment2 && segment3 === 'messages') {
      return await replyMessage(req, auth, segment2);
    }

    return error('NOT_FOUND', 'Rota nao encontrada', 404);
  } catch (err) {
    if (err instanceof AppError) return fromAppError(err);
    console.error('[client-portal] erro nao tratado:', err);
    return error('INTERNAL_ERROR', 'Erro interno do servidor', 500);
  }
});
