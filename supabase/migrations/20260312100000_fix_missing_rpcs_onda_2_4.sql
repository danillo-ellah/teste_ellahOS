-- Migration retroativa: RPCs criadas via Dashboard mas sem migration (F-01, F-02)
-- Ref: docs/specs/onda-2/08-orcamentos-pre-job-arquitetura.md secao 10
-- Idempotente: CREATE OR REPLACE

-- ============================================================================
-- F-01: upsert_orc_code_sequence
-- Chamada por: supabase/functions/crm/handlers/budget/upsert-version.ts
-- Gera proximo indice ORC atomicamente via INSERT ON CONFLICT
-- ============================================================================
CREATE OR REPLACE FUNCTION upsert_orc_code_sequence(
  p_tenant_id UUID,
  p_year INTEGER
) RETURNS INTEGER AS $$
DECLARE
  v_last_index INTEGER;
BEGIN
  INSERT INTO orc_code_sequences (tenant_id, year, last_index)
  VALUES (p_tenant_id, p_year, 1)
  ON CONFLICT (tenant_id, year)
  DO UPDATE SET last_index = orc_code_sequences.last_index + 1,
                updated_at = now()
  RETURNING last_index INTO v_last_index;

  RETURN v_last_index;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION upsert_orc_code_sequence(UUID, INTEGER) IS
  'Gera proximo indice ORC atomicamente via INSERT ON CONFLICT. Retorna o novo last_index.';

-- ============================================================================
-- F-02: convert_opportunity_to_job
-- Chamada por: supabase/functions/crm/handlers/convert-to-job.ts
-- Converte oportunidade em job atomicamente
-- ============================================================================
CREATE OR REPLACE FUNCTION convert_opportunity_to_job(
  p_opportunity_id UUID,
  p_tenant_id UUID,
  p_job_title TEXT,
  p_project_type TEXT DEFAULT NULL,
  p_client_id UUID DEFAULT NULL,
  p_agency_id UUID DEFAULT NULL,
  p_closed_value NUMERIC DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_deliverable_format TEXT DEFAULT NULL,
  p_campaign_period TEXT DEFAULT NULL,
  p_created_by UUID DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_opp RECORD;
  v_job_id UUID;
  v_job_code TEXT;
  v_next_index INTEGER;
  v_current_year INTEGER;
BEGIN
  -- Buscar oportunidade e validar
  SELECT * INTO v_opp
  FROM opportunities
  WHERE id = p_opportunity_id
    AND tenant_id = p_tenant_id
    AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Oportunidade nao encontrada';
  END IF;

  IF v_opp.stage = 'perdido' THEN
    RAISE EXCEPTION 'Nao e possivel converter oportunidade perdida';
  END IF;

  IF v_opp.job_id IS NOT NULL THEN
    RAISE EXCEPTION 'Oportunidade ja convertida em job (job_id: %)', v_opp.job_id;
  END IF;

  -- Gerar codigo do job
  v_current_year := EXTRACT(YEAR FROM now());

  INSERT INTO job_code_sequences (tenant_id, last_index)
  VALUES (p_tenant_id, 1)
  ON CONFLICT (tenant_id)
  DO UPDATE SET last_index = job_code_sequences.last_index + 1
  RETURNING last_index INTO v_next_index;

  v_job_code := lpad(v_next_index::TEXT, 3, '0');

  -- Criar job
  INSERT INTO jobs (
    tenant_id, code, title, client_id, agency_id,
    project_type, closed_value, notes,
    status, created_by
  ) VALUES (
    p_tenant_id,
    v_job_code,
    p_job_title,
    COALESCE(p_client_id, v_opp.client_id),
    COALESCE(p_agency_id, v_opp.agency_id),
    COALESCE(p_project_type, v_opp.project_type, 'outro'),
    COALESCE(p_closed_value, v_opp.estimated_value),
    COALESCE(p_description, v_opp.notes),
    'briefing_recebido',
    p_created_by
  ) RETURNING id INTO v_job_id;

  -- Atualizar oportunidade como ganho
  UPDATE opportunities
  SET stage = 'ganho',
      job_id = v_job_id,
      actual_close_date = now()::date,
      updated_at = now()
  WHERE id = p_opportunity_id
    AND tenant_id = p_tenant_id;

  RETURN jsonb_build_object(
    'job_id', v_job_id,
    'job_code', v_job_code
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION convert_opportunity_to_job IS
  'Converte oportunidade em job atomicamente: cria job + marca oportunidade como ganho + gera codigo.';
