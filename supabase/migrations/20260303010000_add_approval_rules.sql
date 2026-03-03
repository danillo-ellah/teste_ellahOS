-- =============================================================================
-- Migration: T2.5 — Aprovacao Hierarquica de Pagamentos
-- Data: 2026-03-03
--
-- Contexto:
--   Pagamentos acima de determinados valores precisam de aprovacao hierarquica.
--   Regras configuraveis por tenant definem faixas de valor e o papel minimo
--   necessario para aprovar. Cada pedido de pagamento gera um registro de
--   aprovacao vinculado ao cost_item.
--
-- Novas tabelas: payment_approval_rules, payment_approvals
-- ALTER: cost_items.payment_approval_status
-- =============================================================================

SET search_path TO public;

-- -------------------------------------------------------
-- 1. Tabela payment_approval_rules
-- -------------------------------------------------------

CREATE TABLE IF NOT EXISTS payment_approval_rules (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID          NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Faixa de valor (min_amount <= valor < max_amount)
  min_amount      NUMERIC(12,2) NOT NULL DEFAULT 0,
  max_amount      NUMERIC(12,2),

  -- Papel minimo necessario para aprovar nesta faixa
  required_role   TEXT          NOT NULL,

  is_active       BOOLEAN       NOT NULL DEFAULT true,
  description     TEXT,

  created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT chk_approval_rules_min_non_negative CHECK (min_amount >= 0),
  CONSTRAINT chk_approval_rules_max_gt_min CHECK (
    max_amount IS NULL OR max_amount > min_amount
  ),
  CONSTRAINT chk_approval_rules_required_role CHECK (
    required_role IN ('financeiro', 'admin', 'cfo', 'ceo')
  )
);

-- -------------------------------------------------------
-- 2. Comentarios em colunas nao obvias
-- -------------------------------------------------------

COMMENT ON TABLE payment_approval_rules IS 'Regras configuraveis por tenant que definem faixas de valor e o papel minimo para aprovar pagamentos.';
COMMENT ON COLUMN payment_approval_rules.min_amount IS 'Valor minimo (inclusive) da faixa. Default 0 = desde o primeiro centavo.';
COMMENT ON COLUMN payment_approval_rules.max_amount IS 'Valor maximo (exclusive) da faixa. NULL = sem limite superior (faixa aberta).';
COMMENT ON COLUMN payment_approval_rules.required_role IS 'Papel minimo necessario para aprovar: financeiro, admin, cfo, ceo.';
COMMENT ON COLUMN payment_approval_rules.is_active IS 'Permite desativar regra temporariamente sem excluir.';

-- -------------------------------------------------------
-- 3. Tabela payment_approvals
-- -------------------------------------------------------

CREATE TABLE IF NOT EXISTS payment_approvals (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID          NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Vinculo com o cost item que precisa de aprovacao
  cost_item_id    UUID          NOT NULL REFERENCES cost_items(id) ON DELETE CASCADE,

  -- Regra que disparou esta aprovacao (pode ser NULL se regra foi excluida depois)
  rule_id         UUID          REFERENCES payment_approval_rules(id) ON DELETE SET NULL,

  -- Quem solicitou o pagamento
  requested_by    UUID          NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  requested_at    TIMESTAMPTZ   NOT NULL DEFAULT now(),

  -- Status da aprovacao
  status          TEXT          NOT NULL DEFAULT 'pending',

  -- Quem decidiu (aprovou/rejeitou)
  decided_by      UUID          REFERENCES profiles(id) ON DELETE SET NULL,
  decided_at      TIMESTAMPTZ,
  decision_notes  TEXT,

  -- Valor no momento da solicitacao (snapshot para auditoria)
  amount          NUMERIC(12,2) NOT NULL,

  created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT chk_approvals_status CHECK (
    status IN ('pending', 'approved', 'rejected')
  ),
  CONSTRAINT chk_approvals_amount_positive CHECK (amount > 0),
  CONSTRAINT chk_approvals_decision_consistency CHECK (
    (status = 'pending' AND decided_by IS NULL AND decided_at IS NULL)
    OR
    (status IN ('approved', 'rejected') AND decided_by IS NOT NULL AND decided_at IS NOT NULL)
  )
);

