-- =============================================================================
-- Migration 019: Fase 10 — Modulo Financeiro (Schema Completo)
-- Cria 6 tabelas, 2 views, 1 ALTER, 2 functions, 3 triggers
-- =============================================================================

-- Extensao necessaria para dedup de vendors
CREATE EXTENSION IF NOT EXISTS unaccent SCHEMA public;

-- ========================================
-- 1. Funcao auxiliar: normalize_vendor_name
-- ========================================
CREATE OR REPLACE FUNCTION normalize_vendor_name(name TEXT)
RETURNS TEXT
LANGUAGE sql IMMUTABLE STRICT
SET search_path = public
AS $$
  SELECT lower(trim(unaccent(regexp_replace(name, '[^a-zA-Z0-9\s\-]', '', 'g'))))
$$;

COMMENT ON FUNCTION normalize_vendor_name(TEXT) IS
  'Normaliza nome de vendor para dedup: lowercase, trim, unaccent, remove especiais.';

-- ========================================
-- 2. Tabela: cost_categories
-- ========================================
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
  )
);

COMMENT ON TABLE cost_categories IS 'Templates de categorias de custo. Item 1-15 e 99 por tipo de producao.';

CREATE INDEX IF NOT EXISTS idx_cost_categories_tenant
  ON cost_categories(tenant_id, production_type) WHERE deleted_at IS NULL;

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

DROP TRIGGER IF EXISTS trg_cost_categories_updated_at ON cost_categories;
CREATE TRIGGER trg_cost_categories_updated_at
  BEFORE UPDATE ON cost_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ========================================
-- 3. Tabela: vendors
-- ========================================
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

DROP TRIGGER IF EXISTS trg_vendors_updated_at ON vendors;
CREATE TRIGGER trg_vendors_updated_at
  BEFORE UPDATE ON vendors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ========================================
-- 4. Tabela: bank_accounts
-- ========================================
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

CREATE UNIQUE INDEX IF NOT EXISTS uq_bank_accounts_primary
  ON bank_accounts(vendor_id)
  WHERE is_primary = true AND deleted_at IS NULL;

COMMENT ON TABLE bank_accounts IS 'Dados bancarios de vendors. Multiplas contas por vendor, uma primaria.';
COMMENT ON COLUMN bank_accounts.bank_code IS 'Codigo ISPB ou compensacao. Ex: 260=Nubank, 1=BB, 341=Itau.';
COMMENT ON COLUMN bank_accounts.pix_key_type IS 'Tipo da chave PIX: cpf, cnpj, email, telefone, aleatoria.';

CREATE INDEX IF NOT EXISTS idx_bank_accounts_vendor
  ON bank_accounts(vendor_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_bank_accounts_tenant
  ON bank_accounts(tenant_id) WHERE deleted_at IS NULL;

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

DROP TRIGGER IF EXISTS trg_bank_accounts_updated_at ON bank_accounts;
CREATE TRIGGER trg_bank_accounts_updated_at
  BEFORE UPDATE ON bank_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ========================================
-- 5. Tabela: cost_items (CENTRAL)
-- ========================================
CREATE TABLE IF NOT EXISTS cost_items (
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

  payment_condition     TEXT,
  payment_due_date      DATE,
  payment_method        TEXT,

  vendor_id             UUID          REFERENCES vendors(id) ON DELETE SET NULL,
  vendor_name_snapshot  TEXT,
  vendor_email_snapshot TEXT,
  vendor_pix_snapshot   TEXT,
  vendor_bank_snapshot  TEXT,

  item_status           TEXT          NOT NULL DEFAULT 'orcado',
  suggested_status      TEXT,
  status_note           TEXT,

  nf_request_status     TEXT          NOT NULL DEFAULT 'pendente',
  nf_requested_at       TIMESTAMPTZ,
  nf_requested_by       UUID          REFERENCES profiles(id) ON DELETE SET NULL,
  nf_document_id        UUID          REFERENCES nf_documents(id) ON DELETE SET NULL,
  nf_drive_url          TEXT,
  nf_filename           TEXT,
  nf_extracted_value    NUMERIC(12,2),
  nf_validation_ok      BOOLEAN,

  payment_status        TEXT          NOT NULL DEFAULT 'pendente',
  payment_date          DATE,
  payment_proof_url     TEXT,
  payment_proof_filename TEXT,

  created_at            TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ   NOT NULL DEFAULT now(),
  deleted_at            TIMESTAMPTZ,
  created_by            UUID          REFERENCES profiles(id) ON DELETE SET NULL,

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

DROP TRIGGER IF EXISTS trg_cost_items_updated_at ON cost_items;
CREATE TRIGGER trg_cost_items_updated_at
  BEFORE UPDATE ON cost_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Trigger: suggested_status
CREATE OR REPLACE FUNCTION fn_cost_items_suggested_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
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
    NEW.suggested_status := 'aguardando_nf';
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

-- ========================================
-- 6. Tabela: cash_advances
-- ========================================
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

CREATE INDEX IF NOT EXISTS idx_cash_advances_tenant_job
  ON cash_advances(tenant_id, job_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_cash_advances_recipient
  ON cash_advances(recipient_vendor_id) WHERE recipient_vendor_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cash_advances_status
  ON cash_advances(tenant_id, status) WHERE deleted_at IS NULL;

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

DROP TRIGGER IF EXISTS trg_cash_advances_updated_at ON cash_advances;
CREATE TRIGGER trg_cash_advances_updated_at
  BEFORE UPDATE ON cash_advances
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ========================================
-- 7. Tabela: expense_receipts
-- ========================================
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

CREATE INDEX IF NOT EXISTS idx_expense_receipts_cash_advance
  ON expense_receipts(cash_advance_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_expense_receipts_tenant_job
  ON expense_receipts(tenant_id, job_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_expense_receipts_status
  ON expense_receipts(tenant_id, status) WHERE deleted_at IS NULL;

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

DROP TRIGGER IF EXISTS trg_expense_receipts_updated_at ON expense_receipts;
CREATE TRIGGER trg_expense_receipts_updated_at
  BEFORE UPDATE ON expense_receipts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Trigger: recalcular amount_documented em cash_advances
CREATE OR REPLACE FUNCTION fn_recalc_cash_advance_documented()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_total NUMERIC(12,2);
BEGIN
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

-- ========================================
-- 8. ALTER TABLE: jobs (budget_mode)
-- ========================================
ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS budget_mode TEXT DEFAULT 'bottom_up';

-- Constraint so pode ser adicionada se nao existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_jobs_budget_mode'
  ) THEN
    ALTER TABLE jobs
      ADD CONSTRAINT chk_jobs_budget_mode CHECK (
        budget_mode IS NULL OR budget_mode IN ('bottom_up', 'top_down')
      );
  END IF;
END $$;

COMMENT ON COLUMN jobs.budget_mode IS 'Modo de orcamento: bottom_up (soma itens) ou top_down (teto fixo).';

-- ========================================
-- 9. View: vw_calendario_pagamentos
-- ========================================
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

-- ========================================
-- 10. View: vw_resumo_custos_job
-- ========================================
CREATE OR REPLACE VIEW vw_resumo_custos_job
WITH (security_invoker = true)
AS
WITH by_category AS (
  SELECT
    ci.tenant_id,
    ci.job_id,
    ci.item_number,
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
