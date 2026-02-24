
-- ============================================================
-- Migration: fix_fase7_audit_bugs
-- Correcoes baseadas na auditoria de 7 agentes (QA, Security,
-- Backend, Frontend, Tech Lead, DB Architect, PM)
-- ============================================================

-- ============================================================
-- 1. Expandir CHECK constraint de notifications.type
--    Adicionar 3 tipos novos das Fases 6 e 7
-- ============================================================
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS chk_notifications_type;
ALTER TABLE notifications ADD CONSTRAINT chk_notifications_type CHECK (
  type IN (
    'job_approved',
    'status_changed',
    'team_added',
    'deadline_approaching',
    'margin_alert',
    'deliverable_overdue',
    'shooting_date_approaching',
    'integration_failed',
    'portal_message_received',
    'approval_responded',
    'approval_requested'
  )
);

-- ============================================================
-- 2. Fix created_by NOT NULL + ON DELETE SET NULL contradicao
--    Alterar para ON DELETE RESTRICT nas 3 tabelas afetadas
-- ============================================================
-- client_portal_sessions.created_by
ALTER TABLE client_portal_sessions
  DROP CONSTRAINT IF EXISTS client_portal_sessions_created_by_fkey;
ALTER TABLE client_portal_sessions
  ADD CONSTRAINT client_portal_sessions_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE RESTRICT;

-- allocations.created_by (verificar se existe)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'allocations' AND column_name = 'created_by'
  ) THEN
    EXECUTE 'ALTER TABLE allocations DROP CONSTRAINT IF EXISTS allocations_created_by_fkey';
    EXECUTE 'ALTER TABLE allocations ADD CONSTRAINT allocations_created_by_fkey FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE RESTRICT';
  END IF;
END $$;

-- approval_requests.created_by (verificar se existe)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'approval_requests' AND column_name = 'created_by'
  ) THEN
    EXECUTE 'ALTER TABLE approval_requests DROP CONSTRAINT IF EXISTS approval_requests_created_by_fkey';
    EXECUTE 'ALTER TABLE approval_requests ADD CONSTRAINT approval_requests_created_by_fkey FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE RESTRICT';
  END IF;
END $$;

-- ============================================================
-- 3. Fix RPC get_report_financial_monthly
--    - Renomear 'net' para 'total_balance' no summary
--    - Adicionar 'months_count' ao summary
--    - Adicionar 'balance' e renomear 'record_count' para 'job_count' em by_month
--    - Usar due_date em vez de created_at para filtro de competencia
-- ============================================================
CREATE OR REPLACE FUNCTION get_report_financial_monthly(
  p_tenant_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT json_build_object(
      'summary', (
        SELECT json_build_object(
          'total_revenue', COALESCE(sum(CASE WHEN type = 'receita' THEN amount ELSE 0 END), 0),
          'total_expenses', COALESCE(sum(CASE WHEN type = 'despesa' THEN amount ELSE 0 END), 0),
          'total_balance', COALESCE(
            sum(CASE WHEN type = 'receita' THEN amount ELSE 0 END) -
            sum(CASE WHEN type = 'despesa' THEN amount ELSE 0 END),
            0
          ),
          'avg_monthly_revenue', COALESCE(
            CASE
              WHEN count(DISTINCT date_trunc('month', COALESCE(due_date, created_at::date))) > 0
              THEN sum(CASE WHEN type = 'receita' THEN amount ELSE 0 END) /
                   count(DISTINCT date_trunc('month', COALESCE(due_date, created_at::date)))
              ELSE 0
            END,
            0
          ),
          'months_count', COALESCE(
            count(DISTINCT date_trunc('month', COALESCE(due_date, created_at::date))),
            0
          ),
          'paid_count', count(*) FILTER (WHERE status = 'pago'),
          'pending_count', count(*) FILTER (WHERE status = 'pendente'),
          'overdue_count', count(*) FILTER (WHERE status = 'atrasado')
        )
        FROM financial_records
        WHERE tenant_id = p_tenant_id
          AND deleted_at IS NULL
          AND COALESCE(due_date, created_at::date) BETWEEN p_start_date AND p_end_date
      ),
      'by_month', (
        SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
        FROM (
          SELECT
            to_char(date_trunc('month', COALESCE(due_date, created_at::date)), 'YYYY-MM') as month,
            COALESCE(sum(CASE WHEN type = 'receita' THEN amount ELSE 0 END), 0) as revenue,
            COALESCE(sum(CASE WHEN type = 'despesa' THEN amount ELSE 0 END), 0) as expenses,
            COALESCE(
              sum(CASE WHEN type = 'receita' THEN amount ELSE 0 END) -
              sum(CASE WHEN type = 'despesa' THEN amount ELSE 0 END),
              0
            ) as balance,
            count(DISTINCT job_id) as job_count
          FROM financial_records
          WHERE tenant_id = p_tenant_id
            AND deleted_at IS NULL
            AND COALESCE(due_date, created_at::date) BETWEEN p_start_date AND p_end_date
          GROUP BY date_trunc('month', COALESCE(due_date, created_at::date))
          ORDER BY date_trunc('month', COALESCE(due_date, created_at::date))
        ) t
      ),
      'by_category', (
        SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
        FROM (
          SELECT
            category::text,
            type::text,
            COALESCE(sum(amount), 0) as total,
            count(*) as count
          FROM financial_records
          WHERE tenant_id = p_tenant_id
            AND deleted_at IS NULL
            AND COALESCE(due_date, created_at::date) BETWEEN p_start_date AND p_end_date
          GROUP BY category, type
          ORDER BY total DESC
        ) t
      ),
      'projection', (
        SELECT json_build_object(
          'avg_monthly_revenue', COALESCE(avg(monthly_rev), 0),
          'avg_monthly_expenses', COALESCE(avg(monthly_exp), 0),
          'trend', CASE
            WHEN count(*) >= 2 THEN
              CASE
                WHEN (array_agg(monthly_rev ORDER BY m DESC))[1] > (array_agg(monthly_rev ORDER BY m DESC))[2]
                THEN 'up'
                ELSE 'down'
              END
            ELSE 'stable'
          END
        )
        FROM (
          SELECT
            date_trunc('month', COALESCE(due_date, created_at::date)) as m,
            COALESCE(sum(CASE WHEN type = 'receita' THEN amount ELSE 0 END), 0) as monthly_rev,
            COALESCE(sum(CASE WHEN type = 'despesa' THEN amount ELSE 0 END), 0) as monthly_exp
          FROM financial_records
          WHERE tenant_id = p_tenant_id
            AND deleted_at IS NULL
            AND COALESCE(due_date, created_at::date) BETWEEN p_start_date AND p_end_date
          GROUP BY date_trunc('month', COALESCE(due_date, created_at::date))
        ) monthly
      )
    )
  );
