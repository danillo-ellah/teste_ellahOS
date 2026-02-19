import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { handleCors } from './_shared/cors.ts';
import { getAuthContext } from './_shared/auth.ts';
import { error, fromAppError } from './_shared/response.ts';
import { AppError } from './_shared/errors.ts';
import { listMessages } from './handlers/list-messages.ts';
import { handleWebhook } from './handlers/webhook.ts';
import { sendManual } from './handlers/send-manual.ts';

// ========================================================
// whatsapp — Mensagens WhatsApp do job
// GET  /:jobId/messages — listar mensagens do job
// POST /webhook         — callback n8n/Evolution atualiza status
// POST /send            — envio manual (admin/ceo)
// ========================================================

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const url = new URL(req.url);
    const pathSegments = url.pathname.split('/').filter(Boolean);

    // Encontrar indice do 'whatsapp' no path
    const fnIndex = pathSegments.findIndex(s => s === 'whatsapp');
    const segment1 = pathSegments[fnIndex + 1] || ''; // jobId ou 'webhook' ou 'send'
    const segment2 = pathSegments[fnIndex + 2] || ''; // 'messages' (quando segment1=jobId)

    // POST /webhook — sem JWT, usa X-Webhook-Secret
    if (req.method === 'POST' && segment1 === 'webhook') {
      return await handleWebhook(req);
    }

    // POST /send — requer JWT (admin/ceo)
    if (req.method === 'POST' && segment1 === 'send') {
      const auth = await getAuthContext(req);
      return await sendManual(req, auth);
    }

    // GET /:jobId/messages — requer JWT
    if (req.method === 'GET' && segment1 && segment2 === 'messages') {
      const auth = await getAuthContext(req);
      return await listMessages(req, auth, segment1);
    }

    throw new AppError('NOT_FOUND', `Rota nao encontrada: ${req.method} /${segment1}/${segment2}`, 404);
  } catch (err) {
    if (err instanceof AppError) {
      return fromAppError(err);
    }
    console.error('[whatsapp] Erro inesperado:', err);
    return error('INTERNAL_ERROR', 'Erro interno do servidor', 500);
  }
});
