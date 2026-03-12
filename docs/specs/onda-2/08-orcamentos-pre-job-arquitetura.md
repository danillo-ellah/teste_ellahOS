# Onda 2.4 -- Orcamentos pre-Job: Arquitetura Tecnica

**Data:** 2026-03-11
**Status:** IMPLEMENTADO (11/03/2026)
**Autor:** Tech Lead (Claude Opus 4.6)
**Spec de referencia:** 07-orcamentos-pre-job-spec.md
**Esforco estimado:** 4 sprints (4-5 dias uteis)
**Esforco real:** 4 sprints executados conforme planejado

### Findings pos-implementacao (auditoria 11/03/2026)

| ID | Severidade | Descricao | Status |
|----|-----------|-----------|--------|
| F-01 | ALTO | RPC `upsert_orc_code_sequence` chamada pela EF `upsert-version.ts` mas NAO definida em nenhuma migration. Foi criada via Supabase Dashboard. Precisa de migration retroativa. | ABERTO |
| F-02 | ALTO | RPC `convert_opportunity_to_job` chamada pela EF `convert-to-job.ts` mas NAO definida em nenhuma migration. Mesma situacao do F-01. | ABERTO |
| F-03 | BAIXO | Arquitetura propos `SECURITY INVOKER` na RPC (secao 3.3) mas a implementacao real usa `SECURITY DEFINER` (correto, pois INVOKER nao e suportado nesta versao do Postgres). Divergencia doc vs codigo. | CORRIGIDO nesta revisao |
| F-04 | BAIXO | Arquitetura propos criacao de `job_budgets` record na conversao (secao 3.4, pseudocodigo) mas a implementacao real cria apenas `cost_items` sem `job_budgets`. Simplificacao valida. | ACEITO |
| F-05 | INFORMATIVO | `copy_from_active` no `upsert-version.ts` ARQUIVA a versao ativa (muda status para historico) ao copiar. A arquitetura propunha manter a ativa durante o processo. Ambiguidade no fluxo de versionamento. | ACEITO |

---

## 1. Visao Geral da Arquitetura

### 1.1 Diagrama de Modulos

```
+-------------------+     +--------------------+     +-------------------+
|    Frontend        |     |   Edge Function    |     |    PostgreSQL     |
|    (Next.js)       |     |      crm           |     |    (Supabase)     |
+-------------------+     +--------------------+     +-------------------+
|                    |     |                    |     |                    |
| OpportunityBudget  | --> | budget/            | --> | opportunity_budget |
|   Section.tsx      |     |  upsert-version    |     |   _versions        |
|                    |     |  activate-version  |     |                    |
| BudgetVersion      |     |  list-versions     |     | opportunity_budget |
|   History.tsx      |     |                    |     |   _items            |
|                    |     | convert-to-job     |     |                    |
| LossFeedback       | --> |  (REFACTOR)        | --> | orc_code_sequences |
|   Dialog.tsx       |     |                    |     |                    |
|                    |     | update-opportunity |     | opportunities      |
| LossAnalytics      |     |  (REFACTOR)        |     |  (ALTER: +cols)    |
|   Dashboard.tsx    | --> |                    |     |                    |
|                    |     | get-loss-analytics |     | cost_items         |
| opportunity-budget |     |  (NOVO)            |     |  (no alter needed) |
|   -pdf.ts          |     +--------------------+     |                    |
+-------------------+                                 | job_budgets        |
        |                                             |  (usado na conv.)  |
        v                                             +-------------------+
  [jsPDF client-side]
```

### 1.2 Fluxo de Dados Principal

```
1. PE abre oportunidade stage >= proposta
2. Frontend carrega cost_categories do tenant (GET existente)
3. Frontend carrega budget versions (GET /crm/opportunities/:id/budget/versions)
4. PE edita itens do orcamento por categoria
5. PE salva -> POST /crm/opportunities/:id/budget/versions (upsert)
6. EF cria/atualiza versao + itens, gera ORC code na v1
7. PE ativa versao -> POST .../versions/:versionId/activate
8. EF ativa em transacao, atualiza estimated_value da oportunidade
9. Na conversao: convert-to-job le versao ativa, cria cost_items
```

### 1.3 Decisoes Arquiteturais (ADRs Inline)

**ADR-032: opportunity_budget_items separados de cost_items**

- **Contexto:** A spec propoe itens de orcamento simplificados (1 linha por categoria GG, sem sub-itens). cost_items tem 40+ colunas com NF, pagamento, vendor, etc.
- **Decisao:** Criar tabela separada `opportunity_budget_items` com schema enxuto (6 colunas uteis). Na conversao, os dados sao copiados para cost_items com is_category_header=true.
- **Consequencias:** Schema limpo, sem colunas nulas em massa. Trade-off: duplicacao controlada na conversao.
- **Alternativa descartada:** Reusar cost_items com job_id NULL e opportunity_id FK -- poluiria a tabela central com semantica diferente e quebraria constraints existentes (chk_cost_items_period_month_for_fixed).

**ADR-035: Versionamento imutavel de orcamentos**

- **Contexto:** O PE precisa manter historico de versoes para negociacao com cliente.
- **Decisao:** Versoes ativas se tornam `historico` (readonly) ao criar nova versao. Apenas versao `rascunho` e editavel. Ativacao e operacao atomica via transacao.
- **Consequencias:** Historico 100% preservado. Complexidade minima -- 3 estados (rascunho, ativa, historico).
- **Alternativa descartada:** Versionamento via JSONB (snapshot completo) -- perderia queryability e dificultaria reports.

**ADR-033: Codigo ORC com tabela de sequencia dedicada**

- **Contexto:** Precisamos de codigo ORC-YYYY-XXXX atomico, seguindo o padrao comprovado de job_code_sequences.
- **Decisao:** Criar `orc_code_sequences` com INSERT ON CONFLICT, chave (tenant_id, year), identico ao padrao de job_code_sequences mas com particionamento por ano.
- **Consequencias:** Zero race conditions. Sequencia reinicia por ano conforme formato ORC-YYYY-XXXX.

**ADR-034: Campos CRM faltantes corrigidos retroativamente**

- **Contexto:** DESCOBERTA CRITICA durante a analise -- os campos `loss_category`, `winner_competitor`, `winner_value`, `is_competitive_bid`, `response_deadline`, `deliverable_format`, `campaign_period`, `competitor_count`, `win_reason`, `client_budget` existem NO FRONTEND (useCrm.ts types) e NA EDGE FUNCTION (update-opportunity.ts Zod schema) mas NAO existem em nenhuma migration. O stage `pausado` tambem nao esta no CHECK constraint da tabela (a migration original so tem lead..perdido, sem pausado). Esses campos foram adicionados diretamente no banco via Supabase Dashboard (provavelmente durante o CRM Sprint 1 da Onda 1.2), sem migration correspondente.
- **Decisao:** A migration da Onda 2.4 DEVE adicionar todos esses campos via `ADD COLUMN IF NOT EXISTS` e tambem corrigir o CHECK constraint de `stage` para incluir `pausado`. Isso torna a migration a source-of-truth e permite reconstruir o schema em ambientes novos.
- **Consequencias:** Migration mais longa, mas garante reproducibilidade. IF NOT EXISTS garante idempotencia -- se os campos ja existem, o ALTER e no-op.

### 1.4 Respostas as Perguntas Abertas (PA-01 a PA-05)

| ID | Resposta arquitetural |
|----|----------------------|
| PA-01 | Os campos NAO existem nas migrations. A Onda 2.4 os adiciona via ADD COLUMN IF NOT EXISTS para garantir reproducibilidade do schema. |
| PA-02 | O editor mostra APENAS as 16 categorias do tenant carregadas de cost_categories. Sem linhas livres -- simplicidade vem primeiro. Templates reutilizaveis ficam para onda futura (item 8 do fora de escopo). |
| PA-03 | O codigo ORC aparece NO CARD do Kanban (ao lado do titulo, em badge sutil) E na pagina de detalhe. No card, so quando a oportunidade tem orc_code preenchido (stages proposta+). Impacto minimo em OpportunityCard.tsx (1 badge condicional). |
| PA-04 | A sequencia ORC reinicia por ano: ORC-2026-0001, ORC-2027-0001. O schema de orc_code_sequences usa UNIQUE(tenant_id, year), identico ao formato ORC-YYYY-XXXX. Isso evita codigos com 5+ digitos em tenants de alto volume. |
| PA-05 | Pagina nova /crm/perdas no menu lateral, com guard RBAC (admin, ceo, produtor_executivo). Motivo: e uma funcionalidade analitica dedicada, nao faz sentido sobrecarregar o dashboard CRM que tem foco em pipeline ativo. |

---

## 2. Schema de Banco de Dados

### 2.1 Tabela: opportunity_budget_versions

```sql
-- ============================================================
-- Onda 2.4: Versoes de orcamento por oportunidade
-- Cada oportunidade pode ter N versoes, apenas 1 ativa por vez
-- ============================================================

CREATE TABLE IF NOT EXISTS opportunity_budget_versions (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID          NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  opportunity_id    UUID          NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,

  -- Identificacao
  orc_code          TEXT,         -- ORC-YYYY-XXXX, gerado na v1, copiado para versoes seguintes
  version           SMALLINT      NOT NULL DEFAULT 1,
  status            TEXT          NOT NULL DEFAULT 'rascunho'
                      CHECK (status IN ('rascunho', 'ativa', 'historico')),

  -- Valores
  total_value       NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes             TEXT,

  -- Auditoria
  created_by        UUID          REFERENCES profiles(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT now(),
  deleted_at        TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT uq_opp_budget_version UNIQUE (opportunity_id, version, tenant_id),
  CONSTRAINT chk_opp_budget_version_positive CHECK (version >= 1),
  CONSTRAINT chk_opp_budget_total_non_negative CHECK (total_value >= 0)
);

COMMENT ON TABLE opportunity_budget_versions IS
  'Versoes de orcamento pre-job vinculadas a oportunidades CRM. Imutaveis apos ativacao.';
COMMENT ON COLUMN opportunity_budget_versions.orc_code IS
  'Codigo ORC-YYYY-XXXX gerado na criacao da v1. Imutavel, copiado para versoes subsequentes.';
COMMENT ON COLUMN opportunity_budget_versions.status IS
  'rascunho (editavel), ativa (frozen, alimenta estimated_value), historico (readonly).';
COMMENT ON COLUMN opportunity_budget_versions.total_value IS
  'Soma dos values dos items. Calculado pela EF ao salvar.';
```

