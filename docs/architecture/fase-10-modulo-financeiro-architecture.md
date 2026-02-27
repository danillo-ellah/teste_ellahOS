# Arquitetura: Fase 10 -- Modulo Financeiro

**Data:** 27/02/2026
**Status:** PROPOSTA -- Aguardando revisao do PM e CEO
**Autor:** Tech Lead -- ELLAHOS
**Spec de referencia:** docs/specs/fase-10-modulo-financeiro-spec.md (1235 linhas, 33 US)
**Decisoes do CEO:** docs/specs/respostas-perguntas-financeiro.md (10 decisoes)
**Analise de dados reais:** docs/specs/analise-custos-reais-detalhada.md (620 linhas)
**Fase anterior:** docs/architecture/fase-9-automacoes-architecture.md (fase 9 completa)
**ADRs relacionados:** ADR-022 (cost_items vs financial_records), ADR-023 (vendors vs people), ADR-024 (vendor dedup strategy)

---

## 1. Decisoes de Arquitetura

### 1.1 ADR-022: cost_items vs financial_records -- Coexistencia com Papeis Distintos

**Status:** Proposta
**Contexto:**
A tabela `financial_records` (Fase 4) existe em producao com dados reais. Tem colunas como `type`, `category`, `description`, `amount`, `status`, `due_date`, `paid_at`, `payment_method`, `person_id`, e campos adicionados na Fase 9 (`nf_request_status`, `nf_request_sent_at`, `nf_request_gmail_id`, `supplier_email`, `supplier_cnpj`). A tabela `invoices` tambem existe com `nf_document_id`, `drive_file_id`, `issuer_cnpj`, `issuer_name`.

A spec pede uma tabela `cost_items` com ~45 colunas que modela o ciclo completo de custo (do orcamento ao pagamento), replicando a granularidade da aba CUSTOS_REAIS das planilhas GG_.

**Decisao:**
- `cost_items` e a nova tabela operacional que substitui a planilha CUSTOS_REAIS
- `financial_records` permanece como registro de alto nivel do job (faturamento, receitas, despesas simplificadas)
- `financial_records` NAO sera depreciado na Fase 10
- `cost_items` NAO tem FK para `financial_records` -- sao entidades independentes com propositos distintos
- O match de NFs (Fase 9) continua operando via `financial_records` + `nf_documents` para o fluxo existente
- A integracao com cost_items (US-FIN-016) e feita via `nf_document_id` FK em cost_items, que aponta diretamente para `nf_documents`
- O `nf-processor` (Edge Function) sera estendido para tambem atualizar cost_items quando houver match

**Consequencias:**
- Duas tabelas de "dados financeiros" coexistem -- documentar claramente o proposito de cada uma
- financial_records: receitas, faturamento, despesas de alto nivel (uso do financeiro para fluxo de caixa geral)
- cost_items: custos operacionais detalhados por job com ciclo NF completo (uso da equipe de producao)
- Na Fase 11, avaliar depreciar financial_records (P-FIN-004 da spec) unificando em cost_items

**Alternativas rejeitadas:**
- Substituir financial_records por cost_items: muito arriscado, financial_records ja tem dados em producao e e referenciado por nf_documents, invoices, payment_history, e o n8n wf-nf-processor/wf-nf-request
- Adicionar colunas em financial_records: financial_records tem ~15 colunas, cost_items precisa de ~45. Poluiria a tabela existente e quebraria o modelo mental (receita vs custo detalhado)

---

### 1.2 ADR-023: vendors vs people -- Tabelas Independentes com Vinculo Opcional

**Status:** Proposta
**Contexto:**
A tabela `people` (Fase 1) existe com 127 registros estimados. Tem `full_name`, `email`, `phone`, `cpf`, `bank_info` (JSONB), `is_internal`, `default_role`, `default_rate`. E usada para membros da equipe (job_team), contatos, elenco (docuseal_submissions).

A spec pede uma tabela `vendors` focada em fornecedores com dedup automatico, dados bancarios estruturados (tabela separada `bank_accounts`), e normalizacao de nomes.

**Decisao:**
- `vendors` e tabela independente de `people`
- `vendors.people_id` e FK opcional para vincular fornecedores que tambem sao membros da equipe (freelancers)
- Sem sincronizacao automatica entre vendors e people -- o vinculo e somente para navegacao
- Dados bancarios em `bank_accounts` (tabela separada) para vendors -- NAO em JSONB como `people.bank_info`
- `people.bank_info` permanece como esta (nao migrar para bank_accounts na Fase 10)

**Consequencias:**
- Freelancers que prestam servico (cost_item) E participam da equipe (job_team) existem em ambas as tabelas
- A busca por "quem e esse fornecedor?" pode precisar olhar vendors e people
- Na migracao, verificar se vendor importado ja existe como person e vincular

**Alternativas rejeitadas:**
- Expandir people para incluir funcionalidades de vendor: people ja e usada por job_team, docuseal_submissions, contacts. Adicionar dedup, normalizacao, bank_accounts aumentaria complexidade em contextos nao financeiros
- Tabela unica com flags (is_vendor, is_team_member): PostgreSQL nao ganha performance com flags; code paths ficariam entrelaados

---

### 1.3 ADR-024: Estrategia de Dedup de Vendors

**Status:** Proposta
**Contexto:**
A EQUIPE.csv tem 210 registros com 98 variacoes de banco para ~15 bancos reais e CPF/CNPJ/PIX misturados numa unica coluna. O CEO definiu dedup automatica com normalizacao.

**Decisao:**
- Coluna `normalized_name` GENERATED ALWAYS usando funcao `normalize_vendor_name()`
- Funcao PostgreSQL: `lower(trim(unaccent(regexp_replace(full_name, '[^a-zA-Z0-9\s\-]', '', 'g'))))`
- Extensao `unaccent` habilitada no schema (CREATE EXTENSION IF NOT EXISTS unaccent)
- Dedup na insercao: Edge Function verifica `normalized_name` antes de INSERT
- Dedup na migracao: script Python com threshold 0.8 via normalized_name + email + cpf/cnpj
- Merge de duplicatas: endpoint POST /vendors/:id/merge reatribui cost_items e bank_accounts

**Consequencias:**
- Requer extensao `unaccent` habilitada (ja disponivel no Supabase PostgreSQL)
- A funcao `normalize_vendor_name()` e chamada pelo GENERATED ALWAYS -- sem overhead de trigger
- A dedup e uma sugestao, nao um bloqueio. O financeiro pode criar vendor "duplicado" com justificativa

---

### 1.4 Estrategia de Migracao de Dados Existentes

**Decisao:**
- Fase 10 NAO migra dados de financial_records para cost_items automaticamente
- financial_records continua operando normalmente para o fluxo de NF existente
- A migracao das planilhas GG_ (US-FIN-030 a US-FIN-033) popula diretamente cost_items e vendors
- Ordem de migracao: (1) EQUIPE.csv -> vendors + bank_accounts, (2) CUSTOS_REAIS -> cost_items por job
- Scripts Python com modo dry-run e idempotencia via campo `import_source`
- Rollback: DELETE FROM cost_items WHERE import_source LIKE 'migration_%'

---

### 1.5 Edge Functions: Novas Funcoes (Nao Estender Existentes)

**Decisao:**
- Criar 5 novas Edge Functions: `vendors`, `cost-items`, `payment-manager`, `financial-dashboard`, `cash-advances`
- `budget-manager` integrado ao `cost-items` como endpoints adicionais (evitar proliferacao)
- O `nf-processor` existente sera estendido com endpoints de integracao com cost_items
- O `migration-importer` NAO sera Edge Function -- sera script Python local (US-FIN-030)

**Justificativa:**
- Seguir o principio de ADR-001 (1 funcao por dominio, handlers em pasta separada)
- cost-items e a funcao mais critica -- merece seu proprio namespace
- budget-manager tem poucos endpoints e opera sobre os mesmos dados de cost_items -- melhor integrar
- Scripts de migracao rodam uma vez e precisam de acesso a CSVs locais -- nao faz sentido como Edge Function

---

## 2. Diagrama de Posicao na Arquitetura

```
[Frontend Next.js]
     |
     | fetch() + Bearer token
     v
[Edge Functions]                              [n8n Self-hosted]
     |-- cost-items (NOVO)                        |-- wf-nf-processor (EXISTENTE)
     |-- vendors (NOVO)                           |-- wf-nf-request (EXISTENTE)
     |-- payment-manager (NOVO)                   |-- wf-docuseal-contracts (EXISTENTE)
     |-- financial-dashboard (NOVO)               |
     |-- cash-advances (NOVO)                     |
     |-- nf-processor (EXISTENTE, expandir)       |
     |                                            |
     v                                            v
[Supabase PostgreSQL]                         [APIs Externas]
     |-- cost_categories (NOVO)                   |-- Google Drive (comprovantes)
     |-- vendors (NOVO)                           |-- Gmail API (pedido NF)
     |-- bank_accounts (NOVO)                     |
     |-- cost_items (NOVO)                        |
     |-- cash_advances (NOVO)                     |
     |-- expense_receipts (NOVO)                  |
     |-- vw_calendario_pagamentos (NOVO)          |
     |-- vw_resumo_custos_job (NOVO)              |
     |-- financial_records (EXISTENTE)             |
     |-- nf_documents (EXISTENTE)                 |
     |-- invoices (EXISTENTE)                     |
     |-- jobs (EXISTENTE, +budget_mode)           |
```

Total de tabelas apos Fase 10: **42** (36 atuais + 6 novas) + 2 views

---

## 3. Schema de Banco de Dados

### 3.1 Funcoes Auxiliares

```sql
-- Extensao necessaria para dedup
CREATE EXTENSION IF NOT EXISTS unaccent SCHEMA public;

-- Funcao de normalizacao para vendors
CREATE OR REPLACE FUNCTION normalize_vendor_name(name TEXT)
RETURNS TEXT
LANGUAGE sql IMMUTABLE STRICT
SET search_path = public
AS $$
  SELECT lower(trim(unaccent(regexp_replace(name, '[^a-zA-Z0-9\s\-]', '', 'g'))))
$$;

COMMENT ON FUNCTION normalize_vendor_name(TEXT) IS
  'Normaliza nome de vendor para dedup: lowercase, trim, unaccent, remove especiais.';
```

---

### 3.2 Tabela: cost_categories

Templates de categorias de custo por tipo de producao.

