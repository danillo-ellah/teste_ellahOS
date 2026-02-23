// POST /ai-freelancer-match/suggest
// Recebe job_id + role desejado, busca candidatos freelancers do tenant,
// chama Claude Sonnet para ranquear por adequacao e retorna sugestoes enriquecidas.

import { getSupabaseClient, getServiceClient } from '../_shared/supabase-client.ts';
import { success } from '../_shared/response.ts';
import { AppError } from '../_shared/errors.ts';
import type { AuthContext } from '../_shared/auth.ts';
import { callClaude, estimateCost } from '../_shared/claude-client.ts';
import type { ClaudeModel } from '../_shared/claude-client.ts';
import { getJobFullContext, getFreelancerCandidates } from '../_shared/ai-context.ts';
import type { FreelancerCandidate } from '../_shared/ai-context.ts';
import { checkRateLimit, logAiUsage } from '../_shared/ai-rate-limiter.ts';
import {
  FREELANCER_SYSTEM_PROMPT,
  FREELANCER_PROMPT_VERSION,
  buildFreelancerUserPrompt,
} from '../prompts.ts';

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

const MODEL: ClaudeModel = 'claude-sonnet-4-20250514';
const MAX_OUTPUT_TOKENS = 2000;
const TEMPERATURE = 0.3;

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

/** Payload de entrada do endpoint */
interface SuggestPayload {
  job_id: string;
  role: string;
  requirements?: string;
  max_rate?: number;
  preferred_start?: string;
  preferred_end?: string;
  limit?: number;
}

/** Candidato ranqueado retornado pelo Claude */
interface RankedCandidate {
  person_id: string;
  match_score: number;
  match_reasons: string[];
}

/** Resposta parseada do Claude */
interface ClaudeParsedResponse {
  ranked_candidates: RankedCandidate[];
  reasoning: string;
}

/** Sugestao final enriquecida retornada ao cliente */
interface EnrichedSuggestion {
  person_id: string;
  full_name: string;
  default_role: string;
  default_rate: number | null;
  is_internal: boolean;
  match_score: number;
  match_reasons: string[];
  availability: {
    is_available: boolean;
    conflicts: Array<{
      job_code: string;
      job_title: string;
      overlap_start: string;
      overlap_end: string;
    }>;
  };
  past_performance: {
    total_jobs: number;
    jobs_with_same_type: number;
    avg_job_health_score: number | null;
    last_job_date: string | null;
  };
}

// ---------------------------------------------------------------------------
// Validacao
// ---------------------------------------------------------------------------

/** Valida e retorna o payload parseado. Lanca AppError se invalido. */
function validatePayload(body: unknown): SuggestPayload {
  const payload = body as Record<string, unknown>;

  // job_id obrigatorio
  if (!payload.job_id || typeof payload.job_id !== 'string') {
    throw new AppError('VALIDATION_ERROR', 'job_id e obrigatorio (UUID)', 400);
  }

  // role obrigatorio
  if (!payload.role || typeof payload.role !== 'string') {
    throw new AppError('VALIDATION_ERROR', 'role e obrigatorio (string)', 400);
  }

  // requirements opcional (string)
  if (payload.requirements !== undefined && typeof payload.requirements !== 'string') {
    throw new AppError('VALIDATION_ERROR', 'requirements deve ser string', 400);
  }

  // max_rate opcional (numero positivo)
  if (payload.max_rate !== undefined && payload.max_rate !== null) {
    if (typeof payload.max_rate !== 'number' || payload.max_rate <= 0) {
      throw new AppError('VALIDATION_ERROR', 'max_rate deve ser um numero positivo', 400);
    }
  }

  // preferred_start opcional (string ISO)
  if (payload.preferred_start !== undefined && typeof payload.preferred_start !== 'string') {
    throw new AppError('VALIDATION_ERROR', 'preferred_start deve ser uma data ISO', 400);
  }

  // preferred_end opcional (string ISO)
  if (payload.preferred_end !== undefined && typeof payload.preferred_end !== 'string') {
    throw new AppError('VALIDATION_ERROR', 'preferred_end deve ser uma data ISO', 400);
  }

  // limit opcional (default 5, max 10)
  let limit = 5;
  if (payload.limit !== undefined && payload.limit !== null) {
    if (typeof payload.limit !== 'number' || !Number.isInteger(payload.limit) || payload.limit < 1) {
      throw new AppError('VALIDATION_ERROR', 'limit deve ser inteiro entre 1 e 10', 400);
    }
    limit = Math.min(payload.limit as number, 10);
  }

  return {
    job_id: payload.job_id as string,
    role: (payload.role as string).trim(),
    requirements: payload.requirements as string | undefined,
    max_rate: (payload.max_rate as number | undefined) ?? undefined,
    preferred_start: payload.preferred_start as string | undefined,
    preferred_end: payload.preferred_end as string | undefined,
    limit,
  };
}

/**
 * Valida a resposta parseada do Claude.
 * Filtra candidatos cujo person_id nao existe nos candidatos originais.
 * Clipa match_score entre 0 e 100.
 */