END;
$$;

-- ============================================================
-- 4. Fix RPC get_portal_timeline
--    - Adicionar 'label' e 'expires_at' ao session
--    - Renomear 'url' para 'file_url' nos documents
--    - Filtrar sections baseado em permissions da sessao
-- ============================================================
CREATE OR REPLACE FUNCTION get_portal_timeline(
  p_token UUID,
  p_limit INT DEFAULT 50
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session RECORD;
  v_permissions JSONB;
BEGIN
  -- Buscar sessao pelo token
  SELECT cps.*, j.title as job_title, j.code as job_code, j.status::text as job_status
  INTO v_session
  FROM client_portal_sessions cps
  JOIN jobs j ON j.id = cps.job_id
  WHERE cps.token = p_token
    AND cps.deleted_at IS NULL
    AND cps.is_active = true;

  IF v_session IS NULL THEN
    RETURN NULL;
  END IF;

  -- Verificar expiracao
  IF v_session.expires_at IS NOT NULL AND v_session.expires_at < now() THEN
    RETURN json_build_object('error', 'expired');
  END IF;

  -- Atualizar last_accessed_at
  UPDATE client_portal_sessions
  SET last_accessed_at = now()
  WHERE id = v_session.id;

  -- Extrair permissoes (default: tudo habilitado)
  v_permissions := COALESCE(v_session.permissions, '{}'::jsonb);

  RETURN json_build_object(
    'session', json_build_object(
      'id', v_session.id,
      'label', v_session.label,
      'job_title', v_session.job_title,
      'job_code', v_session.job_code,
      'job_status', v_session.job_status,
      'permissions', v_session.permissions,
      'expires_at', v_session.expires_at
    ),
    'timeline', CASE
      WHEN COALESCE((v_permissions->>'timeline')::boolean, true) THEN (
        SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
        FROM (
          SELECT
            jh.id,
            jh.event_type::text,
            jh.description,
            jh.created_at
          FROM job_history jh
          WHERE jh.job_id = v_session.job_id
            AND jh.tenant_id = v_session.tenant_id
            AND jh.event_type IN ('status_change', 'approval', 'file_upload')
          ORDER BY jh.created_at DESC
          LIMIT p_limit
        ) t
      )
      ELSE '[]'::json
    END,
    'documents', CASE
      WHEN COALESCE((v_permissions->>'documents')::boolean, true) THEN (
        SELECT COALESCE(json_agg(row_to_json(d)), '[]'::json)
        FROM (
          SELECT
            jf.id,
            jf.file_name as name,
            jf.file_url,
            jf.category,
            jf.created_at
          FROM job_files jf
          WHERE jf.job_id = v_session.job_id
            AND jf.tenant_id = v_session.tenant_id
            AND jf.deleted_at IS NULL
            AND jf.category IN ('briefing', 'aprovacoes', 'entregaveis')
          ORDER BY jf.created_at DESC
        ) d
      )
      ELSE '[]'::json
    END,
    'approvals', CASE
      WHEN COALESCE((v_permissions->>'approvals')::boolean, true) THEN (
        SELECT COALESCE(json_agg(row_to_json(a)), '[]'::json)
        FROM (
          SELECT
            ar.id,
            ar.approval_type,
            ar.title,
            ar.description,
            ar.file_url,
            ar.status,
            ar.token as approval_token,
            ar.expires_at,
            ar.created_at
          FROM approval_requests ar
          WHERE ar.job_id = v_session.job_id
            AND ar.tenant_id = v_session.tenant_id
            AND ar.deleted_at IS NULL
            AND ar.approver_type = 'external'
          ORDER BY ar.created_at DESC
        ) a
      )
      ELSE '[]'::json
    END,
    'messages', CASE
      WHEN COALESCE((v_permissions->>'messages')::boolean, true) THEN (
        SELECT COALESCE(json_agg(row_to_json(m)), '[]'::json)
        FROM (
          SELECT
            cpm.id,
            cpm.direction,
            cpm.sender_name,
            cpm.content,
            cpm.attachments,
            cpm.created_at
          FROM client_portal_messages cpm
          WHERE cpm.session_id = v_session.id
            AND cpm.deleted_at IS NULL
          ORDER BY cpm.created_at ASC
        ) m
      )
      ELSE '[]'::json
    END
  );
END;
$$;

-- ============================================================
-- 5. Fix get_report_team_utilization - allocated_days negativo
--    Adicionar GREATEST(0, ...) para evitar valores negativos
-- ============================================================
CREATE OR REPLACE FUNCTION get_report_team_utilization(
  p_tenant_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_days INT;
BEGIN
  total_days := (p_end_date - p_start_date) + 1;
  IF total_days <= 0 THEN total_days := 1; END IF;

  RETURN (
    SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
    FROM (
      SELECT
        p.id as person_id,
        p.full_name,
        CASE WHEN p.is_internal THEN 'staff' ELSE 'freelancer' END as person_type,
        count(DISTINCT a.job_id) as job_count,
        COALESCE(sum(
          GREATEST(0, LEAST(a.allocation_end, p_end_date) - GREATEST(a.allocation_start, p_start_date) + 1)
        ), 0) as allocated_days,
        COALESCE(round(
          (sum(
            GREATEST(0, LEAST(a.allocation_end, p_end_date) - GREATEST(a.allocation_start, p_start_date) + 1)
          )::numeric / total_days) * 100, 1
        ), 0) as utilization_pct,
        (
          SELECT count(*)
          FROM allocations a1
          JOIN allocations a2 ON a1.person_id = a2.person_id
            AND a1.id < a2.id
            AND a1.allocation_start <= a2.allocation_end
            AND a1.allocation_end >= a2.allocation_start
            AND a1.deleted_at IS NULL
            AND a2.deleted_at IS NULL
          WHERE a1.person_id = p.id
            AND a1.tenant_id = p_tenant_id
            AND a1.allocation_start <= p_end_date
            AND a1.allocation_end >= p_start_date
        ) as conflicts
      FROM people p
      LEFT JOIN allocations a ON a.person_id = p.id
        AND a.tenant_id = p_tenant_id
        AND a.deleted_at IS NULL
        AND a.allocation_start <= p_end_date
        AND a.allocation_end >= p_start_date
      WHERE p.tenant_id = p_tenant_id
        AND p.deleted_at IS NULL
        AND p.is_active = true
      GROUP BY p.id, p.full_name, p.is_internal
      HAVING count(a.id) > 0
      ORDER BY utilization_pct DESC
    ) t
  );
END;
$$;

-- ============================================================
-- 6. Fix RLS performance: wrap get_tenant_id() em (SELECT ...)
--    para tabelas das Fases 5 e 6 que usam sem wrapper
-- ============================================================

-- notifications
DROP POLICY IF EXISTS "notifications_select" ON notifications;
DROP POLICY IF EXISTS "notifications_insert" ON notifications;
DROP POLICY IF EXISTS "notifications_update" ON notifications;
DROP POLICY IF EXISTS "notifications_delete" ON notifications;

CREATE POLICY "notifications_select" ON notifications
  FOR SELECT TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()));
