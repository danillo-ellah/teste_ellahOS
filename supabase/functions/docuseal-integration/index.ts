import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { handleCors } from '../_shared/cors.ts';
import { getAuthContext } from '../_shared/auth.ts';
import { error, fromAppError } from '../_shared/response.ts';
import { AppError } from '../_shared/errors.ts';
import { createSubmissionHandler } from './handlers/create-submission.ts';
import { listSubmissions } from './handlers/list.ts';
import { getSubmissionHandler } from './handlers/get.ts';
import { webhookHandler } from './handlers/webhook.ts';
import { resendHandler } from './handlers/resend.ts';
import { downloadHandler } from './handlers/download.ts';

// Rotas que usam HMAC em vez de JWT (chamadas pelo DocuSeal, nao por usuarios)
const WEBHOOK_ROUTES = ['webhook'];

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const url = new URL(req.url);
    const pathSegments = url.pathname.split('/').filter(Boolean);

    // Extrair a acao a partir do path: /docuseal-integration/<action>[/<id>]
    const fnIndex = pathSegments.findIndex(s => s === 'docuseal-integration');
    const action = fnIndex >= 0 && pathSegments.length > fnIndex + 1
      ? pathSegments[fnIndex + 1]
      : null;
    // Parametro de ID opcional: /docuseal-integration/get/:id
    const resourceId = fnIndex >= 0 && pathSegments.length > fnIndex + 2
      ? pathSegments[fnIndex + 2]
      : null;

    if (!action) {
      return error('VALIDATION_ERROR', 'Acao e obrigatoria na URL', 400);
    }

    console.log(`[docuseal-integration] ${req.method} /${action}${resourceId ? `/${resourceId}` : ''}`);

    // Rotas com HMAC nao exigem JWT
    if (WEBHOOK_ROUTES.includes(action)) {
      if (action === 'webhook' && req.method === 'POST') {
        return await webhookHandler(req);
      }
      return error('METHOD_NOT_ALLOWED', 'Metodo nao permitido', 405);
    }

    // Demais rotas exigem JWT
    const auth = await getAuthContext(req);

    switch (action) {
      case 'create-submission':
        if (req.method === 'POST') return await createSubmissionHandler(req, auth);
        break;
      case 'list':
        if (req.method === 'GET') return await listSubmissions(req, auth);
        break;
      case 'get':
        if (req.method === 'GET') return await getSubmissionHandler(req, auth, resourceId);
        break;
      case 'resend':
        if (req.method === 'POST') return await resendHandler(req, auth);
        break;
      case 'download':
        if (req.method === 'GET') return await downloadHandler(req, auth, resourceId);
        break;
    }

    return error('METHOD_NOT_ALLOWED', 'Metodo ou rota nao permitido', 405);
  } catch (err) {
    if (err instanceof AppError) return fromAppError(err);
    console.error('[docuseal-integration] erro nao tratado:', err);
    return error('INTERNAL_ERROR', 'Erro interno do servidor', 500);
  }
});
