-- ============================================================
-- Migration 008: Fix schema gaps
-- Adiciona: created_by em jobs, custom_fields, job_shooting_dates,
-- deliverable_status 'aprovado'
-- Fase 1 - Fix pos-auditoria (BUG-002, BUG-003, BUG-005, BUG-006)
-- ============================================================

-- ============================================================
-- BUG-002: Adicionar created_by em jobs (auditoria de criacao)
-- Nota: Coluna pode ja existir se migration 004 ja a incluiu
-- ============================================================

DO $$ BEGIN
  ALTER TABLE jobs ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(id);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_jobs_created_by ON jobs(created_by);

-- ============================================================
-- BUG-003: Adicionar custom_fields em jobs (customizacao por tenant)
-- ============================================================

DO $$ BEGIN
  ALTER TABLE jobs ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}';
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_jobs_custom_fields ON jobs USING GIN(custom_fields);

-- ============================================================
-- BUG-005: Criar tabela job_shooting_dates (diarias de filmagem)
-- Substitui o array shooting_dates date[] por tabela com metadados
-- ============================================================

CREATE TABLE IF NOT EXISTS job_shooting_dates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  shooting_date DATE NOT NULL,
  description TEXT,
  location TEXT,
  start_time TIME,
  end_time TIME,
  notes TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_job_shooting_dates_tenant_id ON job_shooting_dates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_job_shooting_dates_job_id ON job_shooting_dates(job_id);
CREATE INDEX IF NOT EXISTS idx_job_shooting_dates_date ON job_shooting_dates(tenant_id, shooting_date);

-- Trigger updated_at
DROP TRIGGER IF EXISTS trg_job_shooting_dates_updated_at ON job_shooting_dates;
CREATE TRIGGER trg_job_shooting_dates_updated_at
  BEFORE UPDATE ON job_shooting_dates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE job_shooting_dates ENABLE ROW LEVEL SECURITY;

CREATE POLICY job_shooting_dates_select_tenant ON job_shooting_dates
  FOR SELECT TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()));

CREATE POLICY job_shooting_dates_insert_tenant ON job_shooting_dates
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = (SELECT get_tenant_id()));

CREATE POLICY job_shooting_dates_update_tenant ON job_shooting_dates
  FOR UPDATE TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()))
  WITH CHECK (tenant_id = (SELECT get_tenant_id()));

CREATE POLICY job_shooting_dates_delete_tenant ON job_shooting_dates
  FOR DELETE TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()));

-- ============================================================
-- BUG-006: Adicionar valor 'aprovado' ao ENUM deliverable_status
-- Nota: ALTER TYPE ADD VALUE e idempotente no PostgreSQL 11+
-- com IF NOT EXISTS
-- ============================================================

DO $$ BEGIN
  ALTER TYPE deliverable_status ADD VALUE IF NOT EXISTS 'aprovado' BEFORE 'entregue';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- BUG-007: Adicionar version e updated_at em job_files
-- (se nao existem - a migration 005 ja pode te-los)
-- ============================================================

DO $$ BEGIN
  ALTER TABLE job_files ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE job_files ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