**Indices:**

```sql
CREATE INDEX IF NOT EXISTS idx_opp_budget_versions_tenant
  ON opportunity_budget_versions(tenant_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_opp_budget_versions_opportunity
  ON opportunity_budget_versions(opportunity_id, version DESC) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_opp_budget_versions_active
  ON opportunity_budget_versions(opportunity_id)
  WHERE status = 'ativa' AND deleted_at IS NULL;

-- Busca por orc_code (para export PDF, referencia em comunicacao)
CREATE INDEX IF NOT EXISTS idx_opp_budget_versions_orc_code
  ON opportunity_budget_versions(tenant_id, orc_code)
  WHERE orc_code IS NOT NULL AND deleted_at IS NULL;
```

**RLS:**

```sql
ALTER TABLE opportunity_budget_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS opp_budget_versions_select ON opportunity_budget_versions;
CREATE POLICY opp_budget_versions_select ON opportunity_budget_versions
  FOR SELECT TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()));

DROP POLICY IF EXISTS opp_budget_versions_insert ON opportunity_budget_versions;
CREATE POLICY opp_budget_versions_insert ON opportunity_budget_versions
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = (SELECT get_tenant_id()));

DROP POLICY IF EXISTS opp_budget_versions_update ON opportunity_budget_versions;
CREATE POLICY opp_budget_versions_update ON opportunity_budget_versions
  FOR UPDATE TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()))
  WITH CHECK (tenant_id = (SELECT get_tenant_id()));

-- Sem DELETE fisico — apenas soft delete via deleted_at
```

**Triggers:**

```sql
DROP TRIGGER IF EXISTS trg_opp_budget_versions_updated_at ON opportunity_budget_versions;
CREATE TRIGGER trg_opp_budget_versions_updated_at
  BEFORE UPDATE ON opportunity_budget_versions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Audit trail (usa fn_audit_log existente da migration 20260310250000)
DROP TRIGGER IF EXISTS trg_audit_opportunity_budget_versions ON opportunity_budget_versions;
CREATE TRIGGER trg_audit_opportunity_budget_versions
  AFTER INSERT OR UPDATE OR DELETE ON opportunity_budget_versions
  FOR EACH ROW EXECUTE FUNCTION fn_audit_log();
```

---

### 2.2 Tabela: opportunity_budget_items

```sql
-- ============================================================
-- Onda 2.4: Itens (linhas de categoria) por versao de orcamento
-- Schema enxuto: 1 linha = 1 categoria GG (item_number 1-15, 99)
-- ============================================================

CREATE TABLE IF NOT EXISTS opportunity_budget_items (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID          NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  version_id        UUID          NOT NULL REFERENCES opportunity_budget_versions(id) ON DELETE CASCADE,

  -- Categoria
  item_number       SMALLINT      NOT NULL,
  display_name      TEXT          NOT NULL,  -- Snapshot do nome da categoria no momento da criacao

  -- Valores
  value             NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes             TEXT,

  -- Auditoria
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT now(),

  -- Constraints
  CONSTRAINT chk_opp_budget_items_number CHECK (item_number BETWEEN 1 AND 99),
  CONSTRAINT chk_opp_budget_items_value_non_negative CHECK (value >= 0),
  CONSTRAINT uq_opp_budget_items_version_item UNIQUE (version_id, item_number)
);

COMMENT ON TABLE opportunity_budget_items IS
  'Linhas de orcamento por versao. 1 linha = 1 categoria GG (item_number 1-15 + 99). Sem sub-itens.';
COMMENT ON COLUMN opportunity_budget_items.display_name IS
  'Snapshot do nome da categoria de cost_categories no momento da criacao. Nao muda se a categoria for renomeada.';
COMMENT ON COLUMN opportunity_budget_items.value IS
  'Valor total estimado para esta categoria. Sem detalhamento de sub-itens.';
```

**Indices:**

```sql
CREATE INDEX IF NOT EXISTS idx_opp_budget_items_version
  ON opportunity_budget_items(version_id);

CREATE INDEX IF NOT EXISTS idx_opp_budget_items_tenant
  ON opportunity_budget_items(tenant_id);
```

**RLS:**

```sql
ALTER TABLE opportunity_budget_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS opp_budget_items_select ON opportunity_budget_items;
CREATE POLICY opp_budget_items_select ON opportunity_budget_items
  FOR SELECT TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()));

DROP POLICY IF EXISTS opp_budget_items_insert ON opportunity_budget_items;
CREATE POLICY opp_budget_items_insert ON opportunity_budget_items
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = (SELECT get_tenant_id()));

DROP POLICY IF EXISTS opp_budget_items_update ON opportunity_budget_items;
CREATE POLICY opp_budget_items_update ON opportunity_budget_items
  FOR UPDATE TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()))
  WITH CHECK (tenant_id = (SELECT get_tenant_id()));

DROP POLICY IF EXISTS opp_budget_items_delete ON opportunity_budget_items;
CREATE POLICY opp_budget_items_delete ON opportunity_budget_items
  FOR DELETE TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()));
```

**Triggers:**

```sql
DROP TRIGGER IF EXISTS trg_opp_budget_items_updated_at ON opportunity_budget_items;
CREATE TRIGGER trg_opp_budget_items_updated_at
  BEFORE UPDATE ON opportunity_budget_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Audit trail
DROP TRIGGER IF EXISTS trg_audit_opportunity_budget_items ON opportunity_budget_items;
CREATE TRIGGER trg_audit_opportunity_budget_items
  AFTER INSERT OR UPDATE OR DELETE ON opportunity_budget_items
  FOR EACH ROW EXECUTE FUNCTION fn_audit_log();
```

---

### 2.3 Tabela: orc_code_sequences

```sql
-- ============================================================
-- Onda 2.4: Sequencia atomica de codigos ORC-YYYY-XXXX
-- Mesma tecnica do job_code_sequences: INSERT ON CONFLICT
-- Particionado por tenant + ano (reinicia ORC-YYYY-0001 a cada ano)
-- ============================================================

CREATE TABLE IF NOT EXISTS orc_code_sequences (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID          NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  year              SMALLINT      NOT NULL,
  last_index        INTEGER       NOT NULL DEFAULT 0,
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT now(),

  CONSTRAINT uq_orc_code_sequences_tenant_year UNIQUE (tenant_id, year),
  CONSTRAINT chk_orc_code_sequences_year CHECK (year BETWEEN 2020 AND 2099),
  CONSTRAINT chk_orc_code_sequences_index_positive CHECK (last_index >= 0)
);

COMMENT ON TABLE orc_code_sequences IS
  'Contador atomico para gerar codigos ORC-YYYY-XXXX. INSERT ON CONFLICT para evitar race conditions.';
```

**Indices:**

```sql
-- UNIQUE constraint ja cria indice em (tenant_id, year)
-- Indice adicional para busca por tenant
CREATE INDEX IF NOT EXISTS idx_orc_code_sequences_tenant
  ON orc_code_sequences(tenant_id);
```

**RLS:**

```sql
ALTER TABLE orc_code_sequences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS orc_code_sequences_select ON orc_code_sequences;
CREATE POLICY orc_code_sequences_select ON orc_code_sequences
  FOR SELECT TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()));

DROP POLICY IF EXISTS orc_code_sequences_insert ON orc_code_sequences;
CREATE POLICY orc_code_sequences_insert ON orc_code_sequences
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = (SELECT get_tenant_id()));

DROP POLICY IF EXISTS orc_code_sequences_update ON orc_code_sequences;
CREATE POLICY orc_code_sequences_update ON orc_code_sequences
  FOR UPDATE TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()));
```

**Triggers:**

```sql
-- Sem updated_at trigger — a EF faz o UPDATE do campo diretamente no INSERT ON CONFLICT
-- Sem audit trigger — tabela auxiliar de contagem, nao tem valor de auditoria
```

---

### 2.4 ALTER: opportunities (campos faltantes + novos)

