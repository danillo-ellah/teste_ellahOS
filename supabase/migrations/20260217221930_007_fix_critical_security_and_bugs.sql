-- ============================================================
-- Migration 007: Fix critical security and bugs
-- Corrige: admin policy, search_path em functions, job_code_sequences
-- Fase 1 - Fix pos-auditoria
-- ============================================================

-- ============================================================
-- 1. Criar tabela job_code_sequences para geracao atomica de codigos
-- Resolve BUG-004: race condition com MAX(index_number)
-- ============================================================

CREATE TABLE IF NOT EXISTS job_code_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) UNIQUE,
  last_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_job_code_sequences_tenant_id ON job_code_sequences(tenant_id);

ALTER TABLE job_code_sequences ENABLE ROW LEVEL SECURITY;

CREATE POLICY job_code_sequences_select_tenant ON job_code_sequences
  FOR SELECT TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()));

CREATE POLICY job_code_sequences_insert_tenant ON job_code_sequences
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = (SELECT get_tenant_id()));

CREATE POLICY job_code_sequences_update_tenant ON job_code_sequences
  FOR UPDATE TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()))
  WITH CHECK (tenant_id = (SELECT get_tenant_id()));

-- ============================================================
-- 2. Recriar generate_job_code com lock atomico via job_code_sequences
-- INSERT ON CONFLICT para evitar race conditions
-- ============================================================

CREATE OR REPLACE FUNCTION generate_job_code()
RETURNS TRIGGER AS $$
DECLARE
  v_sequence INTEGER;
  v_title_clean TEXT;
  v_agency_name TEXT;
  v_agency_clean TEXT;
BEGIN
  IF NEW.code IS NULL OR NEW.code = '' THEN
    -- Incrementar ou inserir o contador para este tenant (atomico)
    INSERT INTO job_code_sequences (tenant_id, last_index)
    VALUES (NEW.tenant_id, 1)
    ON CONFLICT (tenant_id)
    DO UPDATE SET
      last_index = job_code_sequences.last_index + 1,
      updated_at = now()
    RETURNING last_index INTO v_sequence;

    NEW.index_number := v_sequence;
    NEW.code := lpad(v_sequence::TEXT, 3, '0');

    -- Limpar titulo
    v_title_clean := regexp_replace(NEW.title, '[^a-zA-Z0-9]', '', 'g');

    -- Buscar nome da agencia se informado
    IF NEW.agency_id IS NOT NULL THEN
      SELECT name INTO v_agency_name FROM agencies WHERE id = NEW.agency_id;
      v_agency_clean := regexp_replace(COALESCE(v_agency_name, ''), '[^a-zA-Z0-9]', '', 'g');
      NEW.job_aba := NEW.code || '_' || v_title_clean || '_' || v_agency_clean;
    ELSE
      NEW.job_aba := NEW.code || '_' || v_title_clean;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER SET search_path = public;

-- ============================================================
-- 3. Fix search_path em todas as functions criticas
-- Previne search_path injection attacks
-- ============================================================

-- Recriar get_tenant_id com search_path fixo
CREATE OR REPLACE FUNCTION get_tenant_id()
RETURNS UUID AS $$
  SELECT COALESCE(
    (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid,
    NULL
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- Recriar get_user_role com search_path fixo
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claims', true)::json->>'role',
    'member'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- Recriar update_updated_at com search_path fixo
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Recriar calculate_job_financials com search_path fixo
CREATE OR REPLACE FUNCTION calculate_job_financials()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.closed_value IS NOT NULL AND NEW.closed_value > 0 THEN
    NEW.tax_value := ROUND(NEW.closed_value * (NEW.tax_percentage / 100), 2);
  ELSE
    NEW.tax_value := NULL;
  END IF;

  IF NEW.closed_value IS NOT NULL AND NEW.closed_value > 0 THEN
    NEW.gross_profit := ROUND(
      NEW.closed_value
      - COALESCE(NEW.production_cost, 0)
      - COALESCE(NEW.tax_value, 0)
      - COALESCE(NEW.other_costs, 0)
      - COALESCE(NEW.risk_buffer, 0),
      2
    );
  ELSE
    NEW.gross_profit := NULL;
  END IF;

  IF NEW.closed_value IS NOT NULL AND NEW.closed_value > 0
     AND NEW.gross_profit IS NOT NULL THEN
    NEW.margin_percentage := ROUND(
      (NEW.gross_profit / NEW.closed_value) * 100, 2
    );
  ELSE
    NEW.margin_percentage := NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Recriar calculate_health_score com search_path fixo
CREATE OR REPLACE FUNCTION calculate_health_score()
RETURNS TRIGGER AS $$
DECLARE
  v_score INTEGER := 0;
BEGIN
  IF NEW.budget_letter_url IS NOT NULL AND NEW.budget_letter_url != '' THEN
    v_score := v_score + 15;
  END IF;
  IF NEW.schedule_url IS NOT NULL AND NEW.schedule_url != '' THEN
    v_score := v_score + 15;
  END IF;
  IF NEW.script_url IS NOT NULL AND NEW.script_url != '' THEN
    v_score := v_score + 15;
  END IF;
  IF NEW.ppm_url IS NOT NULL AND NEW.ppm_url != '' THEN
    v_score := v_score + 15;
  END IF;
  IF NEW.expected_delivery_date IS NOT NULL THEN
    v_score := v_score + 10;
  END IF;
  IF NEW.payment_date IS NOT NULL THEN
    v_score := v_score + 10;
  END IF;
  IF NEW.closed_value IS NOT NULL AND NEW.closed_value > 0 THEN
    v_score := v_score + 10;
  END IF;

  NEW.health_score := v_score;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Recriar log_status_change com search_path fixo
CREATE OR REPLACE FUNCTION log_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    NEW.status_updated_at := now();

    INSERT INTO job_history (
      tenant_id, job_id, event_type, user_id,
      data_before, data_after, description
    ) VALUES (
      NEW.tenant_id,
      NEW.id,
      'status_change',
      NEW.status_updated_by,
      jsonb_build_object('status', OLD.status),
      jsonb_build_object('status', NEW.status),
      'Status alterado de ' || OLD.status || ' para ' || NEW.status
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;
