import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { handleCors } from '../_shared/cors.ts';
import { getAuthContext } from '../_shared/auth.ts';
import { error, fromAppError } from '../_shared/response.ts';
import { AppError } from '../_shared/errors.ts';
import { eventsHandler } from './handlers/events.ts';
import { kpisHandler } from './handlers/kpis.ts';
import { postponeHandler } from './handlers/postpone.ts';

// Roles autorizados para acessar o calendario de pagamentos
const ALLOWED_ROLES = ['admin', 'ceo', 'financeiro', 'produtor_executivo'];

Deno.serve(async (req: Request) => {
  // Responde preflight CORS
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const url = new URL(req.url);
    const pathSegments = url.pathname.split('/').filter(Boolean);

    // Extrair acao a partir do path: /payment-calendar/<action>
    const fnIndex = pathSegments.findIndex(s => s === 'payment-calendar');
    const action = fnIndex >= 0 && pathSegments.length > fnIndex + 1
      ? pathSegments[fnIndex + 1]
      : null;

    if (!action) {
      return error('VALIDATION_ERROR', 'Acao e obrigatoria na URL', 400, undefined, req);
    }

    // Todos os endpoints do payment-calendar exigem JWT
    const auth = await getAuthContext(req);

    // Verificar se o role do usuario tem permissao
    if (!ALLOWED_ROLES.includes(auth.role)) {
      return error(
        'FORBIDDEN',
        `Role '${auth.role}' nao tem permissao para acessar o calendario de pagamentos`,
        403,
        undefined,
        req,
      );
    }

    // Roteamento por acao + metodo HTTP
    switch (action) {
      case 'events':
        if (req.method === 'GET') return await eventsHandler(req, auth);
        break;
      case 'kpis':
        if (req.method === 'GET') return await kpisHandler(req, auth);
        break;
      case 'postpone':
        if (req.method === 'PATCH') return await postponeHandler(req, auth);
        break;
    }

    return error('METHOD_NOT_ALLOWED', 'Metodo ou rota nao permitido', 405, undefined, req);
  } catch (err) {
    if (err instanceof AppError) return fromAppError(err, req);
    console.error('[payment-calendar] erro nao tratado:', err);
    return error('INTERNAL_ERROR', 'Erro interno do servidor', 500, undefined, req);
  }
});
