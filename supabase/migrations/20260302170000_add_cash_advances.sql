-- =============================================================================
-- Migration: Extensao do modulo de Verbas a Vista (T1.6)
-- Adiciona colunas faltantes em cash_advances e expense_receipts
-- Adiciona coluna threshold_exceeded + campos de deposito + aprovacao
-- =============================================================================

-- ============================================================
-- 1. Adicionar colunas faltantes em cash_advances
-- ============================================================

-- Indica se o adiantamento excede o limite automatico (10% do orcamento)
-- Quando true, requer aprovacao de CEO/CFO
ALTER TABLE cash_advances
  ADD COLUMN IF NOT EXISTS threshold_exceeded BOOLEAN NOT NULL DEFAULT false;

-- Chave PIX usada no deposito (snapshot no momento do pagamento)
ALTER TABLE cash_advances
  ADD COLUMN IF NOT EXISTS pix_key_used TEXT;

-- Data em que o deposito foi realizado
ALTER TABLE cash_advances
  ADD COLUMN IF NOT EXISTS deposit_date DATE;

-- URL do comprovante do deposito (PIX/TED da empresa para o produtor)
ALTER TABLE cash_advances
  ADD COLUMN IF NOT EXISTS receipt_url TEXT;

-- Quem aprovou (necessario quando threshold_exceeded = true)
ALTER TABLE cash_advances
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- Quando foi aprovado
ALTER TABLE cash_advances
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

COMMENT ON COLUMN cash_advances.threshold_exceeded IS
  'true quando amount_authorized > 10% do closed_value do job. Requer aprovacao CEO/CFO.';
COMMENT ON COLUMN cash_advances.pix_key_used IS
  'Snapshot da chave PIX usada no deposito, registrada no momento do pagamento.';
COMMENT ON COLUMN cash_advances.deposit_date IS
  'Data em que o deposito foi realizado (pode diferir de created_at).';
COMMENT ON COLUMN cash_advances.receipt_url IS
  'URL do comprovante do deposito (screenshot do PIX ou TED).';
COMMENT ON COLUMN cash_advances.approved_by IS
  'Perfil que aprovou o adiantamento acima do threshold. NULL para adiantamentos dentro do limite.';
COMMENT ON COLUMN cash_advances.approved_at IS
  'Timestamp da aprovacao pelo CEO/CFO.';

-- ============================================================
-- 2. Indices para as novas colunas
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_cash_advances_threshold
  ON cash_advances(tenant_id, threshold_exceeded)
  WHERE deleted_at IS NULL AND threshold_exceeded = true;

CREATE INDEX IF NOT EXISTS idx_cash_advances_approved_by
  ON cash_advances(approved_by)
  WHERE approved_by IS NOT NULL;

-- ============================================================
-- 3. View: vw_cash_advances_summary
-- Resumo por job: total autorizado, depositado, comprovado, saldo
-- ============================================================

CREATE OR REPLACE VIEW vw_cash_advances_summary
WITH (security_invoker = true)
AS
SELECT
  ca.tenant_id,
  ca.job_id,
  COUNT(*) FILTER (WHERE ca.deleted_at IS NULL)                                  AS total_advances,
  COUNT(*) FILTER (WHERE ca.deleted_at IS NULL AND ca.status = 'aberta')         AS advances_open,
  COUNT(*) FILTER (WHERE ca.deleted_at IS NULL AND ca.status = 'encerrada')      AS advances_closed,
  COUNT(*) FILTER (WHERE ca.deleted_at IS NULL AND ca.threshold_exceeded = true) AS advances_over_threshold,
  COALESCE(SUM(ca.amount_authorized)  FILTER (WHERE ca.deleted_at IS NULL), 0)  AS total_authorized,
  COALESCE(SUM(ca.amount_deposited)   FILTER (WHERE ca.deleted_at IS NULL), 0)  AS total_deposited,
  COALESCE(SUM(ca.amount_documented)  FILTER (WHERE ca.deleted_at IS NULL), 0)  AS total_documented,
  COALESCE(SUM(ca.balance)            FILTER (WHERE ca.deleted_at IS NULL), 0)  AS total_balance
FROM cash_advances ca
GROUP BY ca.tenant_id, ca.job_id;

COMMENT ON VIEW vw_cash_advances_summary IS
  'Totais de verbas a vista por job. SECURITY INVOKER: RLS de cash_advances se aplica.';
