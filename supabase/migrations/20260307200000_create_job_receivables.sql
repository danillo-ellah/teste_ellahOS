-- =============================================================================
-- Migration: Criar tabela job_receivables (Receitas / Faturamento do Cliente)
-- Gap critico: EllaOS rastreia custos mas nao receitas. Esta tabela registra
-- as parcelas de recebimento do cliente vinculadas a cada job.
-- =============================================================================

SET search_path TO public;

-- ========================================
-- 1. Tabela: job_receivables
-- ========================================
CREATE TABLE IF NOT EXISTS job_receivables (
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID          NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  job_id              UUID          NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  description         TEXT          NOT NULL,
  installment_number  INTEGER       NOT NULL,
  amount              NUMERIC(12,2) NOT NULL,
  due_date            DATE,
  received_date       DATE,
  status              TEXT          NOT NULL DEFAULT 'pendente',
  invoice_number      TEXT,
  invoice_url         TEXT,
  payment_proof_url   TEXT,
  notes               TEXT,
  created_by          UUID          NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ   NOT NULL DEFAULT now(),
  deleted_at          TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT chk_job_receivables_status CHECK (
    status IN ('pendente', 'faturado', 'recebido', 'atrasado', 'cancelado')
  ),
  CONSTRAINT chk_job_receivables_amount_positive CHECK (
    amount > 0
  ),
  CONSTRAINT uq_job_receivables_tenant_job_installment UNIQUE (
    tenant_id, job_id, installment_number
  ),
  CONSTRAINT chk_job_receivables_installment_positive CHECK (
    installment_number > 0
  ),
  CONSTRAINT chk_job_receivables_received_date CHECK (
    received_date IS NULL OR status IN ('recebido')
  )
);

COMMENT ON TABLE job_receivables IS
  'Parcelas de recebimento do cliente por job. Complementa cost_items (custos) com o lado da receita.';
COMMENT ON COLUMN job_receivables.description IS
  'Descricao da parcela. Ex: "Parcela 1 - Aprovacao", "Parcela 2 - Entrega final".';
COMMENT ON COLUMN job_receivables.installment_number IS
  'Numero sequencial da parcela (1, 2, 3...). Unico por job dentro do tenant.';
COMMENT ON COLUMN job_receivables.amount IS
  'Valor da parcela em BRL. Sempre positivo.';
COMMENT ON COLUMN job_receivables.due_date IS
  'Data prevista de recebimento. NULL se ainda nao definida.';
COMMENT ON COLUMN job_receivables.received_date IS
  'Data real em que o pagamento foi recebido. Preenchido apenas quando status = recebido.';
COMMENT ON COLUMN job_receivables.status IS
  'Status da parcela: pendente (default), faturado (NF emitida), recebido (pago), atrasado (vencido), cancelado.';
COMMENT ON COLUMN job_receivables.invoice_number IS
  'Numero da NF emitida para esta parcela. Preenchido ao faturar.';
COMMENT ON COLUMN job_receivables.invoice_url IS
  'Link da NF no Google Drive ou sistema externo.';
COMMENT ON COLUMN job_receivables.payment_proof_url IS
  'Comprovante de recebimento (boleto pago, TED recebida, etc).';
COMMENT ON COLUMN job_receivables.created_by IS
  'Perfil que criou a parcela. Obrigatorio para auditoria.';

-- ========================================
-- 2. Indices
-- ========================================

-- Busca por job (listagem de parcelas de um job)
CREATE INDEX IF NOT EXISTS idx_job_receivables_tenant_job
  ON job_receivables(tenant_id, job_id)
  WHERE deleted_at IS NULL;

-- Filtro por status (dashboard financeiro)
CREATE INDEX IF NOT EXISTS idx_job_receivables_tenant_status
  ON job_receivables(tenant_id, status)
  WHERE deleted_at IS NULL;

-- Calendario de recebiveis (parcelas pendentes/faturadas com data)
CREATE INDEX IF NOT EXISTS idx_job_receivables_tenant_due_date
  ON job_receivables(tenant_id, due_date)
  WHERE status IN ('pendente', 'faturado') AND deleted_at IS NULL;