```sql
-- ============================================================
-- Onda 2.4: Correcao de campos CRM faltantes + novos campos
--
-- CONTEXTO CRITICO: Os campos abaixo existem no frontend
-- (useCrm.ts) e na EF (update-opportunity.ts) mas NUNCA
-- foram adicionados via migration. Foram criados diretamente
-- no Dashboard do Supabase durante o CRM Sprint 1.
--
-- Esta migration torna o schema reproducivel e adiciona
-- os novos campos da Onda 2.4.
-- ============================================================

-- -------------------------------------------------------
-- Parte 1: Campos CRM Sprint 1 (faltantes nas migrations)
-- -------------------------------------------------------

ALTER TABLE opportunities
  ADD COLUMN IF NOT EXISTS loss_category TEXT;

ALTER TABLE opportunities
  ADD COLUMN IF NOT EXISTS winner_competitor TEXT;

ALTER TABLE opportunities
  ADD COLUMN IF NOT EXISTS winner_value NUMERIC(12,2);

ALTER TABLE opportunities
  ADD COLUMN IF NOT EXISTS is_competitive_bid BOOLEAN DEFAULT false;

ALTER TABLE opportunities
  ADD COLUMN IF NOT EXISTS response_deadline DATE;

ALTER TABLE opportunities
  ADD COLUMN IF NOT EXISTS deliverable_format TEXT;

ALTER TABLE opportunities
  ADD COLUMN IF NOT EXISTS campaign_period TEXT;

ALTER TABLE opportunities
  ADD COLUMN IF NOT EXISTS competitor_count INTEGER;

ALTER TABLE opportunities
  ADD COLUMN IF NOT EXISTS win_reason TEXT;

ALTER TABLE opportunities
  ADD COLUMN IF NOT EXISTS client_budget NUMERIC(12,2);

-- -------------------------------------------------------
-- Parte 2: Correcao do CHECK constraint de stage
-- A migration original nao inclui 'pausado' no CHECK.
-- O stage 'pausado' e usado no frontend e EF desde a Onda 1.2.
-- -------------------------------------------------------

-- Remover constraint antigo (se existir)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'opportunities_stage_check'
      AND conrelid = 'opportunities'::regclass
  ) THEN
    ALTER TABLE opportunities DROP CONSTRAINT opportunities_stage_check;
  END IF;
END $$;

-- Recriar com 'pausado'
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_opportunities_stage_v2'
      AND conrelid = 'opportunities'::regclass
  ) THEN
    ALTER TABLE opportunities ADD CONSTRAINT chk_opportunities_stage_v2
      CHECK (stage IN (
        'lead', 'qualificado', 'proposta', 'negociacao',
        'fechamento', 'ganho', 'perdido', 'pausado'
      ));
  END IF;
END $$;

-- -------------------------------------------------------
-- Parte 3: Novos campos Onda 2.4
-- -------------------------------------------------------

-- Codigo ORC copiado da budget_version para consulta rapida
ALTER TABLE opportunities
  ADD COLUMN IF NOT EXISTS orc_code TEXT;

-- CHECK constraint para loss_category expandido com 'concorrencia'
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_opportunities_loss_category'
      AND conrelid = 'opportunities'::regclass
  ) THEN
    ALTER TABLE opportunities ADD CONSTRAINT chk_opportunities_loss_category
      CHECK (loss_category IS NULL OR loss_category IN (
        'preco', 'diretor', 'prazo', 'escopo',
        'relacionamento', 'concorrencia', 'outro'
      ));
  END IF;
END $$;

COMMENT ON COLUMN opportunities.orc_code IS
  'Codigo ORC-YYYY-XXXX copiado da primeira budget_version. Consulta rapida sem join.';
COMMENT ON COLUMN opportunities.loss_category IS
  'Categoria de perda estruturada. Expandido na Onda 2.4 para incluir concorrencia.';

-- -------------------------------------------------------
-- Parte 4: Indice para dashboard de perdas
-- -------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_opportunities_loss_analytics
  ON opportunities(tenant_id, stage, actual_close_date DESC)
  WHERE stage = 'perdido' AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_opportunities_orc_code
  ON opportunities(tenant_id, orc_code)
  WHERE orc_code IS NOT NULL AND deleted_at IS NULL;
```

---

### 2.5 Validacao: cost_items.item_status

O CHECK constraint atual de `cost_items.item_status` ja inclui `'orcado'`:

```sql
-- Existente (migration 20260227100000):
CONSTRAINT chk_cost_items_item_status CHECK (
  item_status IN (
    'orcado', 'aguardando_nf', 'nf_pedida', 'nf_recebida',
    'nf_aprovada', 'pago', 'cancelado'
  )
)
```

**Resultado:** Nenhuma alteracao necessaria em cost_items. O valor `'orcado'` ja e valido.

---

### 2.6 Relacao entre tabelas (Diagrama ER textual)

```
opportunities (1) --< opportunity_budget_versions (N) --< opportunity_budget_items (N)
     |                        |
     |                        +---> orc_code_sequences (lookup atomico)
     |
     +---> jobs (1, via job_id)
              |
              +--< cost_items (N, criados na conversao)
              +--< job_budgets (N, criado na conversao)

cost_categories (lookup) ---> opportunity_budget_items.item_number + display_name
```

---

## 3. Edge Functions

### 3.1 crm/handlers/budget/list-versions.ts (NOVO)

| Campo | Valor |
|-------|-------|
| **Metodo** | GET |
| **Path** | `/crm/opportunities/:id/budget/versions` |
| **RBAC** | Todos autenticados do tenant (leitura) |

**Input (query params):**

```typescript
// Sem parametros obrigatorios — retorna todas as versoes da oportunidade
// Opcional: ?include_items=true (default: true)
const ListBudgetVersionsSchema = z.object({
  include_items: z.enum(['true', 'false']).optional().default('true'),
});
```

**Output:**

```typescript
{
  data: {
    versions: OpportunityBudgetVersion[],  // ordenadas por version DESC
    orc_code: string | null,               // codigo ORC da oportunidade
  }
}

interface OpportunityBudgetVersion {
  id: string;
  opportunity_id: string;
  orc_code: string | null;
  version: number;
  status: 'rascunho' | 'ativa' | 'historico';
  total_value: number;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  items?: OpportunityBudgetItem[];
  created_by_profile?: { id: string; full_name: string } | null;
}

interface OpportunityBudgetItem {
  id: string;
  version_id: string;
  item_number: number;
  display_name: string;
  value: number;
  notes: string | null;
}
```

**Pseudocodigo:**

```
1. Validar auth (getAuthContext)
2. Extrair opportunityId do path
3. Query opportunity_budget_versions WHERE opportunity_id = :id
   ORDER BY version DESC
4. Se include_items=true, JOIN opportunity_budget_items via version_id
5. Query orc_code da oportunidade
6. Retornar { versions, orc_code }
```

---

### 3.2 crm/handlers/budget/upsert-version.ts (NOVO)

| Campo | Valor |
|-------|-------|
| **Metodo** | POST (criar) / PATCH (editar rascunho) |
| **Path POST** | `/crm/opportunities/:id/budget/versions` |
| **Path PATCH** | `/crm/opportunities/:id/budget/versions/:versionId` |
| **RBAC** | admin, ceo, produtor_executivo, atendimento |

**Input (POST -- criar nova versao):**

```typescript
const CreateBudgetVersionSchema = z.object({
  // Se nao informado, copia da versao ativa (se existir)
  items: z.array(z.object({
    item_number: z.number().int().min(1).max(99),
    display_name: z.string().min(1).max(200),
    value: z.number().min(0),
    notes: z.string().max(2000).optional().nullable(),
  })).optional(),
  notes: z.string().max(5000).optional().nullable(),
  // Se true, copia itens da versao ativa existente (ignora items do body)
  copy_from_active: z.boolean().optional().default(false),
});
```

**Input (PATCH -- editar rascunho):**

```typescript
const UpdateBudgetVersionSchema = z.object({
  items: z.array(z.object({
    item_number: z.number().int().min(1).max(99),
    display_name: z.string().min(1).max(200),
    value: z.number().min(0),
    notes: z.string().max(2000).optional().nullable(),
  })),
  notes: z.string().max(5000).optional().nullable(),
});
```

**Output:**

```typescript
{
  data: OpportunityBudgetVersion  // com items incluidos
}
```

**Pseudocodigo (POST):**

```
1. Validar auth + RBAC
2. Buscar oportunidade, validar que existe e pertence ao tenant
3. Validar stage: se stage in ('ganho', 'perdido') -> rejeitar (readonly)
4. Buscar versoes existentes COUNT(*) para calcular next_version
5. Se e a primeira versao (count=0):
   a. Gerar ORC code atomicamente:
      INSERT INTO orc_code_sequences (tenant_id, year, last_index)
      VALUES (:tenant_id, EXTRACT(YEAR FROM now()), 1)
      ON CONFLICT (tenant_id, year)
      DO UPDATE SET last_index = orc_code_sequences.last_index + 1, updated_at = now()
      RETURNING last_index
   b. orc_code = 'ORC-' + year + '-' + lpad(last_index, 4, '0')
   c. Atualizar opportunities.orc_code
6. Se copy_from_active=true:
   a. Buscar versao com status='ativa'
   b. Copiar seus items para a nova versao
   c. Marcar versao ativa como 'historico'
7. Senao: usar items do body
8. INSERT opportunity_budget_versions (status='rascunho', version=next_version)
9. INSERT opportunity_budget_items (batch)
10. Calcular total_value = SUM(items.value)
11. UPDATE opportunity_budget_versions SET total_value
12. Retornar versao criada com items
```

**Pseudocodigo (PATCH):**

```
1. Validar auth + RBAC
2. Buscar versao, validar status='rascunho' (senao -> 422)
3. DELETE FROM opportunity_budget_items WHERE version_id = :versionId
4. INSERT opportunity_budget_items (novos items do body)
5. Calcular total_value = SUM(items.value)
6. UPDATE opportunity_budget_versions SET total_value, notes
7. Retornar versao atualizada com items
```

---

### 3.3 crm/handlers/budget/activate-version.ts (NOVO)

| Campo | Valor |
|-------|-------|
| **Metodo** | POST |
| **Path** | `/crm/opportunities/:id/budget/versions/:versionId/activate` |
| **RBAC** | admin, ceo, produtor_executivo |

**Input:** Sem body (operacao atomica)

**Output:**

```typescript
{
  data: {
    activated_version: OpportunityBudgetVersion,
    opportunity: { id: string; estimated_value: number },
  }
}
```

**Pseudocodigo:**

```
1. Validar auth + RBAC
2. Buscar versao, validar status='rascunho' (so rascunho pode ser ativado)
3. Validar que a versao tem pelo menos 1 item com value > 0
4. TRANSACAO:
   a. UPDATE opportunity_budget_versions SET status='historico'
      WHERE opportunity_id = :oppId AND status = 'ativa'
   b. UPDATE opportunity_budget_versions SET status='ativa'
      WHERE id = :versionId
   c. UPDATE opportunities SET estimated_value = versao.total_value
      WHERE id = :oppId
5. Retornar versao ativada + estimated_value atualizado
```

**Nota sobre atomicidade:** Nao temos transacao real via PostgREST. A alternativa e usar uma RPC (function) no banco. Porem, para manter consistencia com o padrao do projeto (todas as operacoes via supabase client JS), faremos 3 updates sequenciais. O risco de inconsistencia e baixo (single user editando orcamento) e mitigado pela validacao no list-versions.

