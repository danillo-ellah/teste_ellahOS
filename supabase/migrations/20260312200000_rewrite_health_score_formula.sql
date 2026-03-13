-- =============================================
-- REWRITE: health_score formula (4 pilares x 25 pts = 100 pts)
-- Substitui formula antiga baseada em 4 URLs (60 pts) por metrica balanceada
--
-- ANTES: 60% do score dependia de 4 URLs que ninguem preenchia
-- DEPOIS: 4 pilares equilibrados (Setup, Equipe, Financeiro, Timeline)
--
-- Pilar 1 - Setup Basico (25 pts):
--   +5 project_type, +5 delivery_date, +5 closed_value, +5 briefing, +5 status progrediu
-- Pilar 2 - Equipe (25 pts):
--   +10 diretor, +10 produtor_executivo, +5 equipe 3+ membros
-- Pilar 3 - Financeiro (25 pts):
--   +10 custo producao, +10 margem positiva (ou fase inicial), +5 imposto
-- Pilar 4 - Timeline & Docs (25 pts):
--   +10 nao atrasado (-10 se atrasado), +10 atividade recente 30d, +5 URLs
-- =============================================

CREATE OR REPLACE FUNCTION public.calculate_health_score()
RETURNS TRIGGER AS $$
DECLARE
  v_score INTEGER := 0;
  v_team_count INTEGER := 0;
  v_has_director BOOLEAN := false;
  v_has_pe BOOLEAN := false;
  v_is_early_stage BOOLEAN;
  v_url_count INTEGER := 0;
BEGIN
  -- Detectar fase inicial (briefing/orcamento — nao penalizar por dados financeiros incompletos)
  v_is_early_stage := NEW.status IN ('briefing_recebido', 'orcamento_elaboracao', 'orcamento_enviado', 'aguardando_aprovacao');

  -- ===== PILAR 1: SETUP BASICO (25 pts) =====

  IF NEW.project_type IS NOT NULL THEN
    v_score := v_score + 5;
  END IF;

  IF NEW.expected_delivery_date IS NOT NULL THEN
    v_score := v_score + 5;
  END IF;

  IF COALESCE(NEW.closed_value, 0) > 0 THEN
    v_score := v_score + 5;
  END IF;

  IF (NEW.briefing_text IS NOT NULL AND NEW.briefing_text != '') OR NEW.briefing_date IS NOT NULL THEN
    v_score := v_score + 5;
  END IF;

  IF NEW.status NOT IN ('briefing_recebido') THEN
    v_score := v_score + 5;
  END IF;

  -- ===== PILAR 2: EQUIPE (25 pts) =====

  SELECT
    COUNT(*),
    COALESCE(bool_or(role = 'diretor'), false),
    COALESCE(bool_or(role = 'produtor_executivo'), false)
  INTO v_team_count, v_has_director, v_has_pe
  FROM public.job_team
  WHERE job_id = NEW.id AND deleted_at IS NULL;

  IF v_has_director THEN
    v_score := v_score + 10;
  END IF;

  IF v_has_pe THEN
    v_score := v_score + 10;
  END IF;

  IF v_team_count >= 3 THEN
    v_score := v_score + 5;
  END IF;

  -- ===== PILAR 3: FINANCEIRO (25 pts) =====

  IF COALESCE(NEW.production_cost, 0) > 0 THEN
    v_score := v_score + 10;
  END IF;

  IF v_is_early_stage THEN
    v_score := v_score + 10;
  ELSIF COALESCE(NEW.closed_value, 0) > (COALESCE(NEW.production_cost, 0) + COALESCE(NEW.other_costs, 0)) THEN
    v_score := v_score + 10;
  END IF;

  IF COALESCE(NEW.tax_percentage, 0) > 0 THEN
    v_score := v_score + 5;
  END IF;

  -- ===== PILAR 4: TIMELINE & DOCUMENTACAO (25 pts) =====

  IF NEW.expected_delivery_date IS NULL
     OR NEW.expected_delivery_date >= CURRENT_DATE
     OR NEW.actual_delivery_date IS NOT NULL THEN
    v_score := v_score + 10;
  ELSE
    v_score := v_score - 10;
  END IF;

  IF NEW.status_updated_at IS NOT NULL
     AND NEW.status_updated_at >= (CURRENT_DATE - INTERVAL '30 days') THEN
    v_score := v_score + 10;
  ELSIF NEW.updated_at >= (CURRENT_DATE - INTERVAL '30 days') THEN
    v_score := v_score + 5;
  END IF;

  IF NEW.budget_letter_url IS NOT NULL AND NEW.budget_letter_url != '' THEN v_url_count := v_url_count + 1; END IF;
  IF NEW.schedule_url IS NOT NULL AND NEW.schedule_url != '' THEN v_url_count := v_url_count + 1; END IF;
  IF NEW.script_url IS NOT NULL AND NEW.script_url != '' THEN v_url_count := v_url_count + 1; END IF;
  IF NEW.ppm_url IS NOT NULL AND NEW.ppm_url != '' THEN v_url_count := v_url_count + 1; END IF;
  IF NEW.drive_folder_url IS NOT NULL AND NEW.drive_folder_url != '' THEN v_url_count := v_url_count + 1; END IF;

  IF v_url_count >= 2 THEN
    v_score := v_score + 5;
  ELSIF v_url_count >= 1 THEN
    v_score := v_score + 3;
  END IF;

  NEW.health_score := GREATEST(0, LEAST(100, v_score));

  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = '';

-- Recalcular health_score de TODOS os jobs ativos
UPDATE public.jobs
SET updated_at = NOW()
WHERE deleted_at IS NULL
  AND status NOT IN ('finalizado', 'cancelado');
