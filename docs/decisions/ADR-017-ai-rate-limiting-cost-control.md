# ADR-017: Rate Limiting e Controle de Custo para Features AI

**Data:** 20/02/2026
**Status:** Proposta
**Autor:** Tech Lead -- ELLAHOS
**Contexto:** Fase 8 -- Inteligencia Artificial

---

## Contexto

As features de IA consomem tokens da Claude API, que tem custo real por request. Diferente de endpoints CRUD (custo fixo de infra), cada chamada de IA custa entre USD 0.004 (Haiku chat) e USD 0.054 (Sonnet analise). Sem controle, um unico tenant pode gerar custos desproporcionais.

Precisamos de:
1. Rate limiting por usuario (prevenir uso excessivo individual)
2. Rate limiting por tenant (prevenir custo descontrolado)
3. Telemetria de custo (visibilidade para admin)
4. Limites ajustaveis por tier de plano

O projeto ja tem um padrao de rate limiting via contagem no banco (ADR-010 para aprovacoes publicas). A questao e se esse padrao escala para features AI com maior volume.

---

## Decisao

Usar **rate limiting via contagem de `ai_usage_logs`**, seguindo e evoluindo o padrao do ADR-010.

### Limites

| Dimensao | Limite | Janela | Acao |
|----------|--------|--------|------|
| Requests por usuario | 60/hora (copilot), 10/hora (batch) | 1 hora rolling | HTTP 429 |
| Requests por tenant | 500/hora | 1 hora rolling | HTTP 429 |
| Tokens por tenant | 500.000/dia | 24 horas rolling | HTTP 429 |

### Implementacao

```typescript
// _shared/ai-rate-limiter.ts

export async function checkRateLimit(
  client: SupabaseClient,
  tenantId: string,
  userId: string,
  feature: string,
): Promise<void> {
  const oneHourAgo = new Date(Date.now() - 3600_000).toISOString();
  const oneDayAgo = new Date(Date.now() - 86400_000).toISOString();

  // 1. Rate limit por usuario (requests/hora)
  const { count: userCount } = await client
    .from('ai_usage_logs')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('feature', feature)
    .gte('created_at', oneHourAgo);

  const userLimit = feature === 'copilot' ? 60 : 10;
  if (userCount && userCount >= userLimit) {
    throw new AppError('RATE_LIMITED',
      `Limite de ${userLimit} requests/hora atingido. Tente novamente mais tarde.`, 429);
  }

  // 2. Rate limit por tenant (requests/hora)
  const { count: tenantCount } = await client
    .from('ai_usage_logs')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .gte('created_at', oneHourAgo);

  if (tenantCount && tenantCount >= 500) {
    throw new AppError('RATE_LIMITED',
      'Limite de requests por hora do tenant atingido.', 429);
  }

  // 3. Rate limit por tenant (tokens/dia)
  const { data: tokenData } = await client
    .from('ai_usage_logs')
    .select('total_tokens')
    .eq('tenant_id', tenantId)
    .gte('created_at', oneDayAgo);

  const totalTokens = (tokenData ?? []).reduce(
    (sum, row) => sum + (row.total_tokens ?? 0), 0
  );

  if (totalTokens >= 500_000) {
    throw new AppError('RATE_LIMITED',
      'Limite diario de tokens atingido. Tente novamente amanha.', 429);
  }
}
```

### Telemetria de Custo

Toda chamada a Claude registra em `ai_usage_logs`:
- `input_tokens`, `output_tokens`, `total_tokens` (generated column)
- `estimated_cost_usd` = calculado via constantes de pricing do modelo
- `status` = success/error/rate_limited/timeout

### Dashboard de Uso (Settings > IA)

Acessivel para roles admin/ceo. Mostra:
- Uso total do mes (tokens, custo estimado, requests)
- Breakdown por feature (copilot, budget_estimate, etc.)
- Top usuarios por consumo
- Tendencia de uso (grafico de linha, 30 dias)

### Limites por Tier (v2)

Quando implementarmos billing diferenciado:

| Tier | Requests/hora (user) | Requests/hora (tenant) | Tokens/dia |
|------|---------------------|----------------------|-----------|
| Free | 20 | 100 | 100.000 |
| Pro | 60 | 500 | 500.000 |
| Enterprise | 200 | 2.000 | 2.000.000 |

Na v1, todos os tenants usam limites "Pro" como default. O tier e lido de `tenants.settings->>'ai_tier'`.

---

## Consequencias

### Positivas
- Zero dependencias externas (reutiliza PostgreSQL existente via ai_usage_logs)
- Persistente entre cold starts (dados no banco)
- Auditavel (admin pode consultar ai_usage_logs diretamente)
- Custo centralizado e transparente (estimated_cost_usd por request)
- Facil escalar limites sem mudanca de codigo (ajustar constantes ou ler de tenant settings)

### Negativas
- 2-3 queries adicionais por request AI (~5-10ms total) para verificar limites
- Contagem rolling window pode ter leve imprecisao em concorrencia alta (aceitavel)
- Nao protege contra burst instantaneo (10 requests em 1 segundo passam, sao limitados no segundo seguinte)

### Mitigacoes
- As 2-3 queries usam indices (tenant_id + feature + created_at) e sao SELECT count com head: true
- Para burst protection no futuro, pode-se adicionar Upstash Redis como layer complementar
- Token count e estimado (nao bloqueamos antes da chamada Claude, contabilizamos depois)

---

## Alternativas Consideradas

### A1: Upstash Redis (serverless Redis)
**Rejeitada para v1.** Upstash e excelente para rate limiting de alta precisao e baixa latencia (<1ms), mas adiciona:
- Dependencia externa (conta Upstash, SDK, configuracao)
- Custo mensal (~USD 10+ para uso basico)
- Ponto unico de falha adicional

O volume esperado de requests AI (~500-5.000/mes por tenant) nao justifica a complexidade. Se o volume crescer 10x, migrar para Upstash e trivial (interface identica: check + increment).

### A2: In-memory counter na Edge Function
**Rejeitada.** Edge Functions do Supabase nao tem memoria compartilhada entre instancias e nao persistem entre cold starts. Um counter in-memory seria zerado a cada cold start (~3-5 minutos de inatividade).

### A3: Sem rate limiting (confiar no rate limit da Anthropic)
**Rejeitada.** O rate limit da Anthropic protege a conta (nao o tenant). Um tenant abusivo consumiria o rate limit da conta inteira, prejudicando outros tenants. Alem disso, sem rate limiting do nosso lado, nao temos controle de custo.

### A4: Pre-paid token budget (debitar tokens antes da chamada)
**Rejeitada para v1.** Modelo de "creditos" onde o tenant compra tokens antecipadamente e debita a cada uso. Exige: billing, checkout, contabilidade de creditos, UI de compra. Complexidade de produto que nao justifica na v1.

---

## Referencias

- ADR-010: Rate limiting no endpoint publico (padrao base)
- docs/architecture/fase-8-ai-architecture.md (secoes 4.3 e 7)
- Anthropic pricing: https://www.anthropic.com/pricing