function validateParsedResponse(
  parsed: unknown,
  validPersonIds: Set<string>,
): ClaudeParsedResponse {
  const obj = parsed as Record<string, unknown>;

  // ranked_candidates obrigatorio (array)
  if (!Array.isArray(obj.ranked_candidates)) {
    throw new Error('Campo "ranked_candidates" ausente ou nao e um array');
  }

  // reasoning obrigatorio (string)
  if (!obj.reasoning || typeof obj.reasoning !== 'string') {
    throw new Error('Campo "reasoning" ausente ou invalido');
  }

  // Validar e filtrar cada candidato
  const rankedCandidates: RankedCandidate[] = [];

  for (const raw of obj.ranked_candidates) {
    const item = raw as Record<string, unknown>;

    // person_id deve existir entre os candidatos fornecidos
    if (!item.person_id || typeof item.person_id !== 'string') {
      continue; // ignorar entrada sem person_id valido
    }

    if (!validPersonIds.has(item.person_id)) {
      console.warn(
        `[ai-freelancer-match/suggest] Claude retornou person_id desconhecido: ${item.person_id}, ignorando`,
      );
      continue; // ignorar person_id que nao foi fornecido
    }

    // match_score clipped 0-100
    let matchScore = typeof item.match_score === 'number' ? item.match_score : 0;
    matchScore = Math.min(100, Math.max(0, Math.round(matchScore)));

    // match_reasons deve ser array de strings (filtrar invalidos)
    const rawReasons = Array.isArray(item.match_reasons) ? item.match_reasons : [];
    const matchReasons = rawReasons
      .filter((r: unknown) => typeof r === 'string' && (r as string).length > 0)
      .map((r: unknown) => r as string);

    rankedCandidates.push({
      person_id: item.person_id,
      match_score: matchScore,
      match_reasons: matchReasons.length > 0 ? matchReasons : ['Candidato avaliado pela IA'],
    });
  }

  return {
    ranked_candidates: rankedCandidates,
    reasoning: obj.reasoning as string,
  };
}

// ---------------------------------------------------------------------------
// Handler principal
// ---------------------------------------------------------------------------

