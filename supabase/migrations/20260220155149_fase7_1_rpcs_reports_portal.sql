
-- RPCs de Relatorios e Portal (Fase 7.1 Part 3)

-- 6. get_report_financial_monthly
CREATE OR REPLACE FUNCTION get_report_financial_monthly(
  p_tenant_id UUID, p_start_date DATE DEFAULT (date_trunc('year', now()))::date,
  p_end_date DATE DEFAULT (now())::date
) RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN (
    SELECT json_build_object(
      'summary', (
        SELECT json_build_object(
          'total_revenue', COALESCE(sum(CASE WHEN type = 'receita' THEN amount ELSE 0 END), 0),
          'total_expenses', COALESCE(sum(CASE WHEN type = 'despesa' THEN amount ELSE 0 END), 0),
          'net', COALESCE(
            sum(CASE WHEN type = 'receita' THEN amount ELSE 0 END) -
            sum(CASE WHEN type = 'despesa' THEN amount ELSE 0 END), 0
          ),
          'paid_count', count(*) FILTER (WHERE status = 'pago'),
          'pending_count', count(*) FILTER (WHERE status = 'pendente'),
          'overdue_count', count(*) FILTER (WHERE status = 'atrasado')
        ) FROM financial_records
        WHERE tenant_id = p_tenant_id AND deleted_at IS NULL
          AND created_at::date BETWEEN p_start_date AND p_end_date
      ),
      'by_month', (
        SELECT json_agg(row_to_json(t)) FROM (
          SELECT to_char(date_trunc('month', created_at), 'YYYY-MM') as month,
            COALESCE(sum(CASE WHEN type = 'receita' THEN amount ELSE 0 END), 0) as revenue,
            COALESCE(sum(CASE WHEN type = 'despesa' THEN amount ELSE 0 END), 0) as expenses,
            count(*) as record_count
          FROM financial_records
          WHERE tenant_id = p_tenant_id AND deleted_at IS NULL
            AND created_at::date BETWEEN p_start_date AND p_end_date
          GROUP BY date_trunc('month', created_at)
          ORDER BY date_trunc('month', created_at)
        ) t
      ),
      'by_category', (
        SELECT json_agg(row_to_json(t)) FROM (
          SELECT category::text, type::text, COALESCE(sum(amount), 0) as total, count(*) as count
          FROM financial_records
          WHERE tenant_id = p_tenant_id AND deleted_at IS NULL
            AND created_at::date BETWEEN p_start_date AND p_end_date
          GROUP BY category, type ORDER BY total DESC
        ) t
      ),
      'projection', (
        SELECT json_build_object(
          'avg_monthly_revenue', COALESCE(avg(monthly_rev), 0),
          'avg_monthly_expense', COALESCE(avg(monthly_exp), 0),
          'projected_year_end_revenue', COALESCE(avg(monthly_rev) * 12, 0),
          'projected_year_end_expense', COALESCE(avg(monthly_exp) * 12, 0)
        ) FROM (
          SELECT
            COALESCE(sum(CASE WHEN type = 'receita' THEN amount ELSE 0 END), 0) as monthly_rev,
            COALESCE(sum(CASE WHEN type = 'despesa' THEN amount ELSE 0 END), 0) as monthly_exp
          FROM financial_records
          WHERE tenant_id = p_tenant_id AND deleted_at IS NULL
            AND created_at >= now() - interval '3 months'
          GROUP BY date_trunc('month', created_at)
        ) sub
      )
    )
  );
END; $$;

