-- ============================================================
-- Migration 009b: Create job_shooting_dates IF NOT EXISTS
-- Safety net caso a tabela ja tenha sido criada na migration 008
-- Migrar dados do array shooting_dates para a tabela
-- Fase 1 - Complemento
-- ============================================================

-- ============================================================
-- 1. Garantir que a tabela existe (IF NOT EXISTS)
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

-- Indices (IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_job_shooting_dates_tenant_id ON job_shooting_dates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_job_shooting_dates_job_id ON job_shooting_dates(job_id);
CREATE INDEX IF NOT EXISTS idx_job_shooting_dates_date ON job_shooting_dates(tenant_id, shooting_date);

-- RLS (idempotente)
ALTER TABLE job_shooting_dates ENABLE ROW LEVEL SECURITY;

-- Drop e recria policies para garantir estado limpo
DROP POLICY IF EXISTS job_shooting_dates_select_tenant ON job_shooting_dates;
DROP POLICY IF EXISTS job_shooting_dates_insert_tenant ON job_shooting_dates;
DROP POLICY IF EXISTS job_shooting_dates_update_tenant ON job_shooting_dates;
DROP POLICY IF EXISTS job_shooting_dates_delete_tenant ON job_shooting_dates;

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

-- Trigger updated_at (idempotente)
DROP TRIGGER IF EXISTS trg_job_shooting_dates_updated_at ON job_shooting_dates;
CREATE TRIGGER trg_job_shooting_dates_updated_at
  BEFORE UPDATE ON job_shooting_dates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 2. Migrar dados do array shooting_dates para a tabela
-- Se existirem jobs com o array preenchido
-- ============================================================

DO $$
DECLARE
  v_job RECORD;
  v_date DATE;
  v_order INTEGER;
BEGIN
  -- Iterar sobre jobs que tem shooting_dates array preenchido
  FOR v_job IN
    SELECT id, tenant_id, shooting_dates
    FROM jobs
    WHERE shooting_dates IS NOT NULL
      AND array_length(shooting_dates, 1) > 0
      AND deleted_at IS NULL
  LOOP
    v_order := 0;
    -- Iterar sobre cada data no array
    FOREACH v_date IN ARRAY v_job.shooting_dates
    LOOP
      -- Inserir na tabela se nao existe
      INSERT INTO job_shooting_dates (tenant_id, job_id, shooting_date, display_order)
      SELECT v_job.tenant_id, v_job.id, v_date, v_order
      WHERE NOT EXISTS (
        SELECT 1 FROM job_shooting_dates
        WHERE job_id = v_job.id
          AND shooting_date = v_date
          AND deleted_at IS NULL
      );
      v_order := v_order + 1;
    END LOOP;
  END LOOP;
END $$;
