// POST /ai-dailies-analysis/analyze
// Recebe dados textuais de diarias de filmagem, busca contexto do job,
// chama Claude Haiku e retorna analise estruturada (progresso, riscos, recomendacoes).

import { getSupabaseClient, getServiceClient } from '../_shared/supabase-client.ts';
import { success } from '../_shared/response.ts';
import { AppError } from '../_shared/errors.ts';
import type { AuthContext } from '../_shared/auth.ts';
import { callClaude, estimateCost } from '../_shared/claude-client.ts';
import type { ClaudeModel } from '../_shared/claude-client.ts';
import { getJobFullContext } from '../_shared/ai-context.ts';
import { checkRateLimit, logAiUsage } from '../_shared/ai-rate-limiter.ts';
import {
  DAILIES_SYSTEM_PROMPT,
  DAILIES_PROMPT_VERSION,
  buildDailiesUserPrompt,
} from '../prompts.ts';

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

const MODEL: ClaudeModel = 'claude-haiku-4-20250514';
const MAX_OUTPUT_TOKENS = 1500;
const TEMPERATURE = 0.3;

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

/** Item individual de diaria de filmagem */
interface DailyEntry {
  shooting_date: string;
  notes?: string;
  scenes_planned?: number;
  scenes_completed?: number;
  weather_notes?: string;
  equipment_issues?: string;
  talent_notes?: string;
  extra_costs?: string;
  general_observations?: string;
}

/** Payload de entrada do endpoint */
interface AnalyzePayload {
  job_id: string;
  dailies_data: DailyEntry[];
  deliverables_status?: boolean;
}

/** Estrutura de avaliacao de progresso retornada pela IA */
interface ProgressAssessment {
  status: 'on_track' | 'at_risk' | 'behind' | 'ahead';
  explanation: string;
  completion_percentage: number;
}

/** Risco identificado pela IA */
interface Risk {
  severity: 'high' | 'medium' | 'low';
  description: string;
  recommendation: string;
}

/** Resposta parseada do Claude */
interface ClaudeParsedResponse {
  summary: string;
  progress_assessment: ProgressAssessment;
  risks: Risk[];
  recommendations: string[];
}

// ---------------------------------------------------------------------------
// Validacao
// ---------------------------------------------------------------------------

/** Valida e retorna o payload parseado. Lanca AppError se invalido. */
function validatePayload(body: unknown): AnalyzePayload {
  const payload = body as Record<string, unknown>;

  // job_id obrigatorio
  if (!payload.job_id || typeof payload.job_id !== 'string') {
    throw new AppError('VALIDATION_ERROR', 'job_id e obrigatorio (UUID)', 400);
  }

  // dailies_data obrigatorio e deve ter ao menos 1 item
  if (!Array.isArray(payload.dailies_data)) {
    throw new AppError('VALIDATION_ERROR', 'dailies_data e obrigatorio (array)', 400);
  }

  if (payload.dailies_data.length === 0) {
    throw new AppError('VALIDATION_ERROR', 'dailies_data deve ter ao menos 1 item', 400);
  }

  if (payload.dailies_data.length > 30) {
    throw new AppError('VALIDATION_ERROR', 'dailies_data nao pode ter mais de 30 entradas', 400);
  }

  // Validar cada entry minimamente (shooting_date obrigatorio)
  const textFields = [
    'notes',
    'weather_notes',
    'equipment_issues',
    'talent_notes',
    'extra_costs',
    'general_observations',
  ] as const;

  for (let i = 0; i < payload.dailies_data.length; i++) {
    const entry = payload.dailies_data[i] as Record<string, unknown>;

    if (!entry || typeof entry !== 'object') {
      throw new AppError(
        'VALIDATION_ERROR',
        `dailies_data[${i}] deve ser um objeto`,
        400,
      );
    }

    if (!entry.shooting_date || typeof entry.shooting_date !== 'string') {
      throw new AppError(
        'VALIDATION_ERROR',
        `dailies_data[${i}].shooting_date e obrigatorio (string YYYY-MM-DD)`,
        400,
      );
    }

    for (const field of textFields) {
      if (entry[field] !== undefined && typeof entry[field] === 'string' && (entry[field] as string).length > 500) {
        throw new AppError(
          'VALIDATION_ERROR',
          `Campo ${field} excede 500 caracteres`,
          400,
        );
      }
    }
  }

  return {
    job_id: payload.job_id as string,
    dailies_data: payload.dailies_data as DailyEntry[],
    deliverables_status: payload.deliverables_status === true,
  };
}

