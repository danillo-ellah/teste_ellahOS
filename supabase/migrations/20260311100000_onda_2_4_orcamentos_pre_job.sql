-- =============================================================================
-- Migration: Onda 2.4 -- Orcamentos pre-Job
-- Data: 2026-03-11
--
-- Contexto:
--   Orcamentos comerciais (pre-job) vinculados a oportunidades CRM.
--   Permite criar N versoes de orcamento por oportunidade, cada uma com
--   itens por categoria GG. Gera codigo ORC-YYYY-XXXX atomico.
--   Tambem corrige campos CRM faltantes nas migrations (adicionados
--   diretamente no Dashboard durante Onda 1.2).
--
-- Novas tabelas:
--   opportunity_budget_versions  -- versoes de orcamento por oportunidade
--   opportunity_budget_items     -- linhas por versao (1 categoria GG = 1 linha)
--   orc_code_sequences           -- contador atomico para ORC-YYYY-XXXX
--
-- ALTER:
--   opportunities                -- +10 campos CRM faltantes, +orc_code,
--                                   fix stage CHECK (+pausado), +loss_category CHECK
--
-- RPC:
--   activate_budget_version      -- ativacao atomica de versao em transacao
--
-- Referencia: docs/specs/onda-2/08-orcamentos-pre-job-arquitetura.md
-- =============================================================================

SET search_path TO public;

-- =============================================================================
-- 1. TABELAS
-- =============================================================================

-- -------------------------------------------------------------
-- 1.1 Tabela: opportunity_budget_versions
-- Cada oportunidade pode ter N versoes, apenas 1 ativa por vez
-- -------------------------------------------------------------

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

-- -------------------------------------------------------------
-- 1.2 Tabela: opportunity_budget_items
-- Itens (linhas de categoria) por versao de orcamento
-- 1 linha = 1 categoria GG (item_number 1-15, 99)
-- -------------------------------------------------------------

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

-- -------------------------------------------------------------
-- 1.3 Tabela: orc_code_sequences
-- Contador atomico para gerar codigos ORC-YYYY-XXXX
-- Mesma tecnica do job_code_sequences: INSERT ON CONFLICT
-- Particionado por tenant + ano (reinicia ORC-YYYY-0001 a cada ano)
-- -------------------------------------------------------------

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

-- =============================================================================
-- 2. ALTER TABLE: opportunities (campos CRM faltantes + novos campos Onda 2.4)
-- =============================================================================

-- -------------------------------------------------------------
-- 2.1 Campos CRM Sprint 1 (faltantes nas migrations)
-- CONTEXTO: Existem no frontend (useCrm.ts) e na EF
-- (update-opportunity.ts) mas NUNCA foram adicionados via migration.
-- Foram criados diretamente no Dashboard durante CRM Sprint 1.
-- -------------------------------------------------------------

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

-- -------------------------------------------------------------
-- 2.2 Correcao do CHECK constraint de stage
-- A migration original (20260303070000) nao inclui 'pausado'.
-- O stage 'pausado' e usado no frontend e EF desde a Onda 1.2.
-- -------------------------------------------------------------

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

-- -------------------------------------------------------------
-- 2.3 Novos campos Onda 2.4
-- -------------------------------------------------------------

-- Codigo ORC copiado da budget_version para consulta rapida
ALTER TABLE opportunities
  ADD COLUMN IF NOT EXISTS orc_code TEXT;

-- CHECK constraint para loss_category
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

-- =============================================================================
-- 3. RPC: activate_budget_version (ativacao atomica de versao em transacao)
-- =============================================================================

-- Nota: Usamos SECURITY DEFINER porque SECURITY INVOKER nao e suportado
-- nesta versao do Postgres (ver MEMORY.md). A funcao valida tenant_id
-- explicitamente nos WHERE clauses.

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

COMMENT ON FUNCTION activate_budget_version(UUID, UUID, UUID) IS
  'Ativacao atomica de versao de orcamento. Desativa a anterior, ativa a nova e atualiza estimated_value da oportunidade.';

-- =============================================================================
-- 4. INDICES
-- =============================================================================

-- -------------------------------------------------------------
-- 4.1 Indices: opportunity_budget_versions
-- -------------------------------------------------------------

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

-- -------------------------------------------------------------
-- 4.2 Indices: opportunity_budget_items
-- -------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_opp_budget_items_version
  ON opportunity_budget_items(version_id);

CREATE INDEX IF NOT EXISTS idx_opp_budget_items_tenant
  ON opportunity_budget_items(tenant_id);

-- -------------------------------------------------------------
-- 4.3 Indices: orc_code_sequences
-- -------------------------------------------------------------

-- UNIQUE constraint ja cria indice em (tenant_id, year)
-- Indice adicional para busca por tenant
CREATE INDEX IF NOT EXISTS idx_orc_code_sequences_tenant
  ON orc_code_sequences(tenant_id);

-- -------------------------------------------------------------
-- 4.4 Indices: opportunities (novos para Onda 2.4)
-- -------------------------------------------------------------

-- Dashboard de perdas: query por tenant + stage='perdido' + data
CREATE INDEX IF NOT EXISTS idx_opportunities_loss_analytics
  ON opportunities(tenant_id, stage, actual_close_date DESC)
  WHERE stage = 'perdido' AND deleted_at IS NULL;

-- Busca por orc_code na oportunidade
CREATE INDEX IF NOT EXISTS idx_opportunities_orc_code
  ON opportunities(tenant_id, orc_code)
  WHERE orc_code IS NOT NULL AND deleted_at IS NULL;

