import { z } from 'https://esm.sh/zod@3.22.4';
import { getSupabaseClient, getServiceClient } from '../../_shared/supabase-client.ts';
import { created, createdWithWarnings } from '../../_shared/response.ts';
import { AppError } from '../../_shared/errors.ts';
import { enqueueEvent } from '../../_shared/integration-client.ts';
import { createSubmissionFromHtml } from '../../_shared/docuseal-client.ts';
import type { AuthContext } from '../../_shared/auth.ts';
import type { DocuSealSubmissionRow } from '../../_shared/types.ts';
import { generateContractHtml } from '../templates/contract-html.ts';
import type { ContractData } from '../templates/contract-html.ts';

// Roles permitidos para gerar contratos em lote
const ALLOWED_ROLES = ['admin', 'ceo', 'produtor_executivo'];

// Tipos de contrato suportados (mantidos como metadata)
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

// ========================================================
// Interfaces internas
// ========================================================

// Dados completos de uma pessoa para montar o contrato
interface PersonContractData {
  id: string;
  full_name: string;
  email: string | null;
  cpf: string | null;
  rg: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  phone: string | null;
  profession: string | null;
  bank_info: Record<string, string | null> | null;
}

// Dado de membro + dados da pessoa para gerar o contrato
interface MemberWithPerson {
  member_id: string;
  person_id: string;
  role: string;
  rate: number | null;
  person: PersonContractData;
}

// Resultado parcial por membro: gerado com sucesso ou falha
interface MemberResult {
  member_id: string;
  person_id: string;
  person_name: string;
  status: 'generated' | 'skipped';
  skip_reason?: string;
  submission_id?: string;
  docuseal_submission_id?: number;
}

// ========================================================
// Helpers
// ========================================================