```sql
CREATE TABLE IF NOT EXISTS cost_categories (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  item_number       SMALLINT    NOT NULL,
  display_name      TEXT        NOT NULL,
  production_type   TEXT        NOT NULL DEFAULT 'all',
  description       TEXT,
  is_active         BOOLEAN     NOT NULL DEFAULT true,
  sort_order        SMALLINT    NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at        TIMESTAMPTZ,

  CONSTRAINT chk_cost_categories_production_type CHECK (
    production_type IN (
      'filme_publicitario', 'branded_content', 'videoclipe',
      'documentario', 'conteudo_digital', 'all'
    )
  ),
  CONSTRAINT chk_cost_categories_item_number CHECK (
    item_number BETWEEN 1 AND 99
  ),
  CONSTRAINT uq_cost_categories_tenant_type_item UNIQUE (
    tenant_id, production_type, item_number
  ) -- Mesmo item_number nao pode repetir no mesmo template/tenant
);

COMMENT ON TABLE cost_categories IS 'Templates de categorias de custo. Item 1-15 e 99 por tipo de producao.';

-- Indices
CREATE INDEX IF NOT EXISTS idx_cost_categories_tenant
  ON cost_categories(tenant_id, production_type) WHERE deleted_at IS NULL;

-- RLS
ALTER TABLE cost_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cost_categories_select ON cost_categories;
CREATE POLICY cost_categories_select ON cost_categories
  FOR SELECT TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()));

DROP POLICY IF EXISTS cost_categories_insert ON cost_categories;
CREATE POLICY cost_categories_insert ON cost_categories
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = (SELECT get_tenant_id()));

DROP POLICY IF EXISTS cost_categories_update ON cost_categories;
CREATE POLICY cost_categories_update ON cost_categories
  FOR UPDATE TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()));

-- Trigger updated_at
DROP TRIGGER IF EXISTS trg_cost_categories_updated_at ON cost_categories;
CREATE TRIGGER trg_cost_categories_updated_at
  BEFORE UPDATE ON cost_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

**Seed inicial (production_type = 'all'):**

| item_number | display_name |
|-------------|-------------|
| 1 | Desembolsos de Verbas a Vista |
| 2 | Estudio |
| 3 | Locacao |
| 4 | Direcao de Arte / Figurinista / Efeitos |
| 5 | Direcao de Cena / DF / Som |
| 6 | Producao |
| 7 | Veiculos |
| 8 | Passagem, Hospedagem e Alimentacao |
| 9 | Camera, Luz, Maquinaria, Movimento, Gerador e Infra |
| 10 | Producao de Casting |
| 11 | Objetos de Cena |
| 12 | Performance e Footage |
| 13 | Pos Producao / Trilha / Roteirista / Condecine |
| 14 | Administrativo Legal / Financeiro |
| 15 | Monstro |
| 99 | Mao de Obra Interna |

---

### 3.3 Tabela: vendors

Cadastro centralizado de fornecedores com dedup automatico.

```sql
CREATE TABLE IF NOT EXISTS vendors (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  full_name         TEXT        NOT NULL,
  normalized_name   TEXT        GENERATED ALWAYS AS (normalize_vendor_name(full_name)) STORED,
  entity_type       TEXT        NOT NULL DEFAULT 'pf',
  cpf               TEXT,
  cnpj              TEXT,
  razao_social      TEXT,
  email             TEXT,
  phone             TEXT,
  notes             TEXT,
  is_active         BOOLEAN     NOT NULL DEFAULT true,
  people_id         UUID        REFERENCES people(id) ON DELETE SET NULL,
  import_source     TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at        TIMESTAMPTZ,

  CONSTRAINT chk_vendors_entity_type CHECK (
    entity_type IN ('pf', 'pj')
  ),
  CONSTRAINT chk_vendors_cpf_format CHECK (
    cpf IS NULL OR (cpf ~ '^\d{11}$')
  ),
  CONSTRAINT chk_vendors_cnpj_format CHECK (
    cnpj IS NULL OR (cnpj ~ '^\d{14}$')
  )
);

COMMENT ON TABLE vendors IS 'Fornecedores da produtora. Dedup via normalized_name. Substitui EQUIPE.csv.';
COMMENT ON COLUMN vendors.normalized_name IS 'Nome normalizado (lowercase, sem acentos, sem especiais). GENERATED.';
COMMENT ON COLUMN vendors.people_id IS 'Vinculo opcional com tabela people (freelancer que tambem e equipe).';
COMMENT ON COLUMN vendors.import_source IS 'Identifica registros importados via migracao. Ex: migration_equipe_20260301.';

-- Indices
CREATE INDEX IF NOT EXISTS idx_vendors_tenant
  ON vendors(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_vendors_normalized_name
  ON vendors(tenant_id, normalized_name) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_vendors_email
  ON vendors(tenant_id, email) WHERE email IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_vendors_cpf
  ON vendors(tenant_id, cpf) WHERE cpf IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_vendors_cnpj
  ON vendors(tenant_id, cnpj) WHERE cnpj IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_vendors_people_id
  ON vendors(people_id) WHERE people_id IS NOT NULL;

-- RLS
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS vendors_select ON vendors;
CREATE POLICY vendors_select ON vendors
  FOR SELECT TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()));

DROP POLICY IF EXISTS vendors_insert ON vendors;
CREATE POLICY vendors_insert ON vendors
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = (SELECT get_tenant_id()));

DROP POLICY IF EXISTS vendors_update ON vendors;
CREATE POLICY vendors_update ON vendors
  FOR UPDATE TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()));

-- Trigger updated_at
DROP TRIGGER IF EXISTS trg_vendors_updated_at ON vendors;
CREATE TRIGGER trg_vendors_updated_at
  BEFORE UPDATE ON vendors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

---

### 3.4 Tabela: bank_accounts

Dados bancarios estruturados vinculados a vendors.

```sql
CREATE TABLE IF NOT EXISTS bank_accounts (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  vendor_id         UUID        NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  account_holder    TEXT,
  bank_name         TEXT,
  bank_code         TEXT,
  agency            TEXT,
  account_number    TEXT,
  account_type      TEXT,
  pix_key           TEXT,
  pix_key_type      TEXT,
  is_primary        BOOLEAN     NOT NULL DEFAULT false,
  is_active         BOOLEAN     NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at        TIMESTAMPTZ,

  CONSTRAINT chk_bank_accounts_account_type CHECK (
    account_type IS NULL OR account_type IN ('corrente', 'poupanca')
  ),
  CONSTRAINT chk_bank_accounts_pix_key_type CHECK (
    pix_key_type IS NULL OR pix_key_type IN ('cpf', 'cnpj', 'email', 'telefone', 'aleatoria')
  )
);

-- UNIQUE parcial: um vendor so pode ter 1 conta primaria ativa
CREATE UNIQUE INDEX IF NOT EXISTS uq_bank_accounts_primary
  ON bank_accounts(vendor_id)
  WHERE is_primary = true AND deleted_at IS NULL;

COMMENT ON TABLE bank_accounts IS 'Dados bancarios de vendors. Multiplas contas por vendor, uma primaria.';
COMMENT ON COLUMN bank_accounts.bank_code IS 'Codigo ISPB ou compensacao. Ex: 260=Nubank, 1=BB, 341=Itau.';
COMMENT ON COLUMN bank_accounts.pix_key_type IS 'Tipo da chave PIX: cpf, cnpj, email, telefone, aleatoria.';

-- Indices
CREATE INDEX IF NOT EXISTS idx_bank_accounts_vendor
  ON bank_accounts(vendor_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_bank_accounts_tenant
  ON bank_accounts(tenant_id) WHERE deleted_at IS NULL;

-- RLS
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS bank_accounts_select ON bank_accounts;
CREATE POLICY bank_accounts_select ON bank_accounts
  FOR SELECT TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()));

DROP POLICY IF EXISTS bank_accounts_insert ON bank_accounts;
CREATE POLICY bank_accounts_insert ON bank_accounts
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = (SELECT get_tenant_id()));

DROP POLICY IF EXISTS bank_accounts_update ON bank_accounts;
CREATE POLICY bank_accounts_update ON bank_accounts
  FOR UPDATE TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()));

-- Trigger updated_at
DROP TRIGGER IF EXISTS trg_bank_accounts_updated_at ON bank_accounts;
CREATE TRIGGER trg_bank_accounts_updated_at
  BEFORE UPDATE ON bank_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

---

### 3.5 Tabela: cost_items (TABELA CENTRAL)

Itens de custo detalhados por job. Replica a granularidade da aba CUSTOS_REAIS.

```sql
CREATE TABLE IF NOT EXISTS cost_items (
  -- Identificacao e hierarquia
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID          NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  job_id                UUID          REFERENCES jobs(id) ON DELETE CASCADE,
  item_number           SMALLINT      NOT NULL,
  sub_item_number       SMALLINT      NOT NULL DEFAULT 0,
  is_category_header    BOOLEAN       GENERATED ALWAYS AS (sub_item_number = 0) STORED,
  service_description   TEXT          NOT NULL,
  sort_order            SMALLINT      NOT NULL DEFAULT 0,
  period_month          DATE,
  import_source         TEXT,

  -- Valores
  unit_value            NUMERIC(12,2),
  quantity              SMALLINT      NOT NULL DEFAULT 1,
  total_value           NUMERIC(12,2) GENERATED ALWAYS AS (
    COALESCE(unit_value, 0) * COALESCE(quantity, 1)
  ) STORED,
  overtime_hours        NUMERIC(5,2),
  overtime_rate         NUMERIC(12,2),
  overtime_value        NUMERIC(12,2) GENERATED ALWAYS AS (
    COALESCE(overtime_hours, 0) * COALESCE(overtime_rate, 0)
  ) STORED,
  total_with_overtime   NUMERIC(12,2) GENERATED ALWAYS AS (
    (COALESCE(unit_value, 0) * COALESCE(quantity, 1))
    + (COALESCE(overtime_hours, 0) * COALESCE(overtime_rate, 0))
  ) STORED,
  actual_paid_value     NUMERIC(12,2),
  notes                 TEXT,

  -- Condicao de pagamento
  payment_condition     TEXT,
  payment_due_date      DATE,
  payment_method        TEXT,

  -- Vendor snapshot
  vendor_id             UUID          REFERENCES vendors(id) ON DELETE SET NULL,
  vendor_name_snapshot  TEXT,
  vendor_email_snapshot TEXT,
  vendor_pix_snapshot   TEXT,
  vendor_bank_snapshot  TEXT,

  -- Status do item
  item_status           TEXT          NOT NULL DEFAULT 'orcado',
  suggested_status      TEXT,
  status_note           TEXT,

  -- Ciclo de NF
  nf_request_status     TEXT          NOT NULL DEFAULT 'pendente',
  nf_requested_at       TIMESTAMPTZ,
  nf_requested_by       UUID          REFERENCES profiles(id) ON DELETE SET NULL,
  nf_document_id        UUID          REFERENCES nf_documents(id) ON DELETE SET NULL,
  nf_drive_url          TEXT,
  nf_filename           TEXT,
  nf_extracted_value    NUMERIC(12,2),
  nf_validation_ok      BOOLEAN,

  -- Pagamento
  payment_status        TEXT          NOT NULL DEFAULT 'pendente',
  payment_date          DATE,
  payment_proof_url     TEXT,
  payment_proof_filename TEXT,

  -- Auditoria
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ   NOT NULL DEFAULT now(),
  deleted_at            TIMESTAMPTZ,
  created_by            UUID          REFERENCES profiles(id) ON DELETE SET NULL,

  -- Constraints
  CONSTRAINT chk_cost_items_item_number CHECK (
    item_number BETWEEN 1 AND 99
  ),
  CONSTRAINT chk_cost_items_payment_condition CHECK (
    payment_condition IS NULL OR payment_condition IN (
      'a_vista', 'cnf_30', 'cnf_40', 'cnf_45', 'cnf_60', 'cnf_90', 'snf_30'
    )
  ),
  CONSTRAINT chk_cost_items_payment_method CHECK (
    payment_method IS NULL OR payment_method IN (
      'pix', 'ted', 'dinheiro', 'debito', 'credito', 'outro'
    )
  ),
  CONSTRAINT chk_cost_items_item_status CHECK (
    item_status IN (
      'orcado', 'aguardando_nf', 'nf_pedida', 'nf_recebida',
      'nf_aprovada', 'pago', 'cancelado'
    )
  ),
  CONSTRAINT chk_cost_items_nf_request_status CHECK (
    nf_request_status IN (
      'nao_aplicavel', 'pendente', 'pedido', 'recebido', 'rejeitado', 'aprovado'
    )
  ),
  CONSTRAINT chk_cost_items_payment_status CHECK (
    payment_status IN ('pendente', 'pago', 'cancelado')
  ),
  CONSTRAINT chk_cost_items_period_month_for_fixed CHECK (
    (job_id IS NOT NULL) OR (job_id IS NULL AND period_month IS NOT NULL)
  ),
  CONSTRAINT chk_cost_items_quantity_positive CHECK (
    quantity >= 0
  )
);

