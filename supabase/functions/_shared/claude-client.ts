// Cliente HTTP para a Claude API (Anthropic).
// Usado pelas Edge Functions de IA do ELLAHOS (estimativa de orcamento,
// copilot de producao, decupagem automatica, analise de dailies).

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getSecret } from './vault.ts';
import { AppError } from './errors.ts';

// ---------------------------------------------------------------------------
// Pricing por modelo (USD por 1M tokens)
// ---------------------------------------------------------------------------

export const PRICING = {
  'claude-sonnet-4-20250514': { input: 3.0, output: 15.0 },
  'claude-haiku-4-20250514': { input: 0.8, output: 4.0 },
} as const;

export type ClaudeModel = keyof typeof PRICING;

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

export interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ClaudeRequest {
  model: ClaudeModel;
  system: string;
  messages: ClaudeMessage[];
  max_tokens: number;
  temperature?: number; // Default 0.3 (analise). Usar 0.7 para chat/criativo.
  stream?: boolean;
}

export interface ClaudeResponse {
  content: string;
  input_tokens: number;
  output_tokens: number;
  stop_reason: string;
  model: string;
}

export interface ClaudeStreamUsage {
  input_tokens: number;
  output_tokens: number;
}

// ---------------------------------------------------------------------------
// Constantes internas
// ---------------------------------------------------------------------------

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';
const SECRET_NAME = 'ANTHROPIC_API_KEY';

// Retry: 2 tentativas com backoff exponencial (1s, 3s)
const MAX_RETRIES = 2;
const BASE_BACKOFF_MS = 1_000;

// Timeouts
const BATCH_TIMEOUT_MS = 30_000;
const STREAM_TIMEOUT_MS = 60_000;

// ---------------------------------------------------------------------------
// Helpers internos
// ---------------------------------------------------------------------------

/** Resolve a API key do Vault ou env. Lanca AppError se nao encontrar. */
async function resolveApiKey(client: SupabaseClient): Promise<string> {
  const key = await getSecret(client, SECRET_NAME);

  if (!key) {
    throw new AppError(
      'INTERNAL_ERROR',
      'Chave da API Claude nao configurada. Configure em Settings > Integracoes > IA.',
      500,
    );
  }

  return key;
}

/** Monta os headers padrao para a Anthropic API. */
function buildHeaders(apiKey: string): Record<string, string> {
  return {
    'anthropic-version': ANTHROPIC_VERSION,
    'x-api-key': apiKey,
    'content-type': 'application/json',
  };
}

/** Pausa a execucao por `ms` milissegundos. */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Verifica se o status HTTP e elegivel para retry (429 ou 5xx). */
function isRetryableStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

/** Extrai mensagem de erro do body da Anthropic API. */
function extractErrorMessage(body: unknown): string {
  if (body && typeof body === 'object') {
    const obj = body as Record<string, unknown>;
    if (obj.error && typeof obj.error === 'object') {
      const err = obj.error as Record<string, unknown>;
      return (err.message as string) || JSON.stringify(err);
    }
  }
  return JSON.stringify(body);
}

// ---------------------------------------------------------------------------
// callClaude — chamada batch (nao streaming)
// ---------------------------------------------------------------------------

/**
 * Envia uma requisicao batch para a Claude API e retorna a resposta completa.
 *
 * - Timeout: 30 segundos
 * - Retry: ate 2 tentativas com backoff exponencial para 429 e 5xx
 * - Sem retry para erros 4xx (exceto 429)
 */
