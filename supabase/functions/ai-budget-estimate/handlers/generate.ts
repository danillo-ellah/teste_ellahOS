// POST /ai-budget-estimate/generate
// Gera estimativa de orcamento para um job usando Claude Sonnet.
// Logica: buscar job + jobs similares + montar prompt + chamar Claude + cache + log

import { getSupabaseClient, getServiceClient } from '../_shared/supabase-client.ts';
import { success } from '../_shared/response.ts';
import { AppError } from '../_shared/errors.ts';
import type { AuthContext } from '../_shared/auth.ts';
import { callClaude, estimateCost } from '../_shared/claude-client.ts';
import type { ClaudeModel } from '../_shared/claude-client.ts';
import { getSimilarJobsContext, getJobFullContext } from '../_shared/ai-context.ts';
import { checkRateLimit, logAiUsage } from '../_shared/ai-rate-limiter.ts';
import {
  BUDGET_ESTIMATE_SYSTEM_PROMPT,
  BUDGET_PROMPT_VERSION,
  buildBudgetUserPrompt,
  formatSimilarJobsTable,
} from '../prompts.ts';

const MODEL: ClaudeModel = 'claude-sonnet-4-20250514';
const MAX_OUTPUT_TOKENS = 2000;

interface GeneratePayload {
  job_id: string;
  override_context?: {
    additional_requirements?: string;
    reference_jobs?: string[];
    budget_ceiling?: number;
  };
}

