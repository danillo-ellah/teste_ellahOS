-- ============================================================
-- Migration 003: Clients, Agencies, Contacts, People
-- Fase 1 - Schema Base (Cadastros)
-- ============================================================

-- ============================================================
-- Tabela: clients (anunciantes / clientes finais)
-- ============================================================

CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name TEXT NOT NULL,
  trading_name TEXT,
  cnpj TEXT,
  segment client_segment,
  website TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  cep TEXT,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_clients_tenant_id ON clients(tenant_id);
CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(tenant_id, name);

-- Trigger updated_at
CREATE TRIGGER trg_clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- Tabela: agencies (agencias de publicidade)
-- ============================================================

CREATE TABLE IF NOT EXISTS agencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name TEXT NOT NULL,
  trading_name TEXT,
  cnpj TEXT,
  website TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  cep TEXT,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_agencies_tenant_id ON agencies(tenant_id);
CREATE INDEX IF NOT EXISTS idx_agencies_name ON agencies(tenant_id, name);

-- Trigger updated_at
CREATE TRIGGER trg_agencies_updated_at
  BEFORE UPDATE ON agencies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- Tabela: contacts (contatos de clientes e agencias)
-- ============================================================

CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  client_id UUID REFERENCES clients(id),
  agency_id UUID REFERENCES agencies(id),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  role TEXT,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_contacts_tenant_id ON contacts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_contacts_client_id ON contacts(client_id);
CREATE INDEX IF NOT EXISTS idx_contacts_agency_id ON contacts(agency_id);

COMMENT ON COLUMN contacts.role IS 'Funcao do contato na empresa (ex: Gerente de Marketing, Diretor Criativo)';

-- Trigger updated_at
CREATE TRIGGER trg_contacts_updated_at
  BEFORE UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- Tabela: people (staff interno, freelancers, elenco)
-- ============================================================

CREATE TABLE IF NOT EXISTS people (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  profile_id UUID REFERENCES profiles(id),
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  cpf TEXT,
  rg TEXT,
  birth_date DATE,
  address TEXT,
  city TEXT,
  state TEXT,
  cep TEXT,
  profession TEXT,
  default_role team_role,
  default_rate NUMERIC(12,2),
  is_internal BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  drt TEXT,
  ctps_number TEXT,
  ctps_series TEXT,
  bank_info JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_people_tenant_id ON people(tenant_id);
CREATE INDEX IF NOT EXISTS idx_people_profile_id ON people(profile_id);
CREATE INDEX IF NOT EXISTS idx_people_full_name ON people(tenant_id, full_name);

COMMENT ON COLUMN people.profile_id IS 'Vinculo com profiles para quem tem login no sistema';
COMMENT ON COLUMN people.is_internal IS 'true = staff fixo da produtora, false = freelancer/externo';
COMMENT ON COLUMN people.drt IS 'Registro profissional DRT (atores/tecnicos)';
COMMENT ON COLUMN people.ctps_number IS 'Numero da CTPS (para CLT)';
COMMENT ON COLUMN people.bank_info IS 'Dados bancarios: { bank_name, bank_code, agency, account, account_type, pix_key, pix_key_type, holder_name, holder_document }';

-- CHECK constraint para validar estrutura do bank_info
ALTER TABLE people ADD CONSTRAINT chk_people_bank_info_valid_structure
  CHECK (
    bank_info IS NULL
    OR (
      jsonb_typeof(bank_info) = 'object'
    )
  );

-- Trigger updated_at
CREATE TRIGGER trg_people_updated_at
  BEFORE UPDATE ON people
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- RLS: clients
-- ============================================================

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY clients_select_tenant ON clients
  FOR SELECT TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()));

CREATE POLICY clients_insert_tenant ON clients
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = (SELECT get_tenant_id()));

CREATE POLICY clients_update_tenant ON clients
  FOR UPDATE TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()))
  WITH CHECK (tenant_id = (SELECT get_tenant_id()));

CREATE POLICY clients_delete_tenant ON clients
  FOR DELETE TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()));

-- ============================================================
-- RLS: agencies
-- ============================================================

ALTER TABLE agencies ENABLE ROW LEVEL SECURITY;

CREATE POLICY agencies_select_tenant ON agencies
  FOR SELECT TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()));

CREATE POLICY agencies_insert_tenant ON agencies
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = (SELECT get_tenant_id()));

CREATE POLICY agencies_update_tenant ON agencies
  FOR UPDATE TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()))
  WITH CHECK (tenant_id = (SELECT get_tenant_id()));

CREATE POLICY agencies_delete_tenant ON agencies
  FOR DELETE TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()));

-- ============================================================
-- RLS: contacts
-- ============================================================

ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY contacts_select_tenant ON contacts
  FOR SELECT TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()));

CREATE POLICY contacts_insert_tenant ON contacts
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = (SELECT get_tenant_id()));

CREATE POLICY contacts_update_tenant ON contacts
  FOR UPDATE TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()))
  WITH CHECK (tenant_id = (SELECT get_tenant_id()));

CREATE POLICY contacts_delete_tenant ON contacts
  FOR DELETE TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()));

-- ============================================================
-- RLS: people
-- ============================================================

ALTER TABLE people ENABLE ROW LEVEL SECURITY;

CREATE POLICY people_select_tenant ON people
  FOR SELECT TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()));

CREATE POLICY people_insert_tenant ON people
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = (SELECT get_tenant_id()));

CREATE POLICY people_update_tenant ON people
  FOR UPDATE TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()))
  WITH CHECK (tenant_id = (SELECT get_tenant_id()));

CREATE POLICY people_delete_tenant ON people
  FOR DELETE TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()));