COMMENT ON TABLE payment_approvals IS 'Registro de pedidos de aprovacao de pagamento vinculados a cost_items. Um cost_item pode ter multiplas aprovacoes (ex: rejeicao seguida de nova solicitacao).';
COMMENT ON COLUMN payment_approvals.cost_item_id IS 'FK para o cost item cujo pagamento precisa de aprovacao.';
COMMENT ON COLUMN payment_approvals.rule_id IS 'Regra que disparou esta aprovacao. SET NULL se regra for excluida depois.';
COMMENT ON COLUMN payment_approvals.requested_by IS 'Profile do usuario que solicitou o pagamento.';
COMMENT ON COLUMN payment_approvals.requested_at IS 'Timestamp de quando o pagamento foi solicitado (pode diferir de created_at se criado em batch).';
COMMENT ON COLUMN payment_approvals.amount IS 'Snapshot do valor no momento da solicitacao. Serve para auditoria caso o valor do cost_item mude depois.';
COMMENT ON COLUMN payment_approvals.decision_notes IS 'Justificativa da aprovacao ou rejeicao (obrigatoria na UI para rejeicao).';
COMMENT ON COLUMN payment_approvals.decided_at IS 'Timestamp da decisao. Preenchido junto com decided_by via CHECK constraint.';

-- -------------------------------------------------------
-- 4. Indices
-- -------------------------------------------------------

-- payment_approval_rules
CREATE INDEX IF NOT EXISTS idx_payment_approval_rules_tenant
  ON payment_approval_rules(tenant_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_payment_approval_rules_active
  ON payment_approval_rules(tenant_id, is_active) WHERE deleted_at IS NULL;

-- payment_approvals
CREATE INDEX IF NOT EXISTS idx_payment_approvals_tenant
  ON payment_approvals(tenant_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_payment_approvals_cost_item
  ON payment_approvals(cost_item_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_payment_approvals_status
  ON payment_approvals(tenant_id, status) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_payment_approvals_requested_by
  ON payment_approvals(requested_by) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_payment_approvals_decided_by
  ON payment_approvals(decided_by) WHERE decided_by IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_payment_approvals_rule
  ON payment_approvals(rule_id) WHERE rule_id IS NOT NULL AND deleted_at IS NULL;

-- -------------------------------------------------------
-- 5. Triggers updated_at
-- -------------------------------------------------------

DROP TRIGGER IF EXISTS trg_payment_approval_rules_updated_at ON payment_approval_rules;
CREATE TRIGGER trg_payment_approval_rules_updated_at
  BEFORE UPDATE ON payment_approval_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_payment_approvals_updated_at ON payment_approvals;
CREATE TRIGGER trg_payment_approvals_updated_at
  BEFORE UPDATE ON payment_approvals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- -------------------------------------------------------
-- 6. RLS: payment_approval_rules (tenant isolation)
-- -------------------------------------------------------

ALTER TABLE payment_approval_rules ENABLE ROW LEVEL SECURITY;

-- SELECT: qualquer usuario autenticado ve regras do seu tenant
DROP POLICY IF EXISTS payment_approval_rules_select_tenant ON payment_approval_rules;
CREATE POLICY payment_approval_rules_select_tenant ON payment_approval_rules
  FOR SELECT TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()));

-- INSERT: qualquer usuario autenticado insere no seu tenant
DROP POLICY IF EXISTS payment_approval_rules_insert_tenant ON payment_approval_rules;
CREATE POLICY payment_approval_rules_insert_tenant ON payment_approval_rules
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = (SELECT get_tenant_id()));

-- UPDATE: qualquer usuario autenticado atualiza no seu tenant
DROP POLICY IF EXISTS payment_approval_rules_update_tenant ON payment_approval_rules;
CREATE POLICY payment_approval_rules_update_tenant ON payment_approval_rules
  FOR UPDATE TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()))
  WITH CHECK (tenant_id = (SELECT get_tenant_id()));

