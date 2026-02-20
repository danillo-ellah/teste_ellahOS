# ADR-014: Padrao de Integracao com a Claude API

**Data:** 20/02/2026
**Status:** Proposta
**Autor:** Tech Lead -- ELLAHOS
**Contexto:** Fase 8 -- Inteligencia Artificial

---

## Contexto

A Fase 8 requer integracao com a Claude API (Anthropic) para 4 features de IA: estimativa de orcamento, copilot de producao, analise de dailies e matching de freelancer. Precisamos definir como comunicar com a API de forma segura, eficiente e observavel no contexto de Supabase Edge Functions (runtime Deno).

Opcoes tecnicas:
1. Anthropic TypeScript SDK (`@anthropic-ai/sdk`) via esm.sh
2. Fetch HTTP nativo do Deno (chamada direta ao endpoint REST)
3. Wrapper generico de LLM (LangChain, AI SDK da Vercel)

---

## Decisao

Usar **fetch HTTP nativo do Deno** para chamadas a Claude API, sem SDK externo. Implementar um modulo compartilhado `_shared/claude-client.ts` com:

1. **Funcao batch** (`callClaude`): POST para `https://api.anthropic.com/v1/messages`, aguarda resposta completa
2. **Funcao streaming** (`callClaudeStream`): Mesma chamada com `stream: true`, retorna ReadableStream para SSE
3. **API key**: Lida do Supabase Vault via `getSecret()`, fallback para `Deno.env`
4. **Retry**: Exponential backoff (1s, 3s) para HTTP 429 e 500+, max 2 retries. Sem retry para 400.
5. **Timeout**: 30s (batch), 60s (streaming), via AbortController
6. **Telemetria**: Toda chamada registrada em `ai_usage_logs` com tokens, custo, latencia e status
7. **Custo**: Calculado com constantes de pricing centralizadas (`PRICING` map)

Headers obrigatorios:
```
anthropic-version: 2023-06-01
x-api-key: {ANTHROPIC_API_KEY}
content-type: application/json
```

---

## Consequencias

### Positivas
- Zero dependencias externas (sem SDK, sem esm.sh para pacotes grandes)
- A API da Anthropic e simples: 1 endpoint (POST /v1/messages), resposta JSON previsivel
- Fetch nativo do Deno e confiavel e performante em Edge Functions
- Controle total sobre retry, timeout e error handling
- Modulo leve (~200 linhas), facil de manter e testar
- Constantes de pricing centralizadas facilitam atualizacao quando Anthropic mudar valores

### Negativas
- Nao tem type-safety automatica da resposta (mitigado: interfaces manuais no types.ts)
- Parsing manual de SSE chunks (mitigado: protocolo SSE e simples e bem documentado)
- Se Anthropic mudar a API, precisamos atualizar manualmente (mitigado: header anthropic-version fixa a versao)

### Riscos
- Header `anthropic-version` desatualizado pode causar breaking changes (mitigado: monitorar changelogs da Anthropic)
- Streaming SSE pode ter edge cases em Deno Deploy (mitigado: testar extensivamente, fallback sync disponivel)

---

## Alternativas Consideradas

### A1: Anthropic TypeScript SDK via esm.sh
**Rejeitada.** O SDK e projetado para Node.js com dependencias como `node-fetch` e `form-data`. Import via esm.sh pode funcionar para versoes pinadas, mas adiciona ~300KB+ de dependencias, risco de incompatibilidade com Deno, e uma camada de abstracao desnecessaria para uma API que e literalmente 1 endpoint REST.

### A2: Vercel AI SDK (`ai` package)
**Rejeitada.** Otimizado para Next.js (server components, API routes), nao para Deno Edge Functions. Adiciona abstracao multi-provider que nao precisamos (usamos apenas Claude). Overhead de dependencias significativo.

### A3: LangChain
**Rejeitada.** Over-engineering massivo para nosso caso de uso. LangChain e util para pipelines complexos (chains, agents, tools), mas nossas features sao chamadas diretas com prompts estruturados. A complexidade nao se justifica.

---

## Referencias

- Anthropic API docs: https://docs.anthropic.com/en/api/messages
- docs/architecture/fase-8-ai-architecture.md
- _shared/vault.ts (padrao de secrets existente)