// Converte data ISO (2025-03-15) para PT-BR (15/03/2025)
function isoToBR(isoDate: string): string {
  const parts = isoDate.split('T')[0].split('-');
  if (parts.length !== 3) return isoDate;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

// Data atual no formato DD/MM/YYYY
function todayBR(): string {
  return isoToBR(new Date().toISOString());
}

// ========================================================
// Handler principal
// ========================================================

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

  // 1. Verificar que o job existe e pertence ao tenant, buscando dados extras
  const { data: job, error: jobError } = await supabase
    .from('jobs')
    .select('id, code, title, tenant_id, client_id, agency_id')
    .eq('id', input.job_id)
    .eq('tenant_id', auth.tenantId)
    .is('deleted_at', null)
    .single();

  if (jobError || !job) {
    throw new AppError('NOT_FOUND', 'Job nao encontrado', 404);
  }

  // 2. Buscar dados do tenant para contratante
  const { data: tenant, error: tenantError } = await serviceClient
    .from('tenants')
    .select('id, name, settings')
    .eq('id', auth.tenantId)
    .single();

  if (tenantError || !tenant) {
    console.warn(`[batch-generate] tenant nao encontrado: ${tenantError?.message}`);
  }

  // Extrair dados da empresa do tenant.settings
  const tenantSettings = (tenant?.settings ?? {}) as Record<string, string | null>;
  const companyName: string = (tenant?.name as string) ?? 'Ellah Filmes';
  const companyCnpj: string = (tenantSettings['company_cnpj'] as string) ?? '';
  const companyAddress: string = (tenantSettings['company_address'] as string) ?? 'São Paulo, SP';
  const companyCity: string = (tenantSettings['company_city'] as string) ?? 'São Paulo';
  // Email de quem assina pela empresa — config no tenant ou fallback do usuario logado
  const contractSignerEmail: string =
    (tenantSettings['contract_signer_email'] as string) ?? auth.email ?? '';

  console.log(
    `[batch-generate] contratante=${companyName} signer_email=${contractSignerEmail}`,
  );

  // 3. Buscar cliente e agencia do job (queries paralelas)
  const [clientResult, agencyResult, shootingDatesResult] = await Promise.all([
    job.client_id
      ? supabase.from('clients').select('name').eq('id', job.client_id).single()
      : Promise.resolve({ data: null, error: null }),
    job.agency_id
      ? supabase.from('agencies').select('name').eq('id', job.agency_id).single()
      : Promise.resolve({ data: null, error: null }),
    supabase
      .from('job_shooting_dates')
      .select('shooting_date')
      .eq('job_id', input.job_id)
      .eq('tenant_id', auth.tenantId)
      .is('deleted_at', null)
      .order('shooting_date', { ascending: true }),
  ]);

  const clientName: string | null = (clientResult.data as { name: string } | null)?.name ?? null;
  const agencyName: string | null = (agencyResult.data as { name: string } | null)?.name ?? null;
  const shootingDates: string[] = (
    (shootingDatesResult.data ?? []) as Array<{ shooting_date: string }>
  ).map((d) => isoToBR(d.shooting_date));

  console.log(
    `[batch-generate] job=${job.code} cliente=${clientName} agencia=${agencyName} datas_filmagem=${shootingDates.length}`,
  );

  // 4. Buscar membros selecionados com dados completos da pessoa
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
        cpf,
        rg,
        address,
        city,
        state,
        phone,
        profession,
        bank_info
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
      rg: null,
      address: null,
      city: null,
      state: null,
      phone: null,
      profession: null,
      bank_info: null,
    },
  }));

  // 5. Verificar quais membros ja possuem contrato ativo para este job
  //    (sem filtrar por template_id, pois agora o contrato e gerado via HTML)
  const personIds = members.map((m) => m.person_id);
  const { data: existingSubmissions } = await supabase
    .from('docuseal_submissions')
    .select('id, person_id, docuseal_status')
    .eq('job_id', input.job_id)
    .eq('tenant_id', auth.tenantId)
    .in('person_id', personIds)
    .in('docuseal_status', ['pending', 'sent', 'opened', 'partially_signed', 'signed'])
    .is('deleted_at', null);

  const personIdsWithActiveContract = new Set(
    (existingSubmissions ?? []).map((s) => s.person_id as string),
  );

  // 6. Classificar membros: elegiveis vs. ignorados
  const eligible: MemberWithPerson[] = [];
  const skipped: MemberResult[] = [];

  for (const member of members) {
    // Email e obrigatorio para o DocuSeal enviar o link de assinatura
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
        skip_reason: 'Ja possui contrato ativo para este job',
      });
      continue;
    }

    eligible.push(member);
  }

  console.log(
    `[batch-generate] elegiveis=${eligible.length} ignorados=${skipped.length} total=${members.length}`,
  );

  if (eligible.length === 0) {
    // Nenhum membro elegivel — retornar com aviso
    return created({
      job_id: input.job_id,
      job_code: job.code,
      template_type: input.template_type,
      generated: [],
      skipped,
      generated_count: 0,
      skipped_count: skipped.length,
    });
  }

  // 7. Gerar contratos: 1 submission DocuSeal por membro elegivel
  const generated: MemberResult[] = [];
  const failedToGenerate: Array<{ member: MemberWithPerson; reason: string }> = [];
  const now = new Date().toISOString();

  for (const member of eligible) {
    console.log(
      `[batch-generate] gerando contrato para person_id=${member.person_id} email=${member.person.email}`,
    );

    // Montar ContractData para gerar o HTML
    const contractData: ContractData = {
      // Contratante
      company_name: companyName,
      company_cnpj: companyCnpj,
      company_address: companyAddress,
      company_city: companyCity,

      // Contratado
      person_name: member.person.full_name,
      person_cpf: member.person.cpf,
      person_rg: member.person.rg,
      person_address: member.person.address,
      person_city: member.person.city,
      person_state: member.person.state,
      person_phone: member.person.phone,
      person_email: member.person.email!,
      person_profession: member.person.profession,
      person_bank_info: member.person.bank_info
        ? {
            bank_name: member.person.bank_info['bank_name'] ?? undefined,
            pix_key: member.person.bank_info['pix_key'] ?? undefined,
            pix_key_type: member.person.bank_info['pix_key_type'] ?? undefined,
          }
        : null,

      // Projeto
      job_title: job.title,
      job_code: job.code,
      client_name: clientName,
      agency_name: agencyName,

      // Funcao e valor
      role: member.role,
      rate: member.rate,

      // Datas
      shooting_dates: shootingDates,

      // Metadata
      contract_date: todayBR(),
    };

    // Gerar HTML do contrato com dados pre-preenchidos
    let contractHtml: string;
    try {
      contractHtml = generateContractHtml(contractData);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[batch-generate] falha ao gerar HTML para person_id=${member.person_id}: ${msg}`);
      failedToGenerate.push({ member, reason: `Erro ao gerar HTML do contrato: ${msg}` });
      continue;
    }

    // Montar nome do documento para exibicao no DocuSeal
    const documentName = `Contrato — ${member.person.full_name} — ${job.code}`;

    // Submitters: Contratado primeiro, depois Contratante
    // DocuSeal exige que a ordem de roles coincida com os campos declarados no HTML
    const submitters: Array<{ role: string; email: string; send_email: boolean }> = [
      {
        role: 'Contratado',
        email: member.person.email!,
        send_email: true,
      },
    ];

    // Adicionar contratante somente se o email estiver configurado
    if (contractSignerEmail) {
      submitters.push({
        role: 'Contratante',
        email: contractSignerEmail,
        send_email: true,
      });
    }

    // Chamar DocuSeal API via HTML endpoint
    let docusealResponse;
    try {
      docusealResponse = await createSubmissionFromHtml(serviceClient, auth.tenantId, {
        html: contractHtml,
        name: documentName,
        submitters,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(
        `[batch-generate] falha ao criar submission HTML para person_id=${member.person_id}: ${msg}`,
      );
      failedToGenerate.push({ member, reason: msg });
      continue;
    }

    // Persistir registro em docuseal_submissions
    // docuseal_template_id = 0 porque nao usamos template fixo, mas o campo e NOT NULL
    const rowToInsert: Partial<DocuSealSubmissionRow> = {
      tenant_id: auth.tenantId,
      job_id: input.job_id,
      person_id: member.person_id,
      person_name: member.person.full_name,
      person_email: member.person.email!,
      person_cpf: member.person.cpf ?? null,
      docuseal_submission_id: docusealResponse.submission_id,
      docuseal_template_id: 0, // HTML submission nao usa template_id fixo
      docuseal_status: 'sent',
      contract_data: {
        docuseal_submitter_id: docusealResponse.submitters?.[0]?.id ?? null,
        docuseal_submitter_status: docusealResponse.submitters?.[0]?.status ?? null,
        role: member.role,
        template_type: input.template_type,
        generation_method: 'html_api',
        document_name: documentName,
        job_code: job.code,
        job_title: job.title,
        rate: member.rate,
        shooting_dates: shootingDates,
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
        generation_method: 'html_api',
        batch_timestamp: now,
        signer_email: contractSignerEmail || null,
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
      docuseal_submission_id: docusealResponse.submission_id,
    });

    console.log(
      `[batch-generate] contrato gerado: person=${member.person.full_name} docuseal_submission_id=${docusealResponse.submission_id}`,
    );
  }

  // 8. Enfileirar integration_event para auditoria (nao bloqueante)
  try {
    await enqueueEvent(serviceClient, {
      tenant_id: auth.tenantId,
      event_type: 'docuseal_create_batch',
      payload: {
        job_id: input.job_id,
        job_code: job.code,
        template_type: input.template_type,
        generation_method: 'html_api',
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
    generation_method: 'html_api',
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