-- DELETE: soft delete controlado pela aplicacao (admin/ceo setam deleted_at via UPDATE)
-- Nao ha policy FOR DELETE — delecao fisica e bloqueada.

-- -------------------------------------------------------
-- 7. RLS: payment_approvals (tenant isolation)
-- -------------------------------------------------------

ALTER TABLE payment_approvals ENABLE ROW LEVEL SECURITY;

-- SELECT: qualquer usuario autenticado ve aprovacoes do seu tenant
DROP POLICY IF EXISTS payment_approvals_select_tenant ON payment_approvals;
CREATE POLICY payment_approvals_select_tenant ON payment_approvals
  FOR SELECT TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()));

-- INSERT: qualquer usuario autenticado insere no seu tenant
DROP POLICY IF EXISTS payment_approvals_insert_tenant ON payment_approvals;
CREATE POLICY payment_approvals_insert_tenant ON payment_approvals
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = (SELECT get_tenant_id()));

-- UPDATE: qualquer usuario autenticado atualiza no seu tenant
DROP POLICY IF EXISTS payment_approvals_update_tenant ON payment_approvals;
CREATE POLICY payment_approvals_update_tenant ON payment_approvals
  FOR UPDATE TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()))
  WITH CHECK (tenant_id = (SELECT get_tenant_id()));

-- DELETE: soft delete controlado pela aplicacao
-- Nao ha policy FOR DELETE — delecao fisica e bloqueada.

-- -------------------------------------------------------
-- 8. ALTER cost_items: adicionar payment_approval_status
-- -------------------------------------------------------

ALTER TABLE cost_items
  ADD COLUMN IF NOT EXISTS payment_approval_status TEXT NOT NULL DEFAULT 'not_required';

-- CHECK constraint separado para poder fazer IF NOT EXISTS via DO block
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_cost_items_payment_approval_status'
  ) THEN
    ALTER TABLE cost_items
      ADD CONSTRAINT chk_cost_items_payment_approval_status
      CHECK (payment_approval_status IN ('not_required', 'pending', 'approved', 'rejected'));
  END IF;
END $$;

COMMENT ON COLUMN cost_items.payment_approval_status IS 'Status da aprovacao hierarquica: not_required (abaixo do threshold), pending (aguardando), approved (liberado), rejected (negado).';

-- Indice para filtrar cost items pendentes de aprovacao
CREATE INDEX IF NOT EXISTS idx_cost_items_payment_approval_status
  ON cost_items(tenant_id, payment_approval_status)
  WHERE payment_approval_status != 'not_required' AND deleted_at IS NULL;

-- -------------------------------------------------------
-- 9. Verificacao de isolamento de tenant (teste mental)
-- -------------------------------------------------------
-- payment_approval_rules:
--   SELECT: tenant_id = get_tenant_id() -> Tenant A NAO ve regras do Tenant B. OK.
--   INSERT: WITH CHECK -> So insere com seu proprio tenant_id. OK.
--   UPDATE: USING + WITH CHECK duplo -> So atualiza registros do seu tenant. OK.
--   DELETE fisico: SEM policy -> bloqueado para todos. OK.
--
-- payment_approvals:
--   SELECT: tenant_id = get_tenant_id() -> Tenant A NAO ve aprovacoes do Tenant B. OK.
--   INSERT: WITH CHECK -> So insere com seu proprio tenant_id. OK.
--   UPDATE: USING + WITH CHECK duplo -> So atualiza registros do seu tenant. OK.
--   DELETE fisico: SEM policy -> bloqueado para todos. OK.

-- =============================================================================
-- FIM da migration — T2.5 Aprovacao Hierarquica de Pagamentos
-- Novas tabelas: payment_approval_rules, payment_approvals (total: 39)
-- ALTER: cost_items + payment_approval_status
-- Indices: 8 (rules: 2, approvals: 6) + 1 em cost_items
-- RLS: 6 policies (3 por tabela: select, insert, update) + sem delete fisico
-- Triggers: 2 (updated_at)
-- Constraints: 5 (rules: 3, approvals: 3) + 1 em cost_items
-- =============================================================================
