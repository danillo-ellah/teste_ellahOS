# ADR-034: Campos CRM faltantes corrigidos retroativamente

**Data:** 11/03/2026
**Status:** Aceito
**Autor:** Tech Lead -- ELLAHOS
**Contexto:** Onda 2.4 -- Orcamentos pre-Job

## Contexto

DESCOBERTA CRITICA durante a analise da Onda 2.4: 10 campos da tabela `opportunities` existiam no frontend (useCrm.ts types) e na Edge Function (update-opportunity.ts Zod schema) mas NAO existiam em nenhuma migration. O stage `pausado` tambem nao estava no CHECK constraint.

Campos afetados: `loss_category`, `winner_competitor`, `winner_value`, `is_competitive_bid`, `response_deadline`, `deliverable_format`, `campaign_period`, `competitor_count`, `win_reason`, `client_budget`.

Esses campos foram adicionados diretamente no banco via Supabase Dashboard durante o CRM Sprint 1 da Onda 1.2, sem migration correspondente.

## Decisao

A migration da Onda 2.4 (20260311100000) adiciona todos os campos via `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` e corrige o CHECK constraint de stage para incluir `pausado`. Isso torna a migration a source-of-truth e permite reconstruir o schema em ambientes novos.

## Consequencias

### Positivas

- Schema 100% reproducivel via migrations
- Novos ambientes (staging, novos tenants) funcionam sem intervencao manual
- IF NOT EXISTS garante idempotencia (nao quebra se campos ja existem)

### Negativas

- Migration da Onda 2.4 ficou mais longa que o necessario (mistura novos campos com correcao retroativa)
- Historico de migrations nao reflete a real cronologia de criacao dos campos

## Licoes aprendidas

1. NUNCA criar campos diretamente no Supabase Dashboard sem migration correspondente
2. Auditar periodicamente se types do frontend coincidem com migrations do banco
3. Incluir validacao automatica (tsc + Zod) que falhe se tipos divergirem

## Nota adicional (finding F-01 e F-02)

Alem dos campos, duas RPCs tambem foram criadas via Dashboard sem migration:
- `upsert_orc_code_sequence` (usada por budget/upsert-version.ts)
- `convert_opportunity_to_job` (usada por convert-to-job.ts)

Estas RPCs precisam de migration retroativa para manter reproducibilidade.