COMMENT ON TABLE cost_items IS 'Itens de custo detalhados por job. Substitui aba CUSTOS_REAIS das planilhas GG_.';
COMMENT ON COLUMN cost_items.is_category_header IS 'true quando sub_item_number=0 (linha de titulo da categoria). GENERATED.';
COMMENT ON COLUMN cost_items.total_value IS 'unit_value * quantity. GENERATED.';
COMMENT ON COLUMN cost_items.total_with_overtime IS 'total_value + overtime_value. GENERATED.';
COMMENT ON COLUMN cost_items.suggested_status IS 'Status sugerido pelo trigger com base nos dados do item.';
COMMENT ON COLUMN cost_items.vendor_name_snapshot IS 'Snapshot do nome do vendor no momento da criacao. Nao muda se vendor for editado.';
COMMENT ON COLUMN cost_items.period_month IS 'Para custos fixos (job_id IS NULL): primeiro dia do mes de referencia.';
COMMENT ON COLUMN cost_items.import_source IS 'Identifica registros importados. Ex: migration_gg038_20260301.';

-- Indices
CREATE INDEX IF NOT EXISTS idx_cost_items_tenant_job
  ON cost_items(tenant_id, job_id, item_number, sub_item_number)
  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_cost_items_payment_due
  ON cost_items(tenant_id, payment_due_date)
  WHERE payment_status = 'pendente' AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_cost_items_vendor
  ON cost_items(tenant_id, vendor_id)
  WHERE vendor_id IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_cost_items_job_status
  ON cost_items(job_id, item_status)
  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_cost_items_nf_document
  ON cost_items(nf_document_id)
  WHERE nf_document_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cost_items_period_month
  ON cost_items(tenant_id, period_month)
  WHERE job_id IS NULL AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_cost_items_import_source
  ON cost_items(tenant_id, import_source)
  WHERE import_source IS NOT NULL;

-- RLS
ALTER TABLE cost_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cost_items_select ON cost_items;
CREATE POLICY cost_items_select ON cost_items
  FOR SELECT TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()));

DROP POLICY IF EXISTS cost_items_insert ON cost_items;
CREATE POLICY cost_items_insert ON cost_items
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = (SELECT get_tenant_id()));

DROP POLICY IF EXISTS cost_items_update ON cost_items;
CREATE POLICY cost_items_update ON cost_items
  FOR UPDATE TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()));

-- Trigger updated_at
DROP TRIGGER IF EXISTS trg_cost_items_updated_at ON cost_items;
CREATE TRIGGER trg_cost_items_updated_at
  BEFORE UPDATE ON cost_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

**Trigger: suggested_status**

```sql
CREATE OR REPLACE FUNCTION fn_cost_items_suggested_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Regras de sugestao de status, em ordem de prioridade (mais especifico primeiro)
  IF NEW.payment_status = 'pago' THEN
    NEW.suggested_status := 'pago';
  ELSIF NEW.payment_status = 'cancelado' OR NEW.item_status = 'cancelado' THEN
    NEW.suggested_status := 'cancelado';
  ELSIF NEW.nf_validation_ok = true THEN
    NEW.suggested_status := 'nf_aprovada';
  ELSIF NEW.nf_request_status = 'recebido' THEN
    NEW.suggested_status := 'nf_recebida';
  ELSIF NEW.nf_request_status = 'pedido' THEN
    NEW.suggested_status := 'nf_pedida';
  ELSIF NEW.payment_condition IS NOT NULL AND NEW.payment_condition != 'a_vista' THEN
    NEW.suggested_status := 'aguardando_nf';
  ELSIF NEW.payment_condition = 'a_vista' THEN
    NEW.suggested_status := 'aguardando_nf'; -- a_vista pode pular NF mas precisa de registro
  ELSE
    NEW.suggested_status := 'orcado';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cost_items_suggested_status ON cost_items;
CREATE TRIGGER trg_cost_items_suggested_status
  BEFORE INSERT OR UPDATE ON cost_items
  FOR EACH ROW EXECUTE FUNCTION fn_cost_items_suggested_status();
```

**Nota sobre GENERATED columns:** PostgreSQL nao permite que uma GENERATED column referencie outra GENERATED column na mesma tabela. Por isso `total_with_overtime` repete a expressao completa em vez de referenciar `total_value + overtime_value`.

---

### 3.6 Tabela: cash_advances

Adiantamentos de verba a vista entregues ao produtor.

```sql
CREATE TABLE IF NOT EXISTS cash_advances (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID          NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  job_id                UUID          NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  cost_item_id          UUID          REFERENCES cost_items(id) ON DELETE SET NULL,
  recipient_vendor_id   UUID          REFERENCES vendors(id) ON DELETE SET NULL,
  recipient_name        TEXT          NOT NULL,
  description           TEXT          NOT NULL,
  amount_authorized     NUMERIC(12,2) NOT NULL,
  amount_deposited      NUMERIC(12,2) NOT NULL DEFAULT 0,
  amount_documented     NUMERIC(12,2) NOT NULL DEFAULT 0,
  balance               NUMERIC(12,2) GENERATED ALWAYS AS (
    amount_deposited - amount_documented
  ) STORED,
  status                TEXT          NOT NULL DEFAULT 'aberta',
  drive_folder_url      TEXT,
  notes                 TEXT,
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ   NOT NULL DEFAULT now(),
  deleted_at            TIMESTAMPTZ,
  created_by            UUID          REFERENCES profiles(id) ON DELETE SET NULL,

  CONSTRAINT chk_cash_advances_status CHECK (
    status IN ('aberta', 'encerrada', 'aprovada')
  ),
  CONSTRAINT chk_cash_advances_amount_positive CHECK (
    amount_authorized > 0
  ),
  CONSTRAINT chk_cash_advances_deposited_non_negative CHECK (
    amount_deposited >= 0
  )
);

COMMENT ON TABLE cash_advances IS 'Adiantamentos de verba a vista. Substitui aba PRODUCAO das planilhas GG_.';
COMMENT ON COLUMN cash_advances.balance IS 'Saldo: deposited - documented. GENERATED. Positivo = a comprovar.';
COMMENT ON COLUMN cash_advances.cost_item_id IS 'Vinculo com item Item=1 (Desembolsos a Vista) de cost_items.';

-- Indices
CREATE INDEX IF NOT EXISTS idx_cash_advances_tenant_job
  ON cash_advances(tenant_id, job_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_cash_advances_recipient
  ON cash_advances(recipient_vendor_id) WHERE recipient_vendor_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cash_advances_status
  ON cash_advances(tenant_id, status) WHERE deleted_at IS NULL;

-- RLS
ALTER TABLE cash_advances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cash_advances_select ON cash_advances;
CREATE POLICY cash_advances_select ON cash_advances
  FOR SELECT TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()));

DROP POLICY IF EXISTS cash_advances_insert ON cash_advances;
CREATE POLICY cash_advances_insert ON cash_advances
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = (SELECT get_tenant_id()));

DROP POLICY IF EXISTS cash_advances_update ON cash_advances;
CREATE POLICY cash_advances_update ON cash_advances
  FOR UPDATE TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()));

-- Trigger updated_at
DROP TRIGGER IF EXISTS trg_cash_advances_updated_at ON cash_advances;
CREATE TRIGGER trg_cash_advances_updated_at
  BEFORE UPDATE ON cash_advances
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

---

### 3.7 Tabela: expense_receipts

Prestacao de contas de verbas a vista.

```sql
CREATE TABLE IF NOT EXISTS expense_receipts (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID          NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  cash_advance_id   UUID          NOT NULL REFERENCES cash_advances(id) ON DELETE CASCADE,
  job_id            UUID          NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  amount            NUMERIC(12,2) NOT NULL,
  description       TEXT          NOT NULL,
  receipt_type      TEXT          NOT NULL DEFAULT 'nf',
  document_url      TEXT,
  document_filename TEXT,
  expense_date      DATE,
  status            TEXT          NOT NULL DEFAULT 'pendente',
  reviewed_by       UUID          REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at       TIMESTAMPTZ,
  review_note       TEXT,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT now(),
  deleted_at        TIMESTAMPTZ,
  created_by        UUID          REFERENCES profiles(id) ON DELETE SET NULL,

  CONSTRAINT chk_expense_receipts_receipt_type CHECK (
    receipt_type IN ('nf', 'recibo', 'ticket', 'outros')
  ),
  CONSTRAINT chk_expense_receipts_status CHECK (
    status IN ('pendente', 'aprovado', 'rejeitado')
  ),
  CONSTRAINT chk_expense_receipts_amount_positive CHECK (
    amount > 0
  )
);

COMMENT ON TABLE expense_receipts IS 'Comprovantes de gasto de verba a vista. Cada receipt justifica parte do adiantamento.';

-- Indices
CREATE INDEX IF NOT EXISTS idx_expense_receipts_cash_advance
  ON expense_receipts(cash_advance_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_expense_receipts_tenant_job
  ON expense_receipts(tenant_id, job_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_expense_receipts_status
  ON expense_receipts(tenant_id, status) WHERE deleted_at IS NULL;

-- RLS
ALTER TABLE expense_receipts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS expense_receipts_select ON expense_receipts;
CREATE POLICY expense_receipts_select ON expense_receipts
  FOR SELECT TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()));

DROP POLICY IF EXISTS expense_receipts_insert ON expense_receipts;
CREATE POLICY expense_receipts_insert ON expense_receipts
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = (SELECT get_tenant_id()));

DROP POLICY IF EXISTS expense_receipts_update ON expense_receipts;
CREATE POLICY expense_receipts_update ON expense_receipts
  FOR UPDATE TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()));

-- Trigger updated_at
DROP TRIGGER IF EXISTS trg_expense_receipts_updated_at ON expense_receipts;
CREATE TRIGGER trg_expense_receipts_updated_at
  BEFORE UPDATE ON expense_receipts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

**Trigger: recalcular amount_documented em cash_advances**

