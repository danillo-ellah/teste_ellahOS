import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { handleCors } from '../_shared/cors.ts';
import { getAuthContext } from '../_shared/auth.ts';
import { error, fromAppError } from '../_shared/response.ts';
import { AppError } from '../_shared/errors.ts';

import { handleCheck } from './handlers/check.ts';
import { handleRequest } from './handlers/request.ts';
import { handleDecide } from './handlers/decide.ts';
import { handleList } from './handlers/list.ts';
import { handleRules } from './handlers/rules.ts';

// Rotas nomeadas que devem ser verificadas antes de :id
const NAMED_ROUTES = new Set(['check', 'request', 'rules']);

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const auth = await getAuthContext(req);
    const url = new URL(req.url);
    const method = req.method;

    // Extrair segmentos do path apos /payment-approvals
    const pathSegments = url.pathname.split('/').filter(Boolean);
    const fnIndex = pathSegments.findIndex((s) => s === 'payment-approvals');
    const segment1 = fnIndex >= 0 && pathSegments.length > fnIndex + 1
      ? pathSegments[fnIndex + 1]
      : null;
    const segment2 = fnIndex >= 0 && pathSegments.length > fnIndex + 2
      ? pathSegments[fnIndex + 2]
      : null;

    // GET /payment-approvals — lista de aprovacoes
    if (!segment1 && method === 'GET') {
      return await handleList(req, auth);
    }

    // POST /payment-approvals/check — verifica se valor requer aprovacao
    if (segment1 === 'check' && !segment2 && method === 'POST') {
      return await handleCheck(req, auth);
    }

    // POST /payment-approvals/request — solicita aprovacao para um cost item
    if (segment1 === 'request' && !segment2 && method === 'POST') {
      return await handleRequest(req, auth);
    }

    // GET /payment-approvals/rules — lista regras do tenant
    if (segment1 === 'rules' && !segment2 && method === 'GET') {
      return await handleRules(req, auth, null);
    }

    // POST /payment-approvals/rules — cria nova regra
    if (segment1 === 'rules' && !segment2 && method === 'POST') {
      return await handleRules(req, auth, null);
    }

    // PATCH /payment-approvals/rules/:id — atualiza regra
    if (segment1 === 'rules' && segment2 && method === 'PATCH') {
      return await handleRules(req, auth, segment2);
    }

    // Rotas com :id (segment1 e UUID de uma aprovacao)
    if (segment1 && !NAMED_ROUTES.has(segment1)) {
      const id = segment1;

      // POST /payment-approvals/:id/decide — decide aprovacao
      if (segment2 === 'decide' && method === 'POST') {
        return await handleDecide(req, auth, id);
      }
    }

    return error('METHOD_NOT_ALLOWED', 'Metodo ou rota nao permitido', 405, undefined, req);
  } catch (err) {
    if (err instanceof AppError) return fromAppError(err, req);
    console.error('[payment-approvals] erro nao tratado:', err);
    return error('INTERNAL_ERROR', 'Erro interno do servidor', 500, undefined, req);
  }
});
