// POST /chat        — Chat streaming via SSE (Server-Sent Events)
// POST /chat-sync   — Chat sincrono (resposta completa em JSON)
//
// Handler do Copilot ELLA: recebe mensagem do usuario, monta contexto
// (job, metricas do tenant), decide modelo (Haiku vs Sonnet via escalacao),
// chama a Claude API e retorna a resposta com persistencia de conversa.

import { getSupabaseClient, getServiceClient } from '../_shared/supabase-client.ts';
import { success } from '../_shared/response.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { AppError } from '../_shared/errors.ts';
import type { AuthContext } from '../_shared/auth.ts';
import { callClaude, callClaudeStream, estimateCost } from '../_shared/claude-client.ts';
import type { ClaudeModel, ClaudeMessage } from '../_shared/claude-client.ts';
import { getJobFullContext, getTenantMetrics } from '../_shared/ai-context.ts';
import { checkRateLimit, logAiUsage } from '../_shared/ai-rate-limiter.ts';
import {
  shouldEscalateToSonnet,
  buildCopilotSystemPrompt,
  buildDynamicContext,
  COPILOT_PROMPT_VERSION,
} from '../prompts.ts';

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

const HAIKU_MODEL: ClaudeModel = 'claude-haiku-4-20250514';
const SONNET_MODEL: ClaudeModel = 'claude-sonnet-4-20250514';
const MAX_OUTPUT_TOKENS_HAIKU = 1000;
const MAX_OUTPUT_TOKENS_SONNET = 3000;
const MAX_HISTORY_MESSAGES = 20;
const MAX_MESSAGE_LENGTH = 2000;

// Roles com permissao para ver dados financeiros
const FINANCIAL_ROLES = ['admin', 'ceo', 'produtor_executivo'];

// ---------------------------------------------------------------------------
// Payload do request
// ---------------------------------------------------------------------------

interface ChatPayload {
  conversation_id?: string; // NULL = nova conversa
  message: string;          // Mensagem do usuario (max 2000 chars)
  context?: {
    job_id?: string;
    page?: string;
  };
}

// ---------------------------------------------------------------------------
// Helpers internos
// ---------------------------------------------------------------------------

/** Valida e parseia o payload de chat */
async function parsePayload(req: Request): Promise<ChatPayload> {
  let body: ChatPayload;
  try {
    body = await req.json();
  } catch {
    throw new AppError('VALIDATION_ERROR', 'Body JSON invalido', 400);
  }

  if (!body.message || typeof body.message !== 'string') {
    throw new AppError('VALIDATION_ERROR', 'Campo "message" e obrigatorio (string)', 400);
  }

  const trimmed = body.message.trim();
  if (trimmed.length === 0) {
    throw new AppError('VALIDATION_ERROR', 'Campo "message" nao pode ser vazio', 400);
  }

  if (trimmed.length > MAX_MESSAGE_LENGTH) {
    throw new AppError(
      'VALIDATION_ERROR',
      `Mensagem excede o limite de ${MAX_MESSAGE_LENGTH} caracteres (${trimmed.length})`,
      400,
    );
  }

  return {
    ...body,
    message: trimmed,
  };
}

/** Busca o nome do tenant na tabela tenants */
async function getTenantName(
  serviceClient: ReturnType<typeof getServiceClient>,
  tenantId: string,
): Promise<string> {
  const { data, error } = await serviceClient
    .from('tenants')
    .select('name')
    .eq('id', tenantId)
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    console.warn(`[ai-copilot/chat] falha ao buscar tenant name: ${error?.message}`);
    return 'Ellah Filmes'; // fallback
  }

  return data.name ?? 'Ellah Filmes';
}

/** Carrega historico de mensagens de uma conversa existente */
async function loadConversationHistory(
  supabase: ReturnType<typeof getSupabaseClient>,
  conversationId: string,
  tenantId: string,
): Promise<ClaudeMessage[]> {
  // Verificar existencia da conversa (RLS filtra por tenant + user)
  const { data: conv, error: convError } = await supabase
    .from('ai_conversations')
    .select('id')
    .eq('id', conversationId)
    .is('deleted_at', null)
    .maybeSingle();

  if (convError) {
    console.error(`[ai-copilot/chat] erro ao verificar conversa: ${convError.message}`);
    throw new AppError('INTERNAL_ERROR', 'Erro ao buscar conversa', 500);
  }

  if (!conv) {
    throw new AppError('NOT_FOUND', 'Conversa nao encontrada', 404);
  }

  // Buscar ultimas N mensagens em ordem cronologica
  const { data: messages, error: msgError } = await supabase
    .from('ai_conversation_messages')
    .select('role, content')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(MAX_HISTORY_MESSAGES);

  if (msgError) {
    console.error(`[ai-copilot/chat] erro ao buscar historico: ${msgError.message}`);
    return []; // fallback: continua sem historico
  }

  return (messages ?? []).map((m: any) => ({
    role: m.role as 'user' | 'assistant',
    content: m.content as string,
  }));
}

