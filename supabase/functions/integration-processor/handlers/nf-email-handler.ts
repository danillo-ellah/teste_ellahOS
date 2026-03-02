import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type { IntegrationEvent } from '../../_shared/integration-client.ts';
import { sendFallbackEmail } from '../../_shared/email-fallback.ts';

// Handler: processa evento nf_email_send
// Canal primario: n8n wf-nf-request (Gmail OAuth2).
// Canal de fallback: Resend API — ativado automaticamente quando o n8n esta indisponivel
//   e o evento ja esgotou as retries do integration-processor (attempts >= MAX_ATTEMPTS).
//   Neste handler o fallback e usado apenas como tentativa imediata na ultima chamada;
//   o fallback definitivo por exaustao de retries ocorre em index.ts.
export async function processNfEmailEvent(
  serviceClient: SupabaseClient,
  event: IntegrationEvent,
): Promise<Record<string, unknown>> {
  const tenantId = event.tenant_id;
  const supplierEmail = event.payload.supplier_email as string;
  const supplierName = event.payload.supplier_name as string;

  if (!supplierEmail) {
    throw new Error('nf_email_send: supplier_email ausente no payload');
  }

  console.log(`[nf-email-handler] enviando pedido de NF para ${supplierEmail}`);

  // Ler webhook URL do n8n para wf-nf-request
  const { data: tenant } = await serviceClient
    .from('tenants')
    .select('settings')
    .eq('id', tenantId)
    .single();

  const settings = (tenant?.settings as Record<string, unknown>) ?? {};
  const integrations = (settings.integrations as Record<string, Record<string, unknown>>) ?? {};
  const n8nConfig = integrations['n8n'] ?? {};

  if (!n8nConfig.enabled) {
    console.log(`[nf-email-handler] n8n desabilitado para tenant ${tenantId}`);
    return { skipped: true, reason: 'n8n desabilitado' };
  }

  const webhooks = (n8nConfig.webhooks as Record<string, string | null>) ?? {};
  const webhookUrl = webhooks['nf_request'];

  if (!webhookUrl) {
    throw new Error(
      'nf_email_send: webhook URL "nf_request" nao configurada em tenant.settings.integrations.n8n.webhooks',
    );
  }

  // Preparar payload para o n8n
  // Campos alinhados com request-send.ts (producer): email_html, email_subject, email_text
  const n8nPayload = {
    tenant_id: tenantId,
    event_id: event.id,
    supplier_email: supplierEmail,
    supplier_name: supplierName ?? '',
    email_html: event.payload.email_html ?? '',
    email_subject: event.payload.email_subject ?? 'Ellah Filmes - Pedido de Nota Fiscal',
    email_text: event.payload.email_text ?? '',
    reply_to: event.payload.reply_to ?? null,
    financial_record_ids: event.payload.financial_record_ids ?? [],
    timestamp: new Date().toISOString(),
  };

  // C3 fix: enviar auth header para prevenir SSRF e acesso nao autorizado
  const webhookSecret = (n8nConfig.webhook_secret as string) ?? null;
  const reqHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
  if (webhookSecret) {
    reqHeaders['X-Webhook-Secret'] = webhookSecret;
  }

  console.log(`[nf-email-handler] POST nf_request → ${webhookUrl}`);

  const resp = await fetch(webhookUrl, {
    method: 'POST',
    headers: reqHeaders,
    body: JSON.stringify(n8nPayload),
    signal: AbortSignal.timeout(30000),
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(`n8n webhook nf_request retornou HTTP ${resp.status}: ${text.slice(0, 300)}`);
  }

  await resp.json().catch(() => ({}));

  // Nota: nf_request_status ja foi atualizado para 'enviado' pelo request-send.ts
  // Nao duplicar o update aqui para evitar race condition (H4 fix)

  console.log(`[nf-email-handler] email de NF enviado para ${supplierEmail}`);

  return {
    supplier_email: supplierEmail,
    http_status: resp.status,
    channel: 'n8n',
  };
}

/**
 * Tenta enviar o email de pedido de NF diretamente via Resend (fallback).
 * Deve ser chamado apenas quando o n8n esta definitivamente indisponivel
 * (apos exaustao de retries no integration-processor).
 *
 * Retorna { sent, channel } para compor o result do evento.
 */
export async function sendNfEmailFallback(
  event: IntegrationEvent,
): Promise<{ sent: boolean; channel: string }> {
  const supplierEmail = event.payload.supplier_email as string;
  const supplierName = (event.payload.supplier_name as string) ?? '';

  if (!supplierEmail) {
    console.warn('[nf-email-handler] fallback ignorado: supplier_email ausente no payload');
    return { sent: false, channel: 'none' };
  }

  // Usa o HTML e subject pre-montados pelo request-send.ts (estao no payload)
  const subject =
    (event.payload.email_subject as string) || 'Ellah Filmes - Pedido de Nota Fiscal';
  const html = (event.payload.email_html as string) || '';
  const text = (event.payload.email_text as string) || undefined;
  const replyTo = (event.payload.reply_to as string) || undefined;

  if (!html) {
    console.warn(
      `[nf-email-handler] fallback: email_html ausente no payload do evento ${event.id} — enviando template basico`,
    );
  }

  console.log(
    `[nf-email-handler] ativando fallback Resend para pedido de NF de ${supplierName} <${supplierEmail}>`,
  );

  const sent = await sendFallbackEmail(supplierEmail, subject, html || _buildMinimalNfHtml(supplierName), {
    reply_to: replyTo,
    text,
  });

  return { sent, channel: sent ? 'resend_fallback' : 'none' };
}

// HTML minimalista caso email_html nao esteja no payload (situacao de emergencia)
function _buildMinimalNfHtml(supplierName: string): string {
  const safe = supplierName.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8"/></head>
<body style="font-family:Arial,sans-serif;color:#111;padding:32px;">
  <h2 style="color:#09090b;">Solicitacao de Nota Fiscal</h2>
  <p>Prezado(a) <strong>${safe}</strong>,</p>
  <p>
    Voce tem uma solicitacao de nota fiscal pendente.<br/>
    Por favor, acesse o sistema ou entre em contato com o financeiro da Ellah Filmes.
  </p>
  <p style="color:#6b7280;font-size:12px;">
    Este email foi enviado pelo sistema ELLAHOS em modo de contingencia.<br/>
    Em caso de duvidas, contate o financeiro da Ellah Filmes.
  </p>
</body>
</html>`;
}
