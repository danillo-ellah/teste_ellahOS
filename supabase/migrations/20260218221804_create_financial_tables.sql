
-- ============================================================
-- Migration 015: Tabelas financeiras
-- financial_records, budget_items, invoices, payment_history
-- ============================================================

-- ENUMs
DO $$ BEGIN
  CREATE TYPE financial_record_type AS ENUM ('receita', 'despesa');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE financial_record_status AS ENUM ('pendente', 'pago', 'atrasado', 'cancelado');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE financial_record_category AS ENUM (
    'cache_equipe', 'locacao', 'equipamento', 'transporte',
    'alimentacao', 'cenografia', 'figurino', 'pos_producao',
    'musica_audio', 'seguro', 'taxa_administrativa', 'imposto',
    'receita_cliente', 'adiantamento', 'reembolso', 'outro'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE payment_method AS ENUM (
    'pix', 'transferencia', 'boleto', 'cartao_credito',
    'cartao_debito', 'dinheiro', 'cheque', 'outro'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE invoice_type AS ENUM ('nf_servico', 'nf_produto', 'recibo', 'fatura');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE invoice_status AS ENUM ('emitida', 'paga', 'vencida', 'cancelada');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 1. financial_records
CREATE TABLE IF NOT EXISTS financial_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  job_id uuid REFERENCES jobs(id),
  type financial_record_type NOT NULL,
  category financial_record_category NOT NULL DEFAULT 'outro',
  description text NOT NULL,
  amount numeric(15, 2) NOT NULL,
  status financial_record_status NOT NULL DEFAULT 'pendente',
  due_date date,
  paid_at timestamp with time zone,
  payment_method payment_method,
  person_id uuid REFERENCES people(id),
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_at timestamp with time zone
);

-- 2. budget_items
CREATE TABLE IF NOT EXISTS budget_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  budget_id uuid NOT NULL REFERENCES job_budgets(id),
  category text NOT NULL DEFAULT 'geral',
  description text NOT NULL,
  quantity numeric(10, 2) NOT NULL DEFAULT 1,
  unit_value numeric(15, 2) NOT NULL DEFAULT 0,
  total_value numeric(15, 2) GENERATED ALWAYS AS (quantity * unit_value) STORED,
  display_order integer DEFAULT 0,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_at timestamp with time zone
);

-- 3. invoices
CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  job_id uuid REFERENCES jobs(id),
  type invoice_type NOT NULL DEFAULT 'nf_servico',
  nf_number text,
  amount numeric(15, 2) NOT NULL,
  status invoice_status NOT NULL DEFAULT 'emitida',
  issued_at date,
  due_date date,
  paid_at timestamp with time zone,
  pdf_url text,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_at timestamp with time zone
);

-- 4. payment_history (append-only)
CREATE TABLE IF NOT EXISTS payment_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  financial_record_id uuid NOT NULL REFERENCES financial_records(id),
  amount numeric(15, 2) NOT NULL,
  paid_at timestamp with time zone NOT NULL DEFAULT now(),
  payment_method payment_method,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_financial_records_tenant ON financial_records(tenant_id);
CREATE INDEX IF NOT EXISTS idx_financial_records_job ON financial_records(job_id);
CREATE INDEX IF NOT EXISTS idx_financial_records_status ON financial_records(status);
CREATE INDEX IF NOT EXISTS idx_financial_records_due_date ON financial_records(due_date);
CREATE INDEX IF NOT EXISTS idx_financial_records_person ON financial_records(person_id);
CREATE INDEX IF NOT EXISTS idx_budget_items_tenant ON budget_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_budget_items_budget ON budget_items(budget_id);
CREATE INDEX IF NOT EXISTS idx_invoices_tenant ON invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invoices_job ON invoices(job_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_payment_history_tenant ON payment_history(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_record ON payment_history(financial_record_id);

-- RLS
ALTER TABLE financial_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies (usando get_tenant_id() que ja existe)
DROP POLICY IF EXISTS financial_records_tenant_isolation ON financial_records;
CREATE POLICY financial_records_tenant_isolation ON financial_records
  USING (tenant_id = public.get_tenant_id());

DROP POLICY IF EXISTS budget_items_tenant_isolation ON budget_items;
CREATE POLICY budget_items_tenant_isolation ON budget_items
  USING (tenant_id = public.get_tenant_id());

DROP POLICY IF EXISTS invoices_tenant_isolation ON invoices;
CREATE POLICY invoices_tenant_isolation ON invoices
  USING (tenant_id = public.get_tenant_id());

DROP POLICY IF EXISTS payment_history_tenant_isolation ON payment_history;
CREATE POLICY payment_history_tenant_isolation ON payment_history
  USING (tenant_id = public.get_tenant_id());

-- Triggers: updated_at (nao para payment_history que e append-only)
DROP TRIGGER IF EXISTS update_financial_records_updated_at ON financial_records;
CREATE TRIGGER update_financial_records_updated_at
  BEFORE UPDATE ON financial_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_budget_items_updated_at ON budget_items;
CREATE TRIGGER update_budget_items_updated_at
  BEFORE UPDATE ON budget_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_invoices_updated_at ON invoices;
CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
