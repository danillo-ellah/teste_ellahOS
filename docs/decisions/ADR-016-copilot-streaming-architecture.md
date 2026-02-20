# ADR-016: Arquitetura de Streaming do Copilot

**Data:** 20/02/2026
**Status:** Proposta
**Autor:** Tech Lead -- ELLAHOS
**Contexto:** Fase 8 -- Inteligencia Artificial (sub-fase 8.3)

---

## Contexto

O Copilot de Producao e um chat conversacional que precisa entregar respostas do Claude em tempo real ao usuario. Sem streaming, o usuario esperaria 5-15 segundos sem feedback ate a resposta completa chegar. Com streaming, o primeiro token aparece em ~1-2 segundos e o resto vai aparecendo progressivamente.

Opcoes de transporte:
1. Server-Sent Events (SSE) via HTTP
2. WebSocket bidirecional
3. Long polling
4. HTTP chunked transfer

Restricoes do ambiente:
- Supabase Edge Functions rodam em Deno Deploy
- Deno Deploy NAO suporta WebSocket server-side
- Edge Functions retornam um `Response` padrao (request-response HTTP)
- O frontend e Next.js 16 rodando no browser

---

## Decisao

Usar **Server-Sent Events (SSE)** via HTTP Response com ReadableStream.

### Implementacao na Edge Function (Deno)

```typescript
// ai-copilot/handlers/chat.ts (pseudo-codigo simplificado)

export async function handleChat(req: Request, auth: AuthContext): Promise<Response> {
  const body = await req.json();

  // ... validacao, rate limit, carregar contexto ...

  // Chamar Claude com streaming
  const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { /* ... */ },
    body: JSON.stringify({
      model: 'claude-haiku-4-20250514',
      system: systemPrompt,
      messages: conversationHistory,
      max_tokens: 1000,
      stream: true,
    }),
  });

  // Criar TransformStream para re-emitir eventos SSE formatados
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  // Processar stream do Claude em background
  (async () => {
    try {
      // Enviar evento start
      await writer.write(encoder.encode(
        `event: start\ndata: ${JSON.stringify({ conversation_id, message_id })}\n\n`
      ));

      const reader = claudeResponse.body!.getReader();
      const decoder = new TextDecoder();
      let fullText = '';
      let inputTokens = 0;
      let outputTokens = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        // Parsear SSE chunks da Anthropic
        // Extrair content_block_delta events
        // Re-emitir como nosso formato SSE
        for (const textDelta of parseAnthropicSSE(chunk)) {
          fullText += textDelta;
          await writer.write(encoder.encode(
            `event: delta\ndata: ${JSON.stringify({ text: textDelta })}\n\n`
          ));
        }
      }

      // Enviar evento done com metricas
      await writer.write(encoder.encode(
        `event: done\ndata: ${JSON.stringify({ tokens_used: { input: inputTokens, output: outputTokens } })}\n\n`
      ));

      // Salvar mensagem no banco (async, nao bloqueia o stream)
      // ... insert em ai_conversation_messages e ai_usage_logs ...
    } catch (err) {
      await writer.write(encoder.encode(
        `event: error\ndata: ${JSON.stringify({ message: 'Erro no processamento' })}\n\n`
      ));
    } finally {
      await writer.close();
    }
  })();

  return new Response(readable, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-store',
      'Connection': 'keep-alive',
      ...corsHeaders,
    },
  });
}
```

### Protocolo SSE (eventos tipados)

| Evento | Payload | Quando |
|--------|---------|--------|
| `start` | `{ conversation_id, message_id }` | Inicio da resposta |
| `delta` | `{ text: "chunk de texto" }` | Cada chunk de texto |
| `done` | `{ tokens_used, sources }` | Resposta completa |
| `error` | `{ message: "descricao" }` | Erro durante streaming |

### Consumo no Frontend (Next.js)

```typescript
// hooks/use-ai-copilot.ts (pseudo-codigo)
function useAiCopilot() {
  const sendMessage = async (message: string, conversationId?: string) => {
    const response = await fetch('/functions/v1/ai-copilot/chat', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, conversation_id: conversationId }),
    });

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const text = decoder.decode(value, { stream: true });
      // Parsear eventos SSE e atualizar state
      for (const event of parseSSE(text)) {
        if (event.type === 'delta') {
          setCurrentResponse(prev => prev + event.data.text);
        } else if (event.type === 'done') {
          setTokensUsed(event.data.tokens_used);
        }
      }
    }
  };
}
```

### Endpoint Sync (fallback)

O endpoint `POST /ai-copilot/chat-sync` fornece a mesma funcionalidade sem streaming, para:
- Clientes que nao suportam SSE (ex: integracao via n8n)
- Fallback se SSE falhar
- Testes automatizados (mais simples de testar)

---

## Consequencias

### Positivas
- UX responsiva: primeiro chunk em ~1-2s vs ~5-15s sem streaming
- Suportado nativamente no Deno Deploy (Response + ReadableStream)
- Suportado nativamente nos browsers modernos (fetch + ReadableStream ou EventSource)
- Protocolo simples (text/event-stream) sem dependencias
- Fallback sync disponivel para compatibilidade

### Negativas
- SSE e unidirecional (server -> client); usuario nao pode cancelar mid-stream via mesmo canal (mitigado: AbortController no fetch do frontend)
- Parsing manual de chunks SSE da Anthropic (mitigado: parser simples ~30 linhas)
- Edge Functions do Supabase tem timeout de 150s; conversas muito longas podem ser cortadas (mitigado: max_tokens limita resposta)

### Riscos
- Conexao SSE pode ser interrompida por proxies/firewalls corporativos (mitigado: fallback sync)
- TransformStream no Deno Deploy pode ter quirks nao documentados (mitigado: testar extensivamente)
- Salvar mensagem apos stream pode falhar silenciosamente (mitigado: try/catch com logging)

---

## Alternativas Consideradas

### A1: WebSocket
**Rejeitada.** Deno Deploy (runtime do Supabase Edge Functions) nao suporta WebSocket server-side. Teriamos que usar um servico externo (ex: Ably, Pusher) ou um servidor dedicado, adicionando complexidade e custo desnecessarios.

### A2: Long Polling
**Rejeitada.** UX significativamente inferior: cada "chunk" exigiria um novo request HTTP. Para uma resposta de 500 tokens (~100 chunks), seriam 100 requests HTTP. Latencia inaceitavel e overhead de conexao.

### A3: HTTP Chunked Transfer (sem SSE)
**Rejeitada.** Tecnicamente possivel (Transfer-Encoding: chunked), mas sem a semantica de eventos tipados do SSE. O frontend teria que parsear chunks brutos sem saber quando a resposta comecou/terminou. SSE adiciona essa semantica com custo minimo.

### A4: Supabase Realtime (canal dedicado)
**Rejeitada.** Supabase Realtime usa WebSocket para o frontend, mas o canal e broadcast/presence, nao streaming de LLM. Teriamos que: (1) Edge Function escreve chunks em tabela temporaria, (2) Frontend subscribe via Realtime. Isso adiciona latencia de banco + Realtime (50-100ms por chunk) e complexidade de cleanup. SSE direto e mais simples e mais rapido.

---

## Referencias

- docs/architecture/fase-8-ai-architecture.md (secao 5.3)
- MDN Web Docs: Server-Sent Events
- Anthropic Streaming API: https://docs.anthropic.com/en/api/messages-streaming
- Deno Deploy: Response with ReadableStream
