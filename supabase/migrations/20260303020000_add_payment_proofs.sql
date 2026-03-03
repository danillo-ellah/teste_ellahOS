-- =============================================================================
-- Migration: T2.6 — Comprovante N:N (1 PIX, varios itens)
-- Data: 2026-03-03
--
-- Contexto:
--   Um unico comprovante de pagamento (ex: PIX, TED) pode cobrir multiplos
--   cost items. A tabela payment_proofs armazena o comprovante e a tabela
--   junction cost_item_payment_proofs faz o vinculo N:N com alocacao parcial
--   de valor.
--
--   Substitui o campo unitario cost_items.payment_proof_url, que continua
--   existindo para retrocompatibilidade com dados ja migrados.
--
-- Novas tabelas: payment_proofs, cost_item_payment_proofs
-- =============================================================================

SET search_path TO public;

-- -------------------------------------------------------
-- 1. Tabela payment_proofs
-- -------------------------------------------------------

CREATE TABLE IF NOT EXISTS payment_proofs (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID          NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Arquivo do comprovante
  file_url        TEXT          NOT NULL,
  file_name       TEXT,
  storage_path    TEXT,

  -- Dados do pagamento
  payment_date    DATE          NOT NULL,
  bank_reference  TEXT,
  amount          NUMERIC(12,2),
  payer_name      TEXT,

  notes           TEXT,

  -- Quem fez o upload
  uploaded_by     UUID          REFERENCES profiles(id) ON DELETE SET NULL,

  created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT chk_payment_proofs_amount_positive CHECK (
    amount IS NULL OR amount > 0
  ),
  CONSTRAINT chk_payment_proofs_file_url_not_empty CHECK (
    length(trim(file_url)) > 0
  )
);

-- -------------------------------------------------------
-- 2. Comentarios em colunas nao obvias
-- -------------------------------------------------------

COMMENT ON TABLE payment_proofs IS 'Comprovantes de pagamento (PIX, TED, boleto). Um comprovante pode cobrir N cost items via tabela junction.';
COMMENT ON COLUMN payment_proofs.file_url IS 'URL publica ou assinada do arquivo do comprovante (PDF, imagem).';
COMMENT ON COLUMN payment_proofs.file_name IS 'Nome original do arquivo enviado pelo usuario.';
COMMENT ON COLUMN payment_proofs.storage_path IS 'Path no Supabase Storage ou Google Drive para referencia interna.';
COMMENT ON COLUMN payment_proofs.payment_date IS 'Data efetiva do pagamento conforme consta no comprovante.';
COMMENT ON COLUMN payment_proofs.bank_reference IS 'Identificador do banco: codigo PIX end-to-end, numero do DOC/TED, linha digitavel do boleto.';
COMMENT ON COLUMN payment_proofs.amount IS 'Valor total do comprovante. Pode diferir da soma das alocacoes se houver taxas bancarias.';
COMMENT ON COLUMN payment_proofs.payer_name IS 'Nome do pagador conforme aparece no comprovante. Util para conciliacao.';
COMMENT ON COLUMN payment_proofs.uploaded_by IS 'Profile do usuario que fez o upload do comprovante.';

-- -------------------------------------------------------
-- 3. Tabela junction: cost_item_payment_proofs
-- -------------------------------------------------------

CREATE TABLE IF NOT EXISTS cost_item_payment_proofs (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID          NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  cost_item_id      UUID          NOT NULL REFERENCES cost_items(id) ON DELETE CASCADE,
  payment_proof_id  UUID          NOT NULL REFERENCES payment_proofs(id) ON DELETE CASCADE,

  -- Quanto deste comprovante se aplica a este cost item
  allocated_amount  NUMERIC(12,2),

  created_at        TIMESTAMPTZ   NOT NULL DEFAULT now(),

  -- Unicidade: um comprovante so pode ser vinculado uma vez ao mesmo cost item
  CONSTRAINT uq_cost_item_payment_proof UNIQUE (cost_item_id, payment_proof_id),

  -- Constraints
  CONSTRAINT chk_allocated_amount_positive CHECK (
    allocated_amount IS NULL OR allocated_amount > 0
  )
);

COMMENT ON TABLE cost_item_payment_proofs IS 'Vinculo N:N entre cost items e comprovantes de pagamento, com alocacao parcial de valor.';
COMMENT ON COLUMN cost_item_payment_proofs.allocated_amount IS 'Valor alocado deste comprovante para este cost item. NULL = valor total do comprovante aplica-se integralmente.';

-- -------------------------------------------------------
-- 4. Indices
-- -------------------------------------------------------