**Alternativa mais segura (se necessario):**

```sql
CREATE OR REPLACE FUNCTION activate_budget_version(
  p_version_id UUID,
  p_opportunity_id UUID,
  p_tenant_id UUID
) RETURNS VOID AS $$
BEGIN
  -- Desativar versao anterior
  UPDATE opportunity_budget_versions
    SET status = 'historico', updated_at = now()
    WHERE opportunity_id = p_opportunity_id
      AND tenant_id = p_tenant_id
      AND status = 'ativa';

  -- Ativar nova versao
  UPDATE opportunity_budget_versions
    SET status = 'ativa', updated_at = now()
    WHERE id = p_version_id
      AND tenant_id = p_tenant_id;

  -- Atualizar estimated_value da oportunidade
  UPDATE opportunities
    SET estimated_value = (
      SELECT total_value FROM opportunity_budget_versions WHERE id = p_version_id
    )
    WHERE id = p_opportunity_id
      AND tenant_id = p_tenant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
-- Nota: SECURITY DEFINER porque SECURITY INVOKER nao e suportado nesta versao do Postgres.
```

**Decisao:** Implementar a RPC como funcao no banco e chama-la via `supabase.rpc('activate_budget_version', {...})`. Isso garante atomicidade real e segue o padrao de generate_job_code. A funcao sera adicionada na mesma migration.

---

### 3.4 crm/handlers/convert-to-job.ts (REFACTOR)

| Campo | Valor |
|-------|-------|
| **Metodo** | POST |
| **Path** | `/crm/opportunities/:id/convert-to-job` (existente) |
| **RBAC** | admin, ceo, produtor_executivo (sem mudanca) |

**Mudanca no Input:**

```typescript
// Schema existente EXPANDIDO com 1 campo:
const ConvertToJobSchema = z.object({
  // ... campos existentes (job_title, project_type, client_id, etc.)
  job_title: z.string().min(1).max(300),
  project_type: z.string().max(100).optional().nullable(),
  client_id: z.string().uuid().optional().nullable(),
  agency_id: z.string().uuid().optional().nullable(),
  closed_value: z.number().min(0).optional().nullable(),
  description: z.string().max(5000).optional().nullable(),
  deliverable_format: z.string().max(500).optional().nullable(),
  campaign_period: z.string().max(200).optional().nullable(),

  // NOVO: flag para transferir orcamento como cost_items
  transfer_budget: z.boolean().optional().default(false),
});
```

**Mudanca no Output:**

```typescript
{
  data: {
    opportunity: Opportunity,
    job: { id: string; title: string; code: string; status: string },
    // NOVO:
    budget_transfer: {
      success: boolean;
      cost_items_created: number;
      job_budget_id: string | null;
      error?: string;  // mensagem se falhou (job ja criado, nao reverte)
    } | null,
  }
}
```

**Pseudocodigo (apenas a parte NOVA, apos criar job e atualizar opp):**

```
// ... fluxo existente: criar job, atualizar opp como ganho ...

// NOVO: Transferir orcamento se solicitado
let budgetTransfer = null;

if (data.transfer_budget) {
  try {
    // 1. Buscar versao ativa do orcamento
    const { data: activeVersion } = await client
      .from('opportunity_budget_versions')
      .select('*, items:opportunity_budget_items(*)')
      .eq('opportunity_id', opportunityId)
      .eq('status', 'ativa')
      .is('deleted_at', null)
      .single();

    if (!activeVersion) {
      budgetTransfer = { success: false, cost_items_created: 0,
        job_budget_id: null, error: 'Nenhuma versao ativa encontrada' };
    } else {
      // 2. Criar job_budget vinculado ao job
      const { data: jobBudget } = await client
        .from('job_budgets')
        .insert({
          tenant_id: auth.tenantId,
          job_id: createdJob.id,
          client_id: opp.client_id,
          agency_id: opp.agency_id,
          title: `Orcamento importado do CRM (${activeVersion.orc_code ?? 'ORC'} v${activeVersion.version})`,
          version: 1,
          status: 'rascunho',
          total_value: activeVersion.total_value,
          notes: `Importado da oportunidade "${opp.title}" em ${new Date().toISOString().slice(0,10)}.`,
        })
        .select('id')
        .single();

      // 3. Para cada item com value > 0: criar cost_item header
      const itemsToCreate = activeVersion.items
        .filter(item => item.value > 0)
        .map(item => ({
          tenant_id: auth.tenantId,
          job_id: createdJob.id,
          item_number: item.item_number,
          sub_item_number: 0,         // header de categoria
          service_description: item.display_name,
          unit_value: item.value,
          quantity: 1,
          sort_order: item.item_number,
          item_status: 'orcado',
          import_source: `crm_opportunity_${opportunityId}`,
          notes: item.notes,
        }));

      const { data: createdItems, error: itemsError } = await client
        .from('cost_items')
        .insert(itemsToCreate)
        .select('id');

      if (itemsError) {
        console.error('[convert-to-job] erro ao criar cost_items:', itemsError);
        budgetTransfer = { success: false, cost_items_created: 0,
          job_budget_id: jobBudget?.id ?? null,
          error: 'Erro ao criar cost_items: ' + itemsError.message };
      } else {
        budgetTransfer = {
          success: true,
          cost_items_created: createdItems?.length ?? 0,
          job_budget_id: jobBudget?.id ?? null,
        };
      }
    }
  } catch (transferError) {
    console.error('[convert-to-job] erro na transferencia:', transferError);
    budgetTransfer = { success: false, cost_items_created: 0,
      job_budget_id: null, error: 'Erro inesperado na transferencia' };
  }
}

// Registrar atividade (expandida)
await client.from('opportunity_activities').insert({
  // ... atividade existente ...
  description: `Oportunidade convertida em job: "${createdJob.title}" (${createdJob.code}).${
    budgetTransfer?.success ? ` ${budgetTransfer.cost_items_created} categorias de custo transferidas.` : ''
  }`,
});

return success({ opportunity: updatedOpp, job: createdJob, budget_transfer: budgetTransfer }, 200, req);
```

**Decisao importante:** A transferencia de orcamento NAO bloqueia a conversao. Se falhar, o job e criado normalmente e o erro e informado no response. Isso segue CA-05.7 da spec.

---

### 3.5 crm/handlers/update-opportunity.ts (REFACTOR)

| Campo | Valor |
|-------|-------|
| **Metodo** | PATCH (existente) |
| **Path** | `/crm/opportunities/:id` (existente) |

**Mudancas:**

1. **Expandir loss_category enum no Zod:** Adicionar `'concorrencia'` ao z.enum
2. **Tornar loss_category E loss_reason AMBOS obrigatorios ao marcar perdido** (antes era OR)

```typescript
// ANTES (linha 56 atual):
loss_category: z.enum(['preco', 'diretor', 'prazo', 'escopo', 'relacionamento', 'outro']).optional().nullable(),

// DEPOIS:
loss_category: z.enum([
  'preco', 'diretor', 'prazo', 'escopo',
  'relacionamento', 'concorrencia', 'outro'
]).optional().nullable(),
```

```typescript
// ANTES (linha 130 atual):
if (data.stage === 'perdido' && !data.loss_category && !data.loss_reason) {

// DEPOIS:
if (data.stage === 'perdido' && (!data.loss_category || !data.loss_reason)) {
  throw new AppError(
    'VALIDATION_ERROR',
    'Informe a categoria (loss_category) E o motivo detalhado (loss_reason) ao marcar como perdido',
    400,
  );
}
```

**Impacto:** Mudanca de OR para AND. Backwards-compatible porque nenhuma oportunidade e remarcada automaticamente. Apenas novas transicoes para `perdido` serao afetadas.

---

### 3.6 crm/handlers/get-loss-analytics.ts (NOVO)

| Campo | Valor |
|-------|-------|
| **Metodo** | GET |
| **Path** | `/crm/loss-analytics` |
| **RBAC** | admin, ceo, produtor_executivo |

**Input (query params):**

```typescript
const LossAnalyticsSchema = z.object({
  period_days: z.coerce.number().int().min(7).max(730).optional().default(90),
  loss_category: z.string().optional(),
  assigned_to: z.string().uuid().optional(),
  client_id: z.string().uuid().optional(),
});
```

**Output:**

```typescript
{
  data: {
    kpis: {
      total_lost: number;
      total_lost_value: number;
      loss_rate: number;          // perdidas / (ganhas + perdidas) * 100
      top_competitor: string | null;
    };
    by_category: Array<{ category: string; count: number; total_value: number }>;
    recurring_clients: Array<{
      client_id: string;
      client_name: string;
      loss_count: number;
      total_value: number;
    }>;
    top_competitors: Array<{
      competitor: string;
      count: number;
      total_value: number;
    }>;
    opportunities: Array<{
      id: string;
      title: string;
      client_name: string | null;
      actual_close_date: string | null;
      estimated_value: number | null;
      loss_category: string | null;
      loss_reason: string | null;
      winner_competitor: string | null;
      winner_value: number | null;
      assigned_name: string | null;
    }>;
    filters_applied: {
      period_days: number;
      loss_category: string | null;
      assigned_to: string | null;
      client_id: string | null;
    };
  }
}
```

**Pseudocodigo:**

```
1. Validar auth + RBAC (admin, ceo, produtor_executivo)
2. Parse query params com LossAnalyticsSchema
3. Calcular date_from = now() - period_days

4. Query base:
   SELECT o.*, c.name as client_name, p.full_name as assigned_name
   FROM opportunities o
   LEFT JOIN clients c ON c.id = o.client_id
   LEFT JOIN profiles p ON p.id = o.assigned_to
   WHERE o.tenant_id = :tenantId
     AND o.stage = 'perdido'
     AND o.actual_close_date >= date_from
     AND o.deleted_at IS NULL
   [+ filtros opcionais: loss_category, assigned_to, client_id]

5. KPIs:
   total_lost = COUNT(*)
   total_lost_value = SUM(estimated_value)
   total_closed = COUNT(*) from opportunities WHERE stage IN ('ganho','perdido') AND date >= from
   loss_rate = total_lost / total_closed * 100

6. by_category: GROUP BY loss_category, COUNT + SUM

7. recurring_clients: GROUP BY client_id HAVING COUNT > 1, ORDER BY count DESC

8. top_competitors: WHERE winner_competitor IS NOT NULL
   GROUP BY winner_competitor, COUNT + SUM, ORDER BY count DESC LIMIT 5

9. opportunities: lista completa (paginada se necessario)

10. Retornar tudo agrupado
```

