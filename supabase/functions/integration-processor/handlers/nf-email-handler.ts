import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type { IntegrationEvent } from '../../_shared/integration-client.ts';

// Handler: processa evento nf_email_send
// Delega o envio de email de pedido de NF para o workflow n8n wf-nf-request
// que envia via Gmail API com a credencial OAuth2 configurada.
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
  const n8nPayload = {
    tenant_id: tenantId,
    event_id: event.id,
    supplier_email: supplierEmail,
    supplier_name: supplierName ?? '',
    items: event.payload.items ?? [],
    custom_message: event.payload.custom_message ?? '',
    company_data: event.payload.company_data ?? {},
    html_body: event.payload.html_body ?? '',
    subject: event.payload.subject ?? 'Ellah Filmes - Pedido de Nota Fiscal',
    financial_record_ids: event.payload.financial_record_ids ?? [],
    timestamp: new Date().toISOString(),
  };

  console.log(`[nf-email-handler] POST nf_request → ${webhookUrl}`);

  const resp = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(n8nPayload),
    signal: AbortSignal.timeout(30000),
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(`n8n webhook nf_request retornou HTTP ${resp.status}: ${text.slice(0, 300)}`);
  }

  const responseBody = await resp.json().catch(() => ({}));

  // Atualizar status dos financial_records enviados
  const recordIds = (event.payload.financial_record_ids as string[]) ?? [];
  if (recordIds.length > 0) {
    const { error: updateError } = await serviceClient
      .from('financial_records')
      .update({
        nf_request_status: 'enviado',
        nf_request_sent_at: new Date().toISOString(),
      })
      .in('id', recordIds)
      .eq('tenant_id', tenantId);

    if (updateError) {
      console.warn(`[nf-email-handler] falha ao atualizar financial_records: ${updateError.message}`);
    } else {
      console.log(`[nf-email-handler] ${recordIds.length} financial_records atualizados para 'enviado'`);
    }
  }

  console.log(`[nf-email-handler] email de NF enviado para ${supplierEmail}`);

  return {
    supplier_email: supplierEmail,
    webhook_url: webhookUrl,
    http_status: resp.status,
    records_updated: recordIds.length,
    response: responseBody,
  };
}
