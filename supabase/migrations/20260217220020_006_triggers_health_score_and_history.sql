-- ============================================================
-- Migration 006: Triggers de negocio
-- calculate_health_score, log_status_change, generate_job_code
-- Fase 1 - Schema Base
-- ============================================================

-- ============================================================
-- Function: calculate_job_financials
-- Calcula tax_value, gross_profit, margin_percentage
-- Formulas replicando planilha Ellah:
--   tax_value = closed_value * (tax_percentage / 100)
--   gross_profit = closed - production - tax - other - risk
--   margin_percentage = (gross_profit / closed_value) * 100
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

CREATE TRIGGER set_job_financials
  BEFORE INSERT OR UPDATE ON jobs
  FOR EACH ROW EXECUTE FUNCTION calculate_job_financials();

-- ============================================================
-- Function: calculate_health_score
-- Pontuacao 0-100 baseada em preenchimento de campos
-- Regras iniciais (antes do fix da migration 010):
--   +15 pts: budget_letter_url preenchido
--   +15 pts: schedule_url preenchido
--   +15 pts: script_url preenchido
--   +15 pts: ppm_url preenchido
--   +10 pts: expected_delivery_date definida
--   +10 pts: payment_date definida
--   +10 pts: closed_value > 0
--   Total maximo: 90 pts (bug: falta criterio de equipe)
-- ============================================================

CREATE OR REPLACE FUNCTION calculate_health_score()
RETURNS TRIGGER AS $$
DECLARE
  v_score INTEGER := 0;
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

  -- +10 pts por data definida
  IF NEW.expected_delivery_date IS NOT NULL THEN
    v_score := v_score + 10;
  END IF;
  IF NEW.payment_date IS NOT NULL THEN
    v_score := v_score + 10;
  END IF;

  -- +10 pts se valor fechado definido
  IF NEW.closed_value IS NOT NULL AND NEW.closed_value > 0 THEN
    v_score := v_score + 10;
  END IF;

  NEW.health_score := v_score;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER calculate_health_score
  BEFORE INSERT OR UPDATE ON jobs
  FOR EACH ROW EXECUTE FUNCTION calculate_health_score();

-- ============================================================
-- Function: log_status_change
-- Registra automaticamente mudancas de status no job_history
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

CREATE TRIGGER status_history_trigger
  BEFORE UPDATE ON jobs
  FOR EACH ROW EXECUTE FUNCTION log_status_change();

-- ============================================================
-- Function: generate_job_code
-- Gera index_number sequencial e code/job_aba automaticamente
-- Usa MAX(index_number) + 1 (versao inicial, sem lock atomico)
-- ============================================================

CREATE OR REPLACE FUNCTION generate_job_code()
RETURNS TRIGGER AS $$
DECLARE
  v_max_index INTEGER;
  v_title_clean TEXT;
  v_agency_name TEXT;
  v_agency_clean TEXT;
BEGIN
  -- So gera se o code nao foi fornecido (ou esta vazio)
  IF NEW.code IS NULL OR NEW.code = '' THEN
    -- Buscar proximo index_number para este tenant
    SELECT COALESCE(MAX(index_number), 0) + 1 INTO v_max_index
    FROM jobs
    WHERE tenant_id = NEW.tenant_id;

    NEW.index_number := v_max_index;
    NEW.code := lpad(v_max_index::TEXT, 3, '0');

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
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER job_code_trigger
  BEFORE INSERT ON jobs
  FOR EACH ROW EXECUTE FUNCTION generate_job_code();
