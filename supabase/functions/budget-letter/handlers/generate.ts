// POST /budget-letter/generate
//
// Gera uma Carta Orcamento profissional usando IA (Groq Llama 3.3 70B).
// Busca dados do job, chama a Groq API com prompt estruturado e salva
// o resultado em job_files com file_type = 'budget_letter'.

import { z } from 'https://esm.sh/zod@3.22.4';
import { getSupabaseClient, getServiceClient } from '../../_shared/supabase-client.ts';
import { created } from '../../_shared/response.ts';
import { AppError } from '../../_shared/errors.ts';
import { callGroq, GROQ_MODEL, estimateGroqCost } from '../../_shared/groq-client.ts';
import { checkRateLimit, logAiUsage } from '../../_shared/ai-rate-limiter.ts';
import { insertHistory } from '../../_shared/history.ts';
import type { AuthContext } from '../../_shared/auth.ts';

// ---------------------------------------------------------------------------
// Roles com permissao para gerar Carta Orcamento
// ---------------------------------------------------------------------------

const ALLOWED_ROLES = ['admin', 'ceo', 'produtor_executivo', 'financeiro'];

// ---------------------------------------------------------------------------
// Validacao de input (Zod)
// ---------------------------------------------------------------------------

const GenerateSchema = z.object({
  job_id: z.string().uuid('job_id deve ser um UUID valido'),
  template: z.string().optional(),
  custom_instructions: z.string().max(1000, 'custom_instructions excede 1000 caracteres').optional(),
});

type GenerateInput = z.infer<typeof GenerateSchema>;

// ---------------------------------------------------------------------------
// Helpers de formatacao (internos)
// ---------------------------------------------------------------------------

