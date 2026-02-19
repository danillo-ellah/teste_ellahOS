import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type { IntegrationEvent } from '../../_shared/integration-client.ts';
import { getSecret } from '../../_shared/vault.ts';
import {
  sendText,
  buildMessageFromTemplate,
  type WhatsAppTemplate,
} from '../../_shared/whatsapp-client.ts';

// Handler: processa evento whatsapp_send
// Le config do tenant, constroi mensagem de template, envia via Evolution API,
// registra em whatsapp_messages. Re-throw em falha para retry com backoff.
export async function processWhatsappEvent(
  serviceClient: SupabaseClient,
  event: IntegrationEvent,
): Promise<Record<string, unknown>> {
  const { payload, tenant_id: tenantId } = event;

  // 1. Ler config do tenant
  const { data: tenant } = await serviceClient
    .from('tenants')
    .select('settings')
    .eq('id', tenantId)
    .single();

  const settings = (tenant?.settings as Record<string, unknown>) ?? {};
  const integrations = (settings.integrations as Record<string, Record<string, unknown>>) ?? {};
  const waConfig = integrations['whatsapp'] ?? {};

  // 2. Verificar se habilitado
  if (!waConfig.enabled) {
    console.log(`[whatsapp-handler] WhatsApp desabilitado para tenant ${tenantId}, pulando`);
    return { skipped: true, reason: 'WhatsApp desabilitado' };
  }

  const instanceUrl = waConfig.instance_url as string | null;
  const instanceName = waConfig.instance_name as string | null;

  if (!instanceUrl || !instanceName) {
    throw new Error('WhatsApp: instance_url ou instance_name nao configurados');
  }

  // 3. Ler API key do Vault
  const apiKey = await getSecret(serviceClient, `${tenantId}_whatsapp_api_key`);
  if (!apiKey) {
    throw new Error('WhatsApp: API key nao encontrada no Vault');
  }

  // 4. Extrair campos do payload
  const phone = payload.phone as string | null;
  const recipientName = (payload.recipient_name as string) ?? null;
  const template = payload.template as WhatsAppTemplate | string | null;
  const jobId = (payload.job_id as string) ?? null;

  if (!phone) throw new Error('WhatsApp: campo "phone" ausente no payload');
  if (!template) throw new Error('WhatsApp: campo "template" ausente no payload');

  // 5. Construir mensagem
  const message = buildMessageFromTemplate(
    template,
    payload as Record<string, string | number>,
  );

  console.log(`[whatsapp-handler] enviando "${template}" para ${phone} (job: ${jobId})`);

  // 6. Chamar Evolution API
  let externalMessageId: string | null = null;
  let finalStatus: 'sent' | 'failed' = 'sent';
  let sendError: string | undefined;

  try {
    const result = await sendText({ instanceUrl, instanceName, apiKey, phone, message });
    externalMessageId = result.externalMessageId;
  } catch (err) {
    sendError = err instanceof Error ? err.message : String(err);
    finalStatus = 'failed';
  }

  // 7. INSERT em whatsapp_messages (service client bypassa RLS)
  const { error: insertError } = await serviceClient
    .from('whatsapp_messages')
    .insert({
      tenant_id: tenantId,
      job_id: jobId,
      phone,
      recipient_name: recipientName,
      message,
      status: finalStatus,
      provider: 'evolution',
      external_message_id: externalMessageId,
      sent_at: finalStatus === 'sent' ? new Date().toISOString() : null,
    });

  if (insertError) {
    console.error('[whatsapp-handler] falha ao inserir whatsapp_messages:', insertError.message);
  }

  // 8. Re-throw erro de envio (apos persistir registro) para retry
  if (sendError) {
    throw new Error(sendError);
  }

  return {
    phone,
    template,
    external_message_id: externalMessageId,
    status: finalStatus,
  };
}
