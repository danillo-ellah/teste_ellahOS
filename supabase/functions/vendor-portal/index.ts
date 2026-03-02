import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { handleCors } from '../_shared/cors.ts';
import { getAuthContext } from '../_shared/auth.ts';
import { error, fromAppError } from '../_shared/response.ts';
import { AppError } from '../_shared/errors.ts';
import { getByToken } from './handlers/get-by-token.ts';
import { updateByToken } from './handlers/update-by-token.ts';
import { createInvite } from './handlers/create-invite.ts';
import { listInvites } from './handlers/list-invites.ts';

// Roteamento:
// --- PUBLICAS (sem auth) ---
// GET  /vendor-portal/public/:token          -> get-by-token
// POST /vendor-portal/public/:token          -> update-by-token
//
// --- AUTENTICADAS ---
// POST /vendor-portal/invite                 -> create-invite
// GET  /vendor-portal/invites                -> list-invites (query: job_id opcional)

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const url = new URL(req.url);
    const pathSegments = url.pathname.split('/').filter(Boolean);
    const fnIndex = pathSegments.findIndex(s => s === 'vendor-portal');

    const segment1 = pathSegments[fnIndex + 1] ?? null;
    const segment2 = pathSegments[fnIndex + 2] ?? null;

    // --- ROTAS PUBLICAS (sem auth) ---
    if (segment1 === 'public' && segment2) {
      const token = segment2;
      if (req.method === 'GET') {
        return await getByToken(req, token);
      }
      if (req.method === 'POST') {
        return await updateByToken(req, token);
      }
      return error('METHOD_NOT_ALLOWED', 'Metodo nao permitido', 405);
    }

    // --- ROTAS AUTENTICADAS ---
    const auth = await getAuthContext(req);

    if (req.method === 'POST' && segment1 === 'invite' && !segment2) {
      return await createInvite(req, auth);
    }
    if (req.method === 'GET' && segment1 === 'invites' && !segment2) {
      return await listInvites(req, auth);
    }

    return error('NOT_FOUND', 'Rota nao encontrada', 404, undefined, req);
  } catch (err) {
    if (err instanceof AppError) return fromAppError(err);
    console.error('Erro nao tratado em vendor-portal:', err);
    return error('INTERNAL_ERROR', 'Erro interno do servidor', 500);
  }
});
