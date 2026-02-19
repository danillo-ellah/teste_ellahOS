import { z } from 'https://esm.sh/zod@3.22.4';
import type { AuthContext } from '../../_shared/auth.ts';
import { getSupabaseClient } from '../../_shared/supabase-client.ts';
import { getSecret } from '../../_shared/vault.ts';
import {
  sendText,
  buildMessageFromTemplate,
  type WhatsAppTemplate,
} from '../../_shared/whatsapp-client.ts';
import { validate } from '../../_shared/validation.ts';
import { created } from '../../_shared/response.ts';
import { AppError } from '../../_shared/errors.ts';

// Schema de validacao para envio manual
const SendManualSchema = z.object({
  job_id: z.string().uuid('job_id deve ser UUID valido').optional().nullable(),
  phone: z.string().min(10, 'Telefone deve ter pelo menos 10 digitos'),
  recipient_name: z.string().optional().nullable(),
  template: z.string().min(1, 'Template ou mensagem obrigatoria'),
  // Dados opcionais para interpolacao de template
  data: z.record(z.union([z.string(), z.number()])).optional(),
});

// POST /whatsapp/send
// Envio manual de mensagem WhatsApp (apenas admin/ceo)
export async function sendManual(
  req: Request,
  auth: AuthContext,
): Promise<Response> {
  // Apenas admin/ceo
  if (!['admin', 'ceo'].includes(auth.role)) {
    throw new AppError('FORBIDDEN', 'Apenas admin/ceo podem enviar mensagens manuais', 403);
  }

  const body = await req.json().catch(() => ({}));
  const payload = validate(SendManualSchema, body);

  const supabase = getSupabaseClient(auth.token);

  // 1. Ler config do tenant
  const { data: tenant } = await supabase
    .from('tenants')
    .select('settings')
    .eq('id', auth.tenantId)
    .single();

  const settings = (tenant?.settings as Record<string, unknown>) ?? {};
  const integrations = (settings.integrations as Record<string, Record<string, unknown>>) ?? {};
  const waConfig = integrations['whatsapp'] ?? {};

  if (!waConfig.enabled) {
    throw new AppError('BUSINESS_RULE_VIOLATION', 'WhatsApp nao esta habilitado para este tenant', 422);
  }

  const instanceUrl = waConfig.instance_url as string | null;
  const instanceName = waConfig.instance_name as string | null;

  if (!instanceUrl || !instanceName) {
    throw new AppError('BUSINESS_RULE_VIOLATION', 'WhatsApp: instance_url ou instance_name nao configurados', 422);
  }

  // 2. Ler API key do Vault (service client para acessar)
  const { getServiceClient } = await import('../../_shared/supabase-client.ts');
  const serviceClient = getServiceClient();
  const apiKey = await getSecret(serviceClient, `${auth.tenantId}_whatsapp_api_key`);
  if (!apiKey) {
    throw new AppError('BUSINESS_RULE_VIOLATION', 'API key do WhatsApp nao encontrada', 422);
  }

  // 3. Construir mensagem
  const message = buildMessageFromTemplate(
    payload.template as WhatsAppTemplate | string,
    (payload.data ?? {}) as Record<string, string | number>,
  );

  // 4. Enviar via Evolution API
  let externalMessageId: string | null = null;
  let finalStatus: 'sent' | 'failed' = 'sent';
  let sendError: string | undefined;

  try {
    const result = await sendText({
      instanceUrl,
      instanceName,
      apiKey,
      phone: payload.phone,
      message,
    });
    externalMessageId = result.externalMessageId;
  } catch (err) {
    sendError = err instanceof Error ? err.message : String(err);
    finalStatus = 'failed';
  }

  // 5. Persistir em whatsapp_messages (service client para bypass RLS no INSERT)
  const { error: insertError } = await serviceClient
    .from('whatsapp_messages')
    .insert({
      tenant_id: auth.tenantId,
      job_id: payload.job_id ?? null,
      phone: payload.phone,
      recipient_name: payload.recipient_name ?? null,
      message,
      status: finalStatus,
      provider: 'evolution',
      external_message_id: externalMessageId,
      sent_at: finalStatus === 'sent' ? new Date().toISOString() : null,
    });

  if (insertError) {
    console.error('[send-manual] falha ao inserir whatsapp_messages:', insertError.message);
  }

  // 6. Se falhou, lancar erro (apos persistir registro)
  if (sendError) {
    throw new AppError('INTERNAL_ERROR', `Falha ao enviar: ${sendError}`, 500);
  }

  return created({
    phone: payload.phone,
    template: payload.template,
    external_message_id: externalMessageId,
    status: finalStatus,
  });
}
