import { z } from 'https://esm.sh/zod@3.22.4';
import { getSupabaseClient, getServiceClient } from '../../_shared/supabase-client.ts';
import { created, createdWithWarnings } from '../../_shared/response.ts';
import { AppError } from '../../_shared/errors.ts';
import { enqueueEvent } from '../../_shared/integration-client.ts';
import { createSubmission } from '../../_shared/docuseal-client.ts';
import { getSecret } from '../../_shared/vault.ts';
import type { AuthContext } from '../../_shared/auth.ts';
import type { DocuSealSubmissionRow } from '../../_shared/types.ts';

// Roles permitidos para gerar contratos em lote
const ALLOWED_ROLES = ['admin', 'ceo', 'produtor_executivo'];

// Tipos de contrato suportados
const CONTRACT_TEMPLATE_TYPES = ['elenco', 'tecnico', 'pj'] as const;
type ContractTemplateType = (typeof CONTRACT_TEMPLATE_TYPES)[number];

// Schema de validacao do payload
const BatchGenerateSchema = z.object({
  job_id: z.string().uuid('job_id deve ser UUID valido'),
  template_type: z.enum(CONTRACT_TEMPLATE_TYPES, {
    errorMap: () => ({ message: 'template_type deve ser elenco, tecnico ou pj' }),
  }),
  member_ids: z
    .array(z.string().uuid('cada member_id deve ser UUID valido'))
    .min(1, 'Pelo menos um membro deve ser selecionado')
    .max(50, 'Maximo de 50 membros por lote'),
});

type BatchGenerateInput = z.infer<typeof BatchGenerateSchema>;

// Chave do Vault que mapeia tipo de template para template_id no DocuSeal
// Formato: DOCUSEAL_TEMPLATE_ID_ELENCO, DOCUSEAL_TEMPLATE_ID_TECNICO, DOCUSEAL_TEMPLATE_ID_PJ
// Tentamos primeiro a key por tenant, depois a global
async function resolveTemplateId(
  serviceClient: ReturnType<typeof getServiceClient>,
  tenantId: string,
  templateType: ContractTemplateType,
): Promise<number> {
  const keyName = `DOCUSEAL_TEMPLATE_ID_${templateType.toUpperCase()}`;

  // Tenta tenant-specific primeiro
  let value = await getSecret(serviceClient, `${tenantId}_${keyName}`);
  if (!value) {
    // Fallback global
    value = await getSecret(serviceClient, keyName);
  }

  if (!value) {
    throw new AppError(
      'BUSINESS_RULE_VIOLATION',
      `Template DocuSeal para tipo "${templateType}" nao configurado. Configure a secret "${keyName}" no Vault.`,
      422,
      { template_type: templateType, vault_key: keyName },
    );
  }

  const id = parseInt(value, 10);
  if (isNaN(id) || id <= 0) {
    throw new AppError(
      'INTERNAL_ERROR',
      `Valor invalido na secret "${keyName}": esperado numero inteiro positivo, recebido "${value}"`,
      500,
    );
  }

  return id;
}

// Dados completos de uma pessoa para montar o contrato
interface PersonContractData {
  id: string;
  full_name: string;
  email: string | null;
  cpf: string | null;
}

// Dado de membro + dados da pessoa para gerar o contrato
interface MemberWithPerson {
  member_id: string;
  person_id: string;
  role: string;
  rate: number | null;
  person: PersonContractData;
}

// Resultado parcial por membro: gerado com sucesso ou falha (dados incompletos)
interface MemberResult {
  member_id: string;
  person_id: string;
  person_name: string;
  status: 'generated' | 'skipped';
  skip_reason?: string;
  submission_id?: string;
  docuseal_submission_id?: number;
}