---

### 3.7 Novas Rotas no Router CRM (index.ts)

Alteracoes no `supabase/functions/crm/index.ts`:

```typescript
// Novos imports
import { handleListBudgetVersions } from './handlers/budget/list-versions.ts';
import { handleUpsertBudgetVersion } from './handlers/budget/upsert-version.ts';
import { handleActivateBudgetVersion } from './handlers/budget/activate-version.ts';
import { handleGetLossAnalytics } from './handlers/get-loss-analytics.ts';

// Adicionar 'loss-analytics' e 'budget' ao NAMED_ROUTES_SEGMENT1
const NAMED_ROUTES_SEGMENT1 = new Set([
  'dashboard', 'pipeline', 'opportunities', 'stats',
  'agency-history', 'alerts', 'director-ranking',
  'process-alerts', 'report', 'ingest-email',
  'loss-analytics',  // NOVO
]);

// Novas rotas (ANTES do bloco 'opportunities'):

// GET /crm/loss-analytics
if (segment1 === 'loss-analytics' && !segment2 && method === 'GET') {
  return await handleGetLossAnalytics(req, auth);
}

// Dentro do bloco `if (segment1 === 'opportunities' && segment2)`:
// Precisamos de segment4 para rotas de budget
const segment4 = fnIndex >= 0 && pathSegments.length > fnIndex + 4
  ? pathSegments[fnIndex + 4]
  : null;
const segment5 = fnIndex >= 0 && pathSegments.length > fnIndex + 5
  ? pathSegments[fnIndex + 5]
  : null;

// GET /crm/opportunities/:id/budget/versions
if (segment3 === 'budget' && segment4 === 'versions' && !segment5 && method === 'GET') {
  return await handleListBudgetVersions(req, auth, id);
}

// POST /crm/opportunities/:id/budget/versions
if (segment3 === 'budget' && segment4 === 'versions' && !segment5 && method === 'POST') {
  return await handleUpsertBudgetVersion(req, auth, id, null);
}

// PATCH /crm/opportunities/:id/budget/versions/:versionId
if (segment3 === 'budget' && segment4 === 'versions' && segment5 && method === 'PATCH') {
  return await handleUpsertBudgetVersion(req, auth, id, segment5);
}

// POST /crm/opportunities/:id/budget/versions/:versionId/activate
const segment6 = fnIndex >= 0 && pathSegments.length > fnIndex + 6
  ? pathSegments[fnIndex + 6]
  : null;
if (segment3 === 'budget' && segment4 === 'versions' && segment5
    && segment6 === 'activate' && method === 'POST') {
  return await handleActivateBudgetVersion(req, auth, id, segment5);
}
```

**Nota:** O router ja usa segmentos posicionais. A Onda 2.4 adiciona rotas com ate 6 segmentos (crm/opportunities/:id/budget/versions/:versionId/activate). O padrao se mantem consistente.

---

## 4. Componentes Frontend

### 4.1 OpportunityBudgetSection.tsx (NOVO)

| Campo | Valor |
|-------|-------|
| **Path** | `frontend/src/components/crm/OpportunityBudgetSection.tsx` |
| **Props** | `{ opportunity: OpportunityDetail; onBudgetSaved?: () => void }` |
| **Estado** | `useOpportunityBudgetVersions(oppId)`, `useUpsertBudgetVersion(oppId)`, `useActivateBudgetVersion(oppId)` |

**Comportamento:**

- **Stages lead/qualificado:** NAO renderiza. O estimated_value continua como campo simples no formulario de edicao existente.
- **Stages proposta/negociacao/fechamento:** Renderiza editor completo com 16 categorias.
- **Stages ganho/perdido/pausado:** Renderiza em modo readonly.

**Layout:**

```
+------------------------------------------------------------------+
| [Collapsible] ORCAMENTO   {ORC-2026-0042}   v2 (ativa)          |
|------------------------------------------------------------------|
| [Nova Versao]   [Ativar Versao]   [Exportar PDF]                 |
|                                                                  |
| Categoria              Valor (R$)           Notas                |
| 1. Despesas Producao   [  45.000,00  ]     [input text         ] |
| 2. Equipe Tecnica      [  18.000,00  ]     [input text         ] |
| ...                                                              |
| 99. BDI/Outros         [   2.000,00  ]     [input text         ] |
|------------------------------------------------------------------|
| TOTAL                         R$ 82.700,00                       |
| [Salvar Orcamento]                                               |
|                                                                  |
| Historico: v1 - 05/03 - R$ 78.000 - historico | v2 - ativa       |
+------------------------------------------------------------------+
```

**Integracao com cost_categories:**

```typescript
// Buscar categorias do tenant (hook existente ou fetch direto)
// Filtrar por production_type='all' ou tipo do projeto da oportunidade
// Mapear item_number + display_name para preencher o editor
```

**Responsivo (mobile):**

- Categorias empilham verticalmente (1 coluna)
- Inputs com touch target >= 44px
- Botoes full-width no mobile
- Total sticky no rodape

---

### 4.2 BudgetVersionHistory.tsx (NOVO)

| Campo | Valor |
|-------|-------|
| **Path** | `frontend/src/components/crm/BudgetVersionHistory.tsx` |
| **Props** | `{ versions: OpportunityBudgetVersion[]; onSelectVersion?: (v: OpportunityBudgetVersion) => void }` |

**Layout compacto:**

```
Historico de versoes:
 v3 - 09/03/2026 - R$ 85.000 - rascunho [Editar]
 v2 - 07/03/2026 - R$ 82.700 - ativa
 v1 - 05/03/2026 - R$ 78.000 - historico  [Ver] [PDF]
```

**Badges de status:**

- `rascunho` -> badge amarelo
- `ativa` -> badge verde
- `historico` -> badge cinza

---

### 4.3 LossFeedbackDialog.tsx (NOVO)

| Campo | Valor |
|-------|-------|
| **Path** | `frontend/src/components/crm/LossFeedbackDialog.tsx` |
| **Props** | `{ open: boolean; onConfirm: (feedback: LossFeedback) => void; onCancel: () => void; opportunityTitle: string }` |
| **Estado** | Local state para form fields |

```typescript
interface LossFeedback {
  loss_category: string;  // obrigatorio
  loss_reason: string;    // obrigatorio, max 1000 chars
  winner_competitor?: string;
  winner_value?: number;
}
```

**Comportamento:**

- Botao "Confirmar Perda" desabilitado ate loss_category E loss_reason preenchidos
- loss_reason tem counter de caracteres (max 1000)
- winner_value usa input numerico com mascara R$
- Integrado em 2 pontos:
  1. **CrmKanban.tsx:** Intercepta drag para coluna 'perdido'. Antes de confirmar, abre LossFeedbackDialog. So efetiva o move apos confirmacao.
  2. **OpportunityFullDetail.tsx:** Botao "Marcar como Perdida" abre o dialog.

---

### 4.4 ConvertToJobDialog.tsx (EDITAR)

| Campo | Valor |
|-------|-------|
| **Path** | `frontend/src/components/crm/ConvertToJobDialog.tsx` (existente) |

**Alteracoes:**

1. Adicionar hook `useOpportunityBudgetVersions(oppId)` para buscar versao ativa
2. Renderizar secao condicional "Orcamento a transferir" quando ha versao ativa:

```tsx
{activeVersion && (
  <div className="space-y-2 rounded-lg border p-4">
    <h4 className="font-medium">Orcamento a transferir</h4>
    <p className="text-sm text-muted-foreground">
      Versao v{activeVersion.version} -- {formatCurrency(activeVersion.total_value)}
      ({activeVersion.items?.filter(i => i.value > 0).length} categorias)
    </p>
    <label className="flex items-center gap-2">
      <Checkbox checked={transferBudget} onCheckedChange={setTransferBudget} />
      <span className="text-sm">Criar cost_items a partir deste orcamento</span>
    </label>
    {transferBudget && (
      <ul className="text-xs text-muted-foreground ml-6 space-y-1">
        {activeVersion.items?.filter(i => i.value > 0).slice(0, 4).map(item => (
          <li key={item.id}>{item.display_name} -- {formatCurrency(item.value)}</li>
        ))}
        {(activeVersion.items?.filter(i => i.value > 0).length ?? 0) > 4 && (
          <li>+ {activeVersion.items!.filter(i => i.value > 0).length - 4} outras categorias</li>
        )}
      </ul>
    )}
  </div>
)}
```

3. Adicionar `transfer_budget: boolean` ao payload do mutation
4. Exibir resultado no toast: "Job criado com X categorias de custo importadas"

---

### 4.5 OpportunityFullDetail.tsx (EDITAR)

**Alteracoes:**

1. Importar e renderizar `OpportunityBudgetSection` na coluna central, entre a secao de dados e ProposalSection
2. Condicional: so renderiza se stage e 'proposta', 'negociacao', 'fechamento', 'ganho', 'perdido' ou 'pausado'
3. Atualizar `LOSS_CATEGORY_OPTIONS` para incluir `{ value: 'concorrencia', label: 'Concorrencia' }`
4. Substituir o loss dialog inline pelo `LossFeedbackDialog` reutilizavel

---

### 4.6 CrmKanban.tsx (EDITAR)

**Alteracoes:**

1. No handler de drag-end, antes de chamar updateOpportunity:
   - Se destination.droppableId === 'perdido':
     - Setar state `pendingLossMove = { oppId, sourceStage }`
     - Abrir `LossFeedbackDialog`
     - NAO efetuar o move ainda
   - No callback onConfirm do dialog:
     - Chamar updateOpportunity com stage + loss_category + loss_reason + etc.
     - Limpar pendingLossMove
   - No callback onCancel:
     - Reverter visualmente (nao move o card)

