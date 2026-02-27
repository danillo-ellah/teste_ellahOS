// Cliente HTTP para a Groq API (OpenAI-compatible).
// Usado pelo Copilot ELLA como alternativa gratuita ao Claude.
// Modelo: Llama 3.3 70B (versatile) — free tier.

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getSecret } from './vault.ts';
import { AppError } from './errors.ts';

// ---------------------------------------------------------------------------
// Modelo
// ---------------------------------------------------------------------------

export const GROQ_MODEL = 'llama-3.3-70b-versatile' as const;

// ---------------------------------------------------------------------------
// Interfaces (compatíveis com claude-client para troca facil)
// ---------------------------------------------------------------------------

export interface GroqMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface GroqRequest {
  model?: string;
  system: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  max_tokens: number;
  temperature?: number;
}

export interface GroqResponse {
  content: string;
  input_tokens: number;
  output_tokens: number;
  stop_reason: string;
  model: string;
}

export interface GroqStreamUsage {
  input_tokens: number;
  output_tokens: number;
}

// ---------------------------------------------------------------------------
// Constantes internas
// ---------------------------------------------------------------------------

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const SECRET_NAME = 'GROQ_API_KEY';

const MAX_RETRIES = 2;
const BASE_BACKOFF_MS = 1_000;
const BATCH_TIMEOUT_MS = 30_000;
const STREAM_TIMEOUT_MS = 60_000;

// ---------------------------------------------------------------------------
// Helpers internos
// ---------------------------------------------------------------------------

async function resolveApiKey(client: SupabaseClient): Promise<string> {
  const key = await getSecret(client, SECRET_NAME);
  if (!key) {
    throw new AppError(
      'INTERNAL_ERROR',
      'Chave da API Groq nao configurada. Configure GROQ_API_KEY no Vault.',
      500,
    );
  }
  return key;
}

function buildHeaders(apiKey: string): Record<string, string> {
  return {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

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

/** Converte system + messages para formato OpenAI (system como primeira mensagem) */
function buildMessages(
  system: string,
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
): GroqMessage[] {
  return [
    { role: 'system', content: system },
    ...messages.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
  ];
}

// ---------------------------------------------------------------------------
// callGroq — chamada batch (nao streaming)
// ---------------------------------------------------------------------------

export async function callGroq(
  supabaseClient: SupabaseClient,
  request: GroqRequest,
): Promise<GroqResponse> {
  const apiKey = await resolveApiKey(supabaseClient);
  const headers = buildHeaders(apiKey);

  const body = JSON.stringify({
    model: request.model ?? GROQ_MODEL,
    messages: buildMessages(request.system, request.messages),
    max_tokens: request.max_tokens,
    temperature: request.temperature ?? 0.3,
  });

  const startTime = Date.now();
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      const backoffMs = BASE_BACKOFF_MS * Math.pow(2, attempt - 1);
      console.log(`[groq] retry ${attempt}/${MAX_RETRIES} apos ${backoffMs}ms`);
      await sleep(backoffMs);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), BATCH_TIMEOUT_MS);

    try {
      const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers,
        body,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        const durationMs = Date.now() - startTime;

        const content = data.choices?.[0]?.message?.content ?? '';
        const inputTokens = data.usage?.prompt_tokens ?? 0;
        const outputTokens = data.usage?.completion_tokens ?? 0;
        const stopReason = data.choices?.[0]?.finish_reason ?? 'unknown';
        const modelUsed = data.model ?? GROQ_MODEL;

        console.log(
          `[groq] model=${modelUsed} input=${inputTokens} output=${outputTokens} duration=${durationMs}ms`,
        );

        return {
          content,
          input_tokens: inputTokens,
          output_tokens: outputTokens,
          stop_reason: stopReason,
          model: modelUsed,
        };
      }

      const errorBody = await response.json().catch(() => null);
      const errorMsg = extractErrorMessage(errorBody);

      if (isRetryableStatus(response.status) && attempt < MAX_RETRIES) {
        console.warn(`[groq] status=${response.status} retryable — ${errorMsg}`);
        lastError = new AppError(
          'INTERNAL_ERROR',
          `Groq API retornou ${response.status}: ${errorMsg}`,
          response.status,
          { groq_error: errorBody },
        );
        continue;
      }

      const statusCode = response.status >= 400 && response.status < 500 ? response.status : 502;
      throw new AppError(
        'INTERNAL_ERROR',
        `Groq API retornou ${response.status}: ${errorMsg}`,
        statusCode,
        { groq_error: errorBody },
      );
    } catch (err: unknown) {
      clearTimeout(timeoutId);

      if (err instanceof AppError) {
        if (attempt >= MAX_RETRIES) throw err;
        lastError = err;
        continue;
      }

      if (err instanceof DOMException && err.name === 'AbortError') {
        lastError = new AppError('INTERNAL_ERROR', `Groq API timeout apos ${BATCH_TIMEOUT_MS}ms`, 504);
        if (attempt >= MAX_RETRIES) throw lastError;
        continue;
      }

      const networkMsg = err instanceof Error ? err.message : String(err);
      lastError = new AppError('INTERNAL_ERROR', `Erro de rede ao chamar Groq API: ${networkMsg}`, 502);
      if (attempt >= MAX_RETRIES) throw lastError;
    }
  }

  throw lastError ?? new AppError('INTERNAL_ERROR', 'Erro desconhecido ao chamar Groq API', 500);
}