/** Cria nova conversa no banco e retorna o ID */
async function createConversation(
  serviceClient: ReturnType<typeof getServiceClient>,
  tenantId: string,
  userId: string,
  title: string,
  jobId: string | undefined,
  modelUsed: ClaudeModel,
): Promise<string> {
  const conversationTitle = title.length > 50 ? title.substring(0, 50) : title;

  const { data, error } = await serviceClient
    .from('ai_conversations')
    .insert({
      tenant_id: tenantId,
      user_id: userId,
      title: conversationTitle,
      job_id: jobId ?? null,
      model_used: modelUsed,
      message_count: 0,
    })
    .select('id')
    .single();

  if (error || !data) {
    console.error(`[ai-copilot/chat] erro ao criar conversa: ${error?.message}`);
    throw new AppError('INTERNAL_ERROR', 'Erro ao criar conversa', 500);
  }

  return data.id;
}

/** Persiste mensagens (user + assistant) e atualiza contadores da conversa */
async function persistMessages(
  serviceClient: ReturnType<typeof getServiceClient>,
  params: {
    tenantId: string;
    userId: string;
    conversationId: string;
    userMessage: string;
    assistantMessage: string;
    modelUsed: ClaudeModel;
    inputTokens: number;
    outputTokens: number;
    durationMs: number;
  },
): Promise<string> {
  const messageId = crypto.randomUUID();

  // Inserir mensagem do usuario
  const { error: userError } = await serviceClient
    .from('ai_conversation_messages')
    .insert({
      tenant_id: params.tenantId,
      conversation_id: params.conversationId,
      role: 'user',
      content: params.userMessage,
    });

  if (userError) {
    console.error(`[ai-copilot/chat] erro ao persistir msg do usuario: ${userError.message}`);
  }

  // Inserir mensagem do assistant
  const { error: assistantError } = await serviceClient
    .from('ai_conversation_messages')
    .insert({
      id: messageId,
      tenant_id: params.tenantId,
      conversation_id: params.conversationId,
      role: 'assistant',
      content: params.assistantMessage,
      model_used: params.modelUsed,
      input_tokens: params.inputTokens,
      output_tokens: params.outputTokens,
      duration_ms: params.durationMs,
    });

  if (assistantError) {
    console.error(`[ai-copilot/chat] erro ao persistir msg do assistant: ${assistantError.message}`);
  }

  // Atualizar contadores da conversa
  // Usamos RPC-like approach: buscar valores atuais e somar
  const { data: conv } = await serviceClient
    .from('ai_conversations')
    .select('total_input_tokens, total_output_tokens, message_count')
    .eq('id', params.conversationId)
    .single();

  const currentInputTokens = (conv as any)?.total_input_tokens ?? 0;
  const currentOutputTokens = (conv as any)?.total_output_tokens ?? 0;
  const currentMessageCount = (conv as any)?.message_count ?? 0;

  const { error: updateError } = await serviceClient
    .from('ai_conversations')
    .update({
      total_input_tokens: currentInputTokens + params.inputTokens,
      total_output_tokens: currentOutputTokens + params.outputTokens,
      message_count: currentMessageCount + 2, // user + assistant
      last_message_at: new Date().toISOString(),
      model_used: params.modelUsed, // atualiza caso tenha escalado
    })
    .eq('id', params.conversationId);

  if (updateError) {
    console.error(`[ai-copilot/chat] erro ao atualizar conversa: ${updateError.message}`);
  }

  return messageId;
}

/**
 * Prepara contexto comum para ambos os handlers (chat e chat-sync).
 * Retorna system prompt, messages, modelo selecionado, max_tokens e conversation_id.
 */