---

### 4.7 Pagina /crm/perdas (NOVA)

| Campo | Valor |
|-------|-------|
| **Path** | `frontend/src/app/(dashboard)/crm/perdas/page.tsx` |
| **Guard RBAC** | admin, ceo, produtor_executivo |

**Componentes internos:**

- `LossAnalyticsDashboard.tsx` (componente principal)
- Usa hook `useLossAnalytics(filters)`
- Layout:
  - Topo: 4 KPI cards (total perdidas, valor, taxa, top competitor)
  - Meio: grafico de barras por loss_category (recharts ou tremor)
  - Alerta: clientes recorrentes (>= 2 perdas no periodo)
  - Tabela: lista de oportunidades perdidas com colunas sortaveis
  - Rodape: filtros (periodo, categoria, PE, cliente) + botao Exportar CSV

**Exportacao CSV:**

```typescript
// Client-side, sem chamada ao backend
function exportLossCsv(opportunities: LossOpportunity[]) {
  const headers = ['Titulo', 'Cliente', 'Data', 'Valor', 'Categoria', 'Concorrente', 'PE'];
  const rows = opportunities.map(o => [
    o.title, o.client_name, o.actual_close_date,
    o.estimated_value, o.loss_category, o.winner_competitor, o.assigned_name
  ]);
  // gerar CSV string, criar Blob, trigger download
}
```

---

### 4.8 opportunity-budget-pdf.ts (NOVO)

| Campo | Valor |
|-------|-------|
| **Path** | `frontend/src/lib/pdf/opportunity-budget-pdf.ts` |

**Reutiliza:** `pdf-core.ts` (createPdfDoc, addHeader, addFooters, drawSectionTitle, drawTableRow, formatBRL, etc.)

```typescript
export interface OpportunityBudgetPdfParams {
  opportunityTitle: string;
  clientName: string | null;
  agencyName: string | null;
  orcCode: string | null;
  version: number;
  versionDate: string;
  items: Array<{ item_number: number; display_name: string; value: number; notes: string | null }>;
  totalValue: number;
  tenantName?: string;
  proposalValidity?: string;  // ex: "30 dias"
}

export async function generateOpportunityBudgetPdf(params: OpportunityBudgetPdfParams): Promise<void> {
  const pdf = await createPdfDoc();

  const subtitle = params.tenantName
    ? `${params.orcCode ?? 'Sem codigo'} v${params.version} | ${params.tenantName}`
    : `${params.orcCode ?? 'Sem codigo'} v${params.version}`;

  let y = addHeader(pdf, 'Orcamento Comercial', subtitle);

  // --- Info do projeto ---
  y = drawSectionTitle(pdf, 'Informacoes', y);
  // Renderizar: Codigo ORC, Titulo, Cliente, Agencia, Data, Versao

  // --- Tabela de categorias ---
  y = drawSectionTitle(pdf, 'Detalhamento por Categoria', y);
  // Colunas: [Item, Categoria, Valor, Notas]
  // 1 linha por categoria com value > 0
  // Linha final: TOTAL

  // --- Validade ---
  // "Esta proposta tem validade de {X} dias a partir de {data}."

  addFooters(pdf, `Orcamento ${params.orcCode ?? ''}`);

  const fileName = [
    params.orcCode?.replace(/-/g, '_') ?? 'ORC',
    `v${params.version}`,
    params.clientName?.replace(/[^a-zA-Z0-9]/g, '') ?? '',
  ].filter(Boolean).join('_') + '.pdf';

  savePdf(pdf, fileName);
}
```

---

### 4.9 Hook: useCrmBudget.ts (NOVO)

| Campo | Valor |
|-------|-------|
| **Path** | `frontend/src/hooks/useCrmBudget.ts` |

```typescript
'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiMutate } from '@/lib/api'
import { crmKeys } from '@/lib/query-keys'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface OpportunityBudgetItem {
  id: string
  version_id: string
  item_number: number
  display_name: string
  value: number
  notes: string | null
}

export interface OpportunityBudgetVersion {
  id: string
  opportunity_id: string
  orc_code: string | null
  version: number
  status: 'rascunho' | 'ativa' | 'historico'
  total_value: number
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  items?: OpportunityBudgetItem[]
  created_by_profile?: { id: string; full_name: string } | null
}

export interface UpsertBudgetVersionPayload {
  items?: Array<{
    item_number: number
    display_name: string
    value: number
    notes?: string | null
  }>
  notes?: string | null
  copy_from_active?: boolean
}

export interface LossAnalyticsFilters {
  period_days?: number
  loss_category?: string
  assigned_to?: string
  client_id?: string
}

export interface LossAnalyticsResult {
  kpis: {
    total_lost: number
    total_lost_value: number
    loss_rate: number
    top_competitor: string | null
  }
  by_category: Array<{ category: string; count: number; total_value: number }>
  recurring_clients: Array<{
    client_id: string
    client_name: string
    loss_count: number
    total_value: number
  }>
  top_competitors: Array<{
    competitor: string
    count: number
    total_value: number
  }>
  opportunities: Array<{
    id: string
    title: string
    client_name: string | null
    actual_close_date: string | null
    estimated_value: number | null
    loss_category: string | null
    loss_reason: string | null
    winner_competitor: string | null
    winner_value: number | null
    assigned_name: string | null
  }>
  filters_applied: LossAnalyticsFilters
}

// ---------------------------------------------------------------------------
// Query Keys (extensao do crmKeys existente)
// ---------------------------------------------------------------------------
// Adicionar ao query-keys.ts:
// budgetVersions: (oppId: string) => [...crmKeys.detail(oppId), 'budget'] as const,
// lossAnalytics: (filters: LossAnalyticsFilters) => [...crmKeys.all, 'loss-analytics', filters] as const,

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

export function useOpportunityBudgetVersions(opportunityId: string) {
  return useQuery({
    queryKey: [...crmKeys.detail(opportunityId), 'budget'],
    queryFn: () =>
      apiGet<{ versions: OpportunityBudgetVersion[]; orc_code: string | null }>(
        'crm', undefined,
        `opportunities/${opportunityId}/budget/versions`
      ),
    enabled: !!opportunityId,
    staleTime: 30_000,
    select: (res) => res.data,
  })
}

export function useCreateBudgetVersion(opportunityId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: UpsertBudgetVersionPayload) =>
      apiMutate<OpportunityBudgetVersion>(
        'crm', 'POST',
        payload as unknown as Record<string, unknown>,
        `opportunities/${opportunityId}/budget/versions`
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...crmKeys.detail(opportunityId), 'budget'] })
      qc.invalidateQueries({ queryKey: crmKeys.detail(opportunityId) })
      qc.invalidateQueries({ queryKey: crmKeys.pipeline() })
    },
  })
}

export function useUpdateBudgetVersion(opportunityId: string, versionId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: UpsertBudgetVersionPayload) =>
      apiMutate<OpportunityBudgetVersion>(
        'crm', 'PATCH',
        payload as unknown as Record<string, unknown>,
        `opportunities/${opportunityId}/budget/versions/${versionId}`
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...crmKeys.detail(opportunityId), 'budget'] })
    },
  })
}

export function useActivateBudgetVersion(opportunityId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (versionId: string) =>
      apiMutate<{ activated_version: OpportunityBudgetVersion }>(
        'crm', 'POST',
        {} as Record<string, unknown>,
        `opportunities/${opportunityId}/budget/versions/${versionId}/activate`
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...crmKeys.detail(opportunityId), 'budget'] })
      qc.invalidateQueries({ queryKey: crmKeys.detail(opportunityId) })
      qc.invalidateQueries({ queryKey: crmKeys.pipeline() })
    },
  })
}

export function useLossAnalytics(filters: LossAnalyticsFilters = {}) {
  const params: Record<string, string> = {}
  if (filters.period_days) params.period_days = String(filters.period_days)
  if (filters.loss_category) params.loss_category = filters.loss_category
  if (filters.assigned_to) params.assigned_to = filters.assigned_to
  if (filters.client_id) params.client_id = filters.client_id

  return useQuery({
    queryKey: [...crmKeys.all, 'loss-analytics', filters],
    queryFn: () =>
      apiGet<LossAnalyticsResult>('crm', params, 'loss-analytics'),
    staleTime: 60_000,
    select: (res) => res.data,
  })
}
```

---

### 4.10 Atualizacao em useCrm.ts

**Tipos a expandir:**

```typescript
// Na interface Opportunity, adicionar:
orc_code: string | null;

// Na interface UpdateOpportunityPayload, expandir loss_category:
loss_category?: 'preco' | 'diretor' | 'prazo' | 'escopo' | 'relacionamento' | 'concorrencia' | 'outro' | null;

// Na interface ConvertToJobPayload, adicionar:
transfer_budget?: boolean;
```

**Query keys a adicionar em `query-keys.ts`:**

```typescript
export const crmKeys = {
  // ... existentes ...
  budgetVersions: (oppId: string) => [...crmKeys.detail(oppId), 'budget'] as const,
  lossAnalytics: (filters?: Record<string, unknown>) => [...crmKeys.all, 'loss-analytics', filters] as const,
}
```

---

### 4.11 Atualizacao no Sidebar

Adicionar link para `/crm/perdas`:

```
CRM
  Pipeline
  Dashboard
  Alertas
  Analise de Perdas  <-- NOVO
  Relatorio Mensal
```

Visivel apenas para: admin, ceo, produtor_executivo.

---

## 5. Ordem de Implementacao (Sprints)

### Sprint 1: Backend -- Migration + Edge Functions basicas

**Entregaveis:**
1. Migration idempotente com:
   - CREATE TABLE opportunity_budget_versions + RLS + indices + triggers
   - CREATE TABLE opportunity_budget_items + RLS + indices + triggers
   - CREATE TABLE orc_code_sequences + RLS
   - ALTER TABLE opportunities (campos CRM faltantes + orc_code + stage CHECK fix)
   - CREATE FUNCTION activate_budget_version (RPC atomica)
