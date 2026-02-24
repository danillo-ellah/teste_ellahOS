// Rate limiting para features de IA do ELLAHOS
// Controla uso por usuario/tenant com base em contagem de ai_usage_logs no banco
// Estrategia: fail-CLOSED — se a query falhar, BLOQUEIA a requisicao.
// Decisao de seguranca: um erro de DB silencioso nao deve abrir custo ilimitado na Claude API.
// E preferivel rejeitar uma requisicao legitima a permitir abuso irrestrito por falha de infraestrutura.

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { AppError } from './errors.ts';

// ───────────────────────── Tipos ─────────────────────────

export interface RateLimitConfig {
  max_requests_per_hour_user: number;
  max_requests_per_hour_tenant: number;
  max_tokens_per_day_tenant: number;
}

export interface UsageSummary {
  user_requests_last_hour: number;
  tenant_requests_last_hour: number;
  tenant_tokens_today: number;
  limits: RateLimitConfig;
}

// Parametros para registrar uso de IA
interface LogParams {
  tenantId: string;
  userId: string;
  feature: 'budget_estimate' | 'copilot' | 'dailies_analysis' | 'freelancer_match';
  modelUsed: string;
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
  durationMs: number;
  status: 'success' | 'error' | 'rate_limited' | 'timeout';
  errorMessage?: string;
  metadata?: Record<string, unknown>;
}

// ───────────────────────── Constantes ─────────────────────────

// Limites default (tier Pro — unico tier ativo na v1)
const DEFAULT_LIMITS: RateLimitConfig = {
  max_requests_per_hour_user: 60,
  max_requests_per_hour_tenant: 500,
  max_tokens_per_day_tenant: 500_000,
};

// ───────────────────────── Helpers internos ─────────────────────────

// Cria service client para queries que precisam bypass de RLS
function buildServiceClient(): SupabaseClient {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
}

// Conta requisicoes do usuario na ultima hora
async function countUserRequestsLastHour(
  serviceClient: SupabaseClient,
  tenantId: string,
  userId: string,
): Promise<number> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const { count, error } = await serviceClient
    .from('ai_usage_logs')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('user_id', userId)
    .gte('created_at', oneHourAgo);

  if (error) {
    // Fail-closed: lancamos erro para bloquear a requisicao ao inves de retornar 0
    // (retornar 0 criaria um bypass silencioso que permite custo ilimitado na Claude API)
    console.error(
      `[rate-limiter] falha ao contar requests do usuario ${userId}: ${error.message}`,
    );
    throw new AppError(
      'INTERNAL_ERROR',
      'Servico de rate limiting temporariamente indisponivel. Tente novamente em instantes.',
      503,
      { reason: 'db_query_failed', query: 'user_requests_last_hour' },
    );
  }

  return count ?? 0;
}

// Conta requisicoes do tenant na ultima hora
async function countTenantRequestsLastHour(
  serviceClient: SupabaseClient,
  tenantId: string,
): Promise<number> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const { count, error } = await serviceClient
    .from('ai_usage_logs')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .gte('created_at', oneHourAgo);

  if (error) {
    // Fail-closed: lancamos erro para bloquear a requisicao ao inves de retornar 0
    // (retornar 0 criaria um bypass silencioso que permite custo ilimitado na Claude API)
    console.error(
      `[rate-limiter] falha ao contar requests do tenant ${tenantId}: ${error.message}`,
    );
    throw new AppError(
      'INTERNAL_ERROR',
      'Servico de rate limiting temporariamente indisponivel. Tente novamente em instantes.',
      503,
      { reason: 'db_query_failed', query: 'tenant_requests_last_hour' },
    );
  }

  return count ?? 0;
}

// Soma tokens consumidos pelo tenant nas ultimas 24h
async function sumTenantTokensToday(
  serviceClient: SupabaseClient,
  tenantId: string,
): Promise<number> {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await serviceClient
    .from('ai_usage_logs')
    .select('input_tokens, output_tokens')
    .eq('tenant_id', tenantId)
    .gte('created_at', oneDayAgo);

  if (error) {
    // Fail-closed: lancamos erro para bloquear a requisicao ao inves de retornar 0
    // (retornar 0 criaria um bypass silencioso que permite custo ilimitado na Claude API)
    console.error(
      `[rate-limiter] falha ao somar tokens do tenant ${tenantId}: ${error.message}`,
    );
    throw new AppError(
      'INTERNAL_ERROR',
      'Servico de rate limiting temporariamente indisponivel. Tente novamente em instantes.',
      503,
      { reason: 'db_query_failed', query: 'tenant_tokens_today' },
    );
  }

  if (!data || data.length === 0) return 0;

  return data.reduce(
    (sum, row) => sum + (row.input_tokens ?? 0) + (row.output_tokens ?? 0),
    0,
  );
}

// ───────────────────────── Funcoes exportadas ─────────────────────────

/**
 * Verifica se o usuario/tenant esta dentro dos limites de rate limiting.
 * Lanca AppError com status 429 se qualquer limite for excedido.
 * Lanca AppError com status 503 se as queries ao banco falharem (estrategia fail-closed).
 *
 * @param _client - SupabaseClient do usuario (nao usado diretamente, mantido por consistencia de API)
 * @param tenantId - ID do tenant
 * @param userId - ID do usuario
 * @param feature - Nome da feature de IA sendo usada
 */
