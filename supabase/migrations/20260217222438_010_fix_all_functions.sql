-- ============================================================
-- Migration 010: Recriar TODAS as functions com search_path fixo
-- Health score corrigido, job code atomico, financials atualizado
-- Fase 1 - Consolidacao final de functions
-- ============================================================

-- ============================================================
-- 1. Helper functions (recriar com search_path)
-- ============================================================

CREATE OR REPLACE FUNCTION get_tenant_id()
RETURNS UUID AS $$
  SELECT COALESCE(
    (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid,
    NULL
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claims', true)::json->>'role',
    'member'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ============================================================
-- 2. calculate_job_financials (com other_costs e risk_buffer)
-- Formula: gross_profit = closed - production - tax - other - risk
-- ============================================================

CREATE OR REPLACE FUNCTION calculate_job_financials()
RETURNS TRIGGER AS $$
BEGIN
  -- Calcular imposto
  IF NEW.closed_value IS NOT NULL AND NEW.closed_value > 0 THEN
    NEW.tax_value := ROUND(NEW.closed_value * (NEW.tax_percentage / 100), 2);
  ELSE
    NEW.tax_value := NULL;
  END IF;

  -- Calcular lucro bruto (Valor W)
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

  -- Calcular margem percentual
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

-- ============================================================
-- 3. calculate_health_score (CORRIGIDO: inclui equipe)
-- Regras finais:
--   +15 pts: budget_letter_url preenchido
--   +15 pts: schedule_url preenchido
--   +15 pts: script_url preenchido
--   +15 pts: ppm_url preenchido
--   +10 pts: expected_delivery_date definida
--   +10 pts: payment_date definida
--   +10 pts: Diretor na equipe (job_team role='diretor')
--   +10 pts: Produtor Executivo na equipe (job_team role='produtor_executivo')
--   Total maximo: 100 pts
-- ============================================================

CREATE OR REPLACE FUNCTION calculate_health_score()
RETURNS TRIGGER AS $$
DECLARE
  v_score INTEGER := 0;
  v_has_director BOOLEAN := false;
  v_has_pe BOOLEAN := false;
BEGIN
  -- +15 pts por URL preenchido (4 URLs = 60 pts)
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

  -- +10 pts por data definida (20 pts)
  IF NEW.expected_delivery_date IS NOT NULL THEN
    v_score := v_score + 10;
  END IF;
  IF NEW.payment_date IS NOT NULL THEN
    v_score := v_score + 10;
  END IF;

  -- +10 pts por equipe definida (20 pts)
  -- Consultar job_team para verificar diretor e PE
  SELECT EXISTS(
    SELECT 1 FROM job_team
    WHERE job_id = NEW.id AND role = 'diretor' AND deleted_at IS NULL
  ) INTO v_has_director;

  SELECT EXISTS(
    SELECT 1 FROM job_team
    WHERE job_id = NEW.id AND role = 'produtor_executivo' AND deleted_at IS NULL
  ) INTO v_has_pe;

  IF v_has_director THEN
    v_score := v_score + 10;
  END IF;
  IF v_has_pe THEN
    v_score := v_score + 10;
  END IF;

  NEW.health_score := v_score;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ============================================================
-- 4. log_status_change (registra mudancas de status)
-- ============================================================

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

-- ============================================================
-- 5. generate_job_code (atomico via job_code_sequences)
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
-- 6. Garantir que os triggers estao corretos
-- (recriar se necessario)
-- ============================================================

-- Trigger financials
DROP TRIGGER IF EXISTS set_job_financials ON jobs;
CREATE TRIGGER set_job_financials
  BEFORE INSERT OR UPDATE ON jobs
  FOR EACH ROW EXECUTE FUNCTION calculate_job_financials();

-- Trigger health score
DROP TRIGGER IF EXISTS calculate_health_score ON jobs;
CREATE TRIGGER calculate_health_score
  BEFORE INSERT OR UPDATE ON jobs
  FOR EACH ROW EXECUTE FUNCTION calculate_health_score();

-- Trigger status history
DROP TRIGGER IF EXISTS status_history_trigger ON jobs;
CREATE TRIGGER status_history_trigger
  BEFORE UPDATE ON jobs
  FOR EACH ROW EXECUTE FUNCTION log_status_change();

-- Trigger job code
DROP TRIGGER IF EXISTS job_code_trigger ON jobs;
CREATE TRIGGER job_code_trigger
  BEFORE INSERT ON jobs
  FOR EACH ROW EXECUTE FUNCTION generate_job_code();