```sql
CREATE OR REPLACE FUNCTION fn_recalc_cash_advance_documented()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_total NUMERIC(12,2);
BEGIN
  -- Recalcular soma de receipts aprovados
  SELECT COALESCE(SUM(amount), 0)
    INTO v_total
    FROM expense_receipts
   WHERE cash_advance_id = COALESCE(NEW.cash_advance_id, OLD.cash_advance_id)
     AND status = 'aprovado'
     AND deleted_at IS NULL;

  UPDATE cash_advances
     SET amount_documented = v_total,
         updated_at = now()
   WHERE id = COALESCE(NEW.cash_advance_id, OLD.cash_advance_id);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_expense_receipts_recalc ON expense_receipts;
CREATE TRIGGER trg_expense_receipts_recalc
  AFTER INSERT OR UPDATE OF status, amount, deleted_at OR DELETE
  ON expense_receipts
  FOR EACH ROW EXECUTE FUNCTION fn_recalc_cash_advance_documented();
```

---

### 3.8 ALTER TABLE: jobs (budget_mode)

```sql
ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS budget_mode TEXT DEFAULT 'bottom_up';

ALTER TABLE jobs
  ADD CONSTRAINT chk_jobs_budget_mode CHECK (
    budget_mode IS NULL OR budget_mode IN ('bottom_up', 'top_down')
  );

COMMENT ON COLUMN jobs.budget_mode IS 'Modo de orcamento: bottom_up (soma itens) ou top_down (teto fixo).';
```

---

### 3.9 View: vw_calendario_pagamentos

```sql
CREATE OR REPLACE VIEW vw_calendario_pagamentos
WITH (security_invoker = true)
AS
SELECT
  ci.tenant_id,
  ci.payment_due_date,
  ci.job_id,
  j.code AS job_code,
  j.title AS job_title,
  COUNT(*) FILTER (WHERE ci.payment_status != 'cancelado') AS items_count,
  COUNT(*) FILTER (WHERE ci.payment_status = 'pago') AS items_paid,
  COUNT(*) FILTER (WHERE ci.payment_status = 'pendente') AS items_pending,
  COALESCE(SUM(ci.total_with_overtime) FILTER (WHERE ci.payment_status != 'cancelado'), 0) AS total_budgeted,
  COALESCE(SUM(COALESCE(ci.actual_paid_value, ci.total_with_overtime)) FILTER (WHERE ci.payment_status = 'pago'), 0) AS total_paid,
  COALESCE(SUM(ci.total_with_overtime) FILTER (WHERE ci.payment_status = 'pendente'), 0) AS total_pending,
  (ci.payment_due_date < CURRENT_DATE AND COUNT(*) FILTER (WHERE ci.payment_status = 'pendente') > 0) AS is_overdue
FROM cost_items ci
JOIN jobs j ON j.id = ci.job_id
WHERE ci.deleted_at IS NULL
  AND ci.is_category_header = false
  AND ci.payment_due_date IS NOT NULL
GROUP BY ci.tenant_id, ci.payment_due_date, ci.job_id, j.code, j.title
ORDER BY ci.payment_due_date ASC;

COMMENT ON VIEW vw_calendario_pagamentos IS 'Calendario de pagamentos agrupado por data e job. SECURITY INVOKER = RLS das tabelas base se aplica.';
```

---

### 3.10 View: vw_resumo_custos_job

```sql
CREATE OR REPLACE VIEW vw_resumo_custos_job
WITH (security_invoker = true)
AS
WITH by_category AS (
  SELECT
    ci.tenant_id,
    ci.job_id,
    ci.item_number,
    -- Buscar nome da categoria no cost_items (header line) ou fallback
    MAX(CASE WHEN ci.is_category_header THEN ci.service_description END) AS item_name,
    COUNT(*) FILTER (WHERE NOT ci.is_category_header) AS items_total,
    COUNT(*) FILTER (WHERE NOT ci.is_category_header AND ci.payment_status = 'pago') AS items_paid,
    COUNT(*) FILTER (WHERE NOT ci.is_category_header AND ci.nf_request_status IN ('pendente', 'pedido')) AS items_pending_nf,
    COUNT(*) FILTER (WHERE NOT ci.is_category_header AND ci.nf_validation_ok = true) AS items_with_nf_approved,
    COALESCE(SUM(ci.total_with_overtime) FILTER (WHERE NOT ci.is_category_header), 0) AS total_budgeted,
    COALESCE(SUM(COALESCE(ci.actual_paid_value, ci.total_with_overtime)) FILTER (WHERE NOT ci.is_category_header AND ci.payment_status = 'pago'), 0) AS total_paid
  FROM cost_items ci
  WHERE ci.deleted_at IS NULL
    AND ci.job_id IS NOT NULL
  GROUP BY ci.tenant_id, ci.job_id, ci.item_number
)
SELECT
  tenant_id,
  job_id,
  item_number,
  item_name,
  items_total,
  items_paid,
  items_pending_nf,
  items_with_nf_approved,
  total_budgeted,
  total_paid,
  CASE WHEN total_budgeted > 0
    THEN ROUND((total_paid / total_budgeted) * 100, 2)
    ELSE 0
  END AS pct_paid
FROM by_category

UNION ALL

-- Linha de sumario geral por job (item_number = NULL)
SELECT
  tenant_id,
  job_id,
  NULL::SMALLINT AS item_number,
  'TOTAL' AS item_name,
  SUM(items_total)::BIGINT AS items_total,
  SUM(items_paid)::BIGINT AS items_paid,
  SUM(items_pending_nf)::BIGINT AS items_pending_nf,
  SUM(items_with_nf_approved)::BIGINT AS items_with_nf_approved,
  SUM(total_budgeted) AS total_budgeted,
  SUM(total_paid) AS total_paid,
  CASE WHEN SUM(total_budgeted) > 0
    THEN ROUND((SUM(total_paid) / SUM(total_budgeted)) * 100, 2)
    ELSE 0
  END AS pct_paid
FROM by_category
GROUP BY tenant_id, job_id

ORDER BY job_id, item_number NULLS LAST;

COMMENT ON VIEW vw_resumo_custos_job IS 'Resumo de custos por categoria e job. Inclui linha TOTAL com item_number=NULL. SECURITY INVOKER.';
```

---

### 3.11 Resumo do Schema

| Tabela/View | Tipo | Colunas | RLS | Trigger | Generated |
|-------------|------|---------|-----|---------|-----------|
| cost_categories | Tabela nova | 11 | Sim | updated_at | - |
| vendors | Tabela nova | 17 | Sim | updated_at | normalized_name |
| bank_accounts | Tabela nova | 15 | Sim | updated_at | - |
| cost_items | Tabela nova | 43 | Sim | updated_at, suggested_status | is_category_header, total_value, overtime_value, total_with_overtime |
| cash_advances | Tabela nova | 16 | Sim | updated_at | balance |
| expense_receipts | Tabela nova | 16 | Sim | updated_at, recalc_documented | - |
| jobs | ALTER | +1 (budget_mode) | Existente | Existente | - |
| vw_calendario_pagamentos | View | 12 | SECURITY INVOKER | - | - |
| vw_resumo_custos_job | View | 11 | SECURITY INVOKER | - | - |

**Total: 6 tabelas novas + 1 ALTER + 2 views + 3 funcoes**

---

## 4. Edge Functions

### 4.1 `vendors` -- CRUD com Dedup Automatico

**Slug:** `vendors`
**Arquivo:** `supabase/functions/vendors/index.ts`
**Handlers:** `supabase/functions/vendors/handlers/`

| Metodo | Rota | Handler | Descricao | Auth |
|--------|------|---------|-----------|------|
| POST | /vendors | create.ts | Criar vendor com dedup | JWT (financeiro, admin, ceo) |
| GET | /vendors | list.ts | Listar vendors paginado | JWT |
| GET | /vendors/:id | get.ts | Detalhe com bank_accounts | JWT |
| PATCH | /vendors/:id | update.ts | Atualizar vendor | JWT (financeiro, admin, ceo) |
| DELETE | /vendors/:id | delete.ts | Soft delete | JWT (financeiro, admin, ceo) |
| POST | /vendors/:id/merge | merge.ts | Mesclar duplicatas | JWT (admin, ceo) |
| GET | /vendors/suggest | suggest.ts | Autocomplete (5 resultados) | JWT |
| GET | /vendors/banks | banks.ts | Lista padronizada de bancos | JWT |
| POST | /vendors/:id/bank-accounts | bank-accounts-create.ts | Adicionar conta bancaria | JWT (financeiro, admin, ceo) |
| PATCH | /vendors/:id/bank-accounts/:bid | bank-accounts-update.ts | Editar conta bancaria | JWT (financeiro, admin, ceo) |
| DELETE | /vendors/:id/bank-accounts/:bid | bank-accounts-delete.ts | Remover conta bancaria | JWT (financeiro, admin, ceo) |

**Input Schema (POST /vendors):**

```typescript
const CreateVendorSchema = z.object({
  full_name: z.string().min(2).max(200),
  entity_type: z.enum(['pf', 'pj']).default('pf'),
  cpf: z.string().regex(/^\d{11}$/).optional(),
  cnpj: z.string().regex(/^\d{14}$/).optional(),
  razao_social: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  notes: z.string().optional(),
  people_id: z.string().uuid().optional(),
  bank_account: z.object({  // Opcional: criar conta junto com o vendor
    bank_name: z.string().optional(),
    bank_code: z.string().optional(),
    agency: z.string().optional(),
    account_number: z.string().optional(),
    account_type: z.enum(['corrente', 'poupanca']).optional(),
    pix_key: z.string().optional(),
    pix_key_type: z.enum(['cpf', 'cnpj', 'email', 'telefone', 'aleatoria']).optional(),
  }).optional(),
});
```

**Output (POST /vendors -- 201 Created):**

```typescript
{
  data: {
    id: string;
    full_name: string;
    normalized_name: string;
    entity_type: 'pf' | 'pj';
    // ... todos os campos
    bank_accounts: BankAccount[];
  }
}
```

**Output (POST /vendors -- 409 Conflict):**

```typescript
{
  error: 'DUPLICATE_VENDOR',
  message: 'Vendor com nome similar ja existe',
  data: {
    existing_vendor: {
      id: string;
      full_name: string;
      email: string;
      similarity_score: number;
    }
  }
}
```

**Logica de dedup (create.ts):**

1. Normalizar `full_name` com `normalize_vendor_name()`
2. Buscar vendors no tenant com `normalized_name` igual
3. Se match exato: retornar 409 com dados do vendor existente
4. Se CPF ou CNPJ fornecido: buscar match exato por documento
5. Se match por documento: retornar 409
6. Se email fornecido: buscar match exato por email
7. Se match por email: retornar 409 (com `similarity_score: 0.85`)
8. Se nenhum match: INSERT e retornar 201

**Lista padronizada de bancos (GET /vendors/banks):**

```typescript
const BRAZILIAN_BANKS = [
  { code: '1',   name: 'Banco do Brasil' },
  { code: '33',  name: 'Santander' },
  { code: '77',  name: 'Banco Inter' },
  { code: '104', name: 'Caixa Economica Federal' },
  { code: '237', name: 'Bradesco' },
  { code: '260', name: 'Nubank' },
  { code: '336', name: 'Banco C6' },
  { code: '341', name: 'Itau Unibanco' },
  { code: '422', name: 'Safra' },
  { code: '756', name: 'Sicoob' },
  { code: '748', name: 'Sicredi' },
  { code: '212', name: 'Banco Original' },
  { code: '655', name: 'Neon / Votorantim' },
  { code: '380', name: 'PicPay' },
  { code: '290', name: 'PagSeguro' },
  { code: '403', name: 'Cora' },
] as const;
```

