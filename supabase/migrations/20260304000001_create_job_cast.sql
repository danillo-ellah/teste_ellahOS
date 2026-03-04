-- Elenco (cast) por job de filmagem
-- Armazena dados pessoais, contato, financeiro e status de contrato de cada ator/figurante
SET search_path TO public;

CREATE TABLE IF NOT EXISTS job_cast (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  job_id          UUID        NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  person_id       UUID        REFERENCES people(id) ON DELETE SET NULL,

  -- Dados pessoais
  name            TEXT        NOT NULL,
  cast_category   TEXT        NOT NULL DEFAULT 'ator',
  character_name  TEXT,
  cpf             TEXT,
  rg              TEXT,
  birth_date      DATE,
  drt             TEXT,
  profession      TEXT,

  -- Contato
  email           TEXT,
  phone           TEXT,

  -- Endereco
  address         TEXT,
  city            TEXT,
  state           TEXT,
  zip_code        TEXT,

  -- Financeiro (4 valores do contrato)
  service_fee     NUMERIC(12,2) DEFAULT 0,
  image_rights_fee NUMERIC(12,2) DEFAULT 0,
  agency_fee      NUMERIC(12,2) DEFAULT 0,
  total_fee       NUMERIC(12,2) DEFAULT 0,
  num_days        INT         DEFAULT 1,

  -- Atuacao
  scenes_description TEXT,

  -- Agencia de casting (JSONB)
  casting_agency  JSONB,

  -- Status
  data_status     TEXT        DEFAULT 'incompleto'
    CHECK (data_status IN ('completo', 'incompleto')),
  contract_status TEXT        DEFAULT 'pendente'
    CHECK (contract_status IN ('pendente', 'enviado', 'assinado', 'cancelado')),

  -- Controle
  sort_order      INT         DEFAULT 0,
  notes           TEXT,
  created_by      UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_job_cast_tenant ON job_cast(tenant_id);
CREATE INDEX IF NOT EXISTS idx_job_cast_job ON job_cast(job_id);
CREATE INDEX IF NOT EXISTS idx_job_cast_cpf ON job_cast(cpf) WHERE cpf IS NOT NULL;

-- updated_at trigger
DROP TRIGGER IF EXISTS trg_job_cast_updated_at ON job_cast;
CREATE TRIGGER trg_job_cast_updated_at
  BEFORE UPDATE ON job_cast
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE job_cast ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS job_cast_select ON job_cast;
CREATE POLICY job_cast_select ON job_cast
  FOR SELECT TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()));

DROP POLICY IF EXISTS job_cast_insert ON job_cast;
CREATE POLICY job_cast_insert ON job_cast
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = (SELECT get_tenant_id()));

DROP POLICY IF EXISTS job_cast_update ON job_cast;
CREATE POLICY job_cast_update ON job_cast
  FOR UPDATE TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()))
  WITH CHECK (tenant_id = (SELECT get_tenant_id()));

DROP POLICY IF EXISTS job_cast_delete ON job_cast;
CREATE POLICY job_cast_delete ON job_cast
  FOR DELETE TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()));
