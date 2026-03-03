import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createNotification } from '../../_shared/notification-helper.ts';

// ========================================================
// frameio-webhook.ts
// Handler para webhooks recebidos do Frame.io
//
// Eventos suportados:
//   review.approved    -> atualiza deliverable para 'aprovado'
//   review.rejected    -> atualiza deliverable para 'aguardando_aprovacao'
//   comment.created    -> cria notificacao in-app para a equipe do job
//
// Mapeamento asset -> deliverable:
//   1. Via metadata do asset: asset.properties.custom_fields.ellahos_deliverable_id
//   2. Via naming convention: asset.name contem o deliverable.id (primeiros 8 chars UUID)
//
// A funcao retorna um objeto de resultado compativel com o processador de eventos.
// ========================================================

// Tipos de evento Frame.io suportados
type FrameioEventType = 'review.approved' | 'review.rejected' | 'comment.created';

// Payload do webhook Frame.io (campos relevantes)
interface FrameioWebhookPayload {
  event_type: FrameioEventType;
  resource?: {
    id?: string;
    name?: string;
    properties?: {
      custom_fields?: {
        ellahos_deliverable_id?: string;
        ellahos_job_id?: string;
      };
      parent?: { id?: string };
    };
  };
  comment?: {
    id?: string;
    text?: string;
    author?: { name?: string; email?: string };
    timestamp?: number;
  };
  // Assinatura do webhook para validacao opcional
  signature?: string;
}

// Resultado do processamento
interface FrameioHandlerResult {
  event_type: string;
  deliverable_id?: string | null;
  job_id?: string | null;
  action?: string;
  notifications_sent?: number;
  skipped?: boolean;
  reason?: string;
}

// Mapa de status Frame.io para DeliverableStatus do ELLAHOS
const REVIEW_STATUS_MAP: Record<'review.approved' | 'review.rejected', string> = {
  'review.approved': 'aprovado',
  'review.rejected': 'aguardando_aprovacao',
};

/**
 * Tenta encontrar o deliverable_id a partir do payload do Frame.io.
 * Estrategia 1: campo custom_fields.ellahos_deliverable_id (mais confiavel).
 * Estrategia 2: asset.name contem os primeiros 8 caracteres de um UUID valido.
 */
function extractDeliverableHint(payload: FrameioWebhookPayload): {
  deliverable_id: string | null;
  job_id: string | null;
} {
  const customFields = payload.resource?.properties?.custom_fields;
  const deliverableId = customFields?.ellahos_deliverable_id ?? null;
  const jobId = customFields?.ellahos_job_id ?? null;

  if (deliverableId) {
    return { deliverable_id: deliverableId, job_id: jobId };
  }

  // Fallback: tentar extrair UUID do nome do asset (convenção de nomes)
  // Convenção esperada: "DELIVERABLE_<uuid>" ou nome que começa com 8 chars hex
  const assetName = payload.resource?.name ?? '';
  const uuidPrefixMatch = assetName.match(/[0-9a-f]{8}-?[0-9a-f]{4}/i);
  if (uuidPrefixMatch) {
    // Apenas logar hint — precisaremos buscar no banco pelo prefixo
    console.log('[frameio-webhook] hint UUID encontrado no nome do asset:', uuidPrefixMatch[0]);
  }

  return { deliverable_id: null, job_id: jobId };
}

/**
 * Busca o deliverable no banco pelo ID exato ou por prefixo do UUID.
 * Retorna null se nao encontrado.
 */
async function resolveDeliverable(
  client: SupabaseClient,
  payload: FrameioWebhookPayload,
): Promise<{ id: string; job_id: string; description: string; tenant_id: string } | null> {
  const { deliverable_id, job_id } = extractDeliverableHint(payload);

  if (deliverable_id) {
    // Busca direta por ID (UUID completo)
    let query = client
      .from('job_deliverables')
      .select('id, job_id, description, tenant_id')
      .eq('id', deliverable_id)
      .maybeSingle();

    const { data } = await query;
    if (data) return data;
  }

  // Fallback: buscar pelo job_id + prefixo do nome do asset
  if (job_id) {
    const assetName = payload.resource?.name ?? '';
    if (assetName.length >= 8) {
      // Busca por review_url contendo o nome do asset (Frame.io popula review_url)
      const { data: deliverables } = await client
        .from('job_deliverables')
        .select('id, job_id, description, tenant_id')
        .eq('job_id', job_id)
        .not('review_url', 'is', null)
        .ilike('review_url', `%${assetName.slice(0, 32)}%`)
        .limit(1);

      if (deliverables && deliverables.length > 0) {
        return deliverables[0];
      }
    }
  }

  return null;
}

