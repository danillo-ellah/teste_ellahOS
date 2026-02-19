import { getServiceClient } from '../../_shared/supabase-client.ts';
import { success, error } from '../../_shared/response.ts';

// POST /whatsapp/webhook
// Callback para atualizar status de mensagens WhatsApp
// Usado pelo n8n ou Evolution API webhook para informar delivery/read status
// Auth: X-Webhook-Secret (se configurado) — se nao configurado, aceita qualquer request
export async function handleWebhook(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return error('METHOD_NOT_ALLOWED', 'Apenas POST', 405);
  }

  // Validar webhook secret (se configurado)
  const expectedSecret = Deno.env.get('WHATSAPP_WEBHOOK_SECRET');
  if (expectedSecret) {
    const providedSecret = req.headers.get('X-Webhook-Secret');
    if (providedSecret !== expectedSecret) {
      return error('UNAUTHORIZED', 'Webhook secret invalido', 401);
    }
  }

  // Parse body
  let body: {
    external_message_id?: string;
    status?: string;
  };

  try {
    body = await req.json();
  } catch {
    return error('VALIDATION_ERROR', 'Body JSON invalido', 400);
  }

  if (!body.external_message_id) {
    return error('VALIDATION_ERROR', 'Campo "external_message_id" obrigatorio', 400);
  }

  const validStatuses = ['sent', 'delivered', 'read', 'failed'];
  if (!body.status || !validStatuses.includes(body.status)) {
    return error('VALIDATION_ERROR', `Status invalido. Validos: ${validStatuses.join(', ')}`, 400);
  }

  const serviceClient = getServiceClient();

  // Atualizar status da mensagem pelo external_message_id
  const { data: updated, error: updateError } = await serviceClient
    .from('whatsapp_messages')
    .update({ status: body.status })
    .eq('external_message_id', body.external_message_id)
    .select('id, status')
    .maybeSingle();

  if (updateError) {
    console.error('[webhook] erro ao atualizar:', updateError.message);
    return error('INTERNAL_ERROR', 'Erro ao atualizar status', 500);
  }

  if (!updated) {
    console.warn(`[webhook] mensagem nao encontrada: external_message_id=${body.external_message_id}`);
    // Retorna 200 mesmo se nao encontrou (idempotente, evita retry infinito)
    return success({ matched: false });
  }

  console.log(`[webhook] mensagem ${updated.id} atualizada para status=${body.status}`);
  return success({ matched: true, id: updated.id, status: body.status });
}
