-- ============================================================
-- Migration: Formulario de Cadastro de Equipe por Job
-- Substitui Google Forms para registro de freelancers por job.
-- Cada job pode ter um link publico unico (token UUID) que
-- freelancers acessam para se cadastrar na equipe do job.
-- ============================================================

SET search_path TO public;

-- ============================================================
-- 1. ALTER TABLE jobs — campos para link de registro de equipe
-- ============================================================

ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS crew_registration_token   UUID DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS crew_registration_enabled BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN jobs.crew_registration_token IS 'Token UUID unico para o link publico de registro de equipe do job';
COMMENT ON COLUMN jobs.crew_registration_enabled IS 'Toggle para ativar/desativar o formulario publico de registro de equipe';

-- Unique index no token (parcial: apenas tokens nao nulos)
CREATE UNIQUE INDEX IF NOT EXISTS idx_jobs_crew_registration_token
  ON jobs (crew_registration_token) WHERE crew_registration_token IS NOT NULL;

-- ============================================================
-- 2. ALTER TABLE vendors — campos de identificacao profissional
-- ============================================================

ALTER TABLE vendors
  ADD COLUMN IF NOT EXISTS drt  TEXT,
  ADD COLUMN IF NOT EXISTS ctps TEXT;

COMMENT ON COLUMN vendors.drt IS 'Registro profissional DRT (Delegacia Regional do Trabalho)';
COMMENT ON COLUMN vendors.ctps IS 'Numero da Carteira de Trabalho e Previdencia Social';

-- ============================================================
-- 3. CREATE TABLE job_crew_registrations
-- Armazena os dados de participacao de freelancers por job.
-- Um registro por email por job (UNIQUE constraint).
-- ============================================================

CREATE TABLE IF NOT EXISTS job_crew_registrations (
  id             UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID           NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  job_id         UUID           NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  vendor_id      UUID           REFERENCES vendors(id) ON DELETE SET NULL,

  -- Dados do freelancer
  full_name      TEXT           NOT NULL,
  email          TEXT           NOT NULL,
  job_role       TEXT           NOT NULL,
  num_days       SMALLINT       NOT NULL,
  daily_rate     NUMERIC(12,2)  NOT NULL,

  -- Flags
  is_veteran     BOOLEAN        NOT NULL DEFAULT false,

  -- Observacoes
  notes          TEXT,

  -- Controle
  created_at     TIMESTAMPTZ    NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ    NOT NULL DEFAULT now(),
  deleted_at     TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT chk_crew_reg_num_days   CHECK (num_days > 0),
  CONSTRAINT chk_crew_reg_daily_rate CHECK (daily_rate > 0)
);

COMMENT ON TABLE job_crew_registrations IS 'Registros de freelancers por job — substitui Google Forms para cadastro de equipe';
COMMENT ON COLUMN job_crew_registrations.vendor_id IS 'Referencia ao vendor se o freelancer ja estava cadastrado no sistema';
COMMENT ON COLUMN job_crew_registrations.job_role IS 'Funcao no job (ex: Operador de Camera, Eletricista, Maquinista)';
COMMENT ON COLUMN job_crew_registrations.num_days IS 'Numero de diarias contratadas para este job';
COMMENT ON COLUMN job_crew_registrations.daily_rate IS 'Cache por diaria (R$)';
COMMENT ON COLUMN job_crew_registrations.is_veteran IS 'Se o freelancer ja era cadastrado antes deste registro (veterano)';

-- ============================================================
-- Indices
-- ============================================================

-- FK indices (regra: indice em TODA foreign key)
CREATE INDEX IF NOT EXISTS idx_job_crew_tenant_id
  ON job_crew_registrations (tenant_id);

CREATE INDEX IF NOT EXISTS idx_job_crew_job
  ON job_crew_registrations (job_id);

CREATE INDEX IF NOT EXISTS idx_job_crew_vendor
  ON job_crew_registrations (vendor_id) WHERE vendor_id IS NOT NULL;

-- UNIQUE: um email por job (case-insensitive, soft delete safe)
CREATE UNIQUE INDEX IF NOT EXISTS idx_job_crew_unique_email
  ON job_crew_registrations (job_id, LOWER(email)) WHERE deleted_at IS NULL;

-- ============================================================
-- Trigger: updated_at automatico
-- ============================================================

DROP TRIGGER IF EXISTS trg_job_crew_reg_updated_at ON job_crew_registrations;
CREATE TRIGGER trg_job_crew_reg_updated_at
  BEFORE UPDATE ON job_crew_registrations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- RLS: job_crew_registrations — isolamento por tenant
-- ============================================================

ALTER TABLE job_crew_registrations ENABLE ROW LEVEL SECURITY;

-- SELECT: usuarios autenticados veem apenas registros do seu tenant
DROP POLICY IF EXISTS job_crew_registrations_select ON job_crew_registrations;
CREATE POLICY job_crew_registrations_select ON job_crew_registrations
  FOR SELECT TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()));

-- INSERT/UPDATE/DELETE: nao necessario para usuarios autenticados normais.
-- Insercoes publicas sao feitas via Edge Function com service_role (bypassa RLS).
-- Usuarios internos podem gerenciar via EF tambem.

-- ============================================================
-- Audit trail (se fn_audit_log existir)
-- ============================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'fn_audit_log') THEN
    DROP TRIGGER IF EXISTS audit_log_job_crew_registrations ON job_crew_registrations;
    CREATE TRIGGER audit_log_job_crew_registrations
      AFTER INSERT OR UPDATE OR DELETE ON job_crew_registrations
      FOR EACH ROW EXECUTE FUNCTION fn_audit_log();
  END IF;
END $$;