-- FK index: job_id (ja coberto pelo idx_tenant_job composto, mas explicitamos)
CREATE INDEX IF NOT EXISTS idx_job_receivables_job_id
  ON job_receivables(job_id);

-- FK index: created_by
CREATE INDEX IF NOT EXISTS idx_job_receivables_created_by
  ON job_receivables(created_by);

-- ========================================
-- 3. RLS (Row Level Security)
-- ========================================
ALTER TABLE job_receivables ENABLE ROW LEVEL SECURITY;

-- SELECT: qualquer usuario autenticado do mesmo tenant pode visualizar
DROP POLICY IF EXISTS job_receivables_select ON job_receivables;
CREATE POLICY job_receivables_select ON job_receivables
  FOR SELECT TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()));

-- INSERT: apenas admin, ceo, produtor_executivo, financeiro
DROP POLICY IF EXISTS job_receivables_insert ON job_receivables;
CREATE POLICY job_receivables_insert ON job_receivables
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = (SELECT get_tenant_id())
    AND (SELECT get_user_role()) IN ('admin', 'ceo', 'produtor_executivo', 'financeiro')
  );

-- UPDATE: apenas admin, ceo, produtor_executivo, financeiro
DROP POLICY IF EXISTS job_receivables_update ON job_receivables;
CREATE POLICY job_receivables_update ON job_receivables
  FOR UPDATE TO authenticated
  USING (
    tenant_id = (SELECT get_tenant_id())
    AND (SELECT get_user_role()) IN ('admin', 'ceo', 'produtor_executivo', 'financeiro')
  )
  WITH CHECK (
    tenant_id = (SELECT get_tenant_id())
    AND (SELECT get_user_role()) IN ('admin', 'ceo', 'produtor_executivo', 'financeiro')
  );

-- DELETE: apenas admin, ceo (soft delete via deleted_at, mas policy existe por seguranca)
DROP POLICY IF EXISTS job_receivables_delete ON job_receivables;
CREATE POLICY job_receivables_delete ON job_receivables
  FOR DELETE TO authenticated
  USING (
    tenant_id = (SELECT get_tenant_id())
    AND (SELECT get_user_role()) IN ('admin', 'ceo')
  );