export async function checkRateLimit(
  _client: SupabaseClient,
  tenantId: string,
  userId: string,
  feature: string,
): Promise<void> {
  const serviceClient = buildServiceClient();
  const limits = DEFAULT_LIMITS;

  // Check 1: Requests por hora do usuario
  const userRequests = await countUserRequestsLastHour(serviceClient, tenantId, userId);

  if (userRequests >= limits.max_requests_per_hour_user) {
    console.warn(
      `[rate-limiter] BLOCKED tenant=${tenantId} user=${userId} feature=${feature} reason=user_hourly`,
    );
    throw new AppError(
      'BUSINESS_RULE_VIOLATION',
      'Limite de requisicoes por hora atingido. Tente novamente em alguns minutos.',
      429,
      {
        limit_type: 'user_hourly',
        current: userRequests,
        max: limits.max_requests_per_hour_user,
      },
    );
  }

  // Check 2: Requests por hora do tenant
  const tenantRequests = await countTenantRequestsLastHour(serviceClient, tenantId);

  if (tenantRequests >= limits.max_requests_per_hour_tenant) {
    console.warn(
      `[rate-limiter] BLOCKED tenant=${tenantId} user=${userId} feature=${feature} reason=tenant_hourly`,
    );
    throw new AppError(
      'BUSINESS_RULE_VIOLATION',
      'Limite de requisicoes da empresa por hora atingido. Tente novamente em alguns minutos.',
      429,
      {
        limit_type: 'tenant_hourly',
        current: tenantRequests,
        max: limits.max_requests_per_hour_tenant,
      },
    );
  }

  // Check 3: Tokens por dia do tenant
  const tenantTokens = await sumTenantTokensToday(serviceClient, tenantId);

  if (tenantTokens >= limits.max_tokens_per_day_tenant) {
    console.warn(
      `[rate-limiter] BLOCKED tenant=${tenantId} user=${userId} feature=${feature} reason=tenant_daily_tokens`,
    );
    throw new AppError(
      'BUSINESS_RULE_VIOLATION',
      'Limite diario de tokens de IA atingido. O limite sera renovado em algumas horas.',
      429,
      {
        limit_type: 'tenant_daily_tokens',
        current: tenantTokens,
        max: limits.max_tokens_per_day_tenant,
      },
    );
  }

  console.log(
    `[rate-limiter] OK tenant=${tenantId} user=${userId} feature=${feature}`,
  );
}

/**
 * Busca uso atual do tenant para exibir no frontend (dashboard de uso de IA).
 * Executa as 3 queries em paralelo para performance.
 *
 * @param _client - SupabaseClient do usuario (nao usado diretamente, mantido por consistencia de API)
 * @param tenantId - ID do tenant
 * @returns Resumo de uso atual + limites configurados
 */
export async function getCurrentUsage(
  _client: SupabaseClient,
  tenantId: string,
): Promise<UsageSummary> {
  const serviceClient = buildServiceClient();

  // Executa as 3 queries em paralelo
  const [userRequests, tenantRequests, tenantTokens] = await Promise.all([
    // Para uso do usuario, passamos string vazia — getCurrentUsage e por tenant
    // Nao temos userId aqui, retornamos 0 (frontend pode chamar com userId se precisar)
    Promise.resolve(0),
    countTenantRequestsLastHour(serviceClient, tenantId),
    sumTenantTokensToday(serviceClient, tenantId),
  ]);

  return {
    user_requests_last_hour: userRequests,
    tenant_requests_last_hour: tenantRequests,
    tenant_tokens_today: tenantTokens,
    limits: { ...DEFAULT_LIMITS },
  };
}

/**
 * Registra uso de IA na tabela ai_usage_logs.
 * Em caso de erro no insert, apenas loga warning — nao deve quebrar o fluxo principal.
 *
 * @param serviceClient - SupabaseClient com service_role (bypass RLS)
 * @param params - Dados de uso a serem registrados
 */
export async function logAiUsage(
  serviceClient: SupabaseClient,
  params: LogParams,
): Promise<void> {
  const {
    tenantId,
    userId,
    feature,
    modelUsed,
    inputTokens,
    outputTokens,
    estimatedCostUsd,
    durationMs,
    status,
    errorMessage,
    metadata,
  } = params;

  const { error } = await serviceClient
    .from('ai_usage_logs')
    .insert({
      tenant_id: tenantId,
      user_id: userId,
      feature,
      model_used: modelUsed,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      estimated_cost_usd: estimatedCostUsd,
      duration_ms: durationMs,
      status,
      error_message: errorMessage ?? null,
      metadata: metadata ?? null,
    });

  if (error) {
    console.warn(
      `[rate-limiter] falha ao registrar uso de IA: ${error.message}`,
    );
    return;
  }

  const totalTokens = inputTokens + outputTokens;
  console.log(
    `[rate-limiter] logged usage tenant=${tenantId} feature=${feature} tokens=${totalTokens}`,
  );
}