export async function handleSuggest(
  req: Request,
  auth: AuthContext,
): Promise<Response> {
  console.log('[ai-freelancer-match/suggest] tenant:', auth.tenantId, 'user:', auth.userId);

  // 1. Parsear e validar payload
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new AppError('VALIDATION_ERROR', 'Body JSON invalido', 400);
  }

  const payload = validatePayload(body);

  const supabase = getSupabaseClient(auth.token);
  const serviceClient = getServiceClient();

  // 2. Rate limiting
  await checkRateLimit(supabase, auth.tenantId, auth.userId, 'freelancer_match');

  // 3. Buscar contexto do job (sem financeiros — matching nao precisa)
  const jobContext = await getJobFullContext(supabase, auth.tenantId, payload.job_id, false);

  if (!jobContext.job || !jobContext.job.title) {
    throw new AppError('NOT_FOUND', 'Job nao encontrado', 404);
  }

  // 4. Buscar candidatos freelancers para o role solicitado
  const candidates: FreelancerCandidate[] = await getFreelancerCandidates(
    supabase,
    auth.tenantId,
    payload.role,
    payload.preferred_start,
    payload.preferred_end,
    jobContext.job.project_type,
  );

  console.log(
    `[ai-freelancer-match/suggest] ${candidates.length} candidatos encontrados para role "${payload.role}"`,
  );

  // 5. Se nenhum candidato encontrado, retornar lista vazia sem chamar Claude
  if (candidates.length === 0) {
    return success({
      suggestions: [],
      reasoning: `Nenhum freelancer encontrado para a funcao "${payload.role}" neste tenant.`,
      tokens_used: { input: 0, output: 0 },
    });
  }

  // 6. Montar prompt com buildFreelancerUserPrompt
  const userPrompt = buildFreelancerUserPrompt({
    job: {
      code: jobContext.job.code,
      title: jobContext.job.title,
      project_type: jobContext.job.project_type,
      status: jobContext.job.status,
      complexity_level: jobContext.job.complexity_level,
      briefing_text: jobContext.job.briefing_text,
    },
    request: {
      role: payload.role,
      requirements: payload.requirements ?? null,
      max_rate: payload.max_rate ?? null,
      preferred_start: payload.preferred_start ?? null,
      preferred_end: payload.preferred_end ?? null,
    },
    candidates: candidates.map((c) => ({
      person_id: c.person_id,
      full_name: c.full_name,
      default_role: c.default_role,
      default_rate: c.default_rate,
      is_internal: c.is_internal,
      total_jobs: c.total_jobs,
      jobs_same_type: c.jobs_same_type,
      avg_health_score: c.avg_health_score,
      last_job_date: c.last_job_date,
      conflicts: c.conflicts,
    })),
  });

  // 7. Chamar Claude Sonnet
  const startTime = Date.now();
  let claudeResponse;
  let status: 'success' | 'error' | 'timeout' = 'success';
  let errorMessage: string | undefined;

  try {
    claudeResponse = await callClaude(supabase, {
      model: MODEL,
      system: FREELANCER_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
      max_tokens: MAX_OUTPUT_TOKENS,
      temperature: TEMPERATURE,
    });
  } catch (err) {
    const durationMs = Date.now() - startTime;
    status = err instanceof AppError && err.statusCode === 504 ? 'timeout' : 'error';
    errorMessage = err instanceof Error ? err.message : String(err);

    // Log de uso mesmo em caso de erro
    await logAiUsage(serviceClient, {
      tenantId: auth.tenantId,
      userId: auth.userId,
      feature: 'freelancer_match',
      modelUsed: MODEL,
      inputTokens: 0,
      outputTokens: 0,
      estimatedCostUsd: 0,
      durationMs,
      status,
      errorMessage,
      metadata: {
        job_id: payload.job_id,
        role: payload.role,
        prompt_version: FREELANCER_PROMPT_VERSION,
        candidates_count: candidates.length,
        suggestions_count: 0,
      },
    });

    throw err;
  }

  const durationMs = Date.now() - startTime;

  // 8. Parsear resposta JSON do Claude (extrair JSON do content)
  const validPersonIds = new Set(candidates.map((c) => c.person_id));
  let parsedResponse: ClaudeParsedResponse;

  try {
    const jsonMatch = claudeResponse.content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Nenhum JSON encontrado na resposta');
    }
    const rawParsed = JSON.parse(jsonMatch[0]);

    // 9. Validar campos obrigatorios e filtrar person_ids desconhecidos
    parsedResponse = validateParsedResponse(rawParsed, validPersonIds);
  } catch (parseErr) {
    console.error(
      '[ai-freelancer-match/suggest] falha ao parsear resposta Claude:',
      parseErr,
    );

    // Log de uso com erro de parsing
    await logAiUsage(serviceClient, {
      tenantId: auth.tenantId,
      userId: auth.userId,
      feature: 'freelancer_match',
      modelUsed: MODEL,
      inputTokens: claudeResponse.input_tokens,
      outputTokens: claudeResponse.output_tokens,
      estimatedCostUsd: estimateCost(MODEL, claudeResponse.input_tokens, claudeResponse.output_tokens),
      durationMs,
      status: 'error',
      errorMessage: `Falha ao parsear JSON da resposta Claude: ${parseErr instanceof Error ? parseErr.message : String(parseErr)}`,
      metadata: {
        job_id: payload.job_id,
        role: payload.role,
        prompt_version: FREELANCER_PROMPT_VERSION,
        candidates_count: candidates.length,
        suggestions_count: 0,
      },
    });

    throw new AppError(
      'INTERNAL_ERROR',
      'A IA retornou uma resposta em formato inesperado. Tente novamente.',
      502,
    );
  }

  // 10. Enriquecer cada candidato ranqueado com dados do FreelancerCandidate original
  const candidateMap = new Map<string, FreelancerCandidate>();
  for (const c of candidates) {
    candidateMap.set(c.person_id, c);
  }

  const enrichedSuggestions: EnrichedSuggestion[] = [];

  for (const ranked of parsedResponse.ranked_candidates) {
    const candidate = candidateMap.get(ranked.person_id);
    if (!candidate) continue; // seguranca extra (ja filtrado na validacao)

    enrichedSuggestions.push({
      person_id: ranked.person_id,
      full_name: candidate.full_name,
      default_role: candidate.default_role,
      default_rate: candidate.default_rate,
      is_internal: candidate.is_internal,
      match_score: ranked.match_score,
      match_reasons: ranked.match_reasons,
      availability: {
        is_available: candidate.conflicts.length === 0,
        conflicts: candidate.conflicts,
      },
      past_performance: {
        total_jobs: candidate.total_jobs,
        jobs_with_same_type: candidate.jobs_same_type,
        avg_job_health_score: candidate.avg_health_score,
        last_job_date: candidate.last_job_date,
      },
    });
  }

  // 11. Aplicar limit do payload
  const limitedSuggestions = enrichedSuggestions.slice(0, payload.limit);

  // 12. Calcular custo e registrar uso de IA
  const costUsd = estimateCost(MODEL, claudeResponse.input_tokens, claudeResponse.output_tokens);

  await logAiUsage(serviceClient, {
    tenantId: auth.tenantId,
    userId: auth.userId,
    feature: 'freelancer_match',
    modelUsed: MODEL,
    inputTokens: claudeResponse.input_tokens,
    outputTokens: claudeResponse.output_tokens,
    estimatedCostUsd: costUsd,
    durationMs,
    status: 'success',
    metadata: {
      job_id: payload.job_id,
      role: payload.role,
      prompt_version: FREELANCER_PROMPT_VERSION,
      candidates_count: candidates.length,
      suggestions_count: limitedSuggestions.length,
    },
  });

  // 13. Retornar resposta estruturada
  return success({
    suggestions: limitedSuggestions,
    reasoning: parsedResponse.reasoning,
    tokens_used: {
      input: claudeResponse.input_tokens,
      output: claudeResponse.output_tokens,
    },
  });
}
