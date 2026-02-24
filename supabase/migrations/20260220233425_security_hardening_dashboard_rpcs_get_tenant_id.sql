
-- ============================================================
-- Migration: Security Hardening — Parte 2
-- Data: 2026-02-20
-- Descricao: Refatorar 5 RPCs de dashboard para usar get_tenant_id()
--   internamente em vez de receber p_tenant_id como parametro.
--   Defesa em profundidade: elimina risco de refactoring futuro
--   passar tenant_id errado.
-- Idempotente: sim (DROP IF EXISTS + CREATE OR REPLACE)
-- ============================================================

SET search_path = public;

-- 1. get_dashboard_kpis() — sem p_tenant_id
DROP FUNCTION IF EXISTS get_dashboard_kpis(uuid);

CREATE OR REPLACE FUNCTION get_dashboard_kpis()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  result JSON;
  v_tenant_id uuid := get_tenant_id();
BEGIN
  SELECT json_build_object(
    'active_jobs', (
      SELECT count(*) FROM jobs
      WHERE tenant_id = v_tenant_id AND deleted_at IS NULL
        AND status NOT IN ('finalizado', 'cancelado', 'pausado')
    ),
    'total_jobs_month', (
      SELECT count(*) FROM jobs
      WHERE tenant_id = v_tenant_id AND deleted_at IS NULL
        AND created_at >= date_trunc('month', now())
    ),
    'total_revenue', (
      SELECT COALESCE(sum(closed_value), 0) FROM jobs
      WHERE tenant_id = v_tenant_id AND deleted_at IS NULL
        AND status NOT IN ('cancelado') AND closed_value IS NOT NULL
    ),
    'revenue_month', (
      SELECT COALESCE(sum(closed_value), 0) FROM jobs
      WHERE tenant_id = v_tenant_id AND deleted_at IS NULL
        AND status NOT IN ('cancelado') AND closed_value IS NOT NULL
        AND created_at >= date_trunc('month', now())
    ),
    'avg_margin', (
      SELECT COALESCE(round(avg(margin_percentage)::numeric, 1), 0) FROM jobs
      WHERE tenant_id = v_tenant_id AND deleted_at IS NULL
        AND status NOT IN ('cancelado') AND margin_percentage IS NOT NULL
    ),
    'avg_health_score', (
      SELECT COALESCE(round(avg(health_score)::numeric, 0), 0) FROM jobs
      WHERE tenant_id = v_tenant_id AND deleted_at IS NULL
        AND status NOT IN ('finalizado', 'cancelado') AND health_score IS NOT NULL
    ),
    'pending_approvals', (
      SELECT count(*) FROM approval_requests
      WHERE tenant_id = v_tenant_id AND deleted_at IS NULL AND status = 'pending'
    ),
    'overdue_deliverables', (
      SELECT count(*) FROM job_deliverables jd JOIN jobs j ON j.id = jd.job_id
      WHERE j.tenant_id = v_tenant_id AND jd.deleted_at IS NULL AND j.deleted_at IS NULL
        AND jd.status NOT IN ('aprovado', 'entregue')
        AND jd.delivery_date IS NOT NULL AND jd.delivery_date < current_date
    ),
    'team_allocated', (
      SELECT count(DISTINCT people_id) FROM allocations
      WHERE tenant_id = v_tenant_id AND deleted_at IS NULL
        AND allocation_start <= current_date AND allocation_end >= current_date
    )
  ) INTO result;
  RETURN result;
END; $function$;

-- 2. get_pipeline_summary() — sem p_tenant_id
DROP FUNCTION IF EXISTS get_pipeline_summary(uuid);

CREATE OR REPLACE FUNCTION get_pipeline_summary()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  v_tenant_id uuid := get_tenant_id();
BEGIN
  RETURN (
    SELECT json_agg(row_to_json(t)) FROM (
      SELECT status::text, count(*) as count, COALESCE(sum(closed_value), 0) as total_value
      FROM jobs WHERE tenant_id = v_tenant_id AND deleted_at IS NULL AND status NOT IN ('cancelado')
      GROUP BY status
      ORDER BY CASE status
        WHEN 'briefing_recebido' THEN 1 WHEN 'orcamento_elaboracao' THEN 2
        WHEN 'orcamento_enviado' THEN 3 WHEN 'aguardando_aprovacao' THEN 4
        WHEN 'aprovado_selecao_diretor' THEN 5 WHEN 'cronograma_planejamento' THEN 6
        WHEN 'pre_producao' THEN 7 WHEN 'producao_filmagem' THEN 8
        WHEN 'pos_producao' THEN 9 WHEN 'aguardando_aprovacao_final' THEN 10
        WHEN 'entregue' THEN 11 WHEN 'finalizado' THEN 12
        WHEN 'pausado' THEN 13 ELSE 99 END
    ) t
  );
END; $function$;

-- 3. get_alerts(p_limit) — sem p_tenant_id
DROP FUNCTION IF EXISTS get_alerts(uuid, integer);