-- ========================================
-- 4. Trigger: updated_at automatico
-- ========================================
DROP TRIGGER IF EXISTS trg_job_receivables_updated_at ON job_receivables;
CREATE TRIGGER trg_job_receivables_updated_at
  BEFORE UPDATE ON job_receivables
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ========================================
-- 5. RPC: get_receivables_summary
-- Retorna resumo financeiro de recebiveis por tenant, com filtro opcional por job.
-- ========================================
CREATE OR REPLACE FUNCTION get_receivables_summary(
  p_tenant_id UUID,
  p_job_id UUID DEFAULT NULL
)
RETURNS TABLE (
  total_previsto       NUMERIC(12,2),
  total_recebido       NUMERIC(12,2),
  total_pendente       NUMERIC(12,2),
  total_atrasado       NUMERIC(12,2),
  total_faturado       NUMERIC(12,2),
  total_cancelado      NUMERIC(12,2),
  parcelas_total       BIGINT,
  parcelas_recebidas   BIGINT,
  parcelas_pendentes   BIGINT,
  parcelas_atrasadas   BIGINT,
  proxima_parcela_data DATE,
  proxima_parcela_valor NUMERIC(12,2),
  proxima_parcela_job_id UUID,
  proxima_parcela_descricao TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_tenant UUID;
BEGIN
  -- Validacao: o caller deve pertencer ao tenant solicitado
  v_caller_tenant := get_tenant_id();
  IF v_caller_tenant IS NULL OR v_caller_tenant != p_tenant_id THEN
    RAISE EXCEPTION 'Acesso negado: tenant_id nao corresponde ao usuario autenticado.';
  END IF;

  RETURN QUERY
  WITH recebiveis AS (
    SELECT
      jr.amount,
      jr.status,
      jr.due_date,
      jr.job_id AS r_job_id,
      jr.description AS r_description
    FROM job_receivables jr
    WHERE jr.tenant_id = p_tenant_id
      AND jr.deleted_at IS NULL
      AND (p_job_id IS NULL OR jr.job_id = p_job_id)
  ),
  totais AS (
    SELECT
      COALESCE(SUM(amount) FILTER (WHERE status != 'cancelado'), 0) AS total_previsto,
      COALESCE(SUM(amount) FILTER (WHERE status = 'recebido'), 0) AS total_recebido,
      COALESCE(SUM(amount) FILTER (WHERE status IN ('pendente', 'faturado')), 0) AS total_pendente,
      COALESCE(SUM(amount) FILTER (WHERE status = 'atrasado'), 0) AS total_atrasado,
      COALESCE(SUM(amount) FILTER (WHERE status = 'faturado'), 0) AS total_faturado,
      COALESCE(SUM(amount) FILTER (WHERE status = 'cancelado'), 0) AS total_cancelado,
      COUNT(*) FILTER (WHERE status != 'cancelado') AS parcelas_total,
      COUNT(*) FILTER (WHERE status = 'recebido') AS parcelas_recebidas,
      COUNT(*) FILTER (WHERE status IN ('pendente', 'faturado')) AS parcelas_pendentes,
      COUNT(*) FILTER (WHERE status = 'atrasado') AS parcelas_atrasadas
    FROM recebiveis
  ),
  proxima AS (
    SELECT
      r.due_date AS prox_data,
      r.amount AS prox_valor,
      r.r_job_id AS prox_job_id,
      r.r_description AS prox_descricao
    FROM recebiveis r
    WHERE r.status IN ('pendente', 'faturado')
      AND r.due_date IS NOT NULL
    ORDER BY r.due_date ASC
    LIMIT 1
  )
  SELECT
    t.total_previsto,
    t.total_recebido,
    t.total_pendente,
    t.total_atrasado,
    t.total_faturado,
    t.total_cancelado,
    t.parcelas_total,
    t.parcelas_recebidas,
    t.parcelas_pendentes,
    t.parcelas_atrasadas,
    p.prox_data,
    p.prox_valor,
    p.prox_job_id,
    p.prox_descricao
  FROM totais t
  LEFT JOIN proxima p ON true;
END;
$$;

COMMENT ON FUNCTION get_receivables_summary(UUID, UUID) IS
  'Retorna resumo financeiro de recebiveis do tenant. Filtro opcional por job_id. Valida tenant do caller.';

-- ========================================
-- 6. View: vw_calendario_recebiveis
-- Complementa vw_calendario_pagamentos (custos) com o lado da receita.
-- ========================================
CREATE OR REPLACE VIEW vw_calendario_recebiveis
WITH (security_invoker = true)
AS
SELECT
  jr.tenant_id,
  jr.due_date,
  jr.job_id,
  j.code AS job_code,
  j.title AS job_title,
  COUNT(*) FILTER (WHERE jr.status != 'cancelado') AS installments_count,
  COUNT(*) FILTER (WHERE jr.status = 'recebido') AS installments_received,
  COUNT(*) FILTER (WHERE jr.status IN ('pendente', 'faturado')) AS installments_pending,
  COUNT(*) FILTER (WHERE jr.status = 'atrasado') AS installments_overdue,
  COALESCE(SUM(jr.amount) FILTER (WHERE jr.status != 'cancelado'), 0) AS total_expected,
  COALESCE(SUM(jr.amount) FILTER (WHERE jr.status = 'recebido'), 0) AS total_received,
  COALESCE(SUM(jr.amount) FILTER (WHERE jr.status IN ('pendente', 'faturado')), 0) AS total_pending,
  COALESCE(SUM(jr.amount) FILTER (WHERE jr.status = 'atrasado'), 0) AS total_overdue,
  (jr.due_date < CURRENT_DATE AND COUNT(*) FILTER (WHERE jr.status IN ('pendente', 'faturado')) > 0) AS has_overdue
FROM job_receivables jr
JOIN jobs j ON j.id = jr.job_id
WHERE jr.deleted_at IS NULL
  AND jr.due_date IS NOT NULL
GROUP BY jr.tenant_id, jr.due_date, jr.job_id, j.code, j.title
ORDER BY jr.due_date ASC;

COMMENT ON VIEW vw_calendario_recebiveis IS
  'Calendario de recebiveis agrupado por data e job. Complementa vw_calendario_pagamentos. SECURITY INVOKER = RLS das tabelas base se aplica.';