CREATE POLICY "notifications_insert" ON notifications
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = (SELECT get_tenant_id()));
CREATE POLICY "notifications_update" ON notifications
  FOR UPDATE TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()))
  WITH CHECK (tenant_id = (SELECT get_tenant_id()));
CREATE POLICY "notifications_delete" ON notifications
  FOR DELETE TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()));

-- notification_preferences
DROP POLICY IF EXISTS "notification_preferences_select" ON notification_preferences;
DROP POLICY IF EXISTS "notification_preferences_insert" ON notification_preferences;
DROP POLICY IF EXISTS "notification_preferences_update" ON notification_preferences;

CREATE POLICY "notification_preferences_select" ON notification_preferences
  FOR SELECT TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()));
CREATE POLICY "notification_preferences_insert" ON notification_preferences
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = (SELECT get_tenant_id()));
CREATE POLICY "notification_preferences_update" ON notification_preferences
  FOR UPDATE TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()))
  WITH CHECK (tenant_id = (SELECT get_tenant_id()));

-- drive_folders
DROP POLICY IF EXISTS "drive_folders_select" ON drive_folders;
DROP POLICY IF EXISTS "drive_folders_insert" ON drive_folders;
DROP POLICY IF EXISTS "drive_folders_update" ON drive_folders;
DROP POLICY IF EXISTS "drive_folders_delete" ON drive_folders;

