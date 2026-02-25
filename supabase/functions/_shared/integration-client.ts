import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Tipos de eventos de integracao suportados (espelha o ENUM do banco)
export const EVENT_TYPES = [
  'drive_create_structure',
  'whatsapp_send',
  'n8n_webhook',
  'nf_request_sent',
  'nf_received',
  'nf_validated',
  'docuseal_submission_created',
  'docuseal_submission_signed',
  'docuseal_submission_failed',
  // Fase 9: novos event_types para automacoes operacionais
  'nf_email_send',
  'docuseal_create_batch',
  'pdf_generate',
  'drive_copy_templates',
] as const;

export type IntegrationEventType = (typeof EVENT_TYPES)[number];

// Status possiveis de um evento na fila
export const EVENT_STATUSES = [
  'pending',
  'processing',
  'completed',
  'failed',
] as const;

export type IntegrationEventStatus = (typeof EVENT_STATUSES)[number];

// Representa um registro na tabela integration_events
export interface IntegrationEvent {
  id: string;
  tenant_id: string;
  event_type: IntegrationEventType;
  payload: Record<string, unknown>;
  status: IntegrationEventStatus;
  attempts: number;
  locked_at: string | null;
  started_at: string | null;
  processed_at: string | null;
  error_message: string | null;
  next_retry_at: string | null;
  result: Record<string, unknown> | null;
  idempotency_key: string | null;
  created_at: string;
}

// Numero maximo de tentativas antes de marcar como failed
export const MAX_ATTEMPTS = 7;

// Delays de backoff em segundos (sem jitter — jitter aplicado em calculateNextRetry)
// indices: [tentativa_0, tentativa_1, tentativa_2, tentativa_3, tentativa_4, tentativa_5]
export const BACKOFF_DELAYS = [0, 60, 300, 900, 3600, 14400] as const;

// Calcula a proxima data de retry com jitter de +/- 20% para evitar thundering herd.
// Se attempts >= BACKOFF_DELAYS.length, usa o ultimo delay definido.
export function calculateNextRetry(attempts: number): Date {
  const delayIndex = Math.min(attempts, BACKOFF_DELAYS.length - 1);
  const baseDelay = BACKOFF_DELAYS[delayIndex];

  // Jitter de +/- 20% do delay base
  const jitterFactor = 0.8 + Math.random() * 0.4; // [0.8, 1.2)
  const delayWithJitter = Math.round(baseDelay * jitterFactor);

  const nextRetry = new Date();
  nextRetry.setSeconds(nextRetry.getSeconds() + delayWithJitter);
  return nextRetry;
}

// Enfileira um novo evento de integracao.
// Usa idempotency_key para evitar duplicatas: ON CONFLICT retorna o id ja existente.
// Retorna o id do evento (criado ou pre-existente).
export async function enqueueEvent(
  client: SupabaseClient,
  event: Pick<IntegrationEvent, 'tenant_id' | 'event_type' | 'payload'> & {
    idempotency_key?: string;
  },
): Promise<string> {
  const idempotencyKey = event.idempotency_key ?? null;

  // Tenta inserir; se conflito de idempotency_key, retorna o registro existente
  const { data: inserted, error: insertError } = await client
    .from('integration_events')
    .insert({
      tenant_id: event.tenant_id,
      event_type: event.event_type,
      payload: event.payload,
      status: 'pending' as IntegrationEventStatus,
      attempts: 0,
      idempotency_key: idempotencyKey,
    })
    .select('id')
    .single();

  if (!insertError && inserted) {
    console.log(
      `[integration-client] evento "${event.event_type}" enfileirado com id ${inserted.id}`,
    );
    return inserted.id as string;
  }

  // Verifica se o erro e de conflito de idempotency_key (codigo 23505 = unique_violation)
  if (insertError?.code === '23505' && idempotencyKey) {
    const { data: existing, error: selectError } = await client
      .from('integration_events')
      .select('id')
      .eq('idempotency_key', idempotencyKey)
      .single();

    if (!selectError && existing) {
      console.log(
        `[integration-client] evento "${event.event_type}" ja existia (idempotency_key: ${idempotencyKey}), retornando id ${existing.id}`,
      );
      return existing.id as string;
    }
  }

  console.error(
    `[integration-client] falha ao enfileirar evento "${event.event_type}": ${insertError?.message}`,
  );
  throw new Error(`Falha ao enfileirar evento de integracao: ${insertError?.message}`);
}

// Atualiza o status de um evento de integracao.
// Aceita opcionalmente o resultado e mensagem de erro.
export async function updateEventStatus(
  client: SupabaseClient,
  eventId: string,
  status: IntegrationEventStatus,
  result?: Record<string, unknown>,
  errorMessage?: string,
): Promise<void> {
  const updates: Record<string, unknown> = { status };

  if (status === 'completed' || status === 'failed') {
    updates.processed_at = new Date().toISOString();
  }

  if (result !== undefined) {
    updates.result = result;
  }

  if (errorMessage !== undefined) {
    updates.error_message = errorMessage;
  }

  // Limpa o lock ao finalizar
  if (status === 'completed' || status === 'failed') {
    updates.locked_at = null;
  }

  const { error } = await client
    .from('integration_events')
    .update(updates)
    .eq('id', eventId);

  if (error) {
    console.error(
      `[integration-client] falha ao atualizar status do evento ${eventId}: ${error.message}`,
    );
  } else {
    console.log(`[integration-client] evento ${eventId} atualizado para status "${status}"`);
  }
}

// Busca o proximo lote de eventos pendentes com lock atomico.
// Usa FOR UPDATE SKIP LOCKED para seguranca em ambiente concorrente.
// Eventos travados ha mais de 5 minutos sao elegidos novamente (worker morreu).
export async function getNextEvents(
  client: SupabaseClient,
  batchSize: number,
): Promise<IntegrationEvent[]> {
  // O lock atomico e feito via SQL bruto para garantir FOR UPDATE SKIP LOCKED.
  // A query atualiza locked_at e retorna os registros de uma vez (atomic fetch-and-lock).
  const { data, error } = await client.rpc('lock_integration_events', {
    p_batch_size: batchSize,
  });

  if (error) {
    console.error(`[integration-client] falha ao buscar proximos eventos: ${error.message}`);
    // Fallback: retorna array vazio para nao quebrar o processor
    return [];
  }

  const events = (data ?? []) as IntegrationEvent[];
  console.log(`[integration-client] ${events.length} evento(s) bloqueados para processamento`);
  return events;
}