2. Edge Functions:
   - `crm/handlers/budget/list-versions.ts`
   - `crm/handlers/budget/upsert-version.ts` (POST + PATCH)
   - `crm/handlers/budget/activate-version.ts`
3. Atualizacao do router `crm/index.ts` com novas rotas
4. Deploy migration + EF

**Testes manuais:**
- Criar versao de orcamento via curl
- Ativar versao e verificar estimated_value atualizado
- Gerar ORC code e verificar unicidade
- Criar 2 versoes e verificar que apenas 1 esta ativa

**Estimativa:** 1-1.5 dia

---

### Sprint 2: Frontend -- Editor de orcamento + Loss feedback

**Entregaveis:**
1. `hooks/useCrmBudget.ts` -- todos os hooks
2. `components/crm/OpportunityBudgetSection.tsx` -- editor completo
3. `components/crm/BudgetVersionHistory.tsx` -- lista de versoes
4. `components/crm/LossFeedbackDialog.tsx` -- dialog de perda
5. Integracao em `OpportunityFullDetail.tsx`
6. Integracao em `CrmKanban.tsx` (interceptar drag para perdido)
7. Atualizacao de types em `useCrm.ts` (orc_code, concorrencia)
8. Query keys atualizados

**Testes manuais:**
- Criar orcamento em oportunidade stage proposta
- Versionar (v1 -> v2)
- Ativar versao e verificar estimated_value
- Arrastar card para perdido no Kanban -> dialog aparece
- Preencher feedback e confirmar perda
- Verificar dark mode + mobile

**Estimativa:** 1.5 dia

---

### Sprint 3: Backend -- Conversao enriquecida + Loss analytics

**Entregaveis:**
1. REFACTOR `crm/handlers/convert-to-job.ts` -- transfer_budget
2. REFACTOR `crm/handlers/update-opportunity.ts` -- loss_category AND, +concorrencia
3. NOVO `crm/handlers/get-loss-analytics.ts`
4. Rota `loss-analytics` no router
5. Deploy EF

**Testes manuais:**
- Converter oportunidade COM orcamento -> verificar cost_items criados
- Converter oportunidade SEM orcamento -> fluxo existente funciona
- Converter com transfer_budget=false -> nenhum cost_item criado
- Simular erro na transferencia -> job criado, budget_transfer.success=false
- GET /crm/loss-analytics com filtros variados

**Estimativa:** 1 dia

---

### Sprint 4: Frontend -- Dashboard perdas + PDF export + QA

**Entregaveis:**
1. `app/(dashboard)/crm/perdas/page.tsx` + layout guard
2. `components/crm/LossAnalyticsDashboard.tsx` -- KPIs, grafico, tabela, filtros, CSV
3. `lib/pdf/opportunity-budget-pdf.ts` -- gerador PDF
4. Integracao PDF no OpportunityBudgetSection (botao Exportar PDF)
5. Atualizacao ConvertToJobDialog (secao orcamento + checkbox)
6. Sidebar: link Analise de Perdas
7. ORC code badge no OpportunityCard.tsx (Kanban)
8. QA end-to-end + dark mode + mobile + build verificado

**Testes manuais:**
- Dashboard de perdas com dados reais
- Filtros funcionam corretamente
- Exportar CSV
- Gerar PDF do orcamento pre-job
- Fluxo completo: oportunidade -> orcamento -> versoes -> perda com feedback
- Fluxo completo: oportunidade -> orcamento -> conversao -> job com cost_items
- Build sem erros TypeScript

**Estimativa:** 1.5 dia

---

## 6. Trade-offs e Decisoes

### 6.1 Por que opportunity_budget_items separado de cost_items?

| Criterio | opportunity_budget_items | cost_items |
|----------|------------------------|------------|
| Colunas | 7 (enxuto) | 40+ (NF, pagamento, vendor...) |
| Semantica | Estimativa pre-job | Custo real em execucao |
| Lifecycle | Versao imutavel | Editavel continuamente |
| Vinculo | opportunity via version | job via job_id |
| Sub-itens | NAO (1 linha = 1 categoria) | SIM (sub_item_number > 0) |

**Conclusao:** Misturar semanticas em cost_items criaria complexidade desnecessaria (40 colunas nulas por linha de orcamento, constraint chk_cost_items_period_month_for_fixed quebraria, queries de financeiro precisariam filtrar dados CRM). A conversao faz o mapeamento controlado no momento certo.

### 6.2 Versionamento imutavel vs editavel

**Escolha: Imutavel apos ativacao.**

- Pro: Historico 100% preservado, audit trail natural
- Pro: Simplicidade de estados (rascunho -> ativa -> historico)
- Con: Para mudar a versao ativa, precisa criar nova versao
- Mitigacao: Botao "Nova Versao" copia automaticamente todos os itens

A alternativa (editar versao ativa in-place) perderia o historico e complicaria o audit trail. No mercado audiovisual, e comum enviar v1, v2, v3 ao cliente -- o versionamento imutavel reflete esse fluxo real.

### 6.3 Performance do dashboard de perdas

**Riscos e mitigacoes:**

- **Volume:** Uma produtora media tem ~20-50 oportunidades perdidas por ano. Mesmo com 5 anos de dados, sao ~250 registros. NAO ha risco de performance.
- **Indice:** `idx_opportunities_loss_analytics` (tenant_id, stage, actual_close_date DESC WHERE stage='perdido') cobre a query principal.
- **Agregacoes:** Feitas server-side na EF (nao no banco via VIEW) para flexibilidade de filtros.
- **Cache:** staleTime de 60s no hook -- dados de perdas nao mudam frequentemente.

### 6.4 Atomicidade da ativacao de versao

**Risco:** 3 updates sequenciais (desativar antiga, ativar nova, atualizar opp) sem transacao real.

**Mitigacao:** Implementar como RPC (`activate_budget_version`) no banco. A funcao roda em transacao implicita. Isso segue o padrao comprovado de `generate_job_code`.

### 6.5 Codigo ORC -- por que na oportunidade E na versao?

O `orc_code` vive em 2 lugares:
1. `opportunity_budget_versions.orc_code` -- source of truth, gerado na v1
2. `opportunities.orc_code` -- copia para consulta rapida (evita JOIN ao renderizar Kanban)

A duplicacao e intencional e controlada. O orc_code e imutavel apos geracao, entao nao ha risco de dessincronizacao.

---

## 7. Checklist de Validacao

### Schema

- [ ] RLS habilitada em opportunity_budget_versions
- [ ] RLS habilitada em opportunity_budget_items
- [ ] RLS habilitada em orc_code_sequences
- [ ] Policies SELECT/INSERT/UPDATE em todas as 3 tabelas novas
- [ ] Sem policy DELETE em opportunity_budget_versions (soft delete)
- [ ] Policy DELETE em opportunity_budget_items (replace strategy)
- [ ] Migration 100% idempotente (IF NOT EXISTS, DO $$ blocks)
- [ ] Triggers updated_at em versions e items
- [ ] Triggers audit_log em versions e items
- [ ] CHECK constraints em status, item_number, values
- [ ] UNIQUE constraints corretos
- [ ] Indices para queries principais
- [ ] Campos CRM faltantes adicionados com IF NOT EXISTS
- [ ] Stage CHECK corrigido para incluir 'pausado'
- [ ] RPC activate_budget_version criada

### Edge Functions

- [ ] Zod validation em todos os handlers
- [ ] RBAC enforced (ALLOWED_ROLES)
- [ ] getCorsHeaders(req) em todos os responses
- [ ] tenant_id do JWT (nunca do body)
- [ ] Response format { data, meta?, warnings?, error? }
- [ ] Erros logados com console.error
- [ ] search_path fixo em funcoes SQL
- [ ] Imports com paths corretos (../../_shared/)
- [ ] Router atualizado com segment4/5/6

### Frontend

- [ ] TypeScript types atualizados (Opportunity.orc_code, loss_category com concorrencia)
- [ ] Query keys atualizados
- [ ] Hooks useCrmBudget com invalidacao correta
- [ ] Dark mode em todos os componentes novos
- [ ] Mobile responsivo (touch 44px)
- [ ] RBAC guard na pagina /crm/perdas
- [ ] Sidebar atualizado com link Analise de Perdas
- [ ] ConvertToJobPayload com transfer_budget
- [ ] Build sem erros TypeScript (tsc --noEmit)

### Seguranca

- [ ] Sem dados sensiveis em logs
- [ ] CORS configurado corretamente
- [ ] Rate limit nao necessario (rotas autenticadas)
- [ ] Audit trail em tabelas novas (triggers fn_audit_log)

### Testes de Regressao

- [ ] Conversao SEM orcamento funciona como antes
- [ ] Conversao COM orcamento cria cost_items corretos
- [ ] Falha na transferencia NAO reverte criacao do job
- [ ] ORC codes atomicos (testar 2 requests simultaneos)
- [ ] Pipeline Kanban funciona com DnD para perdido
- [ ] Oportunidades existentes sem feedback de perda nao quebram
- [ ] Dashboard CRM existente nao afetado

---

## 8. Arquivos a criar/alterar (resumo)

### Novos (13 arquivos)

