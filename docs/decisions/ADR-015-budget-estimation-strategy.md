# ADR-015: Estrategia de Estimativa de Orcamento AI

**Data:** 20/02/2026
**Status:** Proposta
**Autor:** Tech Lead -- ELLAHOS
**Contexto:** Fase 8 -- Inteligencia Artificial (sub-fase 8.2)

---

## Contexto

A feature "Estimativa de Orcamento AI" precisa buscar jobs historicos similares ao job alvo para fornecer contexto ao Claude na geracao de uma sugestao de orcamento. A qualidade da estimativa depende diretamente da qualidade da busca por similaridade.

Opcoes para busca de jobs similares:
1. pgvector com embeddings dos briefings (busca semantica)
2. Query SQL com score de similaridade composto (busca por atributos)
3. Hibrido: embeddings + atributos

O tenant medio tem entre 50 e 2.000 jobs historicos.

---

## Decisao

Usar **query SQL com score de similaridade composto**, sem embeddings ou pgvector.

### Score de Similaridade (0-100 pontos)

```sql
-- Componentes do score:
-- 40 pts: mesmo project_type
-- 20 pts: mesmo client_segment
-- 15 pts: mesma complexity_level
-- 25 pts: recencia (decai linearmente em 2 anos)
SELECT *,
  (CASE WHEN project_type = $type THEN 40 ELSE 0 END) +
  (CASE WHEN client_segment = $segment THEN 20 ELSE 0 END) +
  (CASE WHEN complexity_level = $complexity THEN 15 ELSE 0 END) +
  GREATEST(0, 25 * (1 - EXTRACT(EPOCH FROM (now() - created_at)) / (2 * 365.25 * 86400)))
  AS similarity_score
FROM jobs
WHERE tenant_id = $tenant_id
  AND status IN ('finalizado', 'entregue')
  AND closed_value IS NOT NULL
  AND deleted_at IS NULL
  AND id != $job_id  -- excluir o proprio job
ORDER BY similarity_score DESC
LIMIT 20;
```

### Cache de Estimativas

Estimativas sao cacheadas por 24h via `input_hash` (SHA-256):
1. Calcular hash de: `job_id + project_type + complexity_level + deliverables_count + JSON(override_context)`
2. Buscar em `ai_budget_estimates WHERE input_hash = $hash AND created_at > now() - 24h`
3. Se cache hit, retornar sem chamar Claude
4. Se cache miss, chamar Claude e salvar resultado

### Few-shot com Dados Reais

Os 3 jobs mais similares sao incluidos como few-shot examples no prompt, mostrando ao Claude o padrao de orcamento da produtora.

---

## Consequencias

### Positivas
- Zero infra adicional (sem pgvector, sem servico de embeddings)
- Query rapida (<50ms para <2.000 jobs com indices existentes)
- Score transparente e explicavel (o usuario entende por que um job foi considerado "similar")
- Cache reduz chamadas repetidas ao Claude (economia de tokens)
- Facil de ajustar pesos (40/20/15/25) baseado em feedback dos usuarios

### Negativas
- Nao captura similaridade semantica de briefings (dois jobs com briefings parecidos mas project_type diferente terao score baixo)
- Score linear de recencia e simplista (nao considera sazonalidade)
- Cache por hash pode ter colisoes teoricas (SHA-256: probabilidade negligivel)

### Riscos
- Tenant com poucos jobs historicos (<10) tera estimativas de baixa qualidade (mitigado: confidence="low" e warning explicito)
- Jobs de tipos raros (ex: documentario em produtora focada em comerciais) terao poucos similares (mitigado: fallback para jobs de qualquer tipo, com score menor)

---

## Alternativas Consideradas

### A1: pgvector + embeddings de briefing
**Rejeitada para v1.** Requer:
- Habilitar extensao pgvector no Supabase
- Pipeline de geracao de embeddings (via Claude ou OpenAI) para cada job criado/atualizado
- Custo adicional de embeddings (~0.0001 USD por embed, mas pipeline complexa)
- Indice HNSW ou IVFFlat para busca eficiente
- Tudo isso para um ganho marginal quando o tenant tem <2.000 jobs

Pode ser adicionado como layer complementar na v2 se necessario.

### A2: Busca full-text no briefing_text (tsvector)
**Rejeitada.** O PostgreSQL ja suporta tsvector, mas a similaridade textual de briefings nao e um bom proxy para similaridade de orcamento. Dois jobs com briefings muito diferentes podem ter orcamentos semelhantes (mesmo tipo, mesma complexidade).

### A3: K-means clustering de jobs
**Rejeitada.** Over-engineering. Requer pipeline de clustering offline, manutencao de clusters, e nao necessariamente produz resultados melhores que o score composto para N pequeno.

---

## Referencias

- docs/architecture/fase-8-ai-architecture.md (secao 2.1)
- Tabela jobs: ~77 colunas, campos relevantes: project_type, client_segment, complexity_level, closed_value, production_cost, margin_percentage
