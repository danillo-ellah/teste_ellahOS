-- =============================================
-- Adiciona coluna health_score_details (JSONB) na tabela jobs
-- e reescreve calculate_health_score() para popular o breakdown
-- dos 4 pilares com score, max e checklist booleano.
--
-- A formula de pontuacao e IDENTICA a migration anterior
-- (20260312200000_rewrite_health_score_formula.sql).
-- A unica mudanca e o registro do breakdown em JSONB.
-- =============================================

-- 1) Adicionar coluna (idempotente)
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS health_score_details JSONB DEFAULT NULL;

COMMENT ON COLUMN public.jobs.health_score_details IS
  'Breakdown do health_score: 4 pilares (setup, team, financial, timeline) com score, max e items booleanos';

-- 2) Reescrever a funcao com breakdown detalhado
CREATE OR REPLACE FUNCTION public.calculate_health_score()
RETURNS TRIGGER AS $$
DECLARE
  v_score INTEGER := 0;
  v_team_count INTEGER := 0;
  v_has_director BOOLEAN := false;
  v_has_pe BOOLEAN := false;
  v_is_early_stage BOOLEAN;
  v_url_count INTEGER := 0;

  -- Scores parciais por pilar
  v_setup_score INTEGER := 0;
  v_team_score INTEGER := 0;
  v_financial_score INTEGER := 0;
  v_timeline_score INTEGER := 0;

  -- Flags booleanas por item
  v_has_project_type BOOLEAN := false;
  v_has_delivery_date BOOLEAN := false;
  v_has_closed_value BOOLEAN := false;
  v_has_briefing BOOLEAN := false;
  v_has_status_progress BOOLEAN := false;

  v_has_director_item BOOLEAN := false;
  v_has_pe_item BOOLEAN := false;
  v_has_team_size_3 BOOLEAN := false;

  v_has_production_cost BOOLEAN := false;
  v_has_positive_margin BOOLEAN := false;
  v_has_tax_percentage BOOLEAN := false;

  v_not_overdue BOOLEAN := false;
  v_has_recent_activity BOOLEAN := false;
  v_has_docs BOOLEAN := false;