// ---------------------------------------------------------------------------
// callGroqStream — chamada streaming para SSE
// ---------------------------------------------------------------------------

/**
 * Envia uma requisicao streaming para a Groq API e retorna um
 * ReadableStream no formato SSE do ELLAHOS (mesmo formato do claude-client).
 *
 * Eventos emitidos:
 * - `start`  — inicio do stream (data: {})
 * - `delta`  — chunk de texto (data: {"text":"..."})
 * - `done`   — fim do stream (data: {"tokens_used":{"input":N,"output":N}})
 */
export async function callGroqStream(
  supabaseClient: SupabaseClient,
  request: GroqRequest,
): Promise<{ stream: ReadableStream<Uint8Array>; getUsage: () => GroqStreamUsage }> {
  const apiKey = await resolveApiKey(supabaseClient);
  const headers = buildHeaders(apiKey);

  const body = JSON.stringify({
    model: request.model ?? GROQ_MODEL,
    messages: buildMessages(request.system, request.messages),
    max_tokens: request.max_tokens,
    temperature: request.temperature ?? 0.3,
    stream: true,
  });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), STREAM_TIMEOUT_MS);

  let response: Response;

  try {
    response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers,
      body,
      signal: controller.signal,
    });
  } catch (err: unknown) {
    clearTimeout(timeoutId);

    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new AppError('INTERNAL_ERROR', `Groq API streaming timeout apos ${STREAM_TIMEOUT_MS}ms`, 504);
    }

    const msg = err instanceof Error ? err.message : String(err);
    throw new AppError('INTERNAL_ERROR', `Erro de rede ao iniciar stream Groq API: ${msg}`, 502);
  }

  if (!response.ok) {
    clearTimeout(timeoutId);
    const errorBody = await response.json().catch(() => null);
    const errorMsg = extractErrorMessage(errorBody);
    const statusCode = response.status >= 400 && response.status < 500 ? response.status : 502;
    throw new AppError(
      'INTERNAL_ERROR',
      `Groq API retornou ${response.status}: ${errorMsg}`,
      statusCode,
      { groq_error: errorBody },
    );
  }

  if (!response.body) {
    clearTimeout(timeoutId);
    throw new AppError('INTERNAL_ERROR', 'Groq API retornou resposta sem body para streaming', 502);
  }

  // Acumulador de usage (preenchido durante o stream)
  const usage: GroqStreamUsage = { input_tokens: 0, output_tokens: 0 };

  const encoder = new TextEncoder();

  function formatSSE(event: string, data: unknown): Uint8Array {
    return encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  }

  let buffer = '';
  let startEmitted = false;

  // TransformStream que converte SSE do Groq (formato OpenAI) para formato ELLAHOS
  const transformStream = new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      const decoder = new TextDecoder();
      buffer += decoder.decode(chunk, { stream: true });

      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;

        const jsonStr = line.slice(6).trim();

        // Groq/OpenAI sinaliza fim do stream com [DONE]
        if (jsonStr === '[DONE]') {
          controller.enqueue(
            formatSSE('done', {
              tokens_used: {
                input: usage.input_tokens,
                output: usage.output_tokens,
              },
            }),
          );

          console.log(
            `[groq] stream done model=${request.model ?? GROQ_MODEL} input=${usage.input_tokens} output=${usage.output_tokens}`,
          );
          continue;
        }

        try {
          const parsed = JSON.parse(jsonStr);

          // Emitir start event no primeiro chunk
          if (!startEmitted) {
            controller.enqueue(formatSSE('start', {}));
            startEmitted = true;
          }

          // Usage info (Groq pode incluir no header x-groq ou no ultimo chunk)
          if (parsed.x_groq?.usage) {
            usage.input_tokens = parsed.x_groq.usage.prompt_tokens ?? 0;
            usage.output_tokens = parsed.x_groq.usage.completion_tokens ?? 0;
          }
          if (parsed.usage) {
            usage.input_tokens = parsed.usage.prompt_tokens ?? 0;
            usage.output_tokens = parsed.usage.completion_tokens ?? 0;
          }

          // Content delta
          const content = parsed.choices?.[0]?.delta?.content;
          if (content !== undefined && content !== null && content !== '') {
            controller.enqueue(formatSSE('delta', { text: content }));
          }
        } catch {
          // JSON invalido — ignora
        }
      }
    },

    flush(controller) {
      clearTimeout(timeoutId);

      // Processar buffer restante
      if (buffer.trim().length > 0 && buffer.startsWith('data: ')) {
        const jsonStr = buffer.slice(6).trim();
        if (jsonStr === '[DONE]') {
          controller.enqueue(
            formatSSE('done', {
              tokens_used: {
                input: usage.input_tokens,
                output: usage.output_tokens,
              },
            }),
          );
        }
      }
    },
  });

  const outputStream = response.body.pipeThrough(transformStream);

  return {
    stream: outputStream,
    getUsage: () => ({ ...usage }),
  };
}

// ---------------------------------------------------------------------------
// estimateGroqCost — sempre 0 no free tier
// ---------------------------------------------------------------------------

export function estimateGroqCost(
  _inputTokens: number,
  _outputTokens: number,
): number {
  return 0;
}