---

### 4.2 `cost-items` -- CRUD Completo + Orcamento

**Slug:** `cost-items`
**Arquivo:** `supabase/functions/cost-items/index.ts`
**Handlers:** `supabase/functions/cost-items/handlers/`

| Metodo | Rota | Handler | Descricao | Auth |
|--------|------|---------|-----------|------|
| POST | /cost-items | create.ts | Criar item de custo | JWT (financeiro, pe, admin, ceo) |
| GET | /cost-items | list.ts | Listar hierarquico por job | JWT |
| GET | /cost-items/:id | get.ts | Detalhe com vendor e NF | JWT |
| PATCH | /cost-items/:id | update.ts | Atualizar item | JWT (financeiro, pe, admin, ceo) |
| DELETE | /cost-items/:id | delete.ts | Soft delete | JWT (financeiro, pe, admin, ceo) |
| POST | /cost-items/batch | batch.ts | Criar ate 200 itens atomico | JWT (financeiro, pe, admin, ceo) |
| POST | /cost-items/:id/copy-to-job | copy.ts | Copiar item para outro job | JWT (financeiro, pe, admin, ceo) |
| GET | /cost-items/budget-summary/:jobId | budget-summary.ts | Resumo orcamento do job | JWT |
| PATCH | /cost-items/budget-mode/:jobId | budget-mode.ts | Definir modo de orcamento | JWT (pe, admin, ceo) |
| POST | /cost-items/apply-template/:jobId | apply-template.ts | Criar itens de template | JWT (pe, admin, ceo) |
| GET | /cost-items/reference-jobs/:jobId | reference-jobs.ts | Jobs similares para referencia | JWT (pe, admin, ceo) |
| GET | /cost-items/export/:jobId | export.ts | Exportar CSV | JWT (financeiro, pe, admin, ceo) |

**Input Schema (POST /cost-items):**

```typescript
const CreateCostItemSchema = z.object({
  job_id: z.string().uuid().nullable(),
  item_number: z.number().int().min(1).max(99),
  sub_item_number: z.number().int().min(0).default(0),
  service_description: z.string().min(1).max(500),
  sort_order: z.number().int().default(0),
  period_month: z.string().date().optional(), // Para custos fixos
  unit_value: z.number().min(0).optional(),
  quantity: z.number().int().min(0).default(1),
  overtime_hours: z.number().min(0).optional(),
  overtime_rate: z.number().min(0).optional(),
  payment_condition: z.enum([
    'a_vista', 'cnf_30', 'cnf_40', 'cnf_45', 'cnf_60', 'cnf_90', 'snf_30'
  ]).optional(),
  payment_due_date: z.string().date().optional(),
  payment_method: z.enum([
    'pix', 'ted', 'dinheiro', 'debito', 'credito', 'outro'
  ]).optional(),
  vendor_id: z.string().uuid().optional(),
  notes: z.string().optional(),
});
```

**Output (GET /cost-items?job_id=xxx):**

```typescript
{
  data: CostItemWithVendor[],  // Ordenado por item_number, sub_item_number, sort_order
  meta: {
    total: number;
    by_status: Record<string, number>;
    total_budgeted: number;
    total_paid: number;
  }
}
```

**Logica de vendor snapshot (create.ts / update.ts):**

Ao informar `vendor_id`, a Edge Function busca o vendor e copia para os campos snapshot:

```typescript
if (body.vendor_id) {
  const { data: vendor } = await serviceClient
    .from('vendors')
    .select('full_name, email, bank_accounts!inner(pix_key, bank_name)')
    .eq('id', body.vendor_id)
    .single();

  if (vendor) {
    insertData.vendor_name_snapshot = vendor.full_name;
    insertData.vendor_email_snapshot = vendor.email;
    const primaryBank = vendor.bank_accounts?.[0]; // is_primary
    insertData.vendor_pix_snapshot = primaryBank?.pix_key ?? null;
    insertData.vendor_bank_snapshot = primaryBank?.bank_name ?? null;
  }
}
```

**Logica de apply-template (apply-template.ts):**

1. Buscar `project_type` do job
2. Buscar categorias de `cost_categories` WHERE `production_type IN (project_type, 'all')`
3. Para cada categoria: criar cost_item com `sub_item_number = 0` (header)
4. Retornar itens criados

**Logica de reference-jobs (reference-jobs.ts):**

```sql
SELECT j.id, j.code, j.title, j.project_type,
       j.closed_value, j.production_cost, j.margin_percentage,
       COUNT(ci.id) AS cost_items_count,
       SUM(ci.total_with_overtime) AS total_costs
  FROM jobs j
  LEFT JOIN cost_items ci ON ci.job_id = j.id AND ci.deleted_at IS NULL
 WHERE j.tenant_id = :tenantId
   AND j.project_type = (SELECT project_type FROM jobs WHERE id = :jobId)
   AND j.id != :jobId
   AND j.deleted_at IS NULL
   AND j.status NOT IN ('briefing_recebido', 'cancelado')
 GROUP BY j.id
 ORDER BY j.created_at DESC
 LIMIT 10;
```

---

### 4.3 `payment-manager` -- Registrar e Desfazer Pagamentos

**Slug:** `payment-manager`
**Arquivo:** `supabase/functions/payment-manager/index.ts`
**Handlers:** `supabase/functions/payment-manager/handlers/`

| Metodo | Rota | Handler | Descricao | Auth |
|--------|------|---------|-----------|------|
| POST | /payment-manager/pay | pay.ts | Pagar N itens em lote | JWT (financeiro, admin, ceo) |
| POST | /payment-manager/undo-pay/:id | undo-pay.ts | Desfazer pagamento (48h) | JWT (financeiro, admin, ceo) |
| GET | /payment-manager/batch-preview | batch-preview.ts | Preview sem efetivar | JWT (financeiro, admin, ceo) |

**Input Schema (POST /payment-manager/pay):**

```typescript
const PaySchema = z.object({
  cost_item_ids: z.array(z.string().uuid()).min(1).max(100),
  payment_date: z.string().date(), // YYYY-MM-DD
  payment_method: z.enum(['pix', 'ted', 'dinheiro', 'debito', 'credito', 'outro']),
  payment_proof_url: z.string().url().optional(),
  actual_paid_value: z.number().min(0).optional(), // Se difere do estimado
});
```

**Logica (pay.ts):**

1. Validar que todos os cost_items pertencem ao tenant
2. Validar que nenhum cost_item tem `payment_status = 'pago'`
3. Para cada item, em transacao:
   a. Gerar `payment_proof_filename` canonico (RN-004)
   b. UPDATE cost_items SET `payment_status = 'pago'`, `payment_date`, `payment_method`, `payment_proof_url`, `payment_proof_filename`, `actual_paid_value`, `item_status = 'pago'`
   c. INSERT em `payment_history` com dados do pagamento
   d. INSERT em `job_history` com `event_type = 'payment_registered'`
4. Retornar resumo: itens pagos, total, filename gerado

**Logica (undo-pay.ts):**

1. Buscar cost_item
2. Validar que `payment_status = 'pago'`
3. Validar que `payment_date >= now() - interval '48 hours'` (ou role = admin)
4. UPDATE cost_items SET `payment_status = 'pendente'`, limpar campos de pagamento
5. INSERT em `job_history` com `event_type = 'payment_undone'`

---

### 4.4 `financial-dashboard` -- Dashboard Financeiro

**Slug:** `financial-dashboard`
**Arquivo:** `supabase/functions/financial-dashboard/index.ts`
**Handlers:** `supabase/functions/financial-dashboard/handlers/`

| Metodo | Rota | Handler | Descricao | Auth |
|--------|------|---------|-----------|------|
| GET | /financial-dashboard/job/:jobId | job-dashboard.ts | Dashboard do job | JWT |
| GET | /financial-dashboard/tenant | tenant-dashboard.ts | Consolidado do tenant | JWT (financeiro, admin, ceo) |

**Output (GET /financial-dashboard/job/:jobId):**

```typescript
{
  data: {
    summary: {
      budget_value: number;      // jobs.closed_value (OC/faturamento)
      total_estimated: number;    // soma total_with_overtime
      total_paid: number;         // soma actual_paid_value ou total_with_overtime WHERE pago
      balance: number;            // estimated - paid
      margin_gross: number;       // budget_value - total_estimated
      margin_pct: number;         // margin_gross / budget_value * 100
      budget_mode: string;
    };
    by_category: Array<{         // De vw_resumo_custos_job
      item_number: number;
      item_name: string;
      total_budgeted: number;
      total_paid: number;
      items_total: number;
      items_paid: number;
      pct_paid: number;
    }>;
    payment_calendar: Array<{    // De vw_calendario_pagamentos, proximos 30d
      payment_due_date: string;
      total_pending: number;
      items_pending: number;
      is_overdue: boolean;
    }>;
    overdue_items: CostItem[];   // payment_due_date < today AND payment_status = pendente
    pending_nf: CostItem[];      // nf_request_status IN (pendente, pedido)
    alerts: Array<{
      type: 'overdue' | 'nf_stale' | 'value_divergence' | 'negative_balance';
      message: string;
      cost_item_id?: string;
      cash_advance_id?: string;
    }>;
  }
}
```

**Cache:** Usar `report_snapshots` existente (tabela Fase 7) com cache de 5 minutos. Chave: `(tenant_id, job_id, 'financial_dashboard')`. Invalidar ao PATCH/POST em cost_items do job.

---

### 4.5 `cash-advances` -- Gestao de Verbas a Vista

**Slug:** `cash-advances`
**Arquivo:** `supabase/functions/cash-advances/index.ts`
**Handlers:** `supabase/functions/cash-advances/handlers/`

| Metodo | Rota | Handler | Descricao | Auth |
|--------|------|---------|-----------|------|
| POST | /cash-advances | create.ts | Criar adiantamento | JWT (financeiro, admin, ceo) |
| GET | /cash-advances | list.ts | Listar por job | JWT |
| GET | /cash-advances/:id | get.ts | Detalhe com receipts | JWT |
| POST | /cash-advances/:id/deposit | deposit.ts | Registrar deposito | JWT (financeiro, admin, ceo) |
| POST | /cash-advances/:id/receipts | receipt-create.ts | Submeter comprovante | JWT (produtor, financeiro, admin, ceo) |
| PATCH | /cash-advances/:id/receipts/:rid | receipt-review.ts | Aprovar/rejeitar | JWT (financeiro, admin, ceo) |
| POST | /cash-advances/:id/close | close.ts | Encerrar verba | JWT (financeiro, admin, ceo) |

**Input Schema (POST /cash-advances):**

```typescript
const CreateCashAdvanceSchema = z.object({
  job_id: z.string().uuid(),
  cost_item_id: z.string().uuid().optional(),
  recipient_vendor_id: z.string().uuid().optional(),
  recipient_name: z.string().min(1),
  description: z.string().min(1),
  amount_authorized: z.number().positive(),
});
```

**Input Schema (POST /cash-advances/:id/receipts):**

```typescript
const CreateReceiptSchema = z.object({
  amount: z.number().positive(),
  description: z.string().min(1),
  receipt_type: z.enum(['nf', 'recibo', 'ticket', 'outros']).default('nf'),
  document_url: z.string().url().optional(),
  document_filename: z.string().optional(),
  expense_date: z.string().date().optional(),
});
```

