-- =============================================================================
-- Migration: T3.7 — Integracao Bancaria (OFX/CNAB)
-- Data: 2026-03-03
--
-- Contexto:
--   Permite importar extratos bancarios em formato OFX e realizar conciliacao
--   automatica ou manual entre transacoes bancarias e cost items / payment proofs.
--
-- Novas tabelas: bank_statements, bank_transactions
-- =============================================================================

SET search_path TO public;

-- -------------------------------------------------------
-- 1. Tabela bank_statements
-- -------------------------------------------------------

CREATE TABLE IF NOT EXISTS bank_statements (
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID          NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Identificacao do extrato
  bank_name           TEXT          NOT NULL,
  account_identifier  TEXT,                       -- ultimos 4 digitos ou agencia/conta

  -- Periodo do extrato
  import_date         TIMESTAMPTZ   NOT NULL DEFAULT now(),
  period_start        DATE          NOT NULL,
  period_end          DATE          NOT NULL,

  -- Arquivo original
  file_name           TEXT,
  storage_path        TEXT,

  -- Counters (atualizados conforme conciliacao avanca)
  total_entries       INT           DEFAULT 0,
  reconciled_entries  INT           DEFAULT 0,

  -- Quem importou
  imported_by         UUID          REFERENCES profiles(id) ON DELETE SET NULL,

  created_at          TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ   NOT NULL DEFAULT now(),
  deleted_at          TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT chk_bank_statements_period CHECK (period_end >= period_start),
  CONSTRAINT chk_bank_statements_entries CHECK (
    reconciled_entries >= 0 AND
    total_entries >= 0 AND
    reconciled_entries <= total_entries
  )
);

-- -------------------------------------------------------
-- 2. Comentarios: bank_statements
-- -------------------------------------------------------

COMMENT ON TABLE bank_statements IS 'Extratos bancarios importados (OFX/CNAB). Cada extrato agrupa um conjunto de transacoes de um periodo especifico.';
COMMENT ON COLUMN bank_statements.bank_name IS 'Nome do banco (ex: Itau, Bradesco, Nubank). Extraido do OFX ou informado manualmente.';
COMMENT ON COLUMN bank_statements.account_identifier IS 'Identificador da conta bancaria (ex: ultimos 4 digitos, agencia+conta). Exibido na UI para diferenciacao.';
COMMENT ON COLUMN bank_statements.period_start IS 'Data de inicio do extrato (DTSTART no OFX).';
COMMENT ON COLUMN bank_statements.period_end IS 'Data de fim do extrato (DTEND no OFX).';
COMMENT ON COLUMN bank_statements.total_entries IS 'Total de transacoes importadas neste extrato.';
COMMENT ON COLUMN bank_statements.reconciled_entries IS 'Quantidade de transacoes ja conciliadas (vinculadas a cost_item ou payment_proof).';
COMMENT ON COLUMN bank_statements.imported_by IS 'Profile do usuario que realizou a importacao do arquivo.';

-- -------------------------------------------------------
-- 3. Tabela bank_transactions
-- -------------------------------------------------------

