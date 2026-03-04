import { z } from 'https://esm.sh/zod@3.22.4';
import { getSupabaseClient, getServiceClient } from '../../_shared/supabase-client.ts';
import { created, createdWithWarnings } from '../../_shared/response.ts';
import { AppError } from '../../_shared/errors.ts';
import { getSecret } from '../../_shared/vault.ts';
import { createSubmission } from '../../_shared/docuseal-client.ts';
import { enqueueEvent } from '../../_shared/integration-client.ts';
import type { AuthContext } from '../../_shared/auth.ts';
import type { DocuSealSubmissionRow } from '../../_shared/types.ts';

// Roles com permissao de gerar contratos de elenco
const ALLOWED_ROLES = ['admin', 'ceo', 'produtor_executivo', 'coordenador', 'diretor', 'financeiro', 'atendimento'];

// Schema de validacao do payload
const GenerateContractsSchema = z.object({
  job_id: z.string().uuid('job_id deve ser UUID valido'),
  cast_member_ids: z
    .array(z.string().uuid('cada cast_member_id deve ser UUID valido'))
    .min(1, 'Pelo menos um membro deve ser selecionado')
    .max(50, 'Maximo de 50 membros por lote'),
  template_id: z.number().int().positive().optional(),
  send_email: z.boolean().default(true),
});

type GenerateContractsInput = z.infer<typeof GenerateContractsSchema>;

// Resultado por membro do elenco
interface CastMemberResult {
  cast_member_id: string;
  name: string;
  status: 'sent' | 'skipped' | 'error';
  skip_reason?: string;
  error?: string;
  submission_id?: string;
  docuseal_submission_id?: number;
}