async function prepareContext(
  payload: ChatPayload,
  auth: AuthContext,
) {
  const supabase = getSupabaseClient(auth.token);
  const serviceClient = getServiceClient();

  // 1. Rate limiting
  await checkRateLimit(supabase, auth.tenantId, auth.userId, 'copilot');

  // 2. Decidir modelo (Haiku default, Sonnet para perguntas complexas)
  const escalateToSonnet = shouldEscalateToSonnet(payload.message);
  const model: ClaudeModel = escalateToSonnet ? SONNET_MODEL : HAIKU_MODEL;
  const maxTokens = escalateToSonnet ? MAX_OUTPUT_TOKENS_SONNET : MAX_OUTPUT_TOKENS_HAIKU;

  console.log(
    `[ai-copilot/chat] modelo=${model} escalado=${escalateToSonnet}`,
  );

  // 3. Gerenciar conversa (carregar historico ou criar nova)
  let conversationId = payload.conversation_id ?? null;
  let history: ClaudeMessage[] = [];

  if (conversationId) {
    // Carregar historico de conversa existente
    history = await loadConversationHistory(supabase, conversationId, auth.tenantId);
  } else {
    // Criar nova conversa
    conversationId = await createConversation(
      serviceClient,
      auth.tenantId,
      auth.userId,
      payload.message,
      payload.context?.job_id,
      model,
    );
  }

  // 4. Carregar contexto do job (se informado)
  let jobContext: Awaited<ReturnType<typeof getJobFullContext>> | undefined;

  if (payload.context?.job_id) {
    const includeFinancials = FINANCIAL_ROLES.includes(auth.role);

    try {
      jobContext = await getJobFullContext(
        supabase,
        auth.tenantId,
        payload.context.job_id,
        includeFinancials,
      );
    } catch (err) {
      console.warn(`[ai-copilot/chat] falha ao carregar contexto do job: ${err}`);
      // Continua sem contexto de job — nao bloqueia o chat
    }
  }

  // 5. Carregar metricas do tenant
  let tenantMetrics: Awaited<ReturnType<typeof getTenantMetrics>> | undefined;

  try {
    tenantMetrics = await getTenantMetrics(supabase, auth.tenantId);
  } catch (err) {
    console.warn(`[ai-copilot/chat] falha ao carregar metricas do tenant: ${err}`);
  }

  // 6. Buscar nome do tenant
  const tenantName = await getTenantName(serviceClient, auth.tenantId);

  // 7. Montar dynamic context
  const dynamicContext = buildDynamicContext({
    jobContext: jobContext?.job
      ? {
          code: jobContext.job.code,
          title: jobContext.job.title,
          status: jobContext.job.status,
          priority: jobContext.job.priority,
          project_type: jobContext.job.project_type,
          client_name: jobContext.client?.name,
          briefing_text: jobContext.job.briefing_text ?? undefined,
          team: jobContext.team.map((t) => ({
            person_name: t.person_name,
            role: t.role,
          })),
          deliverables: jobContext.deliverables.map((d) => ({
            description: d.description,
            status: d.status,
          })),
          shooting_dates: jobContext.shooting_dates.map((s) => ({
            date: s.date,
            location: s.location,
          })),
          recent_history: jobContext.recent_history.map((h) => ({
            event_type: h.event_type,
            description: h.description,
            created_at: h.created_at,
          })),
          closed_value: jobContext.job.closed_value,
          production_cost: jobContext.job.production_cost,
          margin_percentage: jobContext.job.margin_percentage,
        }
      : undefined,
    tenantMetrics: tenantMetrics
      ? {
          total_jobs: tenantMetrics.total_jobs,
          active_jobs: tenantMetrics.active_jobs,
          avg_margin: tenantMetrics.avg_margin,
          total_revenue: tenantMetrics.total_revenue,
          team_size: tenantMetrics.team_size,
        }
      : undefined,
    currentPage: payload.context?.page,
  });

  // 8. Montar system prompt
  const systemPrompt = buildCopilotSystemPrompt({
    tenantName,
    userRole: auth.role,
    dynamicContext,
  });

  // 9. Montar array de mensagens: historico + nova mensagem
  const messages: ClaudeMessage[] = [
    ...history,
    { role: 'user', content: payload.message },
  ];

  return {
    supabase,
    serviceClient,
    model,
    maxTokens,
    systemPrompt,
    messages,
    conversationId,
  };
}