/**
 * Processa evento review.approved ou review.rejected do Frame.io.
 * Atualiza o status do deliverable correspondente.
 */
async function processReviewEvent(
  client: SupabaseClient,
  payload: FrameioWebhookPayload,
  eventType: 'review.approved' | 'review.rejected',
): Promise<FrameioHandlerResult> {
  const deliverable = await resolveDeliverable(client, payload);

  if (!deliverable) {
    console.warn('[frameio-webhook] deliverable nao encontrado para evento de review', {
      event_type: eventType,
      asset_id: payload.resource?.id,
      asset_name: payload.resource?.name,
    });
    return {
      event_type: eventType,
      deliverable_id: null,
      skipped: true,
      reason: 'Deliverable nao encontrado para o asset Frame.io',
    };
  }

  const newStatus = REVIEW_STATUS_MAP[eventType];

  const { error: updateError } = await client
    .from('job_deliverables')
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq('id', deliverable.id)
    .eq('tenant_id', deliverable.tenant_id);

  if (updateError) {
    console.error('[frameio-webhook] erro ao atualizar deliverable:', updateError.message);
    throw new Error(`Erro ao atualizar deliverable: ${updateError.message}`);
  }

  console.log('[frameio-webhook] deliverable atualizado', {
    id: deliverable.id,
    new_status: newStatus,
    event_type: eventType,
  });

  // Notificar admins e producao do job sobre a revisao
  let notificationsSent = 0;
  try {
    notificationsSent = await notifyJobAdmins(client, deliverable, eventType);
  } catch (notifErr) {
    // Falha em notificacao nao invalida o processamento
    console.warn('[frameio-webhook] falha ao enviar notificacoes:', notifErr);
  }

  return {
    event_type: eventType,
    deliverable_id: deliverable.id,
    job_id: deliverable.job_id,
    action: `status_updated_to_${newStatus}`,
    notifications_sent: notificationsSent,
  };
}

/**
 * Processa evento comment.created do Frame.io.
 * Cria notificacao in-app para admins/producao do job.
 */
async function processCommentEvent(
  client: SupabaseClient,
  payload: FrameioWebhookPayload,
): Promise<FrameioHandlerResult> {
  const deliverable = await resolveDeliverable(client, payload);

  const commentText = payload.comment?.text ?? '';
  const commentAuthor = payload.comment?.author?.name ?? 'Cliente';

  if (!deliverable) {
    console.warn('[frameio-webhook] deliverable nao encontrado para comentario', {
      asset_id: payload.resource?.id,
    });
    // Comentarios sem deliverable resolvido: skip sem erro
    return {
      event_type: 'comment.created',
      deliverable_id: null,
      skipped: true,
      reason: 'Deliverable nao encontrado — comentario ignorado',
    };
  }

  let notificationsSent = 0;
  try {
    // Buscar admins/producao do job para notificar
    const { data: teamWithProfiles } = await client
      .from('job_team')
      .select('people!inner(profile_id)')
      .eq('job_id', deliverable.job_id)
      .in('role', ['admin', 'ceo', 'produtor_executivo', 'coordenador_producao'])
      .is('deleted_at', null);

    const profileIds = (teamWithProfiles ?? [])
      .map((m) => (m.people as unknown as { profile_id: string | null } | null)?.profile_id)
      .filter((id): id is string => !!id);

    for (const profileId of profileIds) {
      await createNotification(client, {
        tenant_id: deliverable.tenant_id,
        user_id: profileId,
        type: 'status_changed',
        priority: 'normal',
        title: `Frame.io: novo comentario de ${commentAuthor}`,
        body: commentText.slice(0, 300) || 'Comentario sem texto',
        metadata: {
          frameio_asset_id: payload.resource?.id,
          deliverable_id: deliverable.id,
          author: commentAuthor,
          comment_id: payload.comment?.id,
        },
        action_url: `/jobs/${deliverable.job_id}?tab=entregaveis`,
        job_id: deliverable.job_id,
      });
      notificationsSent++;
    }
  } catch (notifErr) {
    console.warn('[frameio-webhook] falha ao enviar notificacoes de comentario:', notifErr);
  }

  console.log('[frameio-webhook] comentario processado', {
    deliverable_id: deliverable.id,
    notifications_sent: notificationsSent,
  });

  return {
    event_type: 'comment.created',
    deliverable_id: deliverable.id,
    job_id: deliverable.job_id,
    action: 'comment_notification_sent',
    notifications_sent: notificationsSent,
  };
}