-- payment_proofs
CREATE INDEX IF NOT EXISTS idx_payment_proofs_tenant
  ON payment_proofs(tenant_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_payment_proofs_date
  ON payment_proofs(tenant_id, payment_date) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_payment_proofs_uploaded_by
  ON payment_proofs(uploaded_by) WHERE uploaded_by IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_payment_proofs_bank_reference
  ON payment_proofs(tenant_id, bank_reference)
  WHERE bank_reference IS NOT NULL AND deleted_at IS NULL;

-- cost_item_payment_proofs
CREATE INDEX IF NOT EXISTS idx_cost_item_payment_proofs_cost_item
  ON cost_item_payment_proofs(cost_item_id);

CREATE INDEX IF NOT EXISTS idx_cost_item_payment_proofs_proof
  ON cost_item_payment_proofs(payment_proof_id);

CREATE INDEX IF NOT EXISTS idx_cost_item_payment_proofs_tenant
  ON cost_item_payment_proofs(tenant_id);

-- -------------------------------------------------------
-- 5. Trigger updated_at (apenas payment_proofs — junction nao tem updated_at)
-- -------------------------------------------------------

DROP TRIGGER IF EXISTS trg_payment_proofs_updated_at ON payment_proofs;
CREATE TRIGGER trg_payment_proofs_updated_at
  BEFORE UPDATE ON payment_proofs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- -------------------------------------------------------
-- 6. RLS: payment_proofs (tenant isolation)
-- -------------------------------------------------------

ALTER TABLE payment_proofs ENABLE ROW LEVEL SECURITY;

-- SELECT: qualquer usuario autenticado ve comprovantes do seu tenant
DROP POLICY IF EXISTS payment_proofs_select_tenant ON payment_proofs;
CREATE POLICY payment_proofs_select_tenant ON payment_proofs
  FOR SELECT TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()));

-- INSERT: qualquer usuario autenticado insere no seu tenant
DROP POLICY IF EXISTS payment_proofs_insert_tenant ON payment_proofs;
CREATE POLICY payment_proofs_insert_tenant ON payment_proofs
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = (SELECT get_tenant_id()));

-- UPDATE: qualquer usuario autenticado atualiza no seu tenant
DROP POLICY IF EXISTS payment_proofs_update_tenant ON payment_proofs;
CREATE POLICY payment_proofs_update_tenant ON payment_proofs
  FOR UPDATE TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()))
  WITH CHECK (tenant_id = (SELECT get_tenant_id()));

-- DELETE: soft delete controlado pela aplicacao
-- Nao ha policy FOR DELETE — delecao fisica e bloqueada.

-- -------------------------------------------------------
-- 7. RLS: cost_item_payment_proofs (tenant isolation)
-- -------------------------------------------------------

ALTER TABLE cost_item_payment_proofs ENABLE ROW LEVEL SECURITY;

-- SELECT: qualquer usuario autenticado ve vinculos do seu tenant
DROP POLICY IF EXISTS cost_item_payment_proofs_select_tenant ON cost_item_payment_proofs;
CREATE POLICY cost_item_payment_proofs_select_tenant ON cost_item_payment_proofs
  FOR SELECT TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()));

-- INSERT: qualquer usuario autenticado insere no seu tenant
DROP POLICY IF EXISTS cost_item_payment_proofs_insert_tenant ON cost_item_payment_proofs;
CREATE POLICY cost_item_payment_proofs_insert_tenant ON cost_item_payment_proofs
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = (SELECT get_tenant_id()));

-- UPDATE: permite atualizar allocated_amount no seu tenant
DROP POLICY IF EXISTS cost_item_payment_proofs_update_tenant ON cost_item_payment_proofs;
CREATE POLICY cost_item_payment_proofs_update_tenant ON cost_item_payment_proofs
  FOR UPDATE TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()))
  WITH CHECK (tenant_id = (SELECT get_tenant_id()));

-- DELETE: junction pode ser desvinculada (nao e soft delete, mas delecao real do vinculo)
DROP POLICY IF EXISTS cost_item_payment_proofs_delete_tenant ON cost_item_payment_proofs;
CREATE POLICY cost_item_payment_proofs_delete_tenant ON cost_item_payment_proofs
  FOR DELETE TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()));

-- -------------------------------------------------------
-- 8. Verificacao de isolamento de tenant (teste mental)
-- -------------------------------------------------------
-- payment_proofs:
--   SELECT: tenant_id = get_tenant_id() -> Tenant A NAO ve comprovantes do Tenant B. OK.
--   INSERT: WITH CHECK -> So insere com seu proprio tenant_id. OK.
--   UPDATE: USING + WITH CHECK duplo -> So atualiza registros do seu tenant. OK.
--   DELETE fisico: SEM policy -> bloqueado para todos. OK.
--
-- cost_item_payment_proofs:
--   SELECT: tenant_id = get_tenant_id() -> Tenant A NAO ve vinculos do Tenant B. OK.
--   INSERT: WITH CHECK -> So insere com seu proprio tenant_id. OK.
--   UPDATE: USING + WITH CHECK duplo -> So atualiza vinculos do seu tenant. OK.
--   DELETE: USING tenant_id -> So remove vinculos do seu tenant. OK.
--     (DELETE real permitido aqui: junction nao tem soft delete, desvincular e operacao normal)

-- =============================================================================
-- FIM da migration — T2.6 Comprovante N:N
-- Novas tabelas: payment_proofs, cost_item_payment_proofs (total: 41)
-- Indices: 7 (proofs: 4, junction: 3)
-- RLS: 7 policies (proofs: 3, junction: 4 incluindo DELETE)
-- Triggers: 1 (updated_at em payment_proofs)
-- Constraints: 4 (proofs: 2, junction: 2 incluindo UNIQUE)
-- =============================================================================