CREATE POLICY "drive_folders_select" ON drive_folders
  FOR SELECT TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()));
CREATE POLICY "drive_folders_insert" ON drive_folders
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = (SELECT get_tenant_id()));
CREATE POLICY "drive_folders_update" ON drive_folders
  FOR UPDATE TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()))
  WITH CHECK (tenant_id = (SELECT get_tenant_id()));
CREATE POLICY "drive_folders_delete" ON drive_folders
  FOR DELETE TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()));

-- whatsapp_messages
DROP POLICY IF EXISTS "whatsapp_messages_select" ON whatsapp_messages;
DROP POLICY IF EXISTS "whatsapp_messages_insert" ON whatsapp_messages;

CREATE POLICY "whatsapp_messages_select" ON whatsapp_messages
  FOR SELECT TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()));
CREATE POLICY "whatsapp_messages_insert" ON whatsapp_messages
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = (SELECT get_tenant_id()));

-- integration_events
DROP POLICY IF EXISTS "integration_events_select" ON integration_events;
DROP POLICY IF EXISTS "integration_events_insert" ON integration_events;

CREATE POLICY "integration_events_select" ON integration_events
  FOR SELECT TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()));
CREATE POLICY "integration_events_insert" ON integration_events
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = (SELECT get_tenant_id()));

-- allocations
DROP POLICY IF EXISTS "allocations_select" ON allocations;
DROP POLICY IF EXISTS "allocations_insert" ON allocations;
DROP POLICY IF EXISTS "allocations_update" ON allocations;
DROP POLICY IF EXISTS "allocations_delete" ON allocations;

CREATE POLICY "allocations_select" ON allocations
  FOR SELECT TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()));
CREATE POLICY "allocations_insert" ON allocations
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = (SELECT get_tenant_id()));
CREATE POLICY "allocations_update" ON allocations
  FOR UPDATE TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()))
  WITH CHECK (tenant_id = (SELECT get_tenant_id()));
CREATE POLICY "allocations_delete" ON allocations
  FOR DELETE TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()));

-- approval_requests
DROP POLICY IF EXISTS "approval_requests_select" ON approval_requests;
DROP POLICY IF EXISTS "approval_requests_insert" ON approval_requests;
DROP POLICY IF EXISTS "approval_requests_update" ON approval_requests;

CREATE POLICY "approval_requests_select" ON approval_requests
  FOR SELECT TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()));
CREATE POLICY "approval_requests_insert" ON approval_requests
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = (SELECT get_tenant_id()));
CREATE POLICY "approval_requests_update" ON approval_requests
  FOR UPDATE TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()))
  WITH CHECK (tenant_id = (SELECT get_tenant_id()));

-- approval_logs
DROP POLICY IF EXISTS "approval_logs_select" ON approval_logs;
DROP POLICY IF EXISTS "approval_logs_insert" ON approval_logs;

CREATE POLICY "approval_logs_select" ON approval_logs
  FOR SELECT TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()));
CREATE POLICY "approval_logs_insert" ON approval_logs
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = (SELECT get_tenant_id()));

-- ============================================================
-- 7. Indice em drive_folders.created_by (faltava)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_drive_folders_created_by ON drive_folders(created_by);

-- ============================================================
-- 8. Indice composto jobs(tenant_id, created_at) para RPCs
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_jobs_tenant_created ON jobs(tenant_id, created_at);

-- ============================================================
-- 9. Indice em report_snapshots.expires_at para pg_cron
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_report_snapshots_expires_at ON report_snapshots(expires_at);