/**
 * Notifica admins/producao do job sobre alteracao de status via Frame.io.
 * Retorna numero de notificacoes enviadas.
 */
async function notifyJobAdmins(
  client: SupabaseClient,
  deliverable: { id: string; job_id: string; description: string; tenant_id: string },
  eventType: 'review.approved' | 'review.rejected',
): Promise<number> {
  const isApproved = eventType === 'review.approved';
  const title = isApproved
    ? `Frame.io: entregavel aprovado`
    : `Frame.io: entregavel requer revisao`;
  const body = `"${deliverable.description.slice(0, 100)}" foi ${isApproved ? 'aprovado' : 'rejeitado'} no Frame.io.`;

  const { data: teamWithProfiles } = await client
    .from('job_team')
    .select('people!inner(profile_id)')
    .eq('job_id', deliverable.job_id)
    .in('role', ['admin', 'ceo', 'produtor_executivo', 'coordenador_producao'])
    .is('deleted_at', null);

  const profileIds = (teamWithProfiles ?? [])
    .map((m) => (m.people as unknown as { profile_id: string | null } | null)?.profile_id)
    .filter((id): id is string => !!id);

  let count = 0;
  for (const profileId of profileIds) {
    await createNotification(client, {
      tenant_id: deliverable.tenant_id,
      user_id: profileId,
      type: 'status_changed',
      priority: isApproved ? 'normal' : 'high',
      title,
      body,
      metadata: {
        deliverable_id: deliverable.id,
        frameio_event: eventType,
        new_status: REVIEW_STATUS_MAP[eventType],
      },
      action_url: `/jobs/${deliverable.job_id}?tab=entregaveis`,
      job_id: deliverable.job_id,
    });
    count++;
  }

  return count;
}

/**
 * Entry point para webhooks Frame.io.
 * Chamado pelo integration-processor quando event_type = 'frameio_webhook'.
 *
 * O payload do integration_event deve conter:
 *   { frameio_event_type: string, frameio_payload: FrameioWebhookPayload }
 */
export async function processFrameioWebhook(
  client: SupabaseClient,
  event: {
    id: string;
    tenant_id: string;
    payload: Record<string, unknown>;
  },
): Promise<Record<string, unknown>> {
  const frameioEventType = event.payload.frameio_event_type as string;
  const frameioPayload = event.payload.frameio_payload as FrameioWebhookPayload;

  console.log('[frameio-webhook] processando evento', {
    integration_event_id: event.id,
    frameio_event_type: frameioEventType,
    tenant_id: event.tenant_id,
  });

  if (!frameioPayload || !frameioEventType) {
    console.warn('[frameio-webhook] payload invalido — frameio_payload ou frameio_event_type ausente');
    return {
      skipped: true,
      reason: 'Payload Frame.io invalido: frameio_event_type ou frameio_payload ausente',
    };
  }

  let result: FrameioHandlerResult;

  switch (frameioEventType) {
    case 'review.approved':
    case 'review.rejected':
      result = await processReviewEvent(client, frameioPayload, frameioEventType);
      break;
    case 'comment.created':
      result = await processCommentEvent(client, frameioPayload);
      break;
    default:
      console.log('[frameio-webhook] evento nao suportado, ignorando:', frameioEventType);
      result = {
        event_type: frameioEventType,
        skipped: true,
        reason: `Tipo de evento Frame.io nao suportado: ${frameioEventType}`,
      };
  }

  return result as unknown as Record<string, unknown>;
}
