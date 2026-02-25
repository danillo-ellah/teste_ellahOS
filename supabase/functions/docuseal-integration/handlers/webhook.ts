import { getServiceClient } from '../../_shared/supabase-client.ts';
import { success, error } from '../../_shared/response.ts';
import { AppError } from '../../_shared/errors.ts';
import { validateWebhookSignature } from '../../_shared/docuseal-client.ts';
import { enqueueEvent } from '../../_shared/integration-client.ts';

// Eventos suportados do DocuSeal
const SUPPORTED_EVENTS = [
  'form.completed',
  'form.viewed',
  'form.started',
  'form.declined',
] as const;

type DocuSealEvent = (typeof SUPPORTED_EVENTS)[number];

// Mapa de evento DocuSeal → status interno
const EVENT_TO_STATUS: Record<DocuSealEvent, string> = {
  'form.completed': 'signed',
  'form.viewed': 'opened',
  'form.started': 'opened',
  'form.declined': 'declined',
};

interface DocuSealWebhookPayload {
  event_type: string;
  timestamp: string;
  data: {
    id: number;
    status: string;
    submitters: Array<{
      id: number;
      email: string;
      status: string;
      completed_at?: string;
      opened_at?: string;
      documents?: Array<{ url: string; filename: string }>;
    }>;
  };
}