-- 7. get_report_performance
CREATE OR REPLACE FUNCTION get_report_performance(
  p_tenant_id UUID, p_start_date DATE DEFAULT (now() - interval '12 months')::date,
  p_end_date DATE DEFAULT (now())::date, p_group_by TEXT DEFAULT 'director'
) RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_group_by = 'director' THEN
    RETURN (SELECT json_agg(row_to_json(t)) FROM (
      SELECT p.id as group_id, p.full_name as group_label,
        count(DISTINCT j.id) as job_count, COALESCE(sum(j.closed_value), 0) as total_revenue,
        COALESCE(round(avg(j.margin_percentage)::numeric, 1), 0) as avg_margin,
        COALESCE(round(avg(j.health_score)::numeric, 0), 0) as avg_health_score,
        count(*) FILTER (WHERE j.status = 'finalizado') as completed_count,
        count(*) FILTER (WHERE j.status = 'cancelado') as cancelled_count
      FROM job_team jt JOIN jobs j ON j.id = jt.job_id JOIN people p ON p.id = jt.person_id
      WHERE j.tenant_id = p_tenant_id AND j.deleted_at IS NULL AND jt.deleted_at IS NULL
        AND jt.role = 'diretor' AND j.created_at::date BETWEEN p_start_date AND p_end_date
      GROUP BY p.id, p.full_name ORDER BY total_revenue DESC
    ) t);
  ELSIF p_group_by = 'project_type' THEN
    RETURN (SELECT json_agg(row_to_json(t)) FROM (
      SELECT j.project_type::text as group_id, j.project_type::text as group_label,
        count(*) as job_count, COALESCE(sum(j.closed_value), 0) as total_revenue,
        COALESCE(round(avg(j.margin_percentage)::numeric, 1), 0) as avg_margin,
        COALESCE(round(avg(j.health_score)::numeric, 0), 0) as avg_health_score,
        count(*) FILTER (WHERE j.status = 'finalizado') as completed_count,
        count(*) FILTER (WHERE j.status = 'cancelado') as cancelled_count
      FROM jobs j WHERE j.tenant_id = p_tenant_id AND j.deleted_at IS NULL
        AND j.created_at::date BETWEEN p_start_date AND p_end_date
      GROUP BY j.project_type ORDER BY total_revenue DESC
    ) t);
  ELSIF p_group_by = 'client' THEN
    RETURN (SELECT json_agg(row_to_json(t)) FROM (
      SELECT c.id as group_id, c.name as group_label,
        count(*) as job_count, COALESCE(sum(j.closed_value), 0) as total_revenue,
        COALESCE(round(avg(j.margin_percentage)::numeric, 1), 0) as avg_margin,
        COALESCE(round(avg(j.health_score)::numeric, 0), 0) as avg_health_score,
        count(*) FILTER (WHERE j.status = 'finalizado') as completed_count,
        count(*) FILTER (WHERE j.status = 'cancelado') as cancelled_count
      FROM jobs j JOIN clients c ON c.id = j.client_id
      WHERE j.tenant_id = p_tenant_id AND j.deleted_at IS NULL
        AND j.created_at::date BETWEEN p_start_date AND p_end_date
      GROUP BY c.id, c.name ORDER BY total_revenue DESC
    ) t);
  ELSIF p_group_by = 'segment' THEN
    RETURN (SELECT json_agg(row_to_json(t)) FROM (
      SELECT j.client_segment::text as group_id, j.client_segment::text as group_label,
        count(*) as job_count, COALESCE(sum(j.closed_value), 0) as total_revenue,
        COALESCE(round(avg(j.margin_percentage)::numeric, 1), 0) as avg_margin,
        COALESCE(round(avg(j.health_score)::numeric, 0), 0) as avg_health_score,
        count(*) FILTER (WHERE j.status = 'finalizado') as completed_count,
        count(*) FILTER (WHERE j.status = 'cancelado') as cancelled_count
      FROM jobs j WHERE j.tenant_id = p_tenant_id AND j.deleted_at IS NULL
        AND j.client_segment IS NOT NULL
        AND j.created_at::date BETWEEN p_start_date AND p_end_date
      GROUP BY j.client_segment ORDER BY total_revenue DESC
    ) t);
  ELSE
    RETURN '[]'::json;
  END IF;
END; $$;