// Resolve o template_id: usa o informado, ou tenta Vault tenant-specific,
// fallback Vault global, ou fallback hardcoded 3
async function resolveTemplateId(
  serviceClient: ReturnType<typeof getServiceClient>,
  tenantId: string,
  explicitId?: number,
): Promise<number> {
  if (explicitId) return explicitId;

  const KEY = 'DOCUSEAL_TEMPLATE_ID_ELENCO';

  // Tenta vault por tenant
  let value = await getSecret(serviceClient, `${tenantId}_${KEY}`);
  if (!value) {
    // Fallback vault global
    value = await getSecret(serviceClient, KEY);
  }

  if (value) {
    const parsed = parseInt(value, 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;
    console.warn(`[job-cast/generate-contracts] valor invalido no Vault para "${KEY}": "${value}" — usando fallback 3`);
  }

  // Fallback hardcoded (template elenco padrao Ellah Filmes)
  return 3;
}

// Formata valor monetario em BRL
function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// Converte numero para extenso em portugues brasileiro
function numeroParaExtenso(valor: number): string {
  const unidades = ['', 'um', 'dois', 'tres', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];
  const dezenas = ['', 'dez', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
  const centenas = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];
  const especiais = ['dez', 'onze', 'doze', 'treze', 'catorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];

  let valorReais = Math.floor(valor);
  const valorCentavos = Math.round((valor - valorReais) * 100);

  function partePorExtenso(v: number): string {
    let resultado = '';
    let remaining = v;
    if (remaining === 100) return 'cem';
    if (remaining >= 100) {
      resultado += centenas[Math.floor(remaining / 100)];
      remaining %= 100;
      if (remaining > 0) resultado += ' e ';
    }
    if (remaining >= 20) {
      resultado += dezenas[Math.floor(remaining / 10)];
      remaining %= 10;
      if (remaining > 0) resultado += ' e ';
    } else if (remaining >= 10) {
      resultado += especiais[remaining - 10];
      remaining = 0;
    }
    if (remaining > 0) resultado += unidades[remaining];
    return resultado.trim();
  }

  let extenso = '';
  if (valorReais >= 1000) {
    const milhares = Math.floor(valorReais / 1000);
    extenso += milhares === 1 ? 'mil' : `${partePorExtenso(milhares)} mil`;
    valorReais %= 1000;
    if (valorReais > 0) extenso += ' e ';
  }
  if (valorReais > 0) {
    extenso += partePorExtenso(valorReais);
  }
  extenso = extenso ? `${extenso} reais` : 'zero reais';
  if (valorCentavos > 0) {
    extenso += ` e ${partePorExtenso(valorCentavos)} centavos`;
  }
  return extenso.trim();
}

export async function handleGenerateContracts(req: Request, auth: AuthContext): Promise<Response> {
  // Verificar permissao
  if (!ALLOWED_ROLES.includes(auth.role)) {
    throw new AppError('FORBIDDEN', 'Permissao insuficiente para gerar contratos de elenco', 403);
  }

  // Validar payload
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new AppError('VALIDATION_ERROR', 'Payload JSON invalido', 400);
  }

  const parseResult = GenerateContractsSchema.safeParse(body);
  if (!parseResult.success) {
    const issues = parseResult.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message }));
    throw new AppError('VALIDATION_ERROR', issues[0].message, 400, { issues });
  }

  const input: GenerateContractsInput = parseResult.data;
  const supabase = getSupabaseClient(auth.token);
  const serviceClient = getServiceClient();

  console.log('[job-cast/generate-contracts] request recebido', {
    userId: auth.userId,
    tenantId: auth.tenantId,
    jobId: input.job_id,
    castMemberCount: input.cast_member_ids.length,
    sendEmail: input.send_email,
  });

  // 1. Verificar job
  const { data: job, error: jobError } = await supabase
    .from('jobs')
    .select('id, title, code, client_id, agency_id, brand, custom_fields')
    .eq('id', input.job_id)
    .eq('tenant_id', auth.tenantId)
    .is('deleted_at', null)
    .single();

  if (jobError || !job) {
    throw new AppError('NOT_FOUND', 'Job nao encontrado', 404);
  }

  // 2. Buscar dados do cliente
  let clientData: Record<string, unknown> | null = null;
  if (job.client_id) {
    const { data } = await supabase
      .from('clients')
      .select('name, trading_name, cnpj, address, city, state, cep')
      .eq('id', job.client_id)
      .single();
    clientData = data;
  }

  // 3. Buscar dados da agencia de publicidade
  let agencyData: Record<string, unknown> | null = null;
  if (job.agency_id) {
    const { data } = await supabase
      .from('agencies')
      .select('name, trading_name, cnpj, address, city, state, cep')
      .eq('id', job.agency_id)
      .single();
    agencyData = data;
  }

  // 4. Buscar membros do elenco selecionados
  const { data: members, error: membersError } = await supabase
    .from('job_cast')
    .select('*')
    .eq('job_id', input.job_id)
    .eq('tenant_id', auth.tenantId)
    .in('id', input.cast_member_ids);

  if (membersError) {
    console.error('[job-cast/generate-contracts] falha ao buscar membros:', membersError.message);
    throw new AppError('INTERNAL_ERROR', 'Falha ao buscar membros do elenco', 500);
  }

  if (!members || members.length === 0) {
    throw new AppError('NOT_FOUND', 'Nenhum membro do elenco encontrado com os IDs informados', 404);
  }

  // 5. Resolver template_id (Vault ou fallback)
  const resolvedTemplateId = await resolveTemplateId(serviceClient, auth.tenantId, input.template_id);

  console.log('[job-cast/generate-contracts] template resolvido:', resolvedTemplateId);

  // 6. Verificar quais membros ja possuem contrato ativo (evita duplicacao)
  const memberEmails = members
    .map((m) => m.email as string | null)
    .filter((e): e is string => !!e);

  const { data: existingSubmissions } = await supabase
    .from('docuseal_submissions')
    .select('person_email, docuseal_status')
    .eq('job_id', input.job_id)
    .eq('docuseal_template_id', resolvedTemplateId)
    .eq('tenant_id', auth.tenantId)
    .in('person_email', memberEmails)
    .in('docuseal_status', ['pending', 'sent', 'opened', 'partially_signed', 'signed'])
    .is('deleted_at', null);

  const emailsWithActiveContract = new Set(
    (existingSubmissions ?? []).map((s) => s.person_email as string),
  );

  // 7. Data atual formatada para campos do contrato
  const now = new Date();
  const dataAtual = `Sao Paulo, ${now.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })}`;
  const nowIso = now.toISOString();

  // Custom fields do job (dados da obra ANCINE, veiculacao, etc.)
  const cf = ((job.custom_fields as Record<string, unknown>) ?? {}) as Record<string, string>;

  // 8. Gerar contratos individualmente
  const sent: CastMemberResult[] = [];
  const skipped: CastMemberResult[] = [];
  const failed: Array<{ member: typeof members[0]; reason: string }> = [];

  for (const member of members) {
    // Verificar email (obrigatorio para DocuSeal)
    if (!member.email) {
      skipped.push({
        cast_member_id: member.id as string,
        name: member.name as string,
        status: 'skipped',
        skip_reason: 'Email nao informado',
      });
      continue;
    }

    // Verificar contrato ativo existente
    if (emailsWithActiveContract.has(member.email as string)) {
      skipped.push({
        cast_member_id: member.id as string,
        name: member.name as string,
        status: 'skipped',
        skip_reason: 'Ja possui contrato ativo para este template',
      });
      continue;
    }

    const castingAgency = ((member.casting_agency as Record<string, string> | null) ?? {}) as Record<string, string>;

    // Montar campos pre-preenchidos para os placeholders do template
    const contractFields: Array<{ name: string; value: string }> = [
      // Contratado — dados pessoais
      { name: 'NOME_COMPLETO', value: (member.name as string) || '' },
      { name: 'Nome', value: (member.name as string) || '' },
      { name: 'CPF', value: (member.cpf as string) || '' },
      { name: 'RG', value: (member.rg as string) || '' },
      { name: 'DRT', value: (member.drt as string) || '' },
      { name: 'DATA_NASCIMENTO', value: (member.birth_date as string) || '' },
      { name: 'ENDERECO', value: (member.address as string) || '' },
      { name: 'CIDADE', value: (member.city as string) || '' },
      { name: 'CEP', value: (member.zip_code as string) || '' },
      { name: 'TELEFONE', value: (member.phone as string) || '' },
      { name: 'EMAIL', value: (member.email as string) || '' },
      { name: 'PROFISSAO', value: (member.profession as string) || '' },
      { name: 'ELENCO', value: (member.cast_category as string) || '' },
      { name: 'OQUEFEZ', value: (member.scenes_description as string) || '' },
      { name: 'DIARIA', value: String((member.num_days as number) || 1) },

      // Valores monetarios
      { name: 'VALOR_PRESTACAO', value: formatBRL((member.service_fee as number) || 0) },
      { name: 'VALOR_IMAGEM', value: formatBRL((member.image_rights_fee as number) || 0) },
      { name: 'VALOR_AGENCIAMENTO', value: formatBRL((member.agency_fee as number) || 0) },
      { name: 'VALOR_TOTAL', value: formatBRL((member.total_fee as number) || 0) },
      { name: 'VALOR_PRESTACAO_EXTENSO', value: `(${numeroParaExtenso((member.service_fee as number) || 0)})` },
      { name: 'VALOR_IMAGEM_EXTENSO', value: `(${numeroParaExtenso((member.image_rights_fee as number) || 0)})` },
      { name: 'VALOR_AGENCIAMENTO_EXTENSO', value: `(${numeroParaExtenso((member.agency_fee as number) || 0)})` },
      { name: 'VALOR_TOTAL_EXTENSO', value: `(${numeroParaExtenso((member.total_fee as number) || 0)})` },

      // Agencia de Casting (Interveniente)
      { name: 'RAZAO_SOCIAL', value: castingAgency.name || '' },
      { name: 'ENDERECO_AGENCIA', value: castingAgency.address || '' },
      { name: 'CNPJ_AGENCIA', value: castingAgency.cnpj || '' },
      { name: 'REPRESENTANTE_LEGAL', value: castingAgency.representative || '' },
      { name: 'RG_AGENCIA', value: castingAgency.rep_rg || '' },
      { name: 'CPF_AGENCIA', value: castingAgency.rep_cpf || '' },

      // Cliente (Contratante)
      { name: 'NOME_CLIENTE', value: (clientData?.name as string) || '' },
      { name: 'ENDERECO_CLIENTE', value: (clientData?.address as string) || '' },
      { name: 'CNPJ_CLIENTE', value: (clientData?.cnpj as string) || '' },

      // Agencia de Publicidade
      { name: 'NOME_AGENCIA_PUBLI', value: (agencyData?.name as string) || '' },
      { name: 'END_AGENCIA_PUBLI', value: (agencyData?.address as string) || '' },
      { name: 'CIDADE_AGENCIA_PUBLI', value: (agencyData?.city as string) || '' },
      { name: 'ESTADO_AGENCIA_PUBLI', value: (agencyData?.state as string) || '' },
      { name: 'CEP_AGENCIA_PUBLI', value: (agencyData?.cep as string) || '' },
      { name: 'CNPJ_AGENCIA_PUBLI', value: (agencyData?.cnpj as string) || '' },

      // Dados da obra / job
      { name: 'TITULO', value: (job.title as string) || '' },
      { name: 'Projeto', value: (job.title as string) || '' },
      { name: 'Codigo', value: (job.code as string) || '' },
      { name: 'PRODUTO', value: cf.product || (job.brand as string) || '' },
      { name: 'QTDE_PECAS', value: cf.qtde_pecas || '' },
      { name: 'SUP_OBRA', value: cf.sup_obra || '' },
      { name: 'DURACAO', value: cf.duracao || '' },
      { name: 'EXCLUSIVIDADE', value: cf.exclusividade || '' },
      { name: 'VEICULACAO', value: cf.veiculacao || '' },
      { name: 'COMP_GRAFICA', value: cf.comp_grafica || '' },
      { name: 'MIDIA', value: cf.midia || '' },

      // Data do contrato
      { name: 'DATA_ATUAL', value: dataAtual },
    ];

    console.log(
      `[job-cast/generate-contracts] gerando contrato para cast_member_id=${member.id}`,
    );

    // Chamar DocuSeal para criar a submission
    let docusealResponse;
    try {
      docusealResponse = await createSubmission(serviceClient, auth.tenantId, {
        template_id: resolvedTemplateId,
        send_email: input.send_email,
        submitters: [
          {
            role: 'Contratado',
            email: member.email as string,
            fields: contractFields,
          },
        ],
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(
        `[job-cast/generate-contracts] falha DocuSeal para cast_member_id=${member.id}: ${msg}`,
      );
      failed.push({ member, reason: msg });
      continue;
    }

    // Persistir registro em docuseal_submissions
    const rowToInsert: Partial<DocuSealSubmissionRow> = {
      tenant_id: auth.tenantId,
      job_id: input.job_id,
      person_id: (member.person_id as string) || null,
      person_name: member.name as string,
      person_email: member.email as string,
      person_cpf: (member.cpf as string) || null,
      docuseal_submission_id: docusealResponse.id,
      docuseal_template_id: resolvedTemplateId,
      docuseal_status: input.send_email ? 'sent' : 'pending',
      contract_data: {
        docuseal_submitter_id: docusealResponse.submitters?.[0]?.id ?? null,
        docuseal_submitter_status: docusealResponse.submitters?.[0]?.status ?? null,
        template_type: 'elenco',
        cast_member_id: member.id,
        cast_category: member.cast_category,
        fields: contractFields,
        job_code: job.code,
        job_title: job.title,
      },
      signed_pdf_url: null,
      signed_pdf_drive_id: null,
      sent_at: input.send_email ? nowIso : null,
      opened_at: null,
      signed_at: null,
      created_by: auth.userId,
      error_message: null,
      metadata: {
        created_from: 'job-cast/generate-contracts',
        template_type: 'elenco',
        batch_timestamp: nowIso,
      },
    };

    const { data: insertedRow, error: insertError } = await supabase
      .from('docuseal_submissions')
      .insert(rowToInsert)
      .select('id, person_email, person_name, docuseal_status, sent_at')
      .single();

    if (insertError || !insertedRow) {
      const msg = insertError?.message ?? 'erro desconhecido';
      console.error(
        `[job-cast/generate-contracts] falha ao persistir submission para cast_member_id=${member.id}: ${msg}`,
      );
      failed.push({ member, reason: `Falha ao persistir: ${msg}` });
      continue;
    }

    // Atualizar contract_status no job_cast
    const { error: castUpdateErr } = await supabase
      .from('job_cast')
      .update({ contract_status: 'enviado' })
      .eq('id', member.id as string)
      .eq('tenant_id', auth.tenantId);

    if (castUpdateErr) {
      console.error(
        `[job-cast/generate-contracts] falha ao atualizar contract_status para cast_member_id=${member.id}:`,
        castUpdateErr.message,
      );
    }

    sent.push({
      cast_member_id: member.id as string,
      name: member.name as string,
      status: 'sent',
      submission_id: insertedRow.id,
      docuseal_submission_id: docusealResponse.id,
    });

    console.log(
      `[job-cast/generate-contracts] contrato enviado: name=${member.name} docuseal_submission_id=${docusealResponse.id}`,
    );
  }

  // 9. Enfileirar evento de auditoria (nao bloqueante)
  try {
    await enqueueEvent(serviceClient, {
      tenant_id: auth.tenantId,
      event_type: 'docuseal_create_batch',
      payload: {
        job_id: input.job_id,
        job_code: job.code,
        template_type: 'elenco',
        template_id: resolvedTemplateId,
        total_requested: members.length,
        generated_count: sent.length,
        skipped_count: skipped.length,
        failed_count: failed.length,
        created_by: auth.userId,
        submission_ids: sent.map((s) => s.submission_id),
      },
      idempotency_key: `cast_contracts_${input.job_id}_${nowIso.substring(0, 16)}`,
    });
  } catch (evErr) {
    console.error('[job-cast/generate-contracts] falha ao enfileirar integration_event (nao critico):', evErr);
  }

  console.log(
    `[job-cast/generate-contracts] concluido: enviados=${sent.length} ignorados=${skipped.length} falhas=${failed.length}`,
  );

  // Transformar falhas em warnings na resposta
  const warnings = failed.map((f) => ({
    code: 'CONTRACT_GENERATION_FAILED',
    message: `Falha ao gerar contrato para ${f.member.name}: ${f.reason}`,
  }));

  const allResults: CastMemberResult[] = [
    ...sent,
    ...skipped,
    ...failed.map((f) => ({
      cast_member_id: f.member.id as string,
      name: f.member.name as string,
      status: 'error' as const,
      error: f.reason,
    })),
  ];

  const responseData = {
    job_id: input.job_id,
    job_code: job.code,
    template_id: resolvedTemplateId,
    sent: sent.length,
    skipped: skipped.length,
    errors: failed.length,
    results: allResults,
  };

  if (warnings.length > 0) {
    return createdWithWarnings(responseData, warnings, req);
  }

  return created(responseData, req);
}
