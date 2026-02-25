import { z } from 'https://esm.sh/zod@3.22.4';
import { getSupabaseClient, getServiceClient } from '../../_shared/supabase-client.ts';
import { success } from '../../_shared/response.ts';
import { AppError } from '../../_shared/errors.ts';
import { resendSubmission } from '../../_shared/docuseal-client.ts';
import type { AuthContext } from '../../_shared/auth.ts';

// Roles permitidos para reenviar convite de assinatura
const ALLOWED_ROLES = ['admin', 'ceo', 'produtor_executivo'];

// Status que permitem reenvio (somente submissoes ainda pendentes de assinatura)
const RESENDABLE_STATUSES = ['pending', 'sent', 'opened', 'partially_signed'];

// Schema de validacao
const ResendSchema = z.object({
  submission_id: z.string().uuid('submission_id deve ser UUID valido'),
});

type ResendInput = z.infer<typeof ResendSchema>;

export async function resendHandler(req: Request, auth: AuthContext): Promise<Response> {
  // Verificar permissao
  if (!ALLOWED_ROLES.includes(auth.role)) {
    throw new AppError('FORBIDDEN', 'Permissao insuficiente para reenviar contratos DocuSeal', 403);
  }

  // Validar payload
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new AppError('VALIDATION_ERROR', 'Payload JSON invalido', 400);
  }

  const parseResult = ResendSchema.safeParse(body);
  if (!parseResult.success) {
    const issues = parseResult.error.issues.map(i => ({ field: i.path.join('.'), message: i.message }));
    throw new AppError('VALIDATION_ERROR', issues[0].message, 400, { issues });
  }

  const input: ResendInput = parseResult.data;
  const supabase = getSupabaseClient(auth.token);

  console.log(`[resend] user=${auth.userId} submission_id=${input.submission_id}`);

  // 1. Buscar o registro local para validar existencia e status
  const { data: submission, error: fetchError } = await supabase
    .from('docuseal_submissions')
    .select('id, person_email, person_name, docuseal_submission_id, docuseal_status, tenant_id')
    .eq('id', input.submission_id)
    .eq('tenant_id', auth.tenantId)
    .is('deleted_at', null)
    .single();

  if (fetchError || !submission) {
    throw new AppError('NOT_FOUND', 'Submission DocuSeal nao encontrada', 404);
  }

  // 2. Validar se o status permite reenvio
  if (!RESENDABLE_STATUSES.includes(submission.docuseal_status)) {
    throw new AppError(
      'BUSINESS_RULE_VIOLATION',
      `Nao e possivel reenviar contrato com status "${submission.docuseal_status}". Status permitidos: ${RESENDABLE_STATUSES.join(', ')}`,
      422,
      { current_status: submission.docuseal_status },
    );
  }

  // 3. Validar que existe um docuseal_submission_id para chamar a API
  if (!submission.docuseal_submission_id) {
    throw new AppError(
      'BUSINESS_RULE_VIOLATION',
      'Submission nao possui ID externo do DocuSeal — nao e possivel reenviar',
      422,
    );
  }

  // 4. Chamar DocuSeal API para reenviar
  const serviceClient = getServiceClient();
  try {
    await resendSubmission(serviceClient, auth.tenantId, submission.docuseal_submission_id);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[resend] falha ao chamar DocuSeal API: ${msg}`);
    throw new AppError('INTERNAL_ERROR', `Falha ao reenviar contrato: ${msg}`, 502);
  }

  // 5. Atualizar sent_at e garantir status 'sent'
  const now = new Date().toISOString();
  const { error: updateError } = await supabase
    .from('docuseal_submissions')
    .update({
      docuseal_status: 'sent',
      sent_at: now,
    })
    .eq('id', input.submission_id)
    .eq('tenant_id', auth.tenantId);

  if (updateError) {
    // Nao bloqueia — o reenvio ja foi feito
    console.warn('[resend] falha ao atualizar status apos reenvio (nao critico):', updateError.message);
  }

  console.log(
    `[resend] reenvio concluido: submission_id=${input.submission_id} email=${submission.person_email}`,
  );

  return success({
    submission_id: input.submission_id,
    docuseal_submission_id: submission.docuseal_submission_id,
    person_email: submission.person_email,
    person_name: submission.person_name,
    status: 'sent',
    resent_at: now,
  });
}
