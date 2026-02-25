import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type { IntegrationEvent } from '../../_shared/integration-client.ts';

// Handler: processa evento n8n_webhook
// Faz POST para o webhook URL configurado nas settings do tenant
export async function processN8nEvent(
  serviceClient: SupabaseClient,
  event: IntegrationEvent,
): Promise<Record<string, unknown>> {
  const workflow = (event.payload.workflow as string) || '';

  if (!workflow) {
    throw new Error('n8n_webhook: campo "workflow" ausente no payload');
  }

  // Ler webhook URLs do tenant
  const { data: tenant } = await serviceClient
    .from('tenants')
    .select('settings')
    .eq('id', event.tenant_id)
    .single();

  const settings = (tenant?.settings as Record<string, unknown>) || {};
  const integrations = (settings.integrations as Record<string, Record<string, unknown>>) || {};
  const n8nConfig = integrations['n8n'] || {};

  if (!n8nConfig.enabled) {
    console.log(`[n8n-handler] n8n desabilitado para tenant ${event.tenant_id}, pulando`);
    return { skipped: true, reason: 'n8n desabilitado' };
  }

  const webhooks = (n8nConfig.webhooks as Record<string, string | null>) || {};

  // Converter nome do workflow para chave do webhook:
  // 'wf-job-approved' → 'job_approved'
  const webhookKey = workflow
    .replace(/^wf-/, '')
    .replace(/-/g, '_');

  const webhookUrl = webhooks[webhookKey];

  if (!webhookUrl) {
    throw new Error(`Webhook URL nao configurada para workflow: ${workflow} (chave: ${webhookKey})`);
  }

  console.log(`[n8n-handler] POST ${webhookKey} → ${webhookUrl}`);

  // C3 fix: enviar auth header para prevenir SSRF e acesso nao autorizado
  const webhookSecret = (n8nConfig.webhook_secret as string) ?? null;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (webhookSecret) {
    headers['X-Webhook-Secret'] = webhookSecret;
  }

  const resp = await fetch(webhookUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      ...event.payload,
      tenant_id: event.tenant_id,
      event_id: event.id,
      timestamp: new Date().toISOString(),
    }),
    signal: AbortSignal.timeout(30000),
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(`n8n webhook ${webhookKey} retornou HTTP ${resp.status}: ${text.slice(0, 300)}`);
  }

  const responseBody = await resp.json().catch(() => ({}));

  return {
    webhook_key: webhookKey,
    http_status: resp.status,
  };
}