BEGIN
  -- Detectar fase inicial (briefing/orcamento — nao penalizar por dados financeiros incompletos)
  v_is_early_stage := NEW.status IN ('briefing_recebido', 'orcamento_elaboracao', 'orcamento_enviado', 'aguardando_aprovacao');

  -- ===== PILAR 1: SETUP BASICO (25 pts) =====

  IF NEW.project_type IS NOT NULL THEN
    v_setup_score := v_setup_score + 5;
    v_has_project_type := true;
  END IF;

  IF NEW.expected_delivery_date IS NOT NULL THEN
    v_setup_score := v_setup_score + 5;
    v_has_delivery_date := true;
  END IF;

  IF COALESCE(NEW.closed_value, 0) > 0 THEN
    v_setup_score := v_setup_score + 5;
    v_has_closed_value := true;
  END IF;

  IF (NEW.briefing_text IS NOT NULL AND NEW.briefing_text != '') OR NEW.briefing_date IS NOT NULL THEN
    v_setup_score := v_setup_score + 5;
    v_has_briefing := true;
  END IF;

  IF NEW.status NOT IN ('briefing_recebido') THEN
    v_setup_score := v_setup_score + 5;
    v_has_status_progress := true;
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
    v_team_score := v_team_score + 10;
    v_has_director_item := true;
  END IF;

  IF v_has_pe THEN
    v_team_score := v_team_score + 10;
    v_has_pe_item := true;
  END IF;

  IF v_team_count >= 3 THEN
    v_team_score := v_team_score + 5;
    v_has_team_size_3 := true;
  END IF;

  -- ===== PILAR 3: FINANCEIRO (25 pts) =====

  IF COALESCE(NEW.production_cost, 0) > 0 THEN
    v_financial_score := v_financial_score + 10;
    v_has_production_cost := true;
  END IF;

  IF v_is_early_stage THEN
    v_financial_score := v_financial_score + 10;
    v_has_positive_margin := true;  -- fase inicial: margem "ok" por default
  ELSIF COALESCE(NEW.closed_value, 0) > (COALESCE(NEW.production_cost, 0) + COALESCE(NEW.other_costs, 0)) THEN
    v_financial_score := v_financial_score + 10;
    v_has_positive_margin := true;
  END IF;

  IF COALESCE(NEW.tax_percentage, 0) > 0 THEN
    v_financial_score := v_financial_score + 5;
    v_has_tax_percentage := true;
  END IF;

  -- ===== PILAR 4: TIMELINE & DOCUMENTACAO (25 pts) =====

  IF NEW.expected_delivery_date IS NULL
     OR NEW.expected_delivery_date >= CURRENT_DATE
     OR NEW.actual_delivery_date IS NOT NULL THEN
    v_timeline_score := v_timeline_score + 10;
    v_not_overdue := true;
  ELSE
    -- Penalidade por atraso: -10 pontos (pode ficar negativo no pilar)
    v_timeline_score := v_timeline_score - 10;
    v_not_overdue := false;
  END IF;

  IF NEW.status_updated_at IS NOT NULL
     AND NEW.status_updated_at >= (CURRENT_DATE - INTERVAL '30 days') THEN
    v_timeline_score := v_timeline_score + 10;
    v_has_recent_activity := true;
  ELSIF NEW.updated_at >= (CURRENT_DATE - INTERVAL '30 days') THEN
    -- Atividade parcial: +5 em vez de +10 (updated_at mas nao status_updated_at)
    v_timeline_score := v_timeline_score + 5;
    v_has_recent_activity := true;  -- contabiliza como atividade (parcial)
  END IF;

  -- URLs de documentacao
  IF NEW.budget_letter_url IS NOT NULL AND NEW.budget_letter_url != '' THEN v_url_count := v_url_count + 1; END IF;
  IF NEW.schedule_url IS NOT NULL AND NEW.schedule_url != '' THEN v_url_count := v_url_count + 1; END IF;
  IF NEW.script_url IS NOT NULL AND NEW.script_url != '' THEN v_url_count := v_url_count + 1; END IF;
  IF NEW.ppm_url IS NOT NULL AND NEW.ppm_url != '' THEN v_url_count := v_url_count + 1; END IF;
  IF NEW.drive_folder_url IS NOT NULL AND NEW.drive_folder_url != '' THEN v_url_count := v_url_count + 1; END IF;

  IF v_url_count >= 2 THEN
    v_timeline_score := v_timeline_score + 5;
    v_has_docs := true;
  ELSIF v_url_count >= 1 THEN
    v_timeline_score := v_timeline_score + 3;
    v_has_docs := true;  -- tem pelo menos 1 doc (pontuacao parcial)
  END IF;

  -- ===== SCORE TOTAL =====
  v_score := v_setup_score + v_team_score + v_financial_score + v_timeline_score;
  NEW.health_score := GREATEST(0, LEAST(100, v_score));

  -- ===== BREAKDOWN DETALHADO =====
  NEW.health_score_details := jsonb_build_object(
    'setup', jsonb_build_object(
      'score', v_setup_score,
      'max', 25,
      'items', jsonb_build_object(
        'project_type', v_has_project_type,
        'delivery_date', v_has_delivery_date,
        'closed_value', v_has_closed_value,
        'briefing', v_has_briefing,
        'status_progress', v_has_status_progress
      )
    ),
    'team', jsonb_build_object(
      'score', v_team_score,
      'max', 25,
      'items', jsonb_build_object(
        'director', v_has_director_item,
        'executive_producer', v_has_pe_item,
        'team_size_3', v_has_team_size_3
      )
    ),
    'financial', jsonb_build_object(
      'score', v_financial_score,
      'max', 25,
      'items', jsonb_build_object(
        'production_cost', v_has_production_cost,
        'positive_margin', v_has_positive_margin,
        'tax_percentage', v_has_tax_percentage
      )
    ),
    'timeline', jsonb_build_object(
      'score', v_timeline_score,
      'max', 25,
      'items', jsonb_build_object(
        'not_overdue', v_not_overdue,
        'recent_activity', v_has_recent_activity,
        'has_docs', v_has_docs
      )
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = '';

-- 3) Recalcular health_score + health_score_details de TODOS os jobs ativos
-- O UPDATE dispara o trigger BEFORE UPDATE que recalcula ambos os campos
UPDATE public.jobs
SET updated_at = NOW()
WHERE deleted_at IS NULL
  AND status NOT IN ('finalizado', 'cancelado');