/** Valida os campos minimos da resposta parseada do Claude */
function validateParsedResponse(parsed: unknown): ClaudeParsedResponse {
  const obj = parsed as Record<string, unknown>;

  if (!obj.summary || typeof obj.summary !== 'string') {
    throw new Error('Campo "summary" ausente ou invalido na resposta da IA');
  }

  // Validar progress_assessment
  const pa = obj.progress_assessment as Record<string, unknown> | undefined;
  if (!pa || typeof pa !== 'object') {
    throw new Error('Campo "progress_assessment" ausente na resposta da IA');
  }

  const validStatuses = ['on_track', 'at_risk', 'behind', 'ahead'];
  const status = validStatuses.includes(pa.status as string)
    ? (pa.status as ProgressAssessment['status'])
    : 'at_risk'; // fallback seguro

  const completionPct = typeof pa.completion_percentage === 'number'
    ? Math.min(100, Math.max(0, pa.completion_percentage))
    : 0;

  // Validar risks (array, pode estar vazio)
  const rawRisks = Array.isArray(obj.risks) ? obj.risks : [];
  const validSeverities = ['high', 'medium', 'low'];
  const risks: Risk[] = rawRisks
    .filter((r: unknown) => r && typeof r === 'object')
    .map((r: unknown) => {
      const risk = r as Record<string, unknown>;
      return {
        severity: validSeverities.includes(risk.severity as string)
          ? (risk.severity as Risk['severity'])
          : 'medium',
        description: typeof risk.description === 'string' ? risk.description : '',
        recommendation: typeof risk.recommendation === 'string' ? risk.recommendation : '',
      };
    })
    .filter((r: Risk) => r.description.length > 0);

  // Validar recommendations (array de strings)
  const rawRecs = Array.isArray(obj.recommendations) ? obj.recommendations : [];
  const recommendations = rawRecs
    .filter((r: unknown) => typeof r === 'string' && (r as string).length > 0)
    .map((r: unknown) => r as string);

  return {
    summary: obj.summary as string,
    progress_assessment: {
      status,
      explanation: typeof pa.explanation === 'string' ? pa.explanation : '',
      completion_percentage: completionPct,
    },
    risks,
    recommendations,
  };
}

// ---------------------------------------------------------------------------
// Handler principal
// ---------------------------------------------------------------------------

