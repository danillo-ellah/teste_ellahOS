import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { handleCors } from '../_shared/cors.ts';
import { getAuthContext } from '../_shared/auth.ts';
import { error, fromAppError } from '../_shared/response.ts';
import { AppError } from '../_shared/errors.ts';
import { ingestNf } from './handlers/ingest.ts';
import { listNfs } from './handlers/list.ts';
import { statsNfs } from './handlers/stats.ts';
import { validateNf } from './handlers/validate.ts';
import { rejectNf } from './handlers/reject.ts';
import { reassignNf } from './handlers/reassign.ts';
import { requestSendNf } from './handlers/request-send.ts';
import { requestSentCallbackNf } from './handlers/request-sent-callback.ts';
import { uploadNf } from './handlers/upload.ts';
import { linkCostItem } from './handlers/link-cost-item.ts';

// Rotas que usam autenticacao via Cron Secret (chamadas pelo n8n, nao por usuarios)
const CRON_SECRET_ROUTES = ['ingest', 'request-sent-callback'];

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const url = new URL(req.url);
    const pathSegments = url.pathname.split('/').filter(Boolean);

    // Extrair a acao a partir do path: /nf-processor/<action>
    const fnIndex = pathSegments.findIndex(s => s === 'nf-processor');
    const action = fnIndex >= 0 && pathSegments.length > fnIndex + 1
      ? pathSegments[fnIndex + 1]
      : null;

    if (!action) {
      return error('VALIDATION_ERROR', 'Acao e obrigatoria na URL', 400);
    }

    // Rotas com Cron Secret nao exigem JWT
    if (CRON_SECRET_ROUTES.includes(action)) {
      if (action === 'ingest' && req.method === 'POST') {
        return await ingestNf(req);
      }
      if (action === 'request-sent-callback' && req.method === 'POST') {
        return await requestSentCallbackNf(req);
      }
      return error('METHOD_NOT_ALLOWED', 'Metodo nao permitido', 405);
    }

    // Demais rotas exigem JWT
    const auth = await getAuthContext(req);

    switch (action) {
      case 'list':
        if (req.method === 'GET') return await listNfs(req, auth);
        break;
      case 'stats':
        if (req.method === 'GET') return await statsNfs(req, auth);
        break;
      case 'validate':
        if (req.method === 'POST') return await validateNf(req, auth);
        break;
      case 'reject':
        if (req.method === 'POST') return await rejectNf(req, auth);
        break;
      case 'reassign':
        if (req.method === 'POST') return await reassignNf(req, auth);
        break;
      case 'request-send':
        if (req.method === 'POST') return await requestSendNf(req, auth);
        break;
      case 'upload':
        if (req.method === 'POST') return await uploadNf(req, auth);
        break;
      case 'link-cost-item':
        if (req.method === 'POST') return await linkCostItem(req, auth);
        break;
    }

    return error('METHOD_NOT_ALLOWED', 'Metodo nao permitido', 405);
  } catch (err) {
    if (err instanceof AppError) return fromAppError(err);
    console.error('[nf-processor] erro nao tratado:', err);
    return error('INTERNAL_ERROR', 'Erro interno do servidor', 500);
  }
});
