import { getSupabaseClient, getServiceClient } from '../../_shared/supabase-client.ts';
import { success } from '../../_shared/response.ts';
import { AppError } from '../../_shared/errors.ts';
import { getSubmission } from '../../_shared/docuseal-client.ts';
import type { AuthContext } from '../../_shared/auth.ts';

export async function getSubmissionHandler(
  req: Request,
  auth: AuthContext,
  id: string | null,
): Promise<Response> {
  if (!id) {
    throw new AppError('VALIDATION_ERROR', 'ID da submission e obrigatorio na URL', 400);
  }

  // Validar formato UUID basico
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    throw new AppError('VALIDATION_ERROR', 'ID da submission deve ser um UUID valido', 400);
  }

  const supabase = getSupabaseClient(auth.token);

  console.log(`[get] tenant=${auth.tenantId} submission_id=${id}`);

  // 1. Buscar registro local com join em jobs
  const { data: submission, error: fetchError } = await supabase
    .from('docuseal_submissions')
    .select(
      `
      id,
      tenant_id,
      job_id,
      person_id,
      person_name,
      person_email,
      person_cpf,
      docuseal_submission_id,
      docuseal_template_id,
      docuseal_status,
      contract_data,
      signed_pdf_url,
      signed_pdf_drive_id,
      sent_at,
      opened_at,
      signed_at,
      error_message,
      metadata,
      created_by,
      created_at,
      updated_at,
      jobs (
        id,
        code,
        title,
        client_id
      )
      `,
    )
    .eq('id', id)
    .eq('tenant_id', auth.tenantId)
    .is('deleted_at', null)
    .single();

  if (fetchError || !submission) {
    throw new AppError('NOT_FOUND', 'Submission DocuSeal nao encontrada', 404);
  }

  // 2. Consultar DocuSeal API para obter o status atual e audit_log (se tiver submission_id)
  let docusealData = null;
  if (submission.docuseal_submission_id) {
    try {
      const serviceClient = getServiceClient();
      docusealData = await getSubmission(serviceClient, auth.tenantId, submission.docuseal_submission_id);

      // Sincronizar status se divergir
      const remoteStatus = mapDocuSealStatus(docusealData.status);
      if (remoteStatus && remoteStatus !== submission.docuseal_status) {
        console.log(
          `[get] status diverge: local=${submission.docuseal_status} docuseal=${remoteStatus} — atualizando`,
        );

        const updatePayload: Record<string, unknown> = { docuseal_status: remoteStatus };

        // Preencher datas de eventos se ainda nao registradas
        if (remoteStatus === 'signed' && !submission.signed_at) {
          updatePayload.signed_at = new Date().toISOString();
        }
        if (remoteStatus === 'opened' && !submission.opened_at) {
          updatePayload.opened_at = new Date().toISOString();
        }

        // URL do documento assinado (primeiro documento da lista)
        const signedDoc = docusealData.submitters?.[0]?.documents?.[0];
        if (signedDoc?.url) {
          updatePayload.signed_pdf_url = signedDoc.url;
        }

        const supabaseWrite = getSupabaseClient(auth.token);
        await supabaseWrite
          .from('docuseal_submissions')
          .update(updatePayload)
          .eq('id', id)
          .eq('tenant_id', auth.tenantId);

        // Refletir na resposta
        (submission as Record<string, unknown>).docuseal_status = remoteStatus;
        if (updatePayload.signed_at) (submission as Record<string, unknown>).signed_at = updatePayload.signed_at;
        if (updatePayload.opened_at) (submission as Record<string, unknown>).opened_at = updatePayload.opened_at;
        if (updatePayload.signed_pdf_url) (submission as Record<string, unknown>).signed_pdf_url = updatePayload.signed_pdf_url;
      }
    } catch (dsErr) {
      console.warn(
        `[get] falha ao consultar DocuSeal API para submission_id=${submission.docuseal_submission_id} (nao critico):`,
        dsErr instanceof Error ? dsErr.message : dsErr,
      );
      // Nao bloqueia — retorna dados locais
    }
  }

  console.log(`[get] retornando submission id=${id}`);

  return success({
    ...submission,
    // audit_log vem da API DocuSeal se disponivel
    audit_log: docusealData ?? null,
  });
}

// Mapeia status da API DocuSeal para o ENUM interno do banco
function mapDocuSealStatus(apiStatus: string): string | null {
  const map: Record<string, string> = {
    pending: 'pending',
    awaiting: 'sent',
    sent: 'sent',
    opened: 'opened',
    started: 'opened',
    partial: 'partially_signed',
    completed: 'signed',
    signed: 'signed',
    declined: 'declined',
    expired: 'expired',
  };
  return map[apiStatus?.toLowerCase()] ?? null;
}