// Gera hash SHA-256 dos inputs para cache/dedup
async function computeInputHash(jobId: string, overrideContext: unknown): Promise<string> {
  const raw = JSON.stringify({ job_id: jobId, override: overrideContext ?? {} });
  const encoded = new TextEncoder().encode(raw);
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function handleGenerate(
  req: Request,
  auth: AuthContext,
): Promise<Response> {
  console.log('[ai-budget-estimate/generate] tenant:', auth.tenantId, 'user:', auth.userId);

  // 1. Parsear e validar payload
  let payload: GeneratePayload;
  try {
    payload = await req.json();
  } catch {
    throw new AppError('VALIDATION_ERROR', 'Body JSON invalido', 400);
  }

  if (!payload.job_id || typeof payload.job_id !== 'string') {
    throw new AppError('VALIDATION_ERROR', 'job_id e obrigatorio (UUID)', 400);
  }

  const supabase = getSupabaseClient(auth.token);
  const serviceClient = getServiceClient();

  // 2. Rate limiting
  await checkRateLimit(supabase, auth.tenantId, auth.userId, 'budget_estimate');

  // 3. Verificar cache (mesmo input_hash nas ultimas 24h)
  const inputHash = await computeInputHash(payload.job_id, payload.override_context);

  const { data: cached } = await serviceClient
    .from('ai_budget_estimates')
    .select('*')
    .eq('tenant_id', auth.tenantId)
    .eq('input_hash', inputHash)
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (cached) {
    console.log('[ai-budget-estimate/generate] cache hit:', cached.id);
    return success({
      estimate_id: cached.id,
      job_id: cached.job_id,
      suggested_budget: {
        total: cached.suggested_total,
        breakdown: cached.breakdown,
        confidence: cached.confidence,
        confidence_explanation: cached.reasoning?.split('\n')[0] ?? '',
      },
      similar_jobs: cached.similar_jobs,
      reasoning: cached.reasoning,
      warnings: cached.warnings,
      tokens_used: {
        input: cached.input_tokens,
        output: cached.output_tokens,
      },
      cached: true,
    });
  }

  // 4. Buscar contexto do job (com financeiros para estimativa)
  const jobContext = await getJobFullContext(supabase, auth.tenantId, payload.job_id, true);

  if (!jobContext.job) {
    throw new AppError('NOT_FOUND', 'Job nao encontrado', 404);
  }

  // 5. Buscar jobs similares
  const similarJobs = await getSimilarJobsContext(supabase, auth.tenantId, payload.job_id, 10);

  // 6. Montar prompt
  const similarJobsTable = formatSimilarJobsTable(similarJobs);
  const userPrompt = buildBudgetUserPrompt({
    jobTitle: jobContext.job.title,
    jobCode: jobContext.job.code,
    projectType: jobContext.job.project_type,
    clientSegment: jobContext.job.client_segment,
    complexityLevel: jobContext.job.complexity_level,
    briefingText: jobContext.job.briefing_text,
    tags: jobContext.job.tags ?? [],
    mediaType: jobContext.job.media_type,
    deliverables: jobContext.deliverables,
    shootingDates: jobContext.shooting_dates.map((s) => ({
      date: s.date,
      location: s.location,
    })),
    team: jobContext.team.map((t) => ({ role: t.role, rate: t.rate })),
    similarJobsTable,
    overrideContext: payload.override_context,
  });

  // 7. Chamar Claude Sonnet
  const startTime = Date.now();
  let claudeResponse;
  let status: 'success' | 'error' | 'timeout' = 'success';
  let errorMessage: string | undefined;

  try {
    claudeResponse = await callClaude(supabase, {
      model: MODEL,
      system: BUDGET_ESTIMATE_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
      max_tokens: MAX_OUTPUT_TOKENS,
      temperature: 0.3,
    });
  } catch (err) {
    const durationMs = Date.now() - startTime;
    status = err instanceof AppError && err.statusCode === 504 ? 'timeout' : 'error';
    errorMessage = err instanceof Error ? err.message : String(err);

    // Log de uso mesmo em caso de erro
    await logAiUsage(serviceClient, {
      tenantId: auth.tenantId,
      userId: auth.userId,
      feature: 'budget_estimate',
      modelUsed: MODEL,
      inputTokens: 0,
      outputTokens: 0,
      estimatedCostUsd: 0,
      durationMs,
      status,
      errorMessage,
      metadata: { job_id: payload.job_id, prompt_version: BUDGET_PROMPT_VERSION },
    });

    throw err;
  }

  const durationMs = Date.now() - startTime;

  // 8. Parsear resposta JSON do Claude
  let parsedResponse: {
    suggested_budget: {
      total: number;
      breakdown: Record<string, number>;
      confidence: string;
      confidence_explanation: string;
    };
    reasoning: string;
    warnings: string[];
  };

  try {
    // Extrair JSON do content (pode ter texto antes/depois)
    const jsonMatch = claudeResponse.content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Nenhum JSON encontrado na resposta');
    }
    parsedResponse = JSON.parse(jsonMatch[0]);
  } catch (parseErr) {
    console.error('[ai-budget-estimate/generate] falha ao parsear resposta Claude:', parseErr);

    // Log de uso com erro de parsing
    await logAiUsage(serviceClient, {
      tenantId: auth.tenantId,
      userId: auth.userId,
      feature: 'budget_estimate',
      modelUsed: MODEL,
      inputTokens: claudeResponse.input_tokens,
      outputTokens: claudeResponse.output_tokens,
      estimatedCostUsd: estimateCost(MODEL, claudeResponse.input_tokens, claudeResponse.output_tokens),
      durationMs,
      status: 'error',
      errorMessage: `Falha ao parsear JSON da resposta Claude: ${parseErr instanceof Error ? parseErr.message : String(parseErr)}`,
      metadata: { job_id: payload.job_id, prompt_version: BUDGET_PROMPT_VERSION },
    });

    throw new AppError(
      'INTERNAL_ERROR',
      'A IA retornou uma resposta em formato inesperado. Tente novamente.',
      502,
    );
  }

  // 9. Validar campos minimos
  const budget = parsedResponse.suggested_budget;
  if (!budget || typeof budget.total !== 'number') {
    throw new AppError('INTERNAL_ERROR', 'Resposta da IA sem orcamento valido. Tente novamente.', 502);
  }

  const confidence = ['high', 'medium', 'low'].includes(budget.confidence) ? budget.confidence : 'medium';

  // 10. Salvar em ai_budget_estimates (cache)
  const costUsd = estimateCost(MODEL, claudeResponse.input_tokens, claudeResponse.output_tokens);

  const { data: estimate, error: insertError } = await serviceClient
    .from('ai_budget_estimates')
    .insert({
      tenant_id: auth.tenantId,
      job_id: payload.job_id,
      requested_by: auth.userId,
      input_hash: inputHash,
      override_context: payload.override_context ?? {},
      suggested_total: budget.total,
      breakdown: budget.breakdown ?? {},
      confidence,
      reasoning: parsedResponse.reasoning ?? '',
      similar_jobs: similarJobs.map((j) => ({
        job_id: j.job_id,
        title: j.title,
        code: j.code,
        closed_value: j.closed_value,
        production_cost: j.production_cost,
        margin_percentage: j.margin_percentage,
        similarity_score: j.similarity_score,
      })),
      warnings: parsedResponse.warnings ?? [],
      model_used: MODEL,
      input_tokens: claudeResponse.input_tokens,
      output_tokens: claudeResponse.output_tokens,
      duration_ms: durationMs,
    })
    .select('id')
    .single();

  if (insertError) {
    console.error('[ai-budget-estimate/generate] falha ao salvar estimativa:', insertError.message);
  }

  // 11. Log de uso
  await logAiUsage(serviceClient, {
    tenantId: auth.tenantId,
    userId: auth.userId,
    feature: 'budget_estimate',
    modelUsed: MODEL,
    inputTokens: claudeResponse.input_tokens,
    outputTokens: claudeResponse.output_tokens,
    estimatedCostUsd: costUsd,
    durationMs,
    status: 'success',
    metadata: {
      job_id: payload.job_id,
      prompt_version: BUDGET_PROMPT_VERSION,
      estimate_id: estimate?.id,
    },
  });

  // 12. Retornar resposta
  return success({
    estimate_id: estimate?.id ?? null,
    job_id: payload.job_id,
    suggested_budget: {
      total: budget.total,
      breakdown: budget.breakdown,
      confidence,
      confidence_explanation: budget.confidence_explanation ?? '',
    },
    similar_jobs: similarJobs.map((j) => ({
      job_id: j.job_id,
      title: j.title,
      code: j.code,
      closed_value: j.closed_value,
      production_cost: j.production_cost,
      margin_percentage: j.margin_percentage,
      similarity_score: j.similarity_score,
    })),
    reasoning: parsedResponse.reasoning,
    warnings: parsedResponse.warnings ?? [],
    tokens_used: {
      input: claudeResponse.input_tokens,
      output: claudeResponse.output_tokens,
    },
    cached: false,
  });
}
