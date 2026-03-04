// ========================================================
// whatsapp-notify — Helper de alto nivel para notificacoes WhatsApp
// Usado por triggers, cron jobs e automacoes (nao por requests de usuario)
// Usa getServiceClient() para bypass RLS
// ========================================================

import { getServiceClient } from './supabase-client.ts';
import { getSecret } from './vault.ts';
import {
  sendText as evolutionSendText,
  buildMessageFromTemplate,
  type WhatsAppTemplate,
} from './whatsapp-client.ts';
import {
  sendText as zapiSendText,
  type ZapiConfig,
} from './zapi-client.ts';

// --- Types ---

export interface NotifyOpts {
  tenantId: string;
  jobId?: string;
  phone: string;
  recipientName?: string;
  // Nome do template ou mensagem literal
  template: WhatsAppTemplate | string;
  // Dados para interpolacao das variaveis {key} do template
  data?: Record<string, string | number>;
}

export interface NotifyResult {
  success: boolean;
  provider: 'zapi' | 'evolution';
  externalMessageId: string | null;
  error?: string;
}

// --- sendWhatsAppNotification ---
// 1. Le config WhatsApp do tenant (tabela tenants.settings.integrations.whatsapp)
// 2. Escolhe o provider correto (Z-API se provider='zapi'; Evolution se nao configurado)
// 3. Constroi mensagem a partir do template
// 4. Envia via API do provider
// 5. Persiste registro em whatsapp_messages (service client, bypass RLS)
// 6. Retorna true em sucesso, false em falha (nunca lanca excecao)
export async function sendWhatsAppNotification(opts: NotifyOpts): Promise<boolean> {
  const serviceClient = getServiceClient();

  // 1. Ler config do tenant
  const { data: tenant, error: tenantError } = await serviceClient
    .from('tenants')
    .select('settings')
    .eq('id', opts.tenantId)
    .single();

  if (tenantError || !tenant) {
    console.error(
      `[whatsapp-notify] falha ao ler tenant ${opts.tenantId}: ${tenantError?.message}`,
    );
    return false;
  }

  const settings = (tenant.settings as Record<string, unknown>) ?? {};
  const integrations = (settings.integrations as Record<string, Record<string, unknown>>) ?? {};
  const waConfig = integrations['whatsapp'] ?? {};

  if (!waConfig.enabled) {
    console.warn(`[whatsapp-notify] WhatsApp desabilitado para tenant ${opts.tenantId} — notificacao ignorada`);
    return false;
  }

  // 2. Determina o provider
  const provider: 'zapi' | 'evolution' =
    (waConfig.provider as string | undefined) === 'zapi' ? 'zapi' : 'evolution';

  // 3. Constroi mensagem
  const message = buildMessageFromTemplate(
    opts.template,
    (opts.data ?? {}) as Record<string, string | number>,
  );

  // 4. Envia via provider correto
  const result = await _sendViaProvider({
    provider,
    waConfig,
    tenantId: opts.tenantId,
    phone: opts.phone,
    message,
    serviceClient,
  });

  console.log(
    `[whatsapp-notify] envio via ${provider} — status: ${result.success ? 'ok' : 'falhou'}, phone: ${opts.phone}, template: ${opts.template}`,
  );

  // 5. Persistir em whatsapp_messages independente de sucesso/falha
  const { error: insertError } = await serviceClient
    .from('whatsapp_messages')
    .insert({
      tenant_id: opts.tenantId,
      job_id: opts.jobId ?? null,
      phone: opts.phone,
      recipient_name: opts.recipientName ?? null,
      message,
      status: result.success ? 'sent' : 'failed',
      provider,
      external_message_id: result.externalMessageId,
      sent_at: result.success ? new Date().toISOString() : null,
    });

  if (insertError) {
    console.error('[whatsapp-notify] falha ao inserir whatsapp_messages:', insertError.message);
  }

  return result.success;
}

// --- _sendViaProvider ---
// Funcao interna: despacha para o cliente certo e retorna resultado padronizado
async function _sendViaProvider(opts: {
  provider: 'zapi' | 'evolution';
  waConfig: Record<string, unknown>;
  tenantId: string;
  phone: string;
  message: string;
  serviceClient: ReturnType<typeof getServiceClient>;
}): Promise<NotifyResult> {
  const { provider, waConfig, tenantId, phone, message, serviceClient } = opts;

  if (provider === 'zapi') {
    const instanceId = waConfig.instance_id as string | null;
    const token = waConfig.token as string | null;

    if (!instanceId || !token) {
      const err = 'Z-API: instance_id ou token ausentes na config do tenant';
      console.error(`[whatsapp-notify] ${err}`);
      return { success: false, provider, externalMessageId: null, error: err };
    }

    const clientToken = await getSecret(serviceClient, `${tenantId}_zapi_client_token`);
    if (!clientToken) {
      const err = 'Z-API client_token nao encontrado no Vault';
      console.error(`[whatsapp-notify] ${err}`);
      return { success: false, provider, externalMessageId: null, error: err };
    }

    const zapiConfig: ZapiConfig = { instanceId, token, clientToken };
    const result = await zapiSendText({ config: zapiConfig, phone, text: message });

    return {
      success: result.success,
      provider,
      externalMessageId: result.externalMessageId,
      error: result.error,
    };
  }

  // Evolution API (default)
  const instanceUrl = waConfig.instance_url as string | null;
  const instanceName = waConfig.instance_name as string | null;

  if (!instanceUrl || !instanceName) {
    const err = 'Evolution: instance_url ou instance_name ausentes na config do tenant';
    console.error(`[whatsapp-notify] ${err}`);
    return { success: false, provider, externalMessageId: null, error: err };
  }

  const apiKey = await getSecret(serviceClient, `${tenantId}_whatsapp_api_key`);
  if (!apiKey) {
    const err = 'Evolution API key nao encontrada no Vault';
    console.error(`[whatsapp-notify] ${err}`);
    return { success: false, provider, externalMessageId: null, error: err };
  }

  try {
    const result = await evolutionSendText({ instanceUrl, instanceName, apiKey, phone, message });
    return { success: true, provider, externalMessageId: result.externalMessageId };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, provider, externalMessageId: null, error: msg };
  }
}