export async function handleAnalyze(
  req: Request,
  auth: AuthContext,
): Promise<Response> {
  console.log('[ai-dailies-analysis/analyze] tenant:', auth.tenantId.substring(0, 8) + '...', 'user:', auth.userId.substring(0, 8) + '...');

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
  await checkRateLimit(supabase, auth.tenantId, auth.userId, 'dailies_analysis');

  // 3. Carregar contexto do job (sem financeiros — analise de dailies nao precisa)
  const jobContext = await getJobFullContext(supabase, auth.tenantId, payload.job_id, false);

  if (!jobContext.job || !jobContext.job.title) {
    throw new AppError('NOT_FOUND', 'Job nao encontrado', 404);
  }

  // 4. Montar user prompt com contexto do job + dados das diarias
  const userPrompt = buildDailiesUserPrompt({
    job: {
      code: jobContext.job.code,
      title: jobContext.job.title,
      status: jobContext.job.status,
      priority: jobContext.job.priority,
      project_type: jobContext.job.project_type,
      briefing_text: jobContext.job.briefing_text,
    },
    deliverables: payload.deliverables_status
      ? jobContext.deliverables.map((d) => ({
          description: d.description,
          status: d.status,
          format: d.format,
        }))
      : [],
    planned_shooting_dates: jobContext.shooting_dates.map((s) => ({
      date: s.date,
      location: s.location,
    })),
    dailies_entries: payload.dailies_data,
    recent_history: jobContext.recent_history.map((h) => ({
      event_type: h.event_type,
      description: h.description,
      created_at: h.created_at,
    })),
  });

  // 5. Chamar Claude Haiku
  const startTime = Date.now();
  let claudeResponse;
  let status: 'success' | 'error' | 'timeout' = 'success';
  let errorMessage: string | undefined;

  try {
    claudeResponse = await callClaude(supabase, {
      model: MODEL,
      system: DAILIES_SYSTEM_PROMPT,
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
      feature: 'dailies_analysis',
      modelUsed: MODEL,
      inputTokens: 0,
      outputTokens: 0,
      estimatedCostUsd: 0,
      durationMs,
      status,
      errorMessage,
      metadata: { job_id: payload.job_id, prompt_version: DAILIES_PROMPT_VERSION },
    });

    throw err;
  }

  const durationMs = Date.now() - startTime;

  // 6. Parsear resposta JSON do Claude (extrair JSON do content)
  let parsedResponse: ClaudeParsedResponse;

  try {
    // Tentar parse direto primeiro, fallback para regex
    let jsonText: string;
    try {
      JSON.parse(claudeResponse.content);
      jsonText = claudeResponse.content;
    } catch {
      const jsonMatch = claudeResponse.content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Nenhum JSON encontrado na resposta');
      }
      jsonText = jsonMatch[0];
    }
    const rawParsed = JSON.parse(jsonText);
    parsedResponse = validateParsedResponse(rawParsed);
  } catch (parseErr) {
    console.error(
      '[ai-dailies-analysis/analyze] falha ao parsear resposta Claude:',
      parseErr,
    );

    // Log de uso com erro de parsing
    await logAiUsage(serviceClient, {
      tenantId: auth.tenantId,
      userId: auth.userId,
      feature: 'dailies_analysis',
      modelUsed: MODEL,
      inputTokens: claudeResponse.input_tokens,
      outputTokens: claudeResponse.output_tokens,
      estimatedCostUsd: estimateCost(MODEL, claudeResponse.input_tokens, claudeResponse.output_tokens),
      durationMs,
      status: 'error',
      errorMessage: `Falha ao parsear JSON da resposta Claude: ${parseErr instanceof Error ? parseErr.message : String(parseErr)}`,
      metadata: { job_id: payload.job_id, prompt_version: DAILIES_PROMPT_VERSION },
    });

    throw new AppError(
      'INTERNAL_ERROR',
      'A IA retornou uma resposta em formato inesperado. Tente novamente.',
      502,
    );
  }

  // 7. Gerar ID da analise e calcular custo
  const analysisId = crypto.randomUUID();
  const costUsd = estimateCost(MODEL, claudeResponse.input_tokens, claudeResponse.output_tokens);

  // 8. Registrar uso de IA
  await logAiUsage(serviceClient, {
    tenantId: auth.tenantId,
    userId: auth.userId,
    feature: 'dailies_analysis',
    modelUsed: MODEL,
    inputTokens: claudeResponse.input_tokens,
    outputTokens: claudeResponse.output_tokens,
    estimatedCostUsd: costUsd,
    durationMs,
    status: 'success',
    metadata: {
      job_id: payload.job_id,
      prompt_version: DAILIES_PROMPT_VERSION,
      analysis_id: analysisId,
      dailies_count: payload.dailies_data.length,
      include_deliverables: payload.deliverables_status ?? false,
    },
  });

  // 9. Retornar resposta estruturada
  return success({
    analysis_id: analysisId,
    job_id: payload.job_id,
    summary: parsedResponse.summary,
    progress_assessment: parsedResponse.progress_assessment,
    risks: parsedResponse.risks,
    recommendations: parsedResponse.recommendations,
    tokens_used: {
      input: claudeResponse.input_tokens,
      output: claudeResponse.output_tokens,
    },
  });
}