-- =============================================================================
-- 5. RLS (Row Level Security)
-- =============================================================================

-- -------------------------------------------------------------
-- 5.1 RLS: opportunity_budget_versions
-- SELECT, INSERT, UPDATE (sem DELETE fisico -- apenas soft delete)
-- -------------------------------------------------------------

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

-- Sem DELETE fisico -- apenas soft delete via deleted_at

-- -------------------------------------------------------------
-- 5.2 RLS: opportunity_budget_items
-- SELECT, INSERT, UPDATE, DELETE (replace strategy para itens)
-- -------------------------------------------------------------

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

-- -------------------------------------------------------------
-- 5.3 RLS: orc_code_sequences
-- SELECT, INSERT, UPDATE (sem DELETE)
-- -------------------------------------------------------------

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

-- =============================================================================
-- 6. TRIGGERS
-- =============================================================================

-- -------------------------------------------------------------
-- 6.1 Triggers updated_at
-- -------------------------------------------------------------

DROP TRIGGER IF EXISTS trg_opp_budget_versions_updated_at ON opportunity_budget_versions;
CREATE TRIGGER trg_opp_budget_versions_updated_at
  BEFORE UPDATE ON opportunity_budget_versions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_opp_budget_items_updated_at ON opportunity_budget_items;
CREATE TRIGGER trg_opp_budget_items_updated_at
  BEFORE UPDATE ON opportunity_budget_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- orc_code_sequences: sem updated_at trigger -- a EF faz o UPDATE diretamente no INSERT ON CONFLICT

-- -------------------------------------------------------------
-- 6.2 Triggers audit_log (fn_audit_log da migration 20260310250000)
-- Verificamos se a funcao existe antes de criar os triggers.
-- -------------------------------------------------------------

DO $$
BEGIN
  -- Verificar se fn_audit_log() existe antes de criar triggers de auditoria
  IF EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'fn_audit_log'
      AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  ) THEN

    -- Audit trigger para opportunity_budget_versions
    EXECUTE 'DROP TRIGGER IF EXISTS trg_audit_opportunity_budget_versions ON opportunity_budget_versions';
    EXECUTE 'CREATE TRIGGER trg_audit_opportunity_budget_versions
      AFTER INSERT OR UPDATE OR DELETE ON opportunity_budget_versions
      FOR EACH ROW EXECUTE FUNCTION fn_audit_log()';

    -- Audit trigger para opportunity_budget_items
    EXECUTE 'DROP TRIGGER IF EXISTS trg_audit_opportunity_budget_items ON opportunity_budget_items';
    EXECUTE 'CREATE TRIGGER trg_audit_opportunity_budget_items
      AFTER INSERT OR UPDATE OR DELETE ON opportunity_budget_items
      FOR EACH ROW EXECUTE FUNCTION fn_audit_log()';

    -- Nota: orc_code_sequences NAO tem audit trigger (tabela auxiliar de contagem)

    RAISE NOTICE 'Onda 2.4: Audit triggers criados para opportunity_budget_versions e opportunity_budget_items';
  ELSE
    RAISE WARNING 'Onda 2.4: fn_audit_log() nao encontrada -- audit triggers NAO criados. Rode a migration 20260310250000 primeiro.';
  END IF;
END $$;

-- =============================================================================
-- 7. VERIFICACAO DE ISOLAMENTO (teste mental)
-- =============================================================================

-- opportunity_budget_versions:
--   SELECT: tenant_id = get_tenant_id() -> Tenant A NAO ve versoes do Tenant B. OK.
--   INSERT: WITH CHECK -> So insere com seu proprio tenant_id. OK.
--   UPDATE: USING + WITH CHECK -> So edita registros do seu tenant. OK.
--   DELETE fisico: SEM policy -> bloqueado. OK (soft delete via deleted_at).
--
-- opportunity_budget_items:
--   SELECT: tenant_id = get_tenant_id() -> Isolamento garantido. OK.
--   INSERT: WITH CHECK -> tenant_id validado. OK.
--   UPDATE: USING + WITH CHECK -> dupla validacao. OK.
--   DELETE: USING -> so deleta do seu tenant (replace strategy para itens). OK.
--
-- orc_code_sequences:
--   SELECT + INSERT + UPDATE: todas com tenant_id = get_tenant_id(). OK.
--   DELETE: SEM policy -> bloqueado. OK (nunca apagar contadores).
--
-- activate_budget_version (RPC):
--   Recebe p_tenant_id como parametro, usado em todos os WHERE.
--   A EF que chama a RPC extrai tenant_id do JWT (nunca do body).
--   SECURITY DEFINER com search_path=public. OK.

-- =============================================================================
-- FIM da migration -- Onda 2.4 Orcamentos pre-Job
-- Novas tabelas: 3 (opportunity_budget_versions, opportunity_budget_items, orc_code_sequences)
-- ALTER TABLE: 1 (opportunities: +11 colunas, +2 constraints, +2 indices)
-- RPC: 1 (activate_budget_version)
-- Indices: 9 (versions: 4, items: 2, sequences: 1, opportunities: 2)
-- RLS: 10 policies (versions: 3, items: 4, sequences: 3)
-- Triggers: 4 (versions: updated_at + audit, items: updated_at + audit)
-- Constraints: 8 (versions: 3 + UNIQUE, items: 2 + UNIQUE, sequences: 2 + UNIQUE)
-- =============================================================================
