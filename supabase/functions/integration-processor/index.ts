import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { getServiceClient } from './_shared/supabase-client.ts';
import {
  getNextEvents,
  updateEventStatus,
  calculateNextRetry,
  MAX_ATTEMPTS,
} from './_shared/integration-client.ts';
import { createNotification } from './_shared/notification-helper.ts';
import { processDriveEvent } from './handlers/drive-handler.ts';
import { processN8nEvent } from './handlers/n8n-handler.ts';
import { processWhatsappEvent } from './handlers/whatsapp-handler.ts';

// ========================================================
// integration-processor — Processa fila de integration_events
// Invocado via pg_cron a cada minuto (sem JWT, sem CORS)
// ========================================================

Deno.serve(async (req: Request) => {
  // Apenas POST (pg_cron via pg_net)
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const body = await req.json().catch(() => ({}));
  const batchSize = Math.min(Number(body.batch_size) || 20, 50);

  const serviceClient = getServiceClient();

  // Buscar e travar proximo lote de eventos
  const events = await getNextEvents(serviceClient, batchSize);

  if (events.length === 0) {
    return new Response(JSON.stringify({ processed: 0, failed: 0, total: 0 }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  console.log(`[integration-processor] processando ${events.length} evento(s)`);

  let processed = 0;
  let failed = 0;

  // Processar sequencialmente (evita rate limits em APIs externas)
  for (const event of events) {
    try {
      let result: Record<string, unknown>;

      switch (event.event_type) {
        case 'drive_create_structure':
          result = await processDriveEvent(serviceClient, event);
          break;
        case 'n8n_webhook':
          result = await processN8nEvent(serviceClient, event);
          break;
        case 'whatsapp_send':
          result = await processWhatsappEvent(serviceClient, event);
          break;
        default:
          console.warn(`[integration-processor] tipo desconhecido: ${event.event_type}`);
          result = { skipped: true, reason: `Tipo desconhecido: ${event.event_type}` };
          break;
      }

      await updateEventStatus(serviceClient, event.id, 'completed', result);
      processed++;
      console.log(`[integration-processor] evento ${event.id} (${event.event_type}) concluido`);
    } catch (err) {
      failed++;
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error(`[integration-processor] evento ${event.id} falhou (tentativa ${event.attempts}): ${errMsg}`);

      if (event.attempts >= MAX_ATTEMPTS) {
        // Falha permanente — marcar como failed e notificar admin
        await updateEventStatus(serviceClient, event.id, 'failed', undefined, errMsg);
        await notifyAdminOfFailure(serviceClient, event.tenant_id, event, errMsg);
      } else {
        // Agendar retry com backoff exponencial
        // Status = 'retrying' para que o RPC lock_integration_events o pegue no next_retry_at
        const nextRetry = calculateNextRetry(event.attempts);
        await serviceClient
          .from('integration_events')
          .update({
            status: 'retrying',
            error_message: errMsg,
            next_retry_at: nextRetry.toISOString(),
            locked_at: null,
          })
          .eq('id', event.id);

        console.log(
          `[integration-processor] evento ${event.id} agendado para retry em ${nextRetry.toISOString()}`,
        );
      }
    }
  }

  console.log(
    `[integration-processor] batch concluido: ${processed} ok, ${failed} falhas, ${events.length} total`,
  );

  return new Response(
    JSON.stringify({ processed, failed, total: events.length }),
    { headers: { 'Content-Type': 'application/json' } },
  );
});

// Notifica admins do tenant sobre falha permanente de integracao
async function notifyAdminOfFailure(
  client: SupabaseClient,
  tenantId: string,
  event: { id: string; event_type: string; payload: Record<string, unknown> },
  errorMessage: string,
): Promise<void> {
  try {
    // Buscar admins/ceos do tenant
    const { data: admins } = await client
      .from('profiles')
      .select('id')
      .eq('tenant_id', tenantId)
      .in('role', ['admin', 'ceo'])
      .eq('is_active', true)
      .is('deleted_at', null);

    if (!admins || admins.length === 0) return;

    const jobId = (event.payload.job_id as string) || null;

    for (const admin of admins) {
      await createNotification(client, {
        tenant_id: tenantId,
        user_id: admin.id,
        type: 'integration_failed',
        priority: 'urgent',
        title: `Falha de integracao: ${event.event_type}`,
        body: errorMessage.slice(0, 300),
        metadata: { event_id: event.id, event_type: event.event_type },
        action_url: jobId ? `/jobs/${jobId}` : '/settings/integrations',
        job_id: jobId,
      });
    }
  } catch (notifErr) {
    console.error('[integration-processor] falha ao notificar admins:', notifErr);
  }
}

// Import type (Deno resolve via bundling)
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