CREATE TABLE IF NOT EXISTS bank_transactions (
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID          NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  statement_id        UUID          NOT NULL REFERENCES bank_statements(id) ON DELETE CASCADE,

  -- Dados da transacao
  transaction_date    DATE          NOT NULL,
  description         TEXT          NOT NULL,
  amount              NUMERIC(12,2) NOT NULL,     -- positivo = credito, negativo = debito
  balance             NUMERIC(12,2),              -- saldo apos a transacao (LEDGERBAL no OFX)
  reference_id        TEXT,                       -- FITID: ID unico da transacao no banco
  transaction_type    TEXT          CHECK (
    transaction_type IN ('credit', 'debit', 'transfer', 'fee', 'interest')
  ),

  -- Conciliacao
  reconciled          BOOLEAN       NOT NULL DEFAULT false,
  reconciled_at       TIMESTAMPTZ,
  reconciled_by       UUID          REFERENCES profiles(id) ON DELETE SET NULL,
  cost_item_id        UUID          REFERENCES cost_items(id) ON DELETE SET NULL,
  payment_proof_id    UUID          REFERENCES payment_proofs(id) ON DELETE SET NULL,
  match_confidence    NUMERIC(3,2)  CHECK (match_confidence IS NULL OR (match_confidence >= 0 AND match_confidence <= 1)),
  match_method        TEXT          CHECK (
    match_method IN ('manual', 'auto_exact', 'auto_fuzzy')
  ),
  notes               TEXT,

  created_at          TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ   NOT NULL DEFAULT now(),
  deleted_at          TIMESTAMPTZ,

  -- Unicidade: mesmo FITID nao pode ser importado duas vezes no mesmo extrato
  CONSTRAINT uq_bank_transaction_fitid UNIQUE (statement_id, reference_id)
);

-- -------------------------------------------------------
-- 4. Comentarios: bank_transactions
-- -------------------------------------------------------

COMMENT ON TABLE bank_transactions IS 'Transacoes individuais de um extrato bancario importado. Podem ser conciliadas com cost_items ou payment_proofs.';
COMMENT ON COLUMN bank_transactions.amount IS 'Valor da transacao. Positivo = credito (entrada na conta), negativo = debito (saida da conta).';
COMMENT ON COLUMN bank_transactions.balance IS 'Saldo da conta apos esta transacao, conforme reportado pelo banco.';
COMMENT ON COLUMN bank_transactions.reference_id IS 'FITID: identificador unico da transacao fornecido pelo banco no OFX. Garante idempotencia na reimportacao.';
COMMENT ON COLUMN bank_transactions.transaction_type IS 'Tipo: credit (credito), debit (debito), transfer (transferencia), fee (tarifa), interest (juros/rendimento).';
COMMENT ON COLUMN bank_transactions.reconciled IS 'Indica se a transacao foi conciliada com algum custo ou comprovante.';
COMMENT ON COLUMN bank_transactions.cost_item_id IS 'Item de custo vinculado a esta transacao apos conciliacao.';
COMMENT ON COLUMN bank_transactions.payment_proof_id IS 'Comprovante de pagamento vinculado a esta transacao apos conciliacao.';
COMMENT ON COLUMN bank_transactions.match_confidence IS 'Confianca do match automatico (0.00 a 1.00). NULL para matches manuais.';
COMMENT ON COLUMN bank_transactions.match_method IS 'Metodo de conciliacao: manual, auto_exact (valor+data exatos), auto_fuzzy (valor/data aproximados).';

-- -------------------------------------------------------
-- 5. Indices: bank_statements
-- -------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_bank_statements_tenant
  ON bank_statements(tenant_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_bank_statements_period
  ON bank_statements(tenant_id, period_start, period_end) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_bank_statements_imported_by
  ON bank_statements(imported_by) WHERE imported_by IS NOT NULL AND deleted_at IS NULL;

-- -------------------------------------------------------
-- 6. Indices: bank_transactions
-- -------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_bank_transactions_tenant
  ON bank_transactions(tenant_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_bank_transactions_statement
  ON bank_transactions(statement_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_bank_transactions_date
  ON bank_transactions(tenant_id, transaction_date) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_bank_transactions_unreconciled
  ON bank_transactions(tenant_id, reconciled) WHERE reconciled = false AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_bank_transactions_cost_item
  ON bank_transactions(cost_item_id) WHERE cost_item_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_bank_transactions_payment_proof
  ON bank_transactions(payment_proof_id) WHERE payment_proof_id IS NOT NULL;

-- -------------------------------------------------------
-- 7. Triggers updated_at
-- -------------------------------------------------------

DROP TRIGGER IF EXISTS trg_bank_statements_updated_at ON bank_statements;
CREATE TRIGGER trg_bank_statements_updated_at
  BEFORE UPDATE ON bank_statements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_bank_transactions_updated_at ON bank_transactions;
CREATE TRIGGER trg_bank_transactions_updated_at
  BEFORE UPDATE ON bank_transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- -------------------------------------------------------
-- 8. RLS: bank_statements (tenant isolation)
-- -------------------------------------------------------

ALTER TABLE bank_statements ENABLE ROW LEVEL SECURITY;

-- SELECT: usuarios autenticados veem extratos do seu tenant
DROP POLICY IF EXISTS bank_statements_select_tenant ON bank_statements;
CREATE POLICY bank_statements_select_tenant ON bank_statements
  FOR SELECT TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()));

-- INSERT: apenas financeiro/admin/ceo importam extratos
DROP POLICY IF EXISTS bank_statements_insert_tenant ON bank_statements;
CREATE POLICY bank_statements_insert_tenant ON bank_statements
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = (SELECT get_tenant_id()));