CREATE OR REPLACE FUNCTION get_alerts(p_limit integer DEFAULT 20)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  v_tenant_id uuid := get_tenant_id();
BEGIN
  RETURN (
    SELECT json_agg(row_to_json(t)) FROM (
      SELECT * FROM (
        SELECT 'margin_alert'::text as alert_type, j.id as entity_id,
          j.title as entity_title, j.code as entity_code,
          json_build_object('margin', j.margin_percentage) as metadata,
          j.updated_at as alert_date
        FROM jobs j WHERE j.tenant_id = v_tenant_id AND j.deleted_at IS NULL
          AND j.status NOT IN ('finalizado', 'cancelado')
          AND j.margin_percentage IS NOT NULL AND j.margin_percentage < 15
        ORDER BY j.margin_percentage ASC LIMIT 5
      ) margin_alerts
      UNION ALL
      SELECT * FROM (
        SELECT 'overdue_deliverable'::text, jd.id, jd.description, j.code,
          json_build_object('due_date', jd.delivery_date, 'job_title', j.title),
          jd.delivery_date::timestamptz
        FROM job_deliverables jd JOIN jobs j ON j.id = jd.job_id
        WHERE j.tenant_id = v_tenant_id AND jd.deleted_at IS NULL AND j.deleted_at IS NULL
          AND jd.status NOT IN ('aprovado', 'entregue')
          AND jd.delivery_date IS NOT NULL AND jd.delivery_date < current_date
        ORDER BY jd.delivery_date ASC LIMIT 5
      ) overdue_alerts
      UNION ALL
      SELECT * FROM (
        SELECT 'low_health_score'::text, j.id, j.title, j.code,
          json_build_object('health_score', j.health_score), j.updated_at
        FROM jobs j WHERE j.tenant_id = v_tenant_id AND j.deleted_at IS NULL
          AND j.status NOT IN ('finalizado', 'cancelado')
          AND j.health_score IS NOT NULL AND j.health_score < 50
        ORDER BY j.health_score ASC LIMIT 5
      ) health_alerts
      UNION ALL
      SELECT * FROM (
        SELECT 'approval_expiring'::text, ar.id, ar.title, j.code,
          json_build_object('expires_at', ar.expires_at, 'job_title', j.title),
          ar.expires_at
        FROM approval_requests ar JOIN jobs j ON j.id = ar.job_id
        WHERE ar.tenant_id = v_tenant_id AND ar.deleted_at IS NULL
          AND ar.status = 'pending' AND ar.expires_at IS NOT NULL
          AND ar.expires_at < now() + interval '7 days'
        ORDER BY ar.expires_at ASC LIMIT 5
      ) approval_alerts
      ORDER BY alert_date ASC LIMIT p_limit
    ) t
  );
END; $function$;

-- 4. get_recent_activity(p_hours, p_limit) — sem p_tenant_id
DROP FUNCTION IF EXISTS get_recent_activity(uuid, integer, integer);

CREATE OR REPLACE FUNCTION get_recent_activity(p_hours integer DEFAULT 48, p_limit integer DEFAULT 30)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  v_tenant_id uuid := get_tenant_id();
BEGIN
  RETURN (
    SELECT json_agg(row_to_json(t)) FROM (
      SELECT jh.id, jh.event_type::text, jh.description, jh.created_at,
        jh.user_id, p.full_name as user_name,
        j.id as job_id, j.code as job_code, j.title as job_title
      FROM job_history jh
      JOIN jobs j ON j.id = jh.job_id
      LEFT JOIN profiles p ON p.id = jh.user_id
      WHERE jh.tenant_id = v_tenant_id
        AND jh.created_at >= now() - (p_hours || ' hours')::interval
      ORDER BY jh.created_at DESC LIMIT p_limit
    ) t
  );
END; $function$;

-- 5. get_revenue_by_month(p_months) — sem p_tenant_id
DROP FUNCTION IF EXISTS get_revenue_by_month(uuid, integer);

CREATE OR REPLACE FUNCTION get_revenue_by_month(p_months integer DEFAULT 12)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  v_tenant_id uuid := get_tenant_id();
BEGIN
  RETURN (
    SELECT json_agg(row_to_json(t)) FROM (
      SELECT to_char(date_trunc('month', j.created_at), 'YYYY-MM') as month,
        count(*) as job_count,
        COALESCE(sum(j.closed_value), 0) as revenue,
        COALESCE(sum(j.production_cost), 0) as cost,
        COALESCE(sum(j.gross_profit), 0) as profit
      FROM jobs j
      WHERE j.tenant_id = v_tenant_id AND j.deleted_at IS NULL AND j.status NOT IN ('cancelado')
        AND j.created_at >= date_trunc('month', now()) - (p_months || ' months')::interval
      GROUP BY date_trunc('month', j.created_at)
      ORDER BY date_trunc('month', j.created_at)
    ) t
  );
END; $function$;
