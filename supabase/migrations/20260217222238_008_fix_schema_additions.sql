-- ============================================================
-- Migration 008b: Fix schema additions
-- Adiciona colunas extras, valores de enum, indices GIN
-- Fase 1 - Complemento pos-auditoria
-- ============================================================

-- ============================================================
-- 1. Adicionar segmento 'governo' ao client_segment (se faltante)
-- e 'entretenimento' ja existe
-- ============================================================

-- Nota: Os valores 'governo', 'tecnologia', 'alimentos_bebidas'
-- ja foram incluidos na migration 001_enums (que reflete o real).
-- Este bloco e um safety net para garantir idempotencia.

-- ============================================================
-- 2. Adicionar colunas extras em jobs que podem ter sido esquecidas
-- ============================================================

-- Campos de producao
DO $$ BEGIN
  ALTER TABLE jobs ADD COLUMN IF NOT EXISTS has_contracted_audio BOOLEAN;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE jobs ADD COLUMN IF NOT EXISTS has_mockup_scenography BOOLEAN;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE jobs ADD COLUMN IF NOT EXISTS has_computer_graphics BOOLEAN;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE jobs ADD COLUMN IF NOT EXISTS audio_company TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE jobs ADD COLUMN IF NOT EXISTS commercial_responsible TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE jobs ADD COLUMN IF NOT EXISTS ancine_number TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE jobs ADD COLUMN IF NOT EXISTS proposal_validity TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE jobs ADD COLUMN IF NOT EXISTS references_text TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE jobs ADD COLUMN IF NOT EXISTS total_duration_seconds INTEGER;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- URLs extras de producao
DO $$ BEGIN
  ALTER TABLE jobs ADD COLUMN IF NOT EXISTS raw_material_url TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE jobs ADD COLUMN IF NOT EXISTS team_sheet_url TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE jobs ADD COLUMN IF NOT EXISTS team_form_url TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE jobs ADD COLUMN IF NOT EXISTS cast_sheet_url TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE jobs ADD COLUMN IF NOT EXISTS pre_production_url TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE jobs ADD COLUMN IF NOT EXISTS pre_art_url TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE jobs ADD COLUMN IF NOT EXISTS pre_costume_url TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE jobs ADD COLUMN IF NOT EXISTS closing_production_url TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE jobs ADD COLUMN IF NOT EXISTS closing_art_url TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE jobs ADD COLUMN IF NOT EXISTS closing_costume_url TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE jobs ADD COLUMN IF NOT EXISTS final_delivery_url TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Campos de aprovacao
DO $$ BEGIN
  ALTER TABLE jobs ADD COLUMN IF NOT EXISTS approved_by_name TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE jobs ADD COLUMN IF NOT EXISTS approved_by_email TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE jobs ADD COLUMN IF NOT EXISTS internal_approval_doc_url TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Financeiro extra
DO $$ BEGIN
  ALTER TABLE jobs ADD COLUMN IF NOT EXISTS other_costs NUMERIC(12,2);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE jobs ADD COLUMN IF NOT EXISTS risk_buffer NUMERIC(12,2);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- ============================================================
-- 3. Adicionar colunas extras em people (documentos brasileiros)
-- ============================================================

DO $$ BEGIN
  ALTER TABLE people ADD COLUMN IF NOT EXISTS drt TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE people ADD COLUMN IF NOT EXISTS ctps_number TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE people ADD COLUMN IF NOT EXISTS ctps_series TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE people ADD COLUMN IF NOT EXISTS birth_date DATE;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE people ADD COLUMN IF NOT EXISTS bank_info JSONB;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- ============================================================
-- 4. Adicionar colunas extras em job_deliverables
-- ============================================================

DO $$ BEGIN
  ALTER TABLE job_deliverables ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES job_deliverables(id);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_job_deliverables_parent_id ON job_deliverables(parent_id);

DO $$ BEGIN
  ALTER TABLE job_deliverables ADD COLUMN IF NOT EXISTS notes TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE job_deliverables ADD COLUMN IF NOT EXISTS link TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- ============================================================
-- 5. Adicionar colunas extras em job_files (integracao)
-- ============================================================

DO $$ BEGIN
  ALTER TABLE job_files ADD COLUMN IF NOT EXISTS external_id TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE job_files ADD COLUMN IF NOT EXISTS external_source TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- ============================================================
-- 6. Indices GIN adicionais
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_people_bank_info ON people USING GIN(bank_info)
  WHERE bank_info IS NOT NULL;