// ---------------------------------------------------------------------------
// handleChat — POST /chat (SSE streaming)
// ---------------------------------------------------------------------------

/**
 * Handler de chat com streaming SSE.
 *
 * Fluxo:
 * 1. Valida payload e rate limiting
 * 2. Monta contexto (job, metricas, system prompt)
 * 3. Chama Claude com streaming
 * 4. Retorna ReadableStream SSE com eventos: start, delta, done
 * 5. Persiste mensagens no banco apos o stream terminar
 *
 * Eventos SSE emitidos:
 * - start: { conversation_id, message_id }
 * - delta: { text } (re-emitido do callClaudeStream)
 * - done:  { tokens_used: { input, output } }
 * - error: { message } (se ocorrer erro durante o stream)
 */
export async function handleChat(
  req: Request,
  auth: AuthContext,
): Promise<Response> {
  console.log(`[ai-copilot/chat] streaming tenant=${auth.tenantId} user=${auth.userId}`);

  // 1. Parsear e validar payload
  const payload = await parsePayload(req);

  // 2-9. Preparar contexto (rate limit, modelo, historico, prompts)
  const {
    supabase,
    serviceClient,
    model,
    maxTokens,
    systemPrompt,
    messages,
    conversationId,
  } = await prepareContext(payload, auth);

  // 10. Chamar Claude com streaming
  const startTime = Date.now();

  const { stream: claudeStream, getUsage } = await callClaudeStream(supabase, {
    model,
    system: systemPrompt,
    messages,
    max_tokens: maxTokens,
    temperature: 0.7,
  });

  // 11. Criar wrapper TransformStream que:
  //   a. Emite evento 'start' com conversation_id e message_id
  //   b. Re-emite deltas do claudeStream acumulando o texto
  //   c. No flush, persiste mensagens no banco
  const messageId = crypto.randomUUID();
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  // Acumulador de texto para persistencia pos-stream
  let accumulatedText = '';
  let streamStarted = false;

  const wrapperStream = new TransformStream<Uint8Array, Uint8Array>({
    start(controller) {
      // Emitir evento 'start' com conversation_id e message_id
      const startEvent = `event: start\ndata: ${JSON.stringify({
        conversation_id: conversationId,
        message_id: messageId,
      })}\n\n`;
      controller.enqueue(encoder.encode(startEvent));
      streamStarted = true;
    },

    transform(chunk, controller) {
      // Decodificar chunk para interceptar deltas e acumular texto
      const text = decoder.decode(chunk, { stream: true });

      // Parsear eventos SSE do stream interno para acumular texto
      // Cada chunk pode conter multiplos eventos SSE
      const lines = text.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));

            // Acumular texto dos deltas
            if (data.text !== undefined) {
              accumulatedText += data.text;
            }
          } catch {
            // JSON invalido — ignora (pode ser parcial)
          }
        }
      }

      // Re-emitir o chunk original para o cliente
      controller.enqueue(chunk);
    },

    async flush(_controller) {
      // Stream terminou — persistir mensagens no banco
      const durationMs = Date.now() - startTime;
      const usage = getUsage();

      console.log(
        `[ai-copilot/chat] stream finalizado model=${model} input=${usage.input_tokens} output=${usage.output_tokens} duration=${durationMs}ms text_length=${accumulatedText.length}`,
      );

      // Persistir mensagens (user + assistant) e atualizar conversa
      try {
        await persistMessages(serviceClient, {
          tenantId: auth.tenantId,
          userId: auth.userId,
          conversationId: conversationId!,
          userMessage: payload.message,
          assistantMessage: accumulatedText,
          modelUsed: model,
          inputTokens: usage.input_tokens,
          outputTokens: usage.output_tokens,
          durationMs,
        });
      } catch (err) {
        console.error(`[ai-copilot/chat] erro ao persistir mensagens: ${err}`);
        // Nao quebra o stream — as mensagens ja foram enviadas ao cliente
      }

      // Registrar uso de IA
      try {
        const costUsd = estimateCost(model, usage.input_tokens, usage.output_tokens);

        await logAiUsage(serviceClient, {
          tenantId: auth.tenantId,
          userId: auth.userId,
          feature: 'copilot',
          modelUsed: model,
          inputTokens: usage.input_tokens,
          outputTokens: usage.output_tokens,
          estimatedCostUsd: costUsd,
          durationMs,
          status: 'success',
          metadata: {
            conversation_id: conversationId,
            message_id: messageId,
            prompt_version: COPILOT_PROMPT_VERSION,
            escalated_to_sonnet: model === SONNET_MODEL,
            job_id: payload.context?.job_id ?? null,
          },
        });
      } catch (err) {
        console.error(`[ai-copilot/chat] erro ao registrar uso de IA: ${err}`);
      }
    },
  });

  // Conectar o stream do Claude ao wrapper
  const outputStream = claudeStream.pipeThrough(wrapperStream);

  // 12. Retornar SSE Response
  return new Response(outputStream, {
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

// ---------------------------------------------------------------------------
// handleChatSync — POST /chat-sync (sem streaming)
// ---------------------------------------------------------------------------

/**
 * Handler de chat sincrono (resposta completa em JSON).
 * Mesmo fluxo do handleChat, mas usa callClaude (batch) em vez de streaming.
 *
 * Resposta:
 * {
 *   data: {
 *     conversation_id: string,
 *     message_id: string,
 *     response: string,
 *     sources: [],
 *     tokens_used: { input: number, output: number }
 *   }
 * }
 */
export async function handleChatSync(
  req: Request,
  auth: AuthContext,
): Promise<Response> {
  console.log(`[ai-copilot/chat] sync tenant=${auth.tenantId} user=${auth.userId}`);

  // 1. Parsear e validar payload
  const payload = await parsePayload(req);

  // 2-9. Preparar contexto (rate limit, modelo, historico, prompts)
  const {
    serviceClient,
    supabase,
    model,
    maxTokens,
    systemPrompt,
    messages,
    conversationId,
  } = await prepareContext(payload, auth);

  // 10. Chamar Claude (batch, sem streaming)
  const startTime = Date.now();
  let claudeResponse;
  let status: 'success' | 'error' | 'timeout' = 'success';
  let errorMessage: string | undefined;

  try {
    claudeResponse = await callClaude(supabase, {
      model,
      system: systemPrompt,
      messages,
      max_tokens: maxTokens,
      temperature: 0.7,
    });
  } catch (err) {
    const durationMs = Date.now() - startTime;
    status = err instanceof AppError && err.statusCode === 504 ? 'timeout' : 'error';
    errorMessage = err instanceof Error ? err.message : String(err);

    // Registrar uso mesmo em caso de erro
    await logAiUsage(serviceClient, {
      tenantId: auth.tenantId,
      userId: auth.userId,
      feature: 'copilot',
      modelUsed: model,
      inputTokens: 0,
      outputTokens: 0,
      estimatedCostUsd: 0,
      durationMs,
      status,
      errorMessage,
      metadata: {
        conversation_id: conversationId,
        prompt_version: COPILOT_PROMPT_VERSION,
        escalated_to_sonnet: model === SONNET_MODEL,
        job_id: payload.context?.job_id ?? null,
      },
    });

    throw err;
  }

  const durationMs = Date.now() - startTime;

  // 11. Persistir mensagens (user + assistant)
  const messageId = await persistMessages(serviceClient, {
    tenantId: auth.tenantId,
    userId: auth.userId,
    conversationId: conversationId!,
    userMessage: payload.message,
    assistantMessage: claudeResponse.content,
    modelUsed: model,
    inputTokens: claudeResponse.input_tokens,
    outputTokens: claudeResponse.output_tokens,
    durationMs,
  });

  // 12. Registrar uso de IA
  const costUsd = estimateCost(model, claudeResponse.input_tokens, claudeResponse.output_tokens);

  await logAiUsage(serviceClient, {
    tenantId: auth.tenantId,
    userId: auth.userId,
    feature: 'copilot',
    modelUsed: model,
    inputTokens: claudeResponse.input_tokens,
    outputTokens: claudeResponse.output_tokens,
    estimatedCostUsd: costUsd,
    durationMs,
    status: 'success',
    metadata: {
      conversation_id: conversationId,
      message_id: messageId,
      prompt_version: COPILOT_PROMPT_VERSION,
      escalated_to_sonnet: model === SONNET_MODEL,
      job_id: payload.context?.job_id ?? null,
    },
  });

  // 13. Retornar resposta sincrona
  return success({
    conversation_id: conversationId,
    message_id: messageId,
    response: claudeResponse.content,
    sources: [],
    tokens_used: {
      input: claudeResponse.input_tokens,
      output: claudeResponse.output_tokens,
    },
  });
}