export async function batchGenerateHandler(req: Request, auth: AuthContext): Promise<Response> {
  // Verificar permissao
  if (!ALLOWED_ROLES.includes(auth.role)) {
    throw new AppError('FORBIDDEN', 'Permissao insuficiente para gerar contratos em lote', 403);
  }

  // Validar payload
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new AppError('VALIDATION_ERROR', 'Payload JSON invalido', 400);
  }

  const parseResult = BatchGenerateSchema.safeParse(body);
  if (!parseResult.success) {
    const issues = parseResult.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message }));
    throw new AppError('VALIDATION_ERROR', issues[0].message, 400, { issues });
  }

  const input: BatchGenerateInput = parseResult.data;
  const supabase = getSupabaseClient(auth.token);
  const serviceClient = getServiceClient();

  console.log(
    `[batch-generate] user=${auth.userId} job_id=${input.job_id} template_type=${input.template_type} members=${input.member_ids.length}`,
  );

  // 1. Verificar que o job existe e pertence ao tenant
  const { data: job, error: jobError } = await supabase
    .from('jobs')
    .select('id, code, title, tenant_id, shooting_dates, expected_delivery_date, closed_value')
    .eq('id', input.job_id)
    .eq('tenant_id', auth.tenantId)
    .is('deleted_at', null)
    .single();

  if (jobError || !job) {
    throw new AppError('NOT_FOUND', 'Job nao encontrado', 404);
  }

  // 2. Resolver o template_id pelo tipo (Vault ou fallback global)
  let templateId: number;
  try {
    templateId = await resolveTemplateId(serviceClient, auth.tenantId, input.template_type);
  } catch (err) {
    if (err instanceof AppError) throw err;
    const msg = err instanceof Error ? err.message : String(err);
    throw new AppError('INTERNAL_ERROR', `Erro ao resolver template: ${msg}`, 500);
  }

  console.log(
    `[batch-generate] template resolvido: tipo=${input.template_type} template_id=${templateId}`,
  );

  // 3. Buscar membros selecionados com dados completos da pessoa
  const { data: teamRows, error: teamError } = await supabase
    .from('job_team')
    .select(
      `
      id,
      person_id,
      role,
      rate,
      people (
        id,
        full_name,
        email,
        cpf
      )
      `,
    )
    .eq('job_id', input.job_id)
    .eq('tenant_id', auth.tenantId)
    .in('id', input.member_ids)
    .is('deleted_at', null);

  if (teamError) {
    console.error(`[batch-generate] falha ao buscar membros: ${teamError.message}`);
    throw new AppError('INTERNAL_ERROR', 'Falha ao buscar membros da equipe', 500);
  }

  if (!teamRows || teamRows.length === 0) {
    throw new AppError('NOT_FOUND', 'Nenhum membro encontrado com os IDs informados', 404);
  }

  // Normalizar dados dos membros com join de people
  const members: MemberWithPerson[] = (teamRows as Array<{
    id: string;
    person_id: string;
    role: string;
    rate: number | null;
    people: PersonContractData | null;
  }>).map((row) => ({
    member_id: row.id,
    person_id: row.person_id,
    role: row.role,
    rate: row.rate,
    person: row.people ?? {
      id: row.person_id,
      full_name: 'Sem nome',
      email: null,
      cpf: null,
    },
  }));

  // 4. Verificar quais membros ja possuem contrato ativo com este template
  const personIds = members.map((m) => m.person_id);
  const { data: existingSubmissions } = await supabase
    .from('docuseal_submissions')
    .select('id, person_id, docuseal_status')
    .eq('job_id', input.job_id)
    .eq('docuseal_template_id', templateId)
    .eq('tenant_id', auth.tenantId)
    .in('person_id', personIds)
    .in('docuseal_status', ['pending', 'sent', 'opened', 'partially_signed', 'signed'])
    .is('deleted_at', null);

  const personIdsWithActiveContract = new Set(
    (existingSubmissions ?? []).map((s) => s.person_id as string),
  );

  // 5. Classificar membros: elegíveis vs. ignorados
  const eligible: MemberWithPerson[] = [];
  const skipped: MemberResult[] = [];

  for (const member of members) {
    // Verificar email (obrigatorio para DocuSeal)
    if (!member.person.email) {
      skipped.push({
        member_id: member.member_id,
        person_id: member.person_id,
        person_name: member.person.full_name,
        status: 'skipped',
        skip_reason: 'Email nao cadastrado',
      });
      continue;
    }

    // Verificar contrato ativo existente
    if (personIdsWithActiveContract.has(member.person_id)) {
      skipped.push({
        member_id: member.member_id,
        person_id: member.person_id,
        person_name: member.person.full_name,
        status: 'skipped',
        skip_reason: 'Ja possui contrato ativo para este template',
      });
      continue;
    }

    eligible.push(member);
  }

  console.log(
    `[batch-generate] elegíveis=${eligible.length} ignorados=${skipped.length} total=${members.length}`,
  );

  if (eligible.length === 0) {
    // Nenhum membro elegivel — retornar com aviso
    return created({
      job_id: input.job_id,
      job_code: job.code,
      template_type: input.template_type,
      template_id: templateId,
      generated: [],
      skipped,
      generated_count: 0,
      skipped_count: skipped.length,
    });
  }

  // 6. Gerar contratos: 1 submission DocuSeal por membro elegível
  //    (cada membro recebe contrato individual, nao em lote na mesma submission)
  const generated: MemberResult[] = [];
  const failedToGenerate: Array<{ member: MemberWithPerson; reason: string }> = [];
  const now = new Date().toISOString();

  for (const member of eligible) {
    console.log(
      `[batch-generate] gerando contrato para person_id=${member.person_id} email=${member.person.email}`,
    );

    // Montar campos pre-preenchidos para o template DocuSeal
    const contractFields: Array<{ name: string; value: string }> = [
      { name: 'Nome', value: member.person.full_name },
      { name: 'name', value: member.person.full_name },
    ];

    if (member.person.cpf) {
      contractFields.push({ name: 'CPF', value: member.person.cpf });
      contractFields.push({ name: 'cpf', value: member.person.cpf });
    }

    if (member.person.email) {
      contractFields.push({ name: 'Email', value: member.person.email });
      contractFields.push({ name: 'email', value: member.person.email });
    }

    if (member.rate != null) {
      contractFields.push({ name: 'Valor', value: String(member.rate) });
      contractFields.push({ name: 'Cache', value: String(member.rate) });
      contractFields.push({ name: 'Cachê', value: String(member.rate) });
    }

    if (job.title) {
      contractFields.push({ name: 'Projeto', value: job.title });
      contractFields.push({ name: 'Filme', value: job.title });
    }

    if (job.code) {
      contractFields.push({ name: 'Codigo', value: job.code });
      contractFields.push({ name: 'Código do Projeto', value: job.code });
    }

    // Role traduzida para PT-BR (ja vem como snake_case do banco)
    contractFields.push({ name: 'Funcao', value: member.role });
    contractFields.push({ name: 'Função', value: member.role });

    // Chamar DocuSeal API para criar submission individual
    let docusealResponse;
    try {
      docusealResponse = await createSubmission(serviceClient, auth.tenantId, {
        template_id: templateId,
        send_email: true,
        submitters: [
          {
            role: 'Contratado', // Role padrao no template
            email: member.person.email!,
            fields: contractFields,
          },
        ],
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(
        `[batch-generate] falha ao criar submission para person_id=${member.person_id}: ${msg}`,
      );
      failedToGenerate.push({ member, reason: msg });
      continue;
    }

    // Persistir registro em docuseal_submissions
    const rowToInsert: Partial<DocuSealSubmissionRow> = {
      tenant_id: auth.tenantId,
      job_id: input.job_id,
      person_id: member.person_id,
      person_name: member.person.full_name,
      person_email: member.person.email!,
      person_cpf: member.person.cpf ?? null,
      docuseal_submission_id: docusealResponse.id,
      docuseal_template_id: templateId,
      docuseal_status: 'sent',
      contract_data: {
        docuseal_submitter_id: docusealResponse.submitters?.[0]?.id ?? null,
        docuseal_submitter_status: docusealResponse.submitters?.[0]?.status ?? null,
        role: member.role,
        template_type: input.template_type,
        fields: contractFields,
        job_code: job.code,
        job_title: job.title,
      },
      signed_pdf_url: null,
      signed_pdf_drive_id: null,
      sent_at: now,
      opened_at: null,
      signed_at: null,
      created_by: auth.userId,
      error_message: null,
      metadata: {
        created_from: 'batch-generate',
        template_type: input.template_type,
        batch_timestamp: now,
      },
    };

    const { data: insertedRow, error: insertError } = await supabase
      .from('docuseal_submissions')
      .insert(rowToInsert)
      .select('id, person_email, person_name, docuseal_status, sent_at')
      .single();

    if (insertError || !insertedRow) {
      console.error(
        `[batch-generate] falha ao inserir submission para person_id=${member.person_id}: ${insertError?.message}`,
      );
      failedToGenerate.push({
        member,
        reason: `Falha ao persistir: ${insertError?.message ?? 'erro desconhecido'}`,
      });
      continue;
    }

    generated.push({
      member_id: member.member_id,
      person_id: member.person_id,
      person_name: member.person.full_name,
      status: 'generated',
      submission_id: insertedRow.id,
      docuseal_submission_id: docusealResponse.id,
    });

    console.log(
      `[batch-generate] contrato gerado: person=${member.person.full_name} docuseal_submission_id=${docusealResponse.id}`,
    );
  }

  // 7. Enfileirar integration_event para auditoria (nao bloqueante)
  try {
    await enqueueEvent(serviceClient, {
      tenant_id: auth.tenantId,
      event_type: 'docuseal_create_batch',
      payload: {
        job_id: input.job_id,
        job_code: job.code,
        template_type: input.template_type,
        template_id: templateId,
        total_requested: members.length,
        generated_count: generated.length,
        skipped_count: skipped.length,
        failed_count: failedToGenerate.length,
        created_by: auth.userId,
        submission_ids: generated.map((g) => g.submission_id),
      },
      idempotency_key: `batch_generate_${input.job_id}_${input.template_type}_${now.substring(0, 16)}`,
    });
  } catch (evErr) {
    console.error('[batch-generate] falha ao enfileirar integration_event (nao critico):', evErr);
  }

  console.log(
    `[batch-generate] concluido: gerados=${generated.length} ignorados=${skipped.length} falhas=${failedToGenerate.length}`,
  );

  // Transformar falhas em warnings para incluir na resposta
  const warnings = failedToGenerate.map((f) => ({
    code: 'CONTRACT_GENERATION_FAILED',
    message: `Falha ao gerar contrato para ${f.member.person.full_name}: ${f.reason}`,
  }));

  const responseData = {
    job_id: input.job_id,
    job_code: job.code,
    template_type: input.template_type,
    template_id: templateId,
    generated,
    skipped,
    generated_count: generated.length,
    skipped_count: skipped.length,
  };

  if (warnings.length > 0) {
    return createdWithWarnings(responseData, warnings);
  }

  return created(responseData);
}
