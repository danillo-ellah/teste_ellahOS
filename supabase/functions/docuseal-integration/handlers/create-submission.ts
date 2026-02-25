import { z } from 'https://esm.sh/zod@3.22.4';
import { getSupabaseClient, getServiceClient } from '../../_shared/supabase-client.ts';
import { created } from '../../_shared/response.ts';
import { AppError } from '../../_shared/errors.ts';
import { enqueueEvent } from '../../_shared/integration-client.ts';
import { createSubmission } from '../../_shared/docuseal-client.ts';
import type { AuthContext } from '../../_shared/auth.ts';
import type { DocuSealSubmissionRow } from '../../_shared/types.ts';

// Roles permitidos para criar contratos DocuSeal
const ALLOWED_ROLES = ['admin', 'ceo', 'produtor_executivo'];

// Schema de cada submitter no lote
const SubmitterSchema = z.object({
  email: z.string().email('Email do submitter invalido'),
  name: z.string().min(1, 'Nome do submitter e obrigatorio').max(200),
  role: z.string().min(1, 'Role do submitter e obrigatoria').max(100),
  // Campos opcionais que serao pre-preenchidos no formulario
  fields: z.array(z.object({
    name: z.string(),
    value: z.string(),
  })).optional().default([]),
  // person_id opcional para linkar ao cadastro interno
  person_id: z.string().uuid().optional().nullable(),
});

// Schema do payload de criacao em lote
const CreateSubmissionSchema = z.object({
  job_id: z.string().uuid('job_id deve ser UUID valido'),
  template_id: z.number().int().positive('template_id deve ser um numero inteiro positivo'),
  submitters: z.array(SubmitterSchema).min(1, 'Pelo menos um submitter e obrigatorio').max(50),
  metadata: z.record(z.unknown()).optional().default({}),
  send_email: z.boolean().optional().default(true),
});

type CreateSubmissionInput = z.infer<typeof CreateSubmissionSchema>;

