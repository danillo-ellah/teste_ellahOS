import { getSupabaseClient, getServiceClient } from '../../_shared/supabase-client.ts';
import { success } from '../../_shared/response.ts';
import { AppError } from '../../_shared/errors.ts';
import { getSubmission } from '../../_shared/docuseal-client.ts';
import type { AuthContext } from '../../_shared/auth.ts';

export async function downloadHandler(
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

  console.log(`[download] tenant=${auth.tenantId} user=${auth.userId} submission_id=${id}`);

  // 1. Buscar registro local
  const { data: submission, error: fetchError } = await supabase
    .from('docuseal_submissions')
    .select(
      'id, person_email, person_name, docuseal_submission_id, docuseal_status, signed_pdf_url, tenant_id',
    )
    .eq('id', id)
    .eq('tenant_id', auth.tenantId)
    .is('deleted_at', null)
    .single();

  if (fetchError || !submission) {
    throw new AppError('NOT_FOUND', 'Submission DocuSeal nao encontrada', 404);
  }

  // 2. Se ja temos a URL cacheada localmente, retornar diretamente
  if (submission.signed_pdf_url) {
    console.log(`[download] URL cacheada encontrada para submission_id=${id}`);
    return success({
      submission_id: id,
      person_email: submission.person_email,
      person_name: submission.person_name,
      download_url: submission.signed_pdf_url,
      status: submission.docuseal_status,
      source: 'cache',
    });
  }

  // 3. Verificar que a submission esta assinada (somente submissoes 'signed' tem documento)
  if (submission.docuseal_status !== 'signed') {
    throw new AppError(
      'BUSINESS_RULE_VIOLATION',
      `Documento nao disponivel: submission com status "${submission.docuseal_status}". O download so esta disponivel para contratos assinados (signed).`,
      422,
      { current_status: submission.docuseal_status },
    );
  }

  // 4. Sem URL cacheada e status = signed → consultar DocuSeal API
  if (!submission.docuseal_submission_id) {
    throw new AppError(
      'INTERNAL_ERROR',
      'Submission assinada mas sem ID externo DocuSeal — contate o suporte',
      500,
    );
  }

  const serviceClient = getServiceClient();
  let downloadUrl: string | null = null;

  try {
    const docusealData = await getSubmission(serviceClient, auth.tenantId, submission.docuseal_submission_id);

    // Extrair URL do primeiro documento assinado do primeiro submitter
    // A API DocuSeal retorna documentos por submitter
    for (const submitter of docusealData.submitters ?? []) {
      if (submitter.email.toLowerCase() === submission.person_email.toLowerCase()) {
        downloadUrl = submitter.documents?.[0]?.url ?? null;
        break;
      }
    }

    // Fallback: pegar qualquer documento disponivel
    if (!downloadUrl) {
      for (const submitter of docusealData.submitters ?? []) {
        downloadUrl = submitter.documents?.[0]?.url ?? null;
        if (downloadUrl) break;
      }
    }
  } catch (dsErr) {
    const msg = dsErr instanceof Error ? dsErr.message : String(dsErr);
    console.error(`[download] falha ao consultar DocuSeal API: ${msg}`);
    throw new AppError('INTERNAL_ERROR', `Falha ao obter URL do documento: ${msg}`, 502);
  }

  if (!downloadUrl) {
    throw new AppError(
      'NOT_FOUND',
      'Documento assinado nao encontrado no DocuSeal — pode ainda estar sendo processado',
      404,
    );
  }

  // 5. Cachear a URL localmente para proximas consultas (nao bloqueante)
  try {
    await supabase
      .from('docuseal_submissions')
      .update({ signed_pdf_url: downloadUrl })
      .eq('id', id)
      .eq('tenant_id', auth.tenantId);
  } catch (cacheErr) {
    console.warn('[download] falha ao cachear signed_pdf_url (nao critico):', cacheErr);
  }

  console.log(`[download] URL obtida do DocuSeal para submission_id=${id}`);

  return success({
    submission_id: id,
    person_email: submission.person_email,
    person_name: submission.person_name,
    download_url: downloadUrl,
    status: submission.docuseal_status,
    source: 'docuseal_api',
  });
}