export async function callClaude(
  supabaseClient: SupabaseClient,
  request: ClaudeRequest,
): Promise<ClaudeResponse> {
  const apiKey = await resolveApiKey(supabaseClient);
  const headers = buildHeaders(apiKey);

  const body = JSON.stringify({
    model: request.model,
    system: request.system,
    messages: request.messages,
    max_tokens: request.max_tokens,
    temperature: request.temperature ?? 0.3,
  });

  const startTime = Date.now();
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    // Backoff antes do retry (pula na primeira tentativa)
    if (attempt > 0) {
      const backoffMs = BASE_BACKOFF_MS * Math.pow(2, attempt - 1);
      console.log(`[claude] retry ${attempt}/${MAX_RETRIES} apos ${backoffMs}ms`);
      await sleep(backoffMs);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), BATCH_TIMEOUT_MS);

    try {
      const response = await fetch(ANTHROPIC_API_URL, {
        method: 'POST',
        headers,
        body,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Resposta ok — parseia e retorna
      if (response.ok) {
        const data = await response.json();
        const durationMs = Date.now() - startTime;

        const content = data.content?.[0]?.text ?? '';
        const inputTokens = data.usage?.input_tokens ?? 0;
        const outputTokens = data.usage?.output_tokens ?? 0;
        const stopReason = data.stop_reason ?? 'unknown';
        const modelUsed = data.model ?? request.model;

        console.log(
          `[claude] model=${modelUsed} input=${inputTokens} output=${outputTokens} duration=${durationMs}ms`,
        );

        return {
          content,
          input_tokens: inputTokens,
          output_tokens: outputTokens,
          stop_reason: stopReason,
          model: modelUsed,
        };
      }

      // Erro da API — verifica se e retryable
      const errorBody = await response.json().catch(() => null);
      const errorMsg = extractErrorMessage(errorBody);

      if (isRetryableStatus(response.status) && attempt < MAX_RETRIES) {
        console.warn(
          `[claude] status=${response.status} retryable — ${errorMsg}`,
        );
        lastError = new AppError(
          'INTERNAL_ERROR',
          `Claude API retornou ${response.status}: ${errorMsg}`,
          response.status,
          { anthropic_error: errorBody },
        );
        continue;
      }

      // Erro nao-retryable ou retries esgotados
      const statusCode = response.status >= 400 && response.status < 500 ? response.status : 502;
      throw new AppError(
        'INTERNAL_ERROR',
        `Claude API retornou ${response.status}: ${errorMsg}`,
        statusCode,
        { anthropic_error: errorBody },
      );
    } catch (err: unknown) {
      clearTimeout(timeoutId);

      // Se ja e AppError, relanca (exceto se estamos retrying)
      if (err instanceof AppError) {
        if (attempt >= MAX_RETRIES) throw err;
        lastError = err;
        continue;
      }

      // Timeout (AbortError)
      if (err instanceof DOMException && err.name === 'AbortError') {
        lastError = new AppError(
          'INTERNAL_ERROR',
          `Claude API timeout apos ${BATCH_TIMEOUT_MS}ms`,
          504,
        );
        if (attempt >= MAX_RETRIES) throw lastError;
        continue;
      }

      // Erro de rede
      const networkMsg = err instanceof Error ? err.message : String(err);
      lastError = new AppError(
        'INTERNAL_ERROR',
        `Erro de rede ao chamar Claude API: ${networkMsg}`,
        502,
      );
      if (attempt >= MAX_RETRIES) throw lastError;
    }
  }

  // Fallback (nao deveria chegar aqui, mas garante que nunca retorna undefined)
  throw lastError ?? new AppError('INTERNAL_ERROR', 'Erro desconhecido ao chamar Claude API', 500);
}

// ---------------------------------------------------------------------------
// callClaudeStream — chamada streaming para SSE
// ---------------------------------------------------------------------------

/**
 * Envia uma requisicao streaming para a Claude API e retorna um
 * ReadableStream no formato SSE customizado do ELLAHOS.
 *
 * Eventos emitidos:
 * - `start`  — inicio do stream (data: {})
 * - `delta`  — chunk de texto (data: {"text":"..."})
 * - `done`   — fim do stream (data: {"tokens_used":{"input":N,"output":N}})
 *
 * Sem retry para streaming — se falhar, falha imediato.
 */