**Logica de notificacoes:**

- Ao submeter receipt: notificacao in_app para financeiro do job (via _shared/notification-helper.ts)
- Ao aprovar/rejeitar: notificacao in_app para produtor que submeteu

---

### 4.6 Expansao do `nf-processor` (Integracao US-FIN-016)

Adicionar ao nf-processor existente a capacidade de sincronizar com cost_items.

**Novos endpoints:**

| Metodo | Rota | Handler | Descricao | Auth |
|--------|------|---------|-----------|------|
| POST | /nf-processor/link-cost-item | link-cost-item.ts | Vincular NF a cost_item | JWT (financeiro, admin, ceo) |

**Modificacoes nos handlers existentes:**

1. **validate.ts**: Ao confirmar NF, alem de atualizar `financial_records` e `invoices`, tambem buscar `cost_items` com `vendor_email_snapshot = sender_email` no mesmo job e atualizar `nf_document_id`, `nf_request_status = 'recebido'`, `nf_drive_url`, `nf_extracted_value`, `nf_validation_ok`

2. **request-send.ts**: Ao enviar pedido de NF, alem de atualizar `financial_records`, tambem buscar cost_item correspondente e atualizar `nf_request_status = 'pedido'`, `nf_requested_at = now()`, `nf_requested_by`

3. **ingest.ts**: Ao receber NF, alem do match com `financial_records`, fazer match secundario com `cost_items` por `vendor_email_snapshot = sender_email`

**Nota:** A busca em cost_items e SECUNDARIA ao fluxo existente. Se nao encontrar cost_item correspondente, o fluxo continua normalmente via financial_records. Isso garante retrocompatibilidade.

---

### 4.7 Resumo de Edge Functions

| Edge Function | Endpoints | Handlers | Status |
|---------------|-----------|----------|--------|
| vendors | 11 | 11 | NOVA |
| cost-items | 12 | 12 | NOVA |
| payment-manager | 3 | 3 | NOVA |
| financial-dashboard | 2 | 2 | NOVA |
| cash-advances | 7 | 7 | NOVA |
| nf-processor | +1 | +1 modificado, +3 estendidos | EXPANDIR |

**Total: 5 novas + 1 expandida = 36 endpoints novos**

---

## 5. Componentes Frontend

### 5.1 Mapa de Rotas

| Rota | Componente Pagina | US | Prioridade |
|------|-------------------|-----|------------|
| /jobs/[id]/financeiro/custos | JobCostsPage | US-FIN-020, 021 | P0 |
| /jobs/[id]/financeiro/dashboard | JobFinancialDashboardPage | US-FIN-025 | P0 |
| /jobs/[id]/financeiro/orcamento | JobBudgetPage | US-FIN-026 | P1 |
| /jobs/[id]/financeiro/verbas | JobCashAdvancesPage | US-FIN-027 | P1 |
| /financeiro/calendario | PaymentCalendarPage | US-FIN-022 | P0 |
| /financeiro/vendors | VendorsPage | US-FIN-023 | P0 |
| /admin/financeiro/categorias | CostCategoriesAdminPage | US-FIN-028 | P2 |

### 5.2 Componentes por Pagina

#### 5.2.1 /jobs/[id]/financeiro/custos (P0)

```
JobCostsPage
  |-- JobFinancialTabs (custos | dashboard | orcamento | verbas)
  |-- CostItemsToolbar
  |     |-- FilterBar (por categoria, status_pagamento, status_nf, vencimento, vendor)
  |     |-- SearchInput (busca por service_description ou vendor_name)
  |     |-- ButtonGroup (Adicionar Item, Exportar CSV)
  |-- CostItemsTable
  |     |-- CostCategoryGroup (expansivel por item_number)
  |     |     |-- CostCategoryHeader (linha de titulo, somatorio da categoria)
  |     |     |-- CostItemRow (por sub_item)
  |     |           |-- StatusBadge (cor por item_status)
  |     |           |-- StatusMismatchAlert (se suggested != actual)
  |     |           |-- VendorCell (nome + tooltip com email/pix)
  |     |           |-- QuickActions (editar, pagar, pedir NF, ver comprovante)
  |     |-- CostItemsTotals (rodape com totalizadores gerais)
  |-- CostItemDrawer (Sheet lateral para criar/editar)
  |     |-- VendorAutocomplete (GET /vendors/suggest)
  |     |-- CategorySelect (dropdown de cost_categories)
  |     |-- PaymentConditionSelect
  |     |-- StatusOverrideSection (se diverge de suggested)
  |-- PaymentDialog (Modal de pagamento, reutilizado no calendario)
```

**Queries:**
- `GET /cost-items?job_id=xxx` -- lista principal
- `GET /vendors/suggest?q=xxx` -- autocomplete no drawer
- `POST /cost-items` -- criar item
- `PATCH /cost-items/:id` -- editar item
- `DELETE /cost-items/:id` -- soft delete
- `POST /payment-manager/pay` -- pagar

**Estado:** Server state via React Query (SWR). Cache key: `['cost-items', jobId, filters]`. Invalidar ao mutar. Realtime subscription em `cost_items` para atualizacoes de NF vindas do n8n.

#### 5.2.2 /financeiro/calendario (P0)

```
PaymentCalendarPage
  |-- CalendarToolbar
  |     |-- PeriodSelector (7d, 15d, 30d, 60d, custom)
  |     |-- JobFilter (todos os jobs ou um especifico)
  |     |-- CalendarTotals (total a vencer 30d, total vencido, total pago mes)
  |-- PaymentDateGroups
  |     |-- PaymentDateCard (por data de vencimento)
  |     |     |-- DateHeader (data, jobs, total, indicador overdue)
  |     |     |-- CostItemMiniList (itens do grupo, com checkbox)
  |     |           |-- VendorChip, AmountBadge, NfStatusBadge
  |-- BatchPayButton (aparece quando itens selecionados)
  |-- PaymentDialog (reutilizado da tela de custos)
```

**Queries:**
- `GET /financial-dashboard/tenant` -- totalizadores
- `GET /cost-items?payment_due_date_gte=X&payment_due_date_lte=Y&payment_status=pendente` -- itens do periodo
- `POST /payment-manager/batch-preview` -- preview do lote
- `POST /payment-manager/pay` -- efetivar pagamento

#### 5.2.3 /financeiro/vendors (P0)

```
VendorsPage
  |-- VendorsToolbar
  |     |-- SearchInput (busca por nome, email, CPF, CNPJ)
  |     |-- NewVendorButton
  |-- VendorsTable (paginada)
  |     |-- VendorRow
  |     |     |-- DuplicateBadge (se normalized_name tem match)
  |     |     |-- StatusBadge (ativo/inativo)
  |-- VendorCreateDialog
  |     |-- ConflictPanel (aparece se 409 retornado)
  |     |     |-- SideBySideComparison (existente vs novo)
  |     |     |-- ActionButtons (Usar existente, Atualizar, Criar mesmo assim)
  |-- VendorDetailDrawer
  |     |-- VendorInfoSection
  |     |-- BankAccountsList
  |     |     |-- BankAccountCard (editar, definir primaria, remover)
  |     |     |-- AddBankAccountForm (dropdown de banco padronizado)
  |     |-- LinkedCostItemsList (cost_items com este vendor)
  |-- MergeVendorsDialog
  |     |-- VendorSelector (selecionar 2+ vendors)
  |     |-- MergePreview (o que sera reatribuido)
  |     |-- ConfirmMergeButton
```

**Queries:**
- `GET /vendors?q=xxx&page=1&per_page=20` -- lista paginada
- `GET /vendors/:id` -- detalhe
- `POST /vendors` -- criar
- `PATCH /vendors/:id` -- editar
- `POST /vendors/:id/merge` -- mesclar
- `GET /vendors/banks` -- lista de bancos para dropdown

#### 5.2.4 /jobs/[id]/financeiro/dashboard (P0)

```
JobFinancialDashboardPage
  |-- JobFinancialTabs
  |-- KPICardsRow
  |     |-- KPICard (OC/Faturamento)
  |     |-- KPICard (Total Estimado)
  |     |-- KPICard (Total Pago)
  |     |-- KPICard (Saldo)
  |     |-- KPICard (Margem %)
  |     |-- KPICard (Status Geral)
  |-- CategoryChart (barras horizontais: orcado vs pago por categoria)
  |-- AlertsSection
  |     |-- AlertCard (vencidos, NFs pendentes, divergencias, saldo negativo)
  |-- CategorySummaryTable (de vw_resumo_custos_job)
  |-- UpcomingPaymentsSection (proximos 15d)
  |-- BudgetButton (link para /jobs/[id]/financeiro/orcamento)
```

**Queries:**
- `GET /financial-dashboard/job/:jobId` -- todos os dados

**Estado:** React Query com `staleTime: 5min` (acompanhando cache do backend).

#### 5.2.5 /jobs/[id]/financeiro/orcamento (P1)

```
JobBudgetPage
  |-- JobFinancialTabs
  |-- BudgetModeToggle (Bottom-up | Top-down)
  |-- BudgetHeaderForm
  |     |-- BottomUpFields (tax_rate, agency_fee_pct, production_markup)
  |     |-- TopDownFields (budget_ceiling)
  |     |-- RealTimeMarginIndicator (margem calculada em tempo real)
  |-- ApplyTemplateSection
  |     |-- ProductionTypeSelect
  |     |-- ApplyTemplateButton
  |-- ReferenceJobsSection
  |     |-- ReferenceJobCard (jobs similares com valores)
  |-- BudgetVersionHistory (lista de versoes anteriores)
```

**Queries:**
- `GET /cost-items/budget-summary/:jobId`
- `PATCH /cost-items/budget-mode/:jobId`
- `POST /cost-items/apply-template/:jobId`
- `GET /cost-items/reference-jobs/:jobId`
- `PATCH /cost-items/budget-mode/:jobId` -- atualiza jobs.budget_mode + financial fields

#### 5.2.6 /jobs/[id]/financeiro/verbas (P1)

```
JobCashAdvancesPage
  |-- JobFinancialTabs
  |-- CashAdvancesList
  |     |-- CashAdvanceCard (expansivel)
  |     |     |-- AdvanceSummary (autorizado, depositado, comprovado, saldo)
  |     |     |-- BalanceIndicator (vermelho se saldo negativo)
  |     |     |-- ExpenseReceiptsList
  |     |     |     |-- ReceiptRow (amount, description, status badge, acoes)
  |     |     |-- SubmitReceiptButton (role: produtor)
  |     |     |-- ApproveRejectButtons (role: financeiro)
  |     |     |-- CloseAdvanceButton (role: financeiro)
  |-- NewAdvanceDialog
  |-- SubmitReceiptDialog (upload de arquivo ou link Drive)
```

**Queries:**
- `GET /cash-advances?job_id=xxx`
- `POST /cash-advances`
- `POST /cash-advances/:id/deposit`
- `POST /cash-advances/:id/receipts`
- `PATCH /cash-advances/:id/receipts/:rid`
- `POST /cash-advances/:id/close`

#### 5.2.7 /admin/financeiro/categorias (P2)