-- 8. get_report_team_utilization
CREATE OR REPLACE FUNCTION get_report_team_utilization(
  p_tenant_id UUID, p_start_date DATE DEFAULT (now() - interval '3 months')::date,
  p_end_date DATE DEFAULT (now())::date
) RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE total_days INT;
BEGIN
  total_days := (p_end_date - p_start_date) + 1;
  IF total_days <= 0 THEN total_days := 1; END IF;
  RETURN (
    SELECT json_agg(row_to_json(t)) FROM (
      SELECT p.id as person_id, p.full_name,
        CASE WHEN p.is_internal THEN 'staff' ELSE 'freelancer' END as person_type,
        count(DISTINCT a.job_id) as job_count,
        COALESCE(sum(
          LEAST(a.allocation_end, p_end_date) - GREATEST(a.allocation_start, p_start_date) + 1
        ), 0) as allocated_days,
        COALESCE(round(
          (sum(LEAST(a.allocation_end, p_end_date) - GREATEST(a.allocation_start, p_start_date) + 1
          )::numeric / total_days) * 100, 1
        ), 0) as utilization_pct,
        (SELECT count(*) FROM allocations a1
         JOIN allocations a2 ON a1.people_id = a2.people_id
           AND a1.id < a2.id AND a1.deleted_at IS NULL AND a2.deleted_at IS NULL
           AND a2.tenant_id = p_tenant_id
           AND a1.allocation_start <= a2.allocation_end AND a1.allocation_end >= a2.allocation_start
         WHERE a1.people_id = p.id AND a1.tenant_id = p_tenant_id
           AND a1.allocation_start <= p_end_date AND a1.allocation_end >= p_start_date
        ) as conflict_count
      FROM people p
      LEFT JOIN allocations a ON a.people_id = p.id
        AND a.tenant_id = p_tenant_id AND a.deleted_at IS NULL
        AND a.allocation_start <= p_end_date AND a.allocation_end >= p_start_date
      WHERE p.tenant_id = p_tenant_id AND p.deleted_at IS NULL
      GROUP BY p.id, p.full_name, p.is_internal
      ORDER BY utilization_pct DESC
    ) t
  );
END; $$;

-- 9. get_portal_timeline
CREATE OR REPLACE FUNCTION get_portal_timeline(p_token UUID, p_limit INT DEFAULT 50)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_session RECORD;
BEGIN
  SELECT cps.*, j.title as job_title, j.code as job_code, j.status::text as job_status
  INTO v_session
  FROM client_portal_sessions cps JOIN jobs j ON j.id = cps.job_id
  WHERE cps.token = p_token AND cps.deleted_at IS NULL AND cps.is_active = true;

  IF v_session IS NULL THEN RETURN NULL; END IF;
  IF v_session.expires_at IS NOT NULL AND v_session.expires_at < now() THEN
    RETURN json_build_object('error', 'expired');
  END IF;

  UPDATE client_portal_sessions SET last_accessed_at = now() WHERE id = v_session.id;

  RETURN json_build_object(
    'session', json_build_object(
      'id', v_session.id, 'job_title', v_session.job_title,
      'job_code', v_session.job_code, 'job_status', v_session.job_status,
      'permissions', v_session.permissions
    ),
    'timeline', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (
        SELECT jh.id, jh.event_type::text, jh.description, jh.created_at
        FROM job_history jh
        WHERE jh.job_id = v_session.job_id AND jh.tenant_id = v_session.tenant_id
          AND jh.event_type IN ('status_change', 'approval', 'file_upload')
        ORDER BY jh.created_at DESC LIMIT p_limit
      ) t
    ),
    'documents', (
      SELECT COALESCE(json_agg(row_to_json(d)), '[]'::json) FROM (
        SELECT jf.id, jf.file_name as name, jf.file_url as url, jf.category, jf.created_at
        FROM job_files jf
        WHERE jf.job_id = v_session.job_id AND jf.tenant_id = v_session.tenant_id
          AND jf.deleted_at IS NULL AND jf.category IN ('briefing', 'aprovacoes', 'entregaveis')
        ORDER BY jf.created_at DESC
      ) d
    ),
    'approvals', (
      SELECT COALESCE(json_agg(row_to_json(a)), '[]'::json) FROM (
        SELECT ar.id, ar.approval_type, ar.title, ar.description, ar.file_url,
          ar.status, ar.token as approval_token, ar.expires_at, ar.created_at
        FROM approval_requests ar
        WHERE ar.job_id = v_session.job_id AND ar.tenant_id = v_session.tenant_id
          AND ar.deleted_at IS NULL AND ar.approver_type = 'external'
        ORDER BY ar.created_at DESC
      ) a
    ),
    'messages', (
      SELECT COALESCE(json_agg(row_to_json(m)), '[]'::json) FROM (
        SELECT cpm.id, cpm.direction, cpm.sender_name, cpm.content, cpm.attachments, cpm.created_at
        FROM client_portal_messages cpm
        WHERE cpm.session_id = v_session.id AND cpm.deleted_at IS NULL
        ORDER BY cpm.created_at ASC
      ) m
    )
  );
END; $$;