function formatBrl(value: number | null | undefined): string {
  if (value == null) return 'nao informado';
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return 'nao informada';
  const parts = dateStr.split('T')[0].split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

// ---------------------------------------------------------------------------
// Construcao do prompt de geracao da carta
// ---------------------------------------------------------------------------

interface PromptParams {
  clientName: string;
  jobTitle: string;
  projectType: string;
  closedValue: number | null;
  paymentTerms: string | null;
  expectedDeliveryDate: string | null;
  deliverables: Array<{ description: string; format: string | null; status: string }>;
  companyName: string;
  customInstructions?: string;
}

function buildGeneratePrompt(params: PromptParams): string {
  const {
    clientName,
    jobTitle,
    projectType,
    closedValue,
    paymentTerms,
    expectedDeliveryDate,
    deliverables,
    companyName,
    customInstructions,
  } = params;

  const deliverablesText = deliverables.length > 0
    ? deliverables
        .map((d, i) => `  ${i + 1}. ${d.description}${d.format ? ` (${d.format})` : ''}`)
        .join('\n')
    : '  (entregaveis a serem definidos conforme escopo)';

  const hoje = new Date();
  const dataHoje = `${String(hoje.getDate()).padStart(2, '0')}/${String(hoje.getMonth() + 1).padStart(2, '0')}/${hoje.getFullYear()}`;
  const validadeStr = new Date(hoje.getTime() + 30 * 24 * 60 * 60 * 1000);
  const dataValidade = `${String(validadeStr.getDate()).padStart(2, '0')}/${String(validadeStr.getMonth() + 1).padStart(2, '0')}/${validadeStr.getFullYear()}`;

  return `Gere uma carta orcamento profissional para uma produtora audiovisual brasileira.

Dados do projeto:
- Produtora: ${companyName}
- Cliente: ${clientName}
- Projeto: ${jobTitle}
- Tipo: ${projectType}
- Valor: ${formatBrl(closedValue)}
- Condicao de pagamento: ${paymentTerms ?? 'a combinar'}
- Prazo de entrega: ${formatDate(expectedDeliveryDate)}
- Data de emissao: ${dataHoje}
- Validade da proposta: ${dataValidade}

Entregas previstas:
${deliverablesText}

A carta deve ter as seguintes secoes em Markdown bem formatado:
1. Cabecalho com cidade, data e identificacao do documento
2. Saudacao formal ao cliente
3. Paragrafo de apresentacao e contexto do projeto
4. Secao "Escopo do Projeto" descrevendo o que sera produzido
5. Tabela Markdown das entregas com colunas: Item | Descricao | Formato
6. Secao "Proposta Comercial" com valor total e condicao de pagamento
7. Paragrafo sobre validade da proposta (${dataValidade}) e proximo passo (assinatura do contrato)
8. Fechamento cordial com nome da produtora

Regras obrigatorias:
- Use portugues brasileiro formal e profissional
- Tom: serio e confiante, mas cordial
- Nao use termos juridicos excessivos
- Mantenha parágrafos curtos e objetivos
- A tabela de entregas deve ser Markdown valido
- Inclua marcadores ### para cada secao principal
- Nao inclua valor de impostos separado — apenas o valor total ao cliente
- Se o valor nao foi informado, escreva "A ser confirmado conforme escopo final"
${customInstructions ? `\nInstrucoes adicionais do usuario:\n${customInstructions}` : ''}`;
}

// ---------------------------------------------------------------------------
// Salvar em job_files (sem Drive — salva apenas o conteudo markdown em metadata)
// ---------------------------------------------------------------------------

async function saveBudgetLetterFile(
  serviceClient: ReturnType<typeof getServiceClient>,
  params: {
    tenantId: string;
    jobId: string;
    content: string;
    version: number;
    uploadedBy: string;
    fileName: string;
  },
): Promise<{ jobFileId: string; version: number; previousFileId: string | null }> {
  const { tenantId, jobId, content, uploadedBy, fileName } = params;
  const category = 'budget_letter';

  // Buscar versao anterior ativa
  let previousVersion = 0;
  let previousFileId: string | null = null;

  const { data: previousFile } = await serviceClient
    .from('job_files')
    .select('id, version')
    .eq('job_id', jobId)
    .eq('tenant_id', tenantId)
    .eq('category', category)
    .is('superseded_by', null)
    .is('deleted_at', null)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (previousFile) {
    previousVersion = (previousFile.version as number) ?? 0;
    previousFileId = previousFile.id as string;
  }

  const newVersion = previousVersion + 1;

  // Inserir novo registro em job_files
  // O conteudo markdown e armazenado em metadata.content (nao ha upload de arquivo binario)
  const { data: jobFile, error: jobFileError } = await serviceClient
    .from('job_files')
    .insert({
      tenant_id: tenantId,
      job_id: jobId,
      file_name: fileName,
      file_url: null,
      file_type: 'text/markdown',
      category,
      external_id: null,
      external_source: null,
      file_size_bytes: new TextEncoder().encode(content).byteLength,
      version: newVersion,
      uploaded_by: uploadedBy,
      metadata: {
        content,
        generated_by_ai: true,
        model: GROQ_MODEL,
      },
    })
    .select('id')
    .single();

  if (jobFileError || !jobFile) {
    console.error(
      `[budget-letter/generate] falha ao salvar em job_files: ${jobFileError?.message}`,
    );
    // Nao bloqueia — retorna sem ID
    return { jobFileId: '', version: newVersion, previousFileId };
  }

  const jobFileId = jobFile.id as string;

  // Marcar versao anterior como superseded
  if (previousFileId && jobFileId) {
    const { error: supersedeError } = await serviceClient
      .from('job_files')
      .update({ superseded_by: jobFileId })
      .eq('id', previousFileId)
      .eq('tenant_id', tenantId);

    if (supersedeError) {
      console.warn(
        `[budget-letter/generate] falha ao marcar superseded: ${supersedeError.message}`,
      );
    }
  }

  return { jobFileId, version: newVersion, previousFileId };
}

// ---------------------------------------------------------------------------
// Handler principal
// ---------------------------------------------------------------------------

export async function generateHandler(
  req: Request,
  auth: AuthContext,
): Promise<Response> {
  // Verificar permissao
  if (!ALLOWED_ROLES.includes(auth.role)) {
    throw new AppError(
      'FORBIDDEN',
      'Permissao insuficiente para gerar Carta Orcamento',
      403,
    );
  }

  // Validar e parsear body
  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    throw new AppError('VALIDATION_ERROR', 'Payload JSON invalido', 400);
  }

  const parseResult = GenerateSchema.safeParse(rawBody);
  if (!parseResult.success) {
    const firstError = parseResult.error.errors[0];
    throw new AppError('VALIDATION_ERROR', firstError.message, 400, {
      field: firstError.path.join('.'),
    });
  }

  const input: GenerateInput = parseResult.data;
  const { job_id: jobId, custom_instructions: customInstructions } = input;

  const supabase = getSupabaseClient(auth.token);
  const serviceClient = getServiceClient();

  console.log(
    `[budget-letter/generate] user=${auth.userId} tenant=${auth.tenantId} job_id=${jobId}`,
  );

  // Rate limiting
  await checkRateLimit(supabase, auth.tenantId, auth.userId, 'budget_letter');

  // 1. Buscar dados do job
  const { data: job, error: jobError } = await supabase
    .from('jobs')
    .select(`
      id, code, title, project_type, brand,
      closed_value, payment_terms,
      expected_delivery_date,
      clients (
        id, name, company_name
      )
    `)
    .eq('id', jobId)
    .eq('tenant_id', auth.tenantId)
    .is('deleted_at', null)
    .single();

  if (jobError || !job) {
    throw new AppError('NOT_FOUND', 'Job nao encontrado', 404);
  }

  // 2. Buscar entregaveis do job
  const { data: deliverables } = await supabase
    .from('job_deliverables')
    .select('description, format, status')
    .eq('job_id', jobId)
    .eq('tenant_id', auth.tenantId)
    .is('deleted_at', null)
    .order('display_order', { ascending: true });

  // 3. Buscar dados do tenant (nome da produtora)
  const { data: tenant } = await serviceClient
    .from('tenants')
    .select('name, settings')
    .eq('id', auth.tenantId)
    .single();

  const tenantSettings = (tenant?.settings as Record<string, unknown>) ?? {};
  const companyInfo = (tenantSettings.company_info as Record<string, unknown>) ?? {};
  const companyName = (companyInfo.name as string) || (tenant?.name as string) || 'Ellah Filmes';

  // 4. Montar dados do cliente
  const clientData = (job.clients as Record<string, unknown>) ?? {};
  const clientName = (clientData.name as string) ?? (clientData.company_name as string) ?? 'Cliente';

  // 5. Construir prompt e chamar Groq
  const promptParams: PromptParams = {
    clientName,
    jobTitle: (job.title as string) ?? '',
    projectType: (job.project_type as string) ?? '',
    closedValue: job.closed_value as number | null,
    paymentTerms: job.payment_terms as string | null,
    expectedDeliveryDate: job.expected_delivery_date as string | null,
    deliverables: (deliverables ?? []).map((d: Record<string, unknown>) => ({
      description: (d.description as string) ?? '',
      format: (d.format as string | null) ?? null,
      status: (d.status as string) ?? '',
    })),
    companyName,
    customInstructions,
  };

  const systemPrompt =
    'Voce e um redator profissional especializado em documentos comerciais para produtoras audiovisuais brasileiras. Gere documentos formais, claros e profissionais em Markdown.';

  const userPrompt = buildGeneratePrompt(promptParams);

  console.log(`[budget-letter/generate] chamando Groq API para job ${jobId}`);
  const startTime = Date.now();

  let groqResponse;
  let aiStatus: 'success' | 'error' | 'timeout' = 'success';
  let aiError: string | undefined;

  try {
    groqResponse = await callGroq(supabase, {
      model: GROQ_MODEL,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      max_tokens: 3000,
      temperature: 0.4,
    });
  } catch (err) {
    const durationMs = Date.now() - startTime;
    aiStatus = err instanceof AppError && err.statusCode === 504 ? 'timeout' : 'error';
    aiError = err instanceof Error ? err.message : String(err);

    await logAiUsage(serviceClient, {
      tenantId: auth.tenantId,
      userId: auth.userId,
      feature: 'budget_estimate',
      modelUsed: GROQ_MODEL,
      inputTokens: 0,
      outputTokens: 0,
      estimatedCostUsd: 0,
      durationMs,
      status: aiStatus,
      errorMessage: aiError,
      metadata: { job_id: jobId },
    });

    throw err;
  }

  const durationMs = Date.now() - startTime;
  const content = groqResponse.content;

  console.log(
    `[budget-letter/generate] Groq concluiu job=${jobId} chars=${content.length} tokens_in=${groqResponse.input_tokens} tokens_out=${groqResponse.output_tokens} duration=${durationMs}ms`,
  );

  // 6. Registrar uso de IA
  const costUsd = estimateGroqCost(groqResponse.input_tokens, groqResponse.output_tokens);
  await logAiUsage(serviceClient, {
    tenantId: auth.tenantId,
    userId: auth.userId,
    feature: 'budget_estimate',
    modelUsed: GROQ_MODEL,
    inputTokens: groqResponse.input_tokens,
    outputTokens: groqResponse.output_tokens,
    estimatedCostUsd: costUsd,
    durationMs,
    status: aiStatus,
    errorMessage: aiError,
    metadata: { job_id: jobId, document_type: 'budget_letter' },
  });

  // 7. Salvar em job_files
  const jobCode = (job.code as string) ?? jobId.slice(0, 8);
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const fileName = `Carta_Orcamento_${jobCode}_${dateStr}.md`;

  const { jobFileId, version, previousFileId } = await saveBudgetLetterFile(
    serviceClient,
    {
      tenantId: auth.tenantId,
      jobId,
      content,
      version: 1, // sera sobrescrito internamente pela logica de versao
      uploadedBy: auth.userId,
      fileName,
    },
  );

  // 8. Registrar no historico do job
  try {
    await insertHistory(supabase, {
      tenantId: auth.tenantId,
      jobId,
      eventType: 'field_update',
      userId: auth.userId,
      description: version > 1
        ? `Carta Orcamento regenerada (v${version})`
        : 'Carta Orcamento gerada',
      dataAfter: {
        action: 'budget_letter_generated',
        job_file_id: jobFileId || null,
        version,
        generated_by: auth.userId,
        model: GROQ_MODEL,
        previous_file_id: previousFileId,
      },
    });
  } catch (histErr) {
    console.warn('[budget-letter/generate] falha ao registrar historico (nao critico):', histErr);
  }

  return created(
    {
      job_id: jobId,
      content,
      version,
      job_file_id: jobFileId || null,
      previous_file_id: previousFileId,
      file_name: fileName,
      tokens_used: {
        input: groqResponse.input_tokens,
        output: groqResponse.output_tokens,
      },
      generated_at: new Date().toISOString(),
    },
    req,
  );
}