```
CostCategoriesAdminPage
  |-- ProductionTypeSelector (tab por production_type)
  |-- CategoriesTable (ordenavel por item_number)
  |     |-- CategoryRow (item_number, display_name, is_active, sort_order)
  |     |-- InlineEdit (display_name editavel)
  |     |-- ActiveToggle
  |-- AddCategoryButton
  |-- DuplicateTemplateButton
```

---

### 5.3 Componentes Compartilhados Novos

| Componente | Descricao | Usado em |
|-----------|-----------|----------|
| `StatusBadge` | Badge colorido por status do item | CostItemRow, varios |
| `VendorAutocomplete` | Input com autocomplete de vendors | CostItemDrawer, CashAdvanceDialog |
| `PaymentDialog` | Modal de registrar pagamento | JobCostsPage, PaymentCalendarPage |
| `BankDropdown` | Select de banco padronizado | BankAccountForm |
| `CurrencyInput` | Input formatado para Real brasileiro | CostItemDrawer, varias forms |
| `DateRangePicker` | Seletor de range de datas | FilterBar, CalendarToolbar |
| `ExportCsvButton` | Botao de exportar tabela como CSV | CostItemsTable |
| `JobFinancialTabs` | Tabs de navegacao (custos, dashboard, orcamento, verbas) | Todas as paginas /jobs/[id]/financeiro/* |

---

## 6. Plano de Execucao

### 6.1 Batch 1: Schema + Migrations (BLOQUEIA TUDO)

**Estimativa:** 2-3 dias
**Dependencias:** Nenhuma

**Entregaveis:**
- Migration 019: CREATE EXTENSION unaccent, funcao normalize_vendor_name, tabela cost_categories com seed, tabela vendors, tabela bank_accounts
- Migration 020: Tabela cost_items com triggers (updated_at, suggested_status), tabela cash_advances, tabela expense_receipts com trigger recalc
- Migration 021: ALTER TABLE jobs ADD budget_mode, views vw_calendario_pagamentos e vw_resumo_custos_job

**User Stories cobertas:** US-FIN-001, US-FIN-002, US-FIN-003, US-FIN-004, US-FIN-005, US-FIN-006, US-FIN-007, US-FIN-008, US-FIN-009

**Complexidade:** Media -- schemas bem definidos na spec, sem ambiguidade. O ponto de atencao e o GENERATED ALWAYS de cost_items (PostgreSQL nao permite referenciar outro GENERATED, verificar que total_with_overtime inline e aceito).

**Criterios de aceite do batch:**
- Todas as tabelas criadas com IF NOT EXISTS
- RLS habilitado em todas com policies de tenant isolation
- Triggers funcionando (inserir cost_item e verificar suggested_status)
- Views retornando dados corretos com job de teste
- Seeds de cost_categories inseridos

---

### 6.2 Batch 2: Edge Functions Core (P0)

**Estimativa:** 5-7 dias
**Dependencias:** Batch 1

**Entregaveis:**
- Edge Function `vendors` (11 endpoints)
- Edge Function `cost-items` (12 endpoints)
- Edge Function `payment-manager` (3 endpoints)
- _shared: tipos novos em types.ts (VendorRow, CostItemRow, BankAccountRow, etc.)

**User Stories cobertas:** US-FIN-010, US-FIN-011, US-FIN-012

**Complexidade:** Alta -- cost-items tem muita logica (snapshot, batch, template, reference). vendors tem dedup. payment-manager tem transacao atomica com payment_history + job_history.

**Ordem de implementacao interna:**
1. vendors (base -- cost-items depende para vendor_id)
2. cost-items (central)
3. payment-manager (depende de cost-items)

---

### 6.3 Batch 3: Edge Functions Secundarias + Dashboard

**Estimativa:** 3-4 dias
**Dependencias:** Batch 2

**Entregaveis:**
- Edge Function `financial-dashboard` (2 endpoints)
- Edge Function `cash-advances` (7 endpoints)

**User Stories cobertas:** US-FIN-013, US-FIN-014, US-FIN-015

**Complexidade:** Media -- financial-dashboard e leitura pura (views + queries). cash-advances tem logica de notificacao e trigger.

---

### 6.4 Batch 4: Frontend Basico (P0)

**Estimativa:** 7-10 dias
**Dependencias:** Batch 2

**Entregaveis:**
- Pagina /jobs/[id]/financeiro/custos com CostItemsTable, CostItemDrawer, StatusBadge
- Pagina /financeiro/vendors com VendorsTable, VendorCreateDialog, VendorDetailDrawer
- Pagina /financeiro/calendario com PaymentCalendarPage, PaymentDialog
- Componente PaymentDialog (reutilizavel)
- Componente VendorAutocomplete (reutilizavel)
- Componente JobFinancialTabs

**User Stories cobertas:** US-FIN-020, US-FIN-021, US-FIN-022, US-FIN-023, US-FIN-024

**Complexidade:** Alta -- a tela de custos (US-FIN-020) e a mais complexa do ELLAHOS: tabela hierarquica com 160+ linhas, grupos expansiveis, filtros, busca, acoes rapidas, realtime. Considerar react-virtual (TanStack Virtual) para performance.

**Ordem de implementacao interna:**
1. JobFinancialTabs + rota base
2. VendorsPage (mais simples, desbloqueia autocomplete)
3. JobCostsPage (central, mais complexa)
4. PaymentCalendarPage
5. PaymentDialog (compartilhado)

---

### 6.5 Batch 5: Dashboard + Orcamento (P0/P1)

**Estimativa:** 4-5 dias
**Dependencias:** Batch 3, Batch 4

**Entregaveis:**
- Pagina /jobs/[id]/financeiro/dashboard com KPIs, grafico, alertas
- Pagina /jobs/[id]/financeiro/orcamento com modo bottom-up/top-down
- Grafico de barras por categoria (recharts, ja instalado ADR-012)

**User Stories cobertas:** US-FIN-025, US-FIN-026

**Complexidade:** Media -- dashboard usa dados do endpoint financial-dashboard. Orcamento usa endpoints de budget ja criados no batch 2.

---

### 6.6 Batch 6: Integracao com Fase 9 + Verbas

**Estimativa:** 3-4 dias
**Dependencias:** Batch 2

**Entregaveis:**
- Expansao do nf-processor: handler link-cost-item + modificacoes em validate/request-send/ingest
- Pagina /jobs/[id]/financeiro/verbas com CashAdvancesPage
- Notificacoes para fluxo de verbas

**User Stories cobertas:** US-FIN-016, US-FIN-027

**Complexidade:** Media -- a integracao com nf-processor e pontual (buscar cost_item por vendor email e atualizar). Verbas a vista e tela simples com poucos estados.

---

### 6.7 Batch 7: Migracao de Dados (P2)

**Estimativa:** 5-7 dias
**Dependencias:** Batch 2 (vendors + cost-items precisam existir)

**Entregaveis:**
- Script scripts/migration/import_equipe.py (EQUIPE.csv -> vendors + bank_accounts)
- Script scripts/migration/dedup_vendors.py (clusters de duplicatas, YAML de mapeamento)
- Script scripts/migration/import_job_finances.py (CUSTOS_REAIS.csv -> cost_items)
- Documentacao docs/migration/fase-10-guia-migracao.md

**User Stories cobertas:** US-FIN-030, US-FIN-031, US-FIN-032, US-FIN-033

**Complexidade:** Alta -- parsing de CSVs com encoding latin-1, 98 variacoes de banco, CPF/CNPJ/PIX misturados, categorias nao fixas entre jobs. O parser precisa ser muito defensivo. Modo dry-run obrigatorio.

---

### 6.8 Batch 8: Admin + Polish (P2)

**Estimativa:** 2-3 dias
**Dependencias:** Batch 5

**Entregaveis:**
- Pagina /admin/financeiro/categorias (US-FIN-028)
- QA geral, ajustes de UX, testes de integracao
- ADRs 022-024 finalizados

**User Stories cobertas:** US-FIN-028

**Complexidade:** Baixa.

---

### 6.9 Cronograma Resumido

| Batch | Dias | Acumulado | Prioridade | Paralelizavel? |
|-------|------|-----------|------------|----------------|
| 1 - Schema | 2-3 | 2-3 | P0 | Nao (bloqueia tudo) |
| 2 - EF Core | 5-7 | 7-10 | P0 | Nao (depende do 1) |
| 3 - EF Secundarias | 3-4 | 10-14 | P0/P1 | Sim (com batch 4) |
| 4 - Frontend Basico | 7-10 | 14-20 | P0 | Sim (com batch 3) |
| 5 - Dashboard + OC | 4-5 | 18-25 | P0/P1 | Sim (com batch 6) |
| 6 - Integracao + Verbas | 3-4 | 21-29 | P0/P1 | Sim (com batch 5) |
| 7 - Migracao | 5-7 | 26-36 | P2 | Sim (a qualquer momento apos batch 2) |
| 8 - Admin + Polish | 2-3 | 28-39 | P2 | Sim (apos batch 5) |

**Total: 31-43 dias (sequencial) ou 22-30 dias (com paralelizacao)**

**Caminho critico:** Batch 1 -> Batch 2 -> Batch 4 (frontend basico) -> Batch 5 (dashboard)

**MVP operavel:** Batch 1+2+4 = 14-20 dias = **tela de custos + vendors + calendario funcionando**

---

## 7. Riscos Tecnicos

### 7.1 Performance com 200+ Itens por Job

**Risco:** A tela de custos pode ficar lenta com 160+ linhas renderizadas simultaneamente.

**Mitigacao:**
- Usar TanStack Virtual (react-virtual) para virtualizacao de lista no CostItemsTable
- Categorias colapsadas por default -- usuario expande sob demanda
- Indice `(tenant_id, job_id, item_number, sub_item_number)` garante query rapida no banco
- GET /cost-items retorna todos os itens de um job em uma unica chamada (nao paginar)
- Estimativa: 200 linhas x ~500 bytes = ~100KB de payload, aceitavel

### 7.2 GENERATED Columns em Cascata

**Risco:** PostgreSQL nao permite GENERATED ALWAYS referenciando outra GENERATED ALWAYS.

**Mitigacao:** `total_with_overtime` repete a expressao completa inline. Testar na migration com INSERT real antes de deployar.

### 7.3 Trigger suggested_status e Performance

**Risco:** Trigger BEFORE INSERT OR UPDATE em cost_items dispara em toda operacao.

**Mitigacao:** O trigger e leve (apenas IF/ELSIF, sem query). BEFORE trigger nao gera row lock adicional. Para batch de 200 itens, testamos que executa em < 100ms (aceitavel).

### 7.4 Dedup de Vendors: Falsos Positivos

**Risco:** Normalizacao muito agressiva pode marcar vendors diferentes como duplicatas.

**Mitigacao:**
- Dedup e sugestao, nao bloqueio. O financeiro pode criar vendor "duplicado" com justificativa
- O POST retorna 409 com dados do vendor existente para comparacao
- Merge de duplicatas e reversivel (reatribuir cost_items de volta)

### 7.5 Impacto em Tabelas Existentes

**Risco:** ALTER TABLE jobs + expansao do nf-processor podem afetar funcionalidades existentes.

**Mitigacao:**
- ALTER TABLE jobs apenas adiciona coluna budget_mode com DEFAULT -- zero downtime
- Expansao do nf-processor e aditiva (novo handler + logica SECUNDARIA nos handlers existentes)
- A busca em cost_items dentro do nf-processor e opcional (se nao encontrar, ignora e segue fluxo normal)
- Financial_records nao e alterado na Fase 10

### 7.6 Views com SECURITY INVOKER e RLS

**Risco:** Views com SECURITY INVOKER podem nao retornar dados se o usuario nao tiver acesso via RLS.

**Mitigacao:** Todas as tabelas base (cost_items, jobs) tem RLS por tenant_id. O `get_tenant_id()` ja esta nos JWTs. Testar views com diferentes roles (produtor, financeiro, admin) no batch 1 QA.

### 7.7 Migracao de Dados com Encoding Latin-1

**Risco:** CSVs exportados do Google Sheets tem encoding latin-1 (nao UTF-8). Caracteres acentuados podem quebrar.

**Mitigacao:** Script Python usa `open(file, 'rb').read().decode('latin-1')` conforme documentado na analise. Normalizar para UTF-8 antes de inserir no banco. Testes com GG_033 e GG_038 como baseline.

### 7.8 Cache Invalidation do Dashboard

**Risco:** Dashboard financeiro pode mostrar dados desatualizados se cache nao for invalidado corretamente.

**Mitigacao:**
- Toda mutacao em cost-items (POST, PATCH, DELETE) invalida o cache do job afetado
- `DELETE FROM report_snapshots WHERE job_id = :jobId AND report_type = 'financial_dashboard'`
- Cache de 5 minutos e aceitavel para dashboard financeiro (nao e real-time)
- Realtime subscription na tela de custos garante que a lista se atualiza imediatamente

---

## 8. Shared Modules Novos

### 8.1 Novos Tipos em _shared/types.ts

```typescript
// === Fase 10: Modulo Financeiro ===

export interface VendorRow {
  id: string;
  tenant_id: string;
  full_name: string;
  normalized_name: string;
  entity_type: 'pf' | 'pj';
  cpf: string | null;
  cnpj: string | null;
  razao_social: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  is_active: boolean;
  people_id: string | null;
  import_source: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface BankAccountRow {
  id: string;
  tenant_id: string;
  vendor_id: string;
  account_holder: string | null;
  bank_name: string | null;
  bank_code: string | null;
  agency: string | null;
  account_number: string | null;
  account_type: 'corrente' | 'poupanca' | null;
  pix_key: string | null;
  pix_key_type: 'cpf' | 'cnpj' | 'email' | 'telefone' | 'aleatoria' | null;
  is_primary: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export type CostItemStatus =
  | 'orcado' | 'aguardando_nf' | 'nf_pedida' | 'nf_recebida'
  | 'nf_aprovada' | 'pago' | 'cancelado';

export type NfRequestStatus =
  | 'nao_aplicavel' | 'pendente' | 'pedido' | 'recebido' | 'rejeitado' | 'aprovado';

export type PaymentCondition =
  | 'a_vista' | 'cnf_30' | 'cnf_40' | 'cnf_45' | 'cnf_60' | 'cnf_90' | 'snf_30';

export type CostPaymentMethod =
  | 'pix' | 'ted' | 'dinheiro' | 'debito' | 'credito' | 'outro';

export interface CostItemRow {
  id: string;
  tenant_id: string;
  job_id: string | null;
  item_number: number;
  sub_item_number: number;
  is_category_header: boolean;
  service_description: string;
  sort_order: number;
  period_month: string | null;
  import_source: string | null;
  unit_value: number | null;
  quantity: number;
  total_value: number;
  overtime_hours: number | null;
  overtime_rate: number | null;
  overtime_value: number;
  total_with_overtime: number;
  actual_paid_value: number | null;
  notes: string | null;
  payment_condition: PaymentCondition | null;
  payment_due_date: string | null;
  payment_method: CostPaymentMethod | null;
  vendor_id: string | null;
  vendor_name_snapshot: string | null;
  vendor_email_snapshot: string | null;
  vendor_pix_snapshot: string | null;
  vendor_bank_snapshot: string | null;
  item_status: CostItemStatus;
  suggested_status: CostItemStatus | null;
  status_note: string | null;
  nf_request_status: NfRequestStatus;
  nf_requested_at: string | null;
  nf_requested_by: string | null;
  nf_document_id: string | null;
  nf_drive_url: string | null;
  nf_filename: string | null;
  nf_extracted_value: number | null;
  nf_validation_ok: boolean | null;
  payment_status: 'pendente' | 'pago' | 'cancelado';
  payment_date: string | null;
  payment_proof_url: string | null;
  payment_proof_filename: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  created_by: string | null;
}

export interface CashAdvanceRow {
  id: string;
  tenant_id: string;
  job_id: string;
  cost_item_id: string | null;
  recipient_vendor_id: string | null;
  recipient_name: string;
  description: string;
  amount_authorized: number;
  amount_deposited: number;
  amount_documented: number;
  balance: number;
  status: 'aberta' | 'encerrada' | 'aprovada';
  drive_folder_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  created_by: string | null;
}

export interface ExpenseReceiptRow {
  id: string;
  tenant_id: string;
  cash_advance_id: string;
  job_id: string;
  amount: number;
  description: string;
  receipt_type: 'nf' | 'recibo' | 'ticket' | 'outros';
  document_url: string | null;
  document_filename: string | null;
  expense_date: string | null;
  status: 'pendente' | 'aprovado' | 'rejeitado';
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_note: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  created_by: string | null;
}

export interface CostCategoryRow {
  id: string;
  tenant_id: string;
  item_number: number;
  display_name: string;
  production_type: string;
  description: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}
```

### 8.2 Novo Modulo: _shared/vendor-normalize.ts

```typescript
// Normalizacao de vendor para dedup (espelha a funcao PG)
export function normalizeVendorName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos
    .replace(/[^a-z0-9\s\-]/g, '')  // remove especiais
    .replace(/\s+/g, ' ');          // normaliza espacos
}
```

### 8.3 Novo Modulo: _shared/canonical-filenames.ts

```typescript
// Gera nome canonico de arquivo financeiro (RN-004)

export function generateNfFilename(params: {
  paymentDueDate: string; // YYYY-MM-DD
  jobCode: string;
  costItemId: string;
  itemNumber: number;
  subItemNumber: number;
}): string {
  const date = params.paymentDueDate.replace(/-/g, '');
  const idShort = params.costItemId.substring(0, 8);
  return `NF_${date}_J${params.jobCode}_ID${idShort}_I${params.itemNumber}S${params.subItemNumber}`;
}

export function generatePgtoFilename(params: {
  paymentDate: string; // YYYY-MM-DD
  jobCode: string;
  costItemIds: string[];
}): string {
  const date = params.paymentDate.replace(/-/g, '');
  if (params.costItemIds.length === 1) {
    const idShort = params.costItemIds[0].substring(0, 8);
    return `PGTO_${date}_J${params.jobCode}_ID${idShort}`;
  }
  // Lote: hash DJB2 dos IDs ordenados
  const sorted = [...params.costItemIds].sort();
  const hash = djb2Hash(sorted.join(',')).toString(16).substring(0, 6);
  return `PGTO_${date}_J${params.jobCode}_IDS${params.costItemIds.length}_${hash}`;
}

function djb2Hash(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}
```

---

## 9. Seguranca

### 9.1 Permissoes por Endpoint

| Edge Function | Roles Permitidos (alem de admin) | Notas |
|---------------|----------------------------------|-------|
| vendors (escrita) | financeiro, ceo | Merge: apenas admin, ceo |
| vendors (leitura) | todos autenticados | Autocomplete aberto para PE/produtor |
| cost-items (escrita) | financeiro, pe, ceo | |
| cost-items (leitura) | todos autenticados | Produtor ve apenas jobs onde e membro |
| payment-manager | financeiro, ceo | Operacao critica -- sempre registra em job_history |
| financial-dashboard | financeiro, pe, ceo | Tenant dashboard: apenas financeiro, ceo |
| cash-advances (submeter receipt) | produtor, financeiro, ceo | Produtor pode submeter em jobs onde e membro |
| cash-advances (aprovar receipt) | financeiro, ceo | |

### 9.2 RLS e Produtor

O produtor deve ver cost_items apenas dos jobs em que e membro da equipe. Isso ja esta coberto pela RLS por tenant_id (todos os dados do tenant sao visiveis para qualquer usuario autenticado do tenant).

Para restricao adicional (produtor ve apenas seus jobs), a filtragem e feita no frontend e na Edge Function (nao via RLS), pois RLS por job_team seria recursivo e complexo. O Edge Function `cost-items` filtra `job_team.member_profile_id = auth.userId` quando `auth.role = 'produtor'`.

### 9.3 Auditoria

Toda operacao critica registra em `job_history`:

| Evento | event_type | Dados em data_after |
|--------|-----------|---------------------|
| Pagamento registrado | payment_registered | cost_item_ids, amount, payment_date |
| Pagamento desfeito | payment_undone | cost_item_id, reason |
| NF aprovada | nf_approved | cost_item_id, nf_document_id |
| Valor de item editado | financial_update | cost_item_id, old_value, new_value |
| Batch importado | cost_items_imported | count, import_source, job_code |
| Vendors mesclados | vendor_merged | survivor_id, merged_ids, items_reassigned |

---

## 10. Checklist de Compatibilidade

Verificacao de que a Fase 10 nao quebra funcionalidades existentes:

| Funcionalidade Existente | Impacto | Verificacao |
|--------------------------|---------|-------------|
| financial_records CRUD (Edge Function financial) | Nenhum | Nao alterada |
| nf_documents ingest (n8n wf-nf-processor) | Baixo | Busca secundaria em cost_items (opcional) |
| nf_documents validate (frontend /financial/nf-validation) | Baixo | Handler estendido para atualizar cost_items |
| wf-nf-request (n8n) | Nenhum | Nao alterado |
| invoices | Nenhum | Nao alterada |
| payment_history | Nenhum | Novas insercoes do payment-manager |
| jobs | Baixo | ADD COLUMN budget_mode (DEFAULT, nao altera existentes) |
| people | Nenhum | vendors.people_id e FK opcional |
| Dashboard Supabase / Vercel | Nenhum | Novas paginas em novas rotas |

---

## 11. Respostas para Perguntas Abertas da Spec

| Pergunta | Decisao do Tech Lead |
|----------|---------------------|
| P-FIN-001 (budget_ceiling) | Implementar opcao A como padrao (budget_ceiling = budget_value). Campo budget_ceiling pode ser adicionado depois se CEO solicitar. |
| P-FIN-002 (templates) | Implementar opcao B (templates por production_type) com seed usando 'all'. Permite customizar depois. |
| P-FIN-003 (ordem de migracao) | Comecar pelos 5 jobs mais recentes para validar. Script com flag --job-codes para selecionar. |
| P-FIN-004 (budget_items) | Manter ambos na Fase 10 sem conflito. Reavaliar na Fase 11. |
| P-FIN-005 (calendario) | Implementar opcao A (visao consolidada com filtro por job). |

---

*Documento gerado pelo Tech Lead do ELLAHOS em 27/02/2026.*
*Baseado na spec do PM (1235 linhas), decisoes do CEO (10 perguntas) e analise de dados reais (620 linhas).*