| # | Arquivo | Tipo |
|---|---------|------|
| 1 | `supabase/migrations/20260311XXXXXX_onda_2_4_orcamentos_pre_job.sql` | Migration |
| 2 | `supabase/functions/crm/handlers/budget/list-versions.ts` | EF Handler |
| 3 | `supabase/functions/crm/handlers/budget/upsert-version.ts` | EF Handler |
| 4 | `supabase/functions/crm/handlers/budget/activate-version.ts` | EF Handler |
| 5 | `supabase/functions/crm/handlers/get-loss-analytics.ts` | EF Handler |
| 6 | `frontend/src/hooks/useCrmBudget.ts` | Hook |
| 7 | `frontend/src/components/crm/OpportunityBudgetSection.tsx` | Componente |
| 8 | `frontend/src/components/crm/BudgetVersionHistory.tsx` | Componente |
| 9 | `frontend/src/components/crm/LossFeedbackDialog.tsx` | Componente |
| 10 | `frontend/src/components/crm/LossAnalyticsDashboard.tsx` | Componente |
| 11 | `frontend/src/app/(dashboard)/crm/perdas/page.tsx` | Pagina |
| 12 | `frontend/src/lib/pdf/opportunity-budget-pdf.ts` | PDF Generator |
| 13 | `docs/decisions/ADR-032-budget-items-separate-table.md` | ADR |

### Alterados (8 arquivos)

| # | Arquivo | Mudanca |
|---|---------|---------|
| 1 | `supabase/functions/crm/index.ts` | Novas rotas + imports + segment4/5/6 |
| 2 | `supabase/functions/crm/handlers/convert-to-job.ts` | transfer_budget + criacao cost_items |
| 3 | `supabase/functions/crm/handlers/update-opportunity.ts` | loss AND + concorrencia |
| 4 | `frontend/src/hooks/useCrm.ts` | Types expandidos |
| 5 | `frontend/src/lib/query-keys.ts` | budgetVersions + lossAnalytics keys |
| 6 | `frontend/src/components/crm/OpportunityFullDetail.tsx` | Integrar BudgetSection + LossDialog |
| 7 | `frontend/src/components/crm/ConvertToJobDialog.tsx` | Secao orcamento + checkbox |
| 8 | `frontend/src/components/crm/CrmKanban.tsx` | Interceptar drag para perdido |

---

## 9. Dependencias Externas

- **Nenhuma biblioteca nova necessaria.** Todos os recursos ja estao disponíveis:
  - jsPDF (ja instalado, usado em budget-pdf.ts, callsheet-pdf.ts, set-report-pdf.ts)
  - recharts ou tremor (verificar se ja esta no projeto para graficos; se nao, pode usar barras simples com divs/Tailwind)
  - shadcn/ui: Dialog, Checkbox, Select, Input, Textarea, Badge, Card, Table (todos ja existem)
  - @tanstack/react-query (ja instalado)
  - Zod via esm.sh (ja usado em todos os handlers)

---

---

## 10. Remediacao: RPCs faltantes nas migrations (F-01, F-02)

As RPCs abaixo existem no banco (criadas via Supabase Dashboard) e sao chamadas pelas Edge Functions, mas nao possuem migration correspondente. Isso compromete a reproducibilidade do schema em ambientes novos.

### 10.1 RPC: upsert_orc_code_sequence (F-01)

Chamada por: `supabase/functions/crm/handlers/budget/upsert-version.ts` (linha 236)

```sql
-- Migration retroativa necessaria
CREATE OR REPLACE FUNCTION upsert_orc_code_sequence(
  p_tenant_id UUID,
  p_year INTEGER
) RETURNS INTEGER AS $$
DECLARE
  v_last_index INTEGER;
BEGIN
  INSERT INTO orc_code_sequences (tenant_id, year, last_index)
  VALUES (p_tenant_id, p_year, 1)
  ON CONFLICT (tenant_id, year)
  DO UPDATE SET last_index = orc_code_sequences.last_index + 1,
                updated_at = now()
  RETURNING last_index INTO v_last_index;

  RETURN v_last_index;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION upsert_orc_code_sequence(UUID, INTEGER) IS
  'Gera proximo indice ORC atomicamente via INSERT ON CONFLICT. Retorna o novo last_index.';
```

### 10.2 RPC: convert_opportunity_to_job (F-02)

Chamada por: `supabase/functions/crm/handlers/convert-to-job.ts` (linha 64)

```sql
-- Migration retroativa necessaria
CREATE OR REPLACE FUNCTION convert_opportunity_to_job(
  p_opportunity_id UUID,
  p_tenant_id UUID,
  p_job_title TEXT,
  p_project_type TEXT DEFAULT NULL,
  p_client_id UUID DEFAULT NULL,
  p_agency_id UUID DEFAULT NULL,
  p_closed_value NUMERIC DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_deliverable_format TEXT DEFAULT NULL,
  p_campaign_period TEXT DEFAULT NULL,
  p_created_by UUID DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_opp RECORD;
  v_job_id UUID;
  v_job_code TEXT;
  v_next_index INTEGER;
  v_current_year INTEGER;
BEGIN
  -- Buscar oportunidade e validar
  SELECT * INTO v_opp
  FROM opportunities
  WHERE id = p_opportunity_id
    AND tenant_id = p_tenant_id
    AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Oportunidade nao encontrada';
  END IF;

  IF v_opp.stage = 'perdido' THEN
    RAISE EXCEPTION 'Nao e possivel converter oportunidade perdida';
  END IF;

  IF v_opp.job_id IS NOT NULL THEN
    RAISE EXCEPTION 'Oportunidade ja convertida em job (job_id: %)', v_opp.job_id;
  END IF;

  -- Gerar codigo do job
  v_current_year := EXTRACT(YEAR FROM now());

  INSERT INTO job_code_sequences (tenant_id, last_index)
  VALUES (p_tenant_id, 1)
  ON CONFLICT (tenant_id)
  DO UPDATE SET last_index = job_code_sequences.last_index + 1
  RETURNING last_index INTO v_next_index;

  v_job_code := lpad(v_next_index::TEXT, 3, '0');

  -- Criar job
  INSERT INTO jobs (
    tenant_id, code, title, client_id, agency_id,
    project_type, closed_value, notes,
    status, created_by
  ) VALUES (
    p_tenant_id,
    v_job_code,
    p_job_title,
    COALESCE(p_client_id, v_opp.client_id),
    COALESCE(p_agency_id, v_opp.agency_id),
    COALESCE(p_project_type, v_opp.project_type, 'outro'),
    COALESCE(p_closed_value, v_opp.estimated_value),
    COALESCE(p_description, v_opp.notes),
    'briefing_recebido',
    p_created_by
  ) RETURNING id INTO v_job_id;

  -- Atualizar oportunidade como ganho
  UPDATE opportunities
  SET stage = 'ganho',
      job_id = v_job_id,
      actual_close_date = now()::date,
      updated_at = now()
  WHERE id = p_opportunity_id
    AND tenant_id = p_tenant_id;

  RETURN jsonb_build_object(
    'job_id', v_job_id,
    'job_code', v_job_code
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION convert_opportunity_to_job IS
  'Converte oportunidade em job atomicamente: cria job + marca oportunidade como ganho + gera codigo.';
```

### 10.3 Plano de remediacao

Criar migration `20260312XXXXXX_fix_missing_rpcs.sql` com:
1. `CREATE OR REPLACE FUNCTION upsert_orc_code_sequence(...)` (idempotente)
2. `CREATE OR REPLACE FUNCTION convert_opportunity_to_job(...)` (idempotente)

**Prioridade:** ALTA. Sem essas RPCs, o schema nao pode ser reconstruido em um ambiente novo. As EFs que chamam essas RPCs falharao silenciosamente (no caso do `activate_budget_version`, o handler ja tem fallback para quando a RPC nao existe).

---

## 11. Mapa de artefatos implementados (confirmacao)

### Banco de dados

| Artefato | Migration | Status |
|----------|-----------|--------|
| `opportunity_budget_versions` | 20260311100000 | Criado |
| `opportunity_budget_items` | 20260311100000 | Criado |
| `orc_code_sequences` | 20260311100000 | Criado |
| `opportunities` ALTER (+11 cols) | 20260311100000 | Aplicado |
| `activate_budget_version` RPC | 20260311100000 | Criado |
| `upsert_orc_code_sequence` RPC | **SEM MIGRATION** | Via Dashboard |
| `convert_opportunity_to_job` RPC | **SEM MIGRATION** | Via Dashboard |

### Edge Functions (EF crm)

| Handler | Rota | Metodo | Status |
|---------|------|--------|--------|
| `budget/list-versions.ts` | `/crm/opportunities/:id/budget/versions` | GET | Implementado |
| `budget/upsert-version.ts` | `/crm/opportunities/:id/budget/versions` | POST | Implementado |
| `budget/upsert-version.ts` | `/crm/opportunities/:id/budget/versions/:vId` | PATCH | Implementado |
| `budget/activate-version.ts` | `.../versions/:vId/activate` | POST | Implementado |
| `get-loss-analytics.ts` | `/crm/loss-analytics` | GET | Implementado |
| `convert-to-job.ts` | `.../convert-to-job` | POST | Refatorado (transfer_budget) |

### Frontend

| Artefato | Path | Status |
|----------|------|--------|
| `useCrmBudget.ts` | `frontend/src/hooks/useCrmBudget.ts` | Implementado (6 hooks + tipos) |
| `OpportunityBudgetSection.tsx` | `frontend/src/components/crm/` | Implementado |
| `BudgetVersionHistory.tsx` | `frontend/src/components/crm/` | Implementado |
| `LossFeedbackDialog.tsx` | `frontend/src/components/crm/` | Implementado |
| `ConvertToJobDialog.tsx` | `frontend/src/components/crm/` | Refatorado (budget transfer) |
| `/crm/perdas/page.tsx` | `frontend/src/app/(dashboard)/crm/perdas/` | Implementado |
| `opportunity-budget-pdf.ts` | `frontend/src/lib/pdf/` | Implementado |
| `crmKeys.budgetVersions` | `frontend/src/lib/query-keys.ts` | Adicionado |
| `crmKeys.lossAnalytics` | `frontend/src/lib/query-keys.ts` | Adicionado |

---

*Documento gerado pelo Tech Lead como guia de implementacao. Revisado em 11/03/2026 apos conclusao dos 4 sprints. A spec de referencia (07-orcamentos-pre-job-spec.md) contem os wireframes textuais e criterios de aceite detalhados.*

*Findings F-01 e F-02 requerem migration retroativa para garantir reproducibilidade do schema.*
