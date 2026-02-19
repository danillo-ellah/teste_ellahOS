import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type { IntegrationEvent } from '../../_shared/integration-client.ts';

// Stub: whatsapp_send sera implementado na Sub-fase 5.5
// Marca como completed para nao entupir a fila de retry
export async function processWhatsappEvent(
  _serviceClient: SupabaseClient,
  event: IntegrationEvent,
): Promise<Record<string, unknown>> {
  console.log(`[whatsapp-stub] evento ${event.id} recebido — implementar na Sub-fase 5.5`);

  return {
    skipped: true,
    reason: 'WhatsApp handler pendente (Sub-fase 5.5)',
    event_type: event.event_type,
  };
}