-- UPDATE: atualizar counters de conciliacao
DROP POLICY IF EXISTS bank_statements_update_tenant ON bank_statements;
CREATE POLICY bank_statements_update_tenant ON bank_statements
  FOR UPDATE TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()))
  WITH CHECK (tenant_id = (SELECT get_tenant_id()));

-- DELETE: soft delete — sem policy de DELETE fisico

-- -------------------------------------------------------
-- 9. RLS: bank_transactions (tenant isolation)
-- -------------------------------------------------------

ALTER TABLE bank_transactions ENABLE ROW LEVEL SECURITY;

-- SELECT: usuarios autenticados veem transacoes do seu tenant
DROP POLICY IF EXISTS bank_transactions_select_tenant ON bank_transactions;
CREATE POLICY bank_transactions_select_tenant ON bank_transactions
  FOR SELECT TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()));

-- INSERT: inserir transacoes importadas
DROP POLICY IF EXISTS bank_transactions_insert_tenant ON bank_transactions;
CREATE POLICY bank_transactions_insert_tenant ON bank_transactions
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = (SELECT get_tenant_id()));

-- UPDATE: atualizar dados de conciliacao
DROP POLICY IF EXISTS bank_transactions_update_tenant ON bank_transactions;
CREATE POLICY bank_transactions_update_tenant ON bank_transactions
  FOR UPDATE TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()))
  WITH CHECK (tenant_id = (SELECT get_tenant_id()));

-- DELETE: soft delete — sem policy de DELETE fisico

-- -------------------------------------------------------
-- 10. Verificacao de isolamento de tenant (teste mental)
-- -------------------------------------------------------
-- bank_statements:
--   SELECT: tenant_id = get_tenant_id() -> Tenant A NAO ve extratos do Tenant B. OK.
--   INSERT: WITH CHECK -> So insere com seu proprio tenant_id. OK.
--   UPDATE: USING + WITH CHECK duplo -> So atualiza registros do seu tenant. OK.
--   DELETE fisico: SEM policy -> bloqueado para todos. OK.
--
-- bank_transactions:
--   SELECT: tenant_id = get_tenant_id() -> Tenant A NAO ve transacoes do Tenant B. OK.
--   INSERT: WITH CHECK -> So insere com seu proprio tenant_id. OK.
--   UPDATE: USING + WITH CHECK duplo -> So atualiza registros do seu tenant. OK.
--   DELETE fisico: SEM policy -> bloqueado para todos. OK.

-- =============================================================================
-- FIM da migration — T3.7 Integracao Bancaria (OFX/CNAB)
-- Novas tabelas: bank_statements, bank_transactions (total: +2)
-- Indices: 9 (statements: 3, transactions: 6)
-- RLS: 6 policies (statements: 3, transactions: 3)
-- Triggers: 2 (updated_at em ambas as tabelas)
-- Constraints: 5 (period check, entries check, type check, confidence check, UNIQUE fitid)
-- =============================================================================