export async function webhookHandler(req: Request): Promise<Response> {
  // 1. Ler corpo bruto antes de qualquer parse (necessario para HMAC)
  let rawBody: string;
  try {
    rawBody = await req.text();
  } catch {
    console.error('[webhook] falha ao ler corpo da requisicao');
    return error('VALIDATION_ERROR', 'Falha ao ler corpo da requisicao', 400);
  }

  // 2. Extrair assinatura HMAC do header
  const signature = req.headers.get('x-docuseal-signature') ?? '';
  if (!signature) {
    console.warn('[webhook] header x-docuseal-signature ausente — rejeitando');
    return error('UNAUTHORIZED', 'Assinatura HMAC ausente', 401);
  }

  // 3. Precisamos do tenant_id para buscar o webhook secret no Vault.
  //    O DocuSeal pode passar tenant_id no payload ou como query param.
  const url = new URL(req.url);
  const tenantId = url.searchParams.get('tenant_id');

  if (!tenantId) {
    console.warn('[webhook] tenant_id ausente na query string — rejeitando');
    return error('VALIDATION_ERROR', 'tenant_id e obrigatorio na query string do webhook', 400);
  }

  const serviceClient = getServiceClient();

  // 4. Validar assinatura HMAC
  const isValid = await validateWebhookSignature(serviceClient, tenantId, signature, rawBody);
  if (!isValid) {
    console.warn(`[webhook] assinatura HMAC invalida para tenant=${tenantId}`);
    return error('UNAUTHORIZED', 'Assinatura HMAC invalida', 401);
  }

  // 5. Parse do payload
  let payload: DocuSealWebhookPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    console.error('[webhook] payload JSON invalido');
    return error('VALIDATION_ERROR', 'Payload JSON invalido', 400);
  }

  const eventType = payload?.event_type as DocuSealEvent;
  const submissionData = payload?.data;

  if (!eventType || !submissionData?.id) {
    console.warn('[webhook] payload incompleto: event_type ou data.id ausente');
    return error('VALIDATION_ERROR', 'Payload de webhook incompleto', 400);
  }

  if (!SUPPORTED_EVENTS.includes(eventType)) {
    // Evento nao tratado — retornar 200 para o DocuSeal nao reenviar
    console.log(`[webhook] evento nao tratado: ${eventType} — ignorando`);
    return success({ received: true, processed: false, reason: 'evento nao suportado' });
  }

  console.log(
    `[webhook] evento=${eventType} docuseal_submission_id=${submissionData.id} tenant=${tenantId}`,
  );

  const newStatus = EVENT_TO_STATUS[eventType];
  const now = new Date().toISOString();

  // 6. Buscar todos os registros locais com este docuseal_submission_id + tenant
  const { data: localSubmissions, error: fetchError } = await serviceClient
    .from('docuseal_submissions')
    .select('id, person_email, docuseal_status, opened_at, signed_at')
    .eq('docuseal_submission_id', submissionData.id)
    .eq('tenant_id', tenantId)
    .is('deleted_at', null);

  if (fetchError) {
    console.error('[webhook] falha ao buscar docuseal_submissions:', fetchError.message);
    return error('INTERNAL_ERROR', 'Falha ao processar webhook', 500);
  }

  if (!localSubmissions || localSubmissions.length === 0) {
    // Pode acontecer em ambiente de teste ou race condition — logar e retornar 200
    console.warn(
      `[webhook] nenhum registro local para docuseal_submission_id=${submissionData.id} tenant=${tenantId}`,
    );
    return success({ received: true, processed: false, reason: 'nenhum registro local encontrado' });
  }

  // 7. Para cada submitter da API, atualizar o registro local correspondente por email
  let updatedCount = 0;

  for (const apiSubmitter of submissionData.submitters ?? []) {
    const localRecord = localSubmissions.find(
      s => s.person_email.toLowerCase() === apiSubmitter.email?.toLowerCase(),
    );

    if (!localRecord) {
      console.warn(`[webhook] submitter email=${apiSubmitter.email} nao encontrado localmente`);
      continue;
    }

    const updatePayload: Record<string, unknown> = {
      docuseal_status: newStatus,
    };

    // Datas de evento (idempotente: nao sobrescrever se ja preenchida)
    if (eventType === 'form.completed' && !localRecord.signed_at) {
      updatePayload.signed_at = apiSubmitter.completed_at ?? now;
      // URL do PDF assinado (primeiro documento)
      const signedUrl = apiSubmitter.documents?.[0]?.url;
      if (signedUrl) {
        updatePayload.signed_pdf_url = signedUrl;
      }
    }

    if ((eventType === 'form.viewed' || eventType === 'form.started') && !localRecord.opened_at) {
      updatePayload.opened_at = apiSubmitter.opened_at ?? now;
    }

    const { error: updateError } = await serviceClient
      .from('docuseal_submissions')
      .update(updatePayload)
      .eq('id', localRecord.id)
      .eq('tenant_id', tenantId);

    if (updateError) {
      console.error(
        `[webhook] falha ao atualizar submission id=${localRecord.id}: ${updateError.message}`,
      );
      continue;
    }

    updatedCount++;
    console.log(
      `[webhook] submission id=${localRecord.id} email=${apiSubmitter.email} → status=${newStatus}`,
    );
  }

  // 8. Enfileirar integration_event para log/auditoria (nao bloqueante)
  try {
    const eventTypeMap: Record<DocuSealEvent, 'docuseal_submission_signed' | 'docuseal_submission_failed' | 'docuseal_submission_created'> = {
      'form.completed': 'docuseal_submission_signed',
      'form.viewed': 'docuseal_submission_created',   // reaproveitando como "visualizado"
      'form.started': 'docuseal_submission_created',
      'form.declined': 'docuseal_submission_failed',
    };

    const integrationEventType = eventTypeMap[eventType] ?? 'docuseal_submission_created';

    await enqueueEvent(serviceClient, {
      tenant_id: tenantId,
      event_type: integrationEventType,
      payload: {
        webhook_event: eventType,
        docuseal_submission_id: submissionData.id,
        docuseal_status: submissionData.status,
        updated_count: updatedCount,
        received_at: now,
        submitters: submissionData.submitters?.map(s => ({
          email: s.email,
          status: s.status,
        })) ?? [],
      },
      idempotency_key: `docuseal_webhook_${submissionData.id}_${eventType}_${now.substring(0, 16)}`,
    });
  } catch (evErr) {
    console.warn('[webhook] falha ao enfileirar integration_event (nao critico):', evErr);
  }

  console.log(
    `[webhook] processado: evento=${eventType} docuseal_id=${submissionData.id} atualizados=${updatedCount}`,
  );

  return success({
    received: true,
    processed: true,
    event_type: eventType,
    docuseal_submission_id: submissionData.id,
    updated_count: updatedCount,
  });
}