export async function createSubmissionHandler(req: Request, auth: AuthContext): Promise<Response> {
  // Verificar permissao
  if (!ALLOWED_ROLES.includes(auth.role)) {
    throw new AppError('FORBIDDEN', 'Permissao insuficiente para criar contratos DocuSeal', 403);
  }

  // Validar payload
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new AppError('VALIDATION_ERROR', 'Payload JSON invalido', 400);
  }

  const parseResult = CreateSubmissionSchema.safeParse(body);
  if (!parseResult.success) {
    const issues = parseResult.error.issues.map(i => ({ field: i.path.join('.'), message: i.message }));
    throw new AppError('VALIDATION_ERROR', issues[0].message, 400, { issues });
  }

  const input: CreateSubmissionInput = parseResult.data;
  const supabase = getSupabaseClient(auth.token);
  const serviceClient = getServiceClient();

  console.log(
    `[create-submission] user=${auth.userId} job_id=${input.job_id} template_id=${input.template_id} submitters=${input.submitters.length}`,
  );

  // 1. Verificar que o job existe e pertence ao tenant
  const { data: job, error: jobError } = await supabase
    .from('jobs')
    .select('id, code, title, tenant_id')
    .eq('id', input.job_id)
    .eq('tenant_id', auth.tenantId)
    .is('deleted_at', null)
    .single();

  if (jobError || !job) {
    throw new AppError('NOT_FOUND', 'Job nao encontrado', 404);
  }

  // 2. Deduplicacao: verificar se ja existe submission pendente ou assinada para o mesmo email + job + template
  const existingEmails = input.submitters.map(s => s.email);
  const { data: existingSubmissions } = await supabase
    .from('docuseal_submissions')
    .select('id, person_email, docuseal_status')
    .eq('job_id', input.job_id)
    .eq('docuseal_template_id', input.template_id)
    .eq('tenant_id', auth.tenantId)
    .in('person_email', existingEmails)
    .in('docuseal_status', ['pending', 'sent', 'opened', 'partially_signed', 'signed'])
    .is('deleted_at', null);

  const duplicateEmails = (existingSubmissions ?? []).map(s => s.person_email);
  if (duplicateEmails.length > 0) {
    throw new AppError('CONFLICT', `Ja existe contrato ativo para: ${duplicateEmails.join(', ')}`, 409, {
      duplicate_emails: duplicateEmails,
    });
  }

  // 3. Chamar DocuSeal API para criar a submission em lote
  let docusealResponse;
  try {
    docusealResponse = await createSubmission(serviceClient, auth.tenantId, {
      template_id: input.template_id,
      send_email: input.send_email,
      submitters: input.submitters.map(s => ({
        role: s.role,
        email: s.email,
        fields: s.fields.map(f => ({
          name: f.name,
          value: f.value,
        })),
      })),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[create-submission] falha ao chamar DocuSeal API: ${msg}`);
    throw new AppError('INTERNAL_ERROR', `Falha ao criar submission no DocuSeal: ${msg}`, 502);
  }

  console.log(
    `[create-submission] DocuSeal retornou submission id=${docusealResponse.id} status=${docusealResponse.status}`,
  );

  // 4. Persistir cada submitter como registro separado em docuseal_submissions
  const now = new Date().toISOString();
  const rowsToInsert: Partial<DocuSealSubmissionRow>[] = input.submitters.map((submitter, idx) => {
    // Cada submitter do DocuSeal tem seu proprio ID na resposta
    const docusealSubmitter = docusealResponse.submitters[idx];

    return {
      tenant_id: auth.tenantId,
      job_id: input.job_id,
      person_id: submitter.person_id ?? null,
      person_name: submitter.name,
      person_email: submitter.email,
      person_cpf: null,
      // Armazenar o submission_id da API DocuSeal (1 submission pode ter N submitters)
      docuseal_submission_id: docusealResponse.id,
      docuseal_template_id: input.template_id,
      docuseal_status: 'sent',
      contract_data: {
        docuseal_submitter_id: docusealSubmitter?.id ?? null,
        docuseal_submitter_status: docusealSubmitter?.status ?? null,
        role: submitter.role,
        fields: submitter.fields,
        job_code: job.code,
        job_title: job.title,
      },
      signed_pdf_url: null,
      signed_pdf_drive_id: null,
      sent_at: input.send_email ? now : null,
      opened_at: null,
      signed_at: null,
      created_by: auth.userId,
      error_message: null,
      metadata: {
        ...input.metadata,
        created_from: 'docuseal-integration',
        send_email: input.send_email,
      },
    };
  });

  const { data: insertedRows, error: insertError } = await supabase
    .from('docuseal_submissions')
    .insert(rowsToInsert)
    .select('id, person_email, person_name, docuseal_status, sent_at');

  if (insertError) {
    console.error('[create-submission] falha ao inserir docuseal_submissions:', insertError.message);
    throw new AppError('INTERNAL_ERROR', 'Falha ao salvar registros de contrato', 500);
  }

  // 5. Enfileirar integration_event para log/auditoria
  try {
    await enqueueEvent(serviceClient, {
      tenant_id: auth.tenantId,
      event_type: 'docuseal_submission_created',
      payload: {
        job_id: input.job_id,
        job_code: job.code,
        template_id: input.template_id,
        docuseal_submission_id: docusealResponse.id,
        submitter_count: input.submitters.length,
        created_by: auth.userId,
        submission_ids: (insertedRows ?? []).map(r => r.id),
      },
      idempotency_key: `docuseal_created_${docusealResponse.id}`,
    });
  } catch (evErr) {
    console.error('[create-submission] falha ao enfileirar integration_event (nao critico):', evErr);
    // Nao bloqueia a resposta
  }

  console.log(
    `[create-submission] ${insertedRows?.length ?? 0} registro(s) criado(s) para job ${job.code}`,
  );

  return created({
    docuseal_submission_id: docusealResponse.id,
    docuseal_status: docusealResponse.status,
    job_id: input.job_id,
    job_code: job.code,
    submissions: insertedRows ?? [],
    submitter_count: input.submitters.length,
  });
}