export async function callClaudeStream(
  supabaseClient: SupabaseClient,
  request: ClaudeRequest,
): Promise<{ stream: ReadableStream<Uint8Array>; getUsage: () => ClaudeStreamUsage }> {
  const apiKey = await resolveApiKey(supabaseClient);
  const headers = buildHeaders(apiKey);

  const body = JSON.stringify({
    model: request.model,
    system: request.system,
    messages: request.messages,
    max_tokens: request.max_tokens,
    temperature: request.temperature ?? 0.3,
    stream: true,
  });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), STREAM_TIMEOUT_MS);

  let response: Response;

  try {
    response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers,
      body,
      signal: controller.signal,
    });
  } catch (err: unknown) {
    clearTimeout(timeoutId);

    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new AppError(
        'INTERNAL_ERROR',
        `Claude API streaming timeout apos ${STREAM_TIMEOUT_MS}ms`,
        504,
      );
    }

    const msg = err instanceof Error ? err.message : String(err);
    throw new AppError(
      'INTERNAL_ERROR',
      `Erro de rede ao iniciar stream Claude API: ${msg}`,
      502,
    );
  }

  if (!response.ok) {
    clearTimeout(timeoutId);
    const errorBody = await response.json().catch(() => null);
    const errorMsg = extractErrorMessage(errorBody);
    const statusCode = response.status >= 400 && response.status < 500 ? response.status : 502;

    throw new AppError(
      'INTERNAL_ERROR',
      `Claude API retornou ${response.status}: ${errorMsg}`,
      statusCode,
      { anthropic_error: errorBody },
    );
  }

  if (!response.body) {
    clearTimeout(timeoutId);
    throw new AppError(
      'INTERNAL_ERROR',
      'Claude API retornou resposta sem body para streaming',
      502,
    );
  }

  // Acumulador de usage (preenchido durante o stream)
  const usage: ClaudeStreamUsage = { input_tokens: 0, output_tokens: 0 };

  const encoder = new TextEncoder();

  // Formata um evento SSE
  function formatSSE(event: string, data: unknown): Uint8Array {
    return encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  }

  // Buffer para parsear linhas SSE incompletas vindas da Anthropic
  let buffer = '';

  // TransformStream que converte os SSE da Anthropic para o formato ELLAHOS
  const transformStream = new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      const decoder = new TextDecoder();
      buffer += decoder.decode(chunk, { stream: true });

      // Processa linhas completas
      const lines = buffer.split('\n');
      // Ultima linha pode estar incompleta — guarda no buffer
      buffer = lines.pop() ?? '';

      let currentEventType = '';

      for (const line of lines) {
        // Linha de tipo de evento
        if (line.startsWith('event: ')) {
          currentEventType = line.slice(7).trim();
          continue;
        }

        // Linha de dados
        if (line.startsWith('data: ')) {
          const jsonStr = line.slice(6);

          try {
            const parsed = JSON.parse(jsonStr);

            switch (parsed.type || currentEventType) {
              case 'message_start': {
                // Captura input_tokens do message_start
                usage.input_tokens = parsed.message?.usage?.input_tokens ?? 0;
                controller.enqueue(formatSSE('start', {}));
                break;
              }

              case 'content_block_delta': {
                const text = parsed.delta?.text;
                if (text !== undefined && text !== '') {
                  controller.enqueue(formatSSE('delta', { text }));
                }
                break;
              }

              case 'message_delta': {
                // Captura output_tokens do message_delta
                usage.output_tokens = parsed.usage?.output_tokens ?? 0;
                break;
              }

              case 'message_stop': {
                controller.enqueue(
                  formatSSE('done', {
                    tokens_used: {
                      input: usage.input_tokens,
                      output: usage.output_tokens,
                    },
                  }),
                );

                console.log(
                  `[claude] stream done model=${request.model} input=${usage.input_tokens} output=${usage.output_tokens}`,
                );
                break;
              }

              // Outros eventos (ping, content_block_start/stop) — ignora
              default:
                break;
            }
          } catch {
            // JSON invalido — ignora (pode ser [DONE] ou linha parcial)
          }

          currentEventType = '';
          continue;
        }

        // Linha vazia ou desconhecida — ignora
      }
    },

    flush(controller) {
      clearTimeout(timeoutId);

      // Se ainda houver dados no buffer, tenta processar
      if (buffer.trim().length > 0 && buffer.startsWith('data: ')) {
        try {
          const jsonStr = buffer.slice(6);
          const parsed = JSON.parse(jsonStr);

          if (parsed.type === 'message_stop') {
            controller.enqueue(
              formatSSE('done', {
                tokens_used: {
                  input: usage.input_tokens,
                  output: usage.output_tokens,
                },
              }),
            );
          }
        } catch {
          // Ignora
        }
      }
    },
  });

  // Conecta o stream da Anthropic ao TransformStream
  const outputStream = response.body.pipeThrough(transformStream);

  return {
    stream: outputStream,
    getUsage: () => ({ ...usage }),
  };
}

// ---------------------------------------------------------------------------
// estimateCost — calcula custo estimado em USD
// ---------------------------------------------------------------------------

/**
 * Calcula o custo estimado de uma chamada Claude em USD.
 *
 * Formula: (inputTokens / 1M) * precoInput + (outputTokens / 1M) * precoOutput
 */
export function estimateCost(
  model: ClaudeModel,
  inputTokens: number,
  outputTokens: number,
): number {
  const pricing = PRICING[model];
  return (inputTokens / 1_000_000) * pricing.input + (outputTokens / 1_000_000) * pricing.output;
}

// ---------------------------------------------------------------------------
// sanitizeUserInput — protecao contra prompt injection
// ---------------------------------------------------------------------------

/**
 * Sanitiza input do usuario antes de inserir em prompts da Claude API.
 *
 * Defesas aplicadas:
 * 1. Limita tamanho maximo (10.000 chars) para evitar context overflow
 * 2. Escapa caracteres especiais XML (<, >, &, ", ') que poderiam
 *    fechar/abrir tags XML usadas como delimiters no prompt
 * 3. Remove sequencias de controle nao-printaveis
 *
 * Uso: envolver todo input do usuario com <user-input>${sanitizeUserInput(raw)}</user-input>
 */
export function sanitizeUserInput(input: string, maxLength = 10_000): string {
  if (!input || typeof input !== 'string') return '';

  // 1. Truncar no limite de tamanho
  const truncated = input.length > maxLength ? input.slice(0, maxLength) : input;

  // 2. Remover caracteres de controle nao-printaveis (exceto tab, newline, carriage return)
  const noControl = truncated.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // 3. Escapar caracteres especiais XML para evitar injecao via tags
  return noControl
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
