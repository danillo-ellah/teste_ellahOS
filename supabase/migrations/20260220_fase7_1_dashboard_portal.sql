-- ============================================================
-- Migration: Fase 7.1 -- Dashboard + Relatorios + Portal do Cliente
-- Data: 2026-02-20
-- Descricao: Criar 3 tabelas novas (client_portal_sessions,
--   client_portal_messages, report_snapshots), 9 RPCs de agregacao,
--   RLS policies, triggers updated_at, indices de performance e
--   pg_cron para cleanup de report_snapshots.
-- Idempotente: sim (IF NOT EXISTS, DROP IF EXISTS, CREATE OR REPLACE)
-- ============================================================

-- Fixar search_path para seguranca
SET search_path = public, extensions;

-- ============================================================
-- 1. TABELAS NOVAS
-- ============================================================

-- ----------------------------------------------------------
-- 1.1 client_portal_sessions
-- Tokens de acesso ao portal do cliente. Um token persistente
-- por job por contato. Diferente de approval_requests (aprovacao
-- especifica com validade curta).
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS client_portal_sessions (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  job_id            UUID        NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  contact_id        UUID        REFERENCES contacts(id) ON DELETE SET NULL,
  token             UUID        NOT NULL DEFAULT gen_random_uuid(),
  label             TEXT,
  permissions       JSONB       NOT NULL DEFAULT '{"timeline":true,"documents":true,"approvals":true,"messages":true}',
  is_active         BOOLEAN     NOT NULL DEFAULT true,
  last_accessed_at  TIMESTAMPTZ,
  expires_at        TIMESTAMPTZ,
  created_by        UUID        NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at        TIMESTAMPTZ,

  -- Token unico globalmente
  CONSTRAINT uq_client_portal_sessions_token UNIQUE (token)
);

COMMENT ON TABLE client_portal_sessions IS 'Sessoes de acesso ao portal do cliente. Token UUID persistente por job.';
COMMENT ON COLUMN client_portal_sessions.permissions IS 'JSON com permissoes: timeline, documents, approvals, messages (booleans)';
COMMENT ON COLUMN client_portal_sessions.label IS 'Label descritivo para identificacao no settings (ex: nome do contato + job)';
COMMENT ON COLUMN client_portal_sessions.last_accessed_at IS 'Ultima vez que o token foi usado para acessar o portal';
COMMENT ON COLUMN client_portal_sessions.expires_at IS 'Data de expiracao do token. NULL = nao expira.';

-- Unique parcial: um token ativo por job por contato
-- PostgreSQL nao suporta WHERE em CONSTRAINT UNIQUE inline,
-- entao usamos CREATE UNIQUE INDEX
CREATE UNIQUE INDEX IF NOT EXISTS idx_client_portal_sessions_active_job_contact
  ON client_portal_sessions(tenant_id, job_id, contact_id)
  WHERE deleted_at IS NULL AND is_active = true;

-- ----------------------------------------------------------
-- 1.2 client_portal_messages
-- Mensagens bidirecionais entre cliente e produtora via portal.
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS client_portal_messages (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  session_id            UUID        NOT NULL REFERENCES client_portal_sessions(id) ON DELETE CASCADE,
  job_id                UUID        NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  direction             TEXT        NOT NULL,
  sender_name           TEXT        NOT NULL,
  sender_user_id        UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  content               TEXT        NOT NULL,
  attachments           JSONB       DEFAULT '[]',
  read_at               TIMESTAMPTZ,
  idempotency_key       TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at            TIMESTAMPTZ,

  -- Direcao valida
  CONSTRAINT chk_portal_messages_direction CHECK (
    direction IN ('client_to_producer', 'producer_to_client')
  ),

  -- Consistencia direction/sender: cliente nao tem user_id, produtor tem
  CONSTRAINT chk_portal_messages_direction_sender CHECK (
    (direction = 'client_to_producer' AND sender_user_id IS NULL)
    OR
    (direction = 'producer_to_client' AND sender_user_id IS NOT NULL)
  ),

  -- Idempotency obrigatorio para mensagens do cliente (previne duplicatas por retry)
  CONSTRAINT chk_portal_messages_idempotency_required CHECK (
    direction = 'producer_to_client' OR idempotency_key IS NOT NULL
  ),

  -- Idempotencia
  CONSTRAINT uq_portal_messages_idempotency UNIQUE (idempotency_key)
);

COMMENT ON TABLE client_portal_messages IS 'Mensagens do portal do cliente. Canal bidirecional entre cliente e produtora.';
COMMENT ON COLUMN client_portal_messages.direction IS 'Direcao: client_to_producer ou producer_to_client';
COMMENT ON COLUMN client_portal_messages.sender_name IS 'Nome visivel do remetente (ex: "Joao Silva" ou "Ellah Producoes")';
COMMENT ON COLUMN client_portal_messages.attachments IS 'Array JSON de anexos: [{name, url, size}]';
COMMENT ON COLUMN client_portal_messages.sender_user_id IS 'ID do usuario interno que enviou. NULL se remetente e cliente externo.';

-- ----------------------------------------------------------
-- 1.3 report_snapshots
-- Cache de relatorios pre-calculados. TTL de 1h para pesados.
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS report_snapshots (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  report_type     TEXT        NOT NULL,
  parameters      JSONB       NOT NULL DEFAULT '{}',
  data            JSONB       NOT NULL,
  generated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at      TIMESTAMPTZ NOT NULL,
  created_by      UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ,

  -- Tipo valido
  CONSTRAINT chk_report_snapshots_type CHECK (
    report_type IN ('financial_monthly', 'performance_director', 'team_utilization', 'client_summary')
  )
);

COMMENT ON TABLE report_snapshots IS 'Cache de relatorios pre-calculados. TTL de 1h para relatorios pesados.';
COMMENT ON COLUMN report_snapshots.parameters IS 'Parametros usados para gerar: {period, client_id, director_id, etc}';
COMMENT ON COLUMN report_snapshots.expires_at IS 'Expiracao do cache. Apos expirar, sera recalculado sob demanda.';

-- ============================================================
-- 2. TRIGGERS updated_at
-- A function update_updated_at() ja existe no banco (Fase 1).
-- ============================================================

DROP TRIGGER IF EXISTS trg_client_portal_sessions_updated_at ON client_portal_sessions;
CREATE TRIGGER trg_client_portal_sessions_updated_at
  BEFORE UPDATE ON client_portal_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_client_portal_messages_updated_at ON client_portal_messages;
CREATE TRIGGER trg_client_portal_messages_updated_at
  BEFORE UPDATE ON client_portal_messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_report_snapshots_updated_at ON report_snapshots;
CREATE TRIGGER trg_report_snapshots_updated_at
  BEFORE UPDATE ON report_snapshots
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 3. RLS POLICIES
-- Padrao: get_tenant_id() retorna tenant_id do JWT.
-- Todas usam (SELECT get_tenant_id()) para evitar re-eval por row.
-- ============================================================

-- ----------------------------------------------------------
-- 3.1 client_portal_sessions
-- Isolamento por tenant. Qualquer usuario autenticado do tenant.
-- ----------------------------------------------------------
ALTER TABLE client_portal_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "client_portal_sessions_select" ON client_portal_sessions;
CREATE POLICY "client_portal_sessions_select" ON client_portal_sessions
  FOR SELECT TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()));

DROP POLICY IF EXISTS "client_portal_sessions_insert" ON client_portal_sessions;
CREATE POLICY "client_portal_sessions_insert" ON client_portal_sessions
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = (SELECT get_tenant_id()));

DROP POLICY IF EXISTS "client_portal_sessions_update" ON client_portal_sessions;
CREATE POLICY "client_portal_sessions_update" ON client_portal_sessions
  FOR UPDATE TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()));

-- ----------------------------------------------------------
-- 3.2 client_portal_messages
-- Isolamento por tenant. Qualquer usuario autenticado do tenant
-- pode ler e inserir (producer_to_client). Mensagens do cliente
-- (client_to_producer) sao inseridas via service_role na Edge
-- Function (endpoint publico sem auth).
-- ----------------------------------------------------------
ALTER TABLE client_portal_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "portal_messages_select" ON client_portal_messages;
CREATE POLICY "portal_messages_select" ON client_portal_messages
  FOR SELECT TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()));

DROP POLICY IF EXISTS "portal_messages_insert" ON client_portal_messages;
CREATE POLICY "portal_messages_insert" ON client_portal_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = (SELECT get_tenant_id())
    AND direction = 'producer_to_client'
    AND sender_user_id = (SELECT auth.uid())
  );

DROP POLICY IF EXISTS "portal_messages_update" ON client_portal_messages;
CREATE POLICY "portal_messages_update" ON client_portal_messages
  FOR UPDATE TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()));

-- ----------------------------------------------------------
-- 3.3 report_snapshots
-- Isolamento por tenant.
-- ----------------------------------------------------------
ALTER TABLE report_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "report_snapshots_select" ON report_snapshots;
CREATE POLICY "report_snapshots_select" ON report_snapshots
  FOR SELECT TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()));

DROP POLICY IF EXISTS "report_snapshots_insert" ON report_snapshots;
CREATE POLICY "report_snapshots_insert" ON report_snapshots
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = (SELECT get_tenant_id()));

-- ============================================================
-- 4. INDICES
-- ============================================================

-- client_portal_sessions: busca por token (principal acesso publico)
CREATE INDEX IF NOT EXISTS idx_client_portal_sessions_token
  ON client_portal_sessions(token)
  WHERE deleted_at IS NULL;

-- client_portal_sessions: busca por tenant + job
CREATE INDEX IF NOT EXISTS idx_client_portal_sessions_tenant_job
  ON client_portal_sessions(tenant_id, job_id)
  WHERE deleted_at IS NULL;

-- client_portal_sessions: FK indices
CREATE INDEX IF NOT EXISTS idx_client_portal_sessions_tenant_id
  ON client_portal_sessions(tenant_id);

CREATE INDEX IF NOT EXISTS idx_client_portal_sessions_job_id
  ON client_portal_sessions(job_id);

CREATE INDEX IF NOT EXISTS idx_client_portal_sessions_contact_id
  ON client_portal_sessions(contact_id)
  WHERE contact_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_client_portal_sessions_created_by
  ON client_portal_sessions(created_by);

-- client_portal_messages: busca por sessao (ordenado por data)
CREATE INDEX IF NOT EXISTS idx_portal_messages_session
  ON client_portal_messages(session_id, created_at DESC);

-- client_portal_messages: busca por tenant + job
CREATE INDEX IF NOT EXISTS idx_portal_messages_tenant_job
  ON client_portal_messages(tenant_id, job_id);

-- client_portal_messages: FK indices
CREATE INDEX IF NOT EXISTS idx_portal_messages_tenant_id
  ON client_portal_messages(tenant_id);

CREATE INDEX IF NOT EXISTS idx_portal_messages_job_id
  ON client_portal_messages(job_id);

CREATE INDEX IF NOT EXISTS idx_portal_messages_session_id
  ON client_portal_messages(session_id);

CREATE INDEX IF NOT EXISTS idx_portal_messages_sender_user_id
  ON client_portal_messages(sender_user_id)
  WHERE sender_user_id IS NOT NULL;

-- report_snapshots: busca por tenant + tipo + data
CREATE INDEX IF NOT EXISTS idx_report_snapshots_lookup
  ON report_snapshots(tenant_id, report_type, generated_at DESC);

-- report_snapshots: FK indices
CREATE INDEX IF NOT EXISTS idx_report_snapshots_tenant_id
  ON report_snapshots(tenant_id);

CREATE INDEX IF NOT EXISTS idx_report_snapshots_created_by
  ON report_snapshots(created_by)
  WHERE created_by IS NOT NULL;

-- ----------------------------------------------------------
-- 4.1 Indices de performance para RPCs de dashboard/relatorios
-- Parciais para acelerar queries agregadas.
-- ----------------------------------------------------------

-- Para get_dashboard_kpis e get_pipeline_summary: jobs ativos por tenant+status
CREATE INDEX IF NOT EXISTS idx_jobs_tenant_status_active
  ON jobs(tenant_id, status)
  WHERE deleted_at IS NULL AND status NOT IN ('finalizado', 'cancelado');

-- Para get_alerts (entregaveis atrasados): delivery_date em nao entregues
-- Nota: idx_job_deliverables_overdue ja existe (Fase 5.2) com status != 'entregue'.
-- Este indice complementa para os status usados nas RPCs.
CREATE INDEX IF NOT EXISTS idx_deliverables_overdue_dashboard
  ON job_deliverables(delivery_date)
  WHERE deleted_at IS NULL AND status NOT IN ('aprovado', 'entregue');

-- Para get_recent_activity: historico recente por tenant
CREATE INDEX IF NOT EXISTS idx_job_history_tenant_recent
  ON job_history(tenant_id, created_at DESC);

-- Para get_report_financial_monthly: financeiro por tenant+data
CREATE INDEX IF NOT EXISTS idx_financial_records_tenant_date
  ON financial_records(tenant_id, created_at)
  WHERE deleted_at IS NULL;

-- ============================================================
-- 5. GRANTS
-- ============================================================

-- service_role: acesso total (para Edge Functions e pg_cron)
GRANT ALL ON client_portal_sessions TO service_role;
GRANT ALL ON client_portal_messages TO service_role;
GRANT ALL ON report_snapshots TO service_role;

-- authenticated: operacoes via RLS
GRANT SELECT, INSERT, UPDATE, DELETE ON client_portal_sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON client_portal_messages TO authenticated;
GRANT SELECT, INSERT ON report_snapshots TO authenticated;

-- anon: necessario para RPCs publicas (get_portal_timeline chama via service_role,
-- mas para seguranca nao damos acesso direto a anon nas tabelas)

-- ============================================================
-- 6. RPCs DE AGREGACAO
-- Todas sao SECURITY DEFINER com SET search_path = public.
-- Recebem p_tenant_id como parametro (do JWT na Edge Function).
-- ============================================================

-- ----------------------------------------------------------
-- 6.1 get_dashboard_kpis
-- Retorna KPIs agregados do dashboard: jobs ativos, faturamento,
-- margem media, health score, aprovacoes pendentes, etc.
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION get_dashboard_kpis(p_tenant_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'active_jobs', (
      SELECT count(*)
      FROM jobs
      WHERE tenant_id = p_tenant_id
        AND deleted_at IS NULL
        AND status NOT IN ('finalizado', 'cancelado', 'pausado')
    ),
    'total_jobs_month', (
      SELECT count(*)
      FROM jobs
      WHERE tenant_id = p_tenant_id
        AND deleted_at IS NULL
        AND created_at >= date_trunc('month', now())
    ),
    'total_revenue', (
      SELECT COALESCE(sum(closed_value), 0)
      FROM jobs
      WHERE tenant_id = p_tenant_id
        AND deleted_at IS NULL
        AND status NOT IN ('cancelado')
        AND closed_value IS NOT NULL
    ),
    'revenue_month', (
      SELECT COALESCE(sum(closed_value), 0)
      FROM jobs
      WHERE tenant_id = p_tenant_id
        AND deleted_at IS NULL
        AND status NOT IN ('cancelado')
        AND closed_value IS NOT NULL
        AND created_at >= date_trunc('month', now())
    ),
    'avg_margin', (
      SELECT COALESCE(round(avg(margin_percentage)::numeric, 1), 0)
      FROM jobs
      WHERE tenant_id = p_tenant_id
        AND deleted_at IS NULL
        AND status NOT IN ('cancelado')
        AND margin_percentage IS NOT NULL
    ),
    'avg_health_score', (
      SELECT COALESCE(round(avg(health_score)::numeric, 0), 0)
      FROM jobs
      WHERE tenant_id = p_tenant_id
        AND deleted_at IS NULL
        AND status NOT IN ('finalizado', 'cancelado')
        AND health_score IS NOT NULL
    ),
    'pending_approvals', (
      SELECT count(*)
      FROM approval_requests
      WHERE tenant_id = p_tenant_id
        AND deleted_at IS NULL
        AND status = 'pending'
    ),
    'overdue_deliverables', (
      -- job_deliverables usa delivery_date (nao due_date)
      -- e status e ENUM deliverable_status
      SELECT count(*)
      FROM job_deliverables jd
      JOIN jobs j ON j.id = jd.job_id
      WHERE j.tenant_id = p_tenant_id
        AND jd.deleted_at IS NULL
        AND j.deleted_at IS NULL
        AND jd.status NOT IN ('aprovado', 'entregue')
        AND jd.delivery_date IS NOT NULL
        AND jd.delivery_date < current_date
    ),
    'team_allocated', (
      SELECT count(DISTINCT people_id)
      FROM allocations
      WHERE tenant_id = p_tenant_id
        AND deleted_at IS NULL
        AND allocation_start <= current_date
        AND allocation_end >= current_date
    )
  ) INTO result;

  RETURN result;
END;
$$;

COMMENT ON FUNCTION get_dashboard_kpis(UUID) IS 'Retorna KPIs agregados do dashboard: jobs ativos, faturamento, margem, health score, aprovacoes pendentes, entregaveis atrasados, equipe alocada.';

-- ----------------------------------------------------------
-- 6.2 get_pipeline_summary
-- Retorna contagem e valor por status (pipeline visual).
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION get_pipeline_summary(p_tenant_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT json_agg(row_to_json(t))
    FROM (
      SELECT
        status::text,
        count(*) as count,
        COALESCE(sum(closed_value), 0) as total_value
      FROM jobs
      WHERE tenant_id = p_tenant_id
        AND deleted_at IS NULL
        AND status NOT IN ('cancelado')
      GROUP BY status
      ORDER BY
        CASE status
          WHEN 'briefing_recebido' THEN 1
          WHEN 'orcamento_elaboracao' THEN 2
          WHEN 'orcamento_enviado' THEN 3
          WHEN 'aguardando_aprovacao' THEN 4
          WHEN 'aprovado_selecao_diretor' THEN 5
          WHEN 'cronograma_planejamento' THEN 6
          WHEN 'pre_producao' THEN 7
          WHEN 'producao_filmagem' THEN 8
          WHEN 'pos_producao' THEN 9
          WHEN 'aguardando_aprovacao_final' THEN 10
          WHEN 'entregue' THEN 11
          WHEN 'finalizado' THEN 12
          WHEN 'pausado' THEN 13
          ELSE 99
        END
    ) t
  );
END;
$$;

COMMENT ON FUNCTION get_pipeline_summary(UUID) IS 'Retorna contagem de jobs e valor total por status para o pipeline visual do dashboard.';

-- ----------------------------------------------------------
-- 6.3 get_revenue_by_month
-- Retorna faturamento mensal para graficos (ultimos N meses).
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION get_revenue_by_month(
  p_tenant_id UUID,
  p_months INT DEFAULT 12
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT json_agg(row_to_json(t))
    FROM (
      SELECT
        to_char(date_trunc('month', j.created_at), 'YYYY-MM') as month,
        count(*) as job_count,
        COALESCE(sum(j.closed_value), 0) as revenue,
        COALESCE(sum(j.production_cost), 0) as cost,
        COALESCE(sum(j.gross_profit), 0) as profit
      FROM jobs j
      WHERE j.tenant_id = p_tenant_id
        AND j.deleted_at IS NULL
        AND j.status NOT IN ('cancelado')
        AND j.created_at >= date_trunc('month', now()) - (p_months || ' months')::interval
      GROUP BY date_trunc('month', j.created_at)
      ORDER BY date_trunc('month', j.created_at)
    ) t
  );
END;
$$;

COMMENT ON FUNCTION get_revenue_by_month(UUID, INT) IS 'Retorna faturamento, custo e lucro por mes dos ultimos N meses para graficos do dashboard.';

-- ----------------------------------------------------------
-- 6.4 get_alerts
-- Retorna alertas urgentes: margem baixa, entregaveis atrasados,
-- health score baixo, aprovacoes expirando.
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION get_alerts(
  p_tenant_id UUID,
  p_limit INT DEFAULT 20
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT json_agg(row_to_json(t))
    FROM (
      -- Subquery wrapper para aplicar ORDER BY e LIMIT no resultado total
      SELECT * FROM (
        -- Margin alerts: jobs com margem < 15%
        SELECT
          'margin_alert'::text as alert_type,
          j.id as entity_id,
          j.title as entity_title,
          j.code as entity_code,
          json_build_object('margin', j.margin_percentage) as metadata,
          j.updated_at as alert_date
        FROM jobs j
        WHERE j.tenant_id = p_tenant_id
          AND j.deleted_at IS NULL
          AND j.status NOT IN ('finalizado', 'cancelado')
          AND j.margin_percentage IS NOT NULL
          AND j.margin_percentage < 15
        ORDER BY j.margin_percentage ASC
        LIMIT 5
      ) margin_alerts

      UNION ALL

      SELECT * FROM (
        -- Overdue deliverables
        -- Nota: job_deliverables usa description (nao title) e delivery_date (nao due_date)
        SELECT
          'overdue_deliverable'::text as alert_type,
          jd.id as entity_id,
          jd.description as entity_title,
          j.code as entity_code,
          json_build_object('due_date', jd.delivery_date, 'job_title', j.title) as metadata,
          jd.delivery_date::timestamptz as alert_date
        FROM job_deliverables jd
        JOIN jobs j ON j.id = jd.job_id
        WHERE j.tenant_id = p_tenant_id
          AND jd.deleted_at IS NULL
          AND j.deleted_at IS NULL
          AND jd.status NOT IN ('aprovado', 'entregue')
          AND jd.delivery_date IS NOT NULL
          AND jd.delivery_date < current_date
        ORDER BY jd.delivery_date ASC
        LIMIT 5
      ) overdue_alerts

      UNION ALL

      SELECT * FROM (
        -- Low health score (< 50)
        SELECT
          'low_health_score'::text as alert_type,
          j.id as entity_id,
          j.title as entity_title,
          j.code as entity_code,
          json_build_object('health_score', j.health_score) as metadata,
          j.updated_at as alert_date
        FROM jobs j
        WHERE j.tenant_id = p_tenant_id
          AND j.deleted_at IS NULL
          AND j.status NOT IN ('finalizado', 'cancelado')
          AND j.health_score IS NOT NULL
          AND j.health_score < 50
        ORDER BY j.health_score ASC
        LIMIT 5
      ) health_alerts

      UNION ALL

      SELECT * FROM (
        -- Pending approvals expiring soon (< 7 days)
        SELECT
          'approval_expiring'::text as alert_type,
          ar.id as entity_id,
          ar.title as entity_title,
          j.code as entity_code,
          json_build_object('expires_at', ar.expires_at, 'job_title', j.title) as metadata,
          ar.expires_at as alert_date
        FROM approval_requests ar
        JOIN jobs j ON j.id = ar.job_id
        WHERE ar.tenant_id = p_tenant_id
          AND ar.deleted_at IS NULL
          AND ar.status = 'pending'
          AND ar.expires_at IS NOT NULL
          AND ar.expires_at < now() + interval '7 days'
        ORDER BY ar.expires_at ASC
        LIMIT 5
      ) approval_alerts

      ORDER BY alert_date ASC
      LIMIT p_limit
    ) t
  );
END;
$$;

COMMENT ON FUNCTION get_alerts(UUID, INT) IS 'Retorna alertas urgentes do dashboard: margem baixa, entregaveis atrasados, health score baixo, aprovacoes expirando.';

-- ----------------------------------------------------------
-- 6.5 get_recent_activity
-- Retorna atividades recentes do job_history (ultimas N horas).
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION get_recent_activity(
  p_tenant_id UUID,
  p_hours INT DEFAULT 48,
  p_limit INT DEFAULT 30
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT json_agg(row_to_json(t))
    FROM (
      SELECT
        jh.id,
        jh.event_type::text,
        jh.description,
        jh.created_at,
        jh.user_id,
        p.full_name as user_name,
        j.id as job_id,
        j.code as job_code,
        j.title as job_title
      FROM job_history jh
      JOIN jobs j ON j.id = jh.job_id
      LEFT JOIN profiles p ON p.id = jh.user_id
      WHERE jh.tenant_id = p_tenant_id
        AND jh.created_at >= now() - (p_hours || ' hours')::interval
      ORDER BY jh.created_at DESC
      LIMIT p_limit
    ) t
  );
END;
$$;

COMMENT ON FUNCTION get_recent_activity(UUID, INT, INT) IS 'Retorna atividades recentes do job_history das ultimas N horas. Inclui nome do usuario e dados do job.';

-- ----------------------------------------------------------
-- 6.6 get_report_financial_monthly
-- Relatorio financeiro mensal com resumo, detalhamento por mes,
-- por categoria e projecao simples.
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION get_report_financial_monthly(
  p_tenant_id UUID,
  p_start_date DATE DEFAULT (date_trunc('year', now()))::date,
  p_end_date DATE DEFAULT (now())::date
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
          'net', COALESCE(
            sum(CASE WHEN type = 'receita' THEN amount ELSE 0 END) -
            sum(CASE WHEN type = 'despesa' THEN amount ELSE 0 END),
            0
          ),
          'paid_count', count(*) FILTER (WHERE status = 'pago'),
          'pending_count', count(*) FILTER (WHERE status = 'pendente'),
          'overdue_count', count(*) FILTER (WHERE status = 'atrasado')
        )
        FROM financial_records
        WHERE tenant_id = p_tenant_id
          AND deleted_at IS NULL
          AND created_at::date BETWEEN p_start_date AND p_end_date
      ),
      'by_month', (
        SELECT json_agg(row_to_json(t))
        FROM (
          SELECT
            to_char(date_trunc('month', created_at), 'YYYY-MM') as month,
            COALESCE(sum(CASE WHEN type = 'receita' THEN amount ELSE 0 END), 0) as revenue,
            COALESCE(sum(CASE WHEN type = 'despesa' THEN amount ELSE 0 END), 0) as expenses,
            count(*) as record_count
          FROM financial_records
          WHERE tenant_id = p_tenant_id
            AND deleted_at IS NULL
            AND created_at::date BETWEEN p_start_date AND p_end_date
          GROUP BY date_trunc('month', created_at)
          ORDER BY date_trunc('month', created_at)
        ) t
      ),
      'by_category', (
        SELECT json_agg(row_to_json(t))
        FROM (
          SELECT
            category::text,
            type::text,
            COALESCE(sum(amount), 0) as total,
            count(*) as count
          FROM financial_records
          WHERE tenant_id = p_tenant_id
            AND deleted_at IS NULL
            AND created_at::date BETWEEN p_start_date AND p_end_date
          GROUP BY category, type
          ORDER BY total DESC
        ) t
      ),
      'projection', (
        -- Projecao simples: media dos ultimos 3 meses * 12
        SELECT json_build_object(
          'avg_monthly_revenue', COALESCE(avg(monthly_rev), 0),
          'avg_monthly_expense', COALESCE(avg(monthly_exp), 0),
          'projected_year_end_revenue', COALESCE(avg(monthly_rev) * 12, 0),
          'projected_year_end_expense', COALESCE(avg(monthly_exp) * 12, 0)
        )
        FROM (
          SELECT
            COALESCE(sum(CASE WHEN type = 'receita' THEN amount ELSE 0 END), 0) as monthly_rev,
            COALESCE(sum(CASE WHEN type = 'despesa' THEN amount ELSE 0 END), 0) as monthly_exp
          FROM financial_records
          WHERE tenant_id = p_tenant_id
            AND deleted_at IS NULL
            AND created_at >= now() - interval '3 months'
          GROUP BY date_trunc('month', created_at)
        ) sub
      )
    )
  );
END;
$$;

COMMENT ON FUNCTION get_report_financial_monthly(UUID, DATE, DATE) IS 'Relatorio financeiro mensal: resumo, detalhamento por mes, por categoria e projecao anual.';

-- ----------------------------------------------------------
-- 6.7 get_report_performance
-- Relatorio de performance agrupado por dimensao:
-- director, project_type, client, segment.
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION get_report_performance(
  p_tenant_id UUID,
  p_start_date DATE DEFAULT (now() - interval '12 months')::date,
  p_end_date DATE DEFAULT (now())::date,
  p_group_by TEXT DEFAULT 'director'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_group_by = 'director' THEN
    RETURN (
      SELECT json_agg(row_to_json(t))
      FROM (
        SELECT
          p.id as group_id,
          p.full_name as group_label,
          count(DISTINCT j.id) as job_count,
          COALESCE(sum(j.closed_value), 0) as total_revenue,
          COALESCE(round(avg(j.margin_percentage)::numeric, 1), 0) as avg_margin,
          COALESCE(round(avg(j.health_score)::numeric, 0), 0) as avg_health_score,
          count(*) FILTER (WHERE j.status = 'finalizado') as completed_count,
          count(*) FILTER (WHERE j.status = 'cancelado') as cancelled_count
        FROM job_team jt
        JOIN jobs j ON j.id = jt.job_id
        JOIN people p ON p.id = jt.person_id
        WHERE j.tenant_id = p_tenant_id
          AND j.deleted_at IS NULL
          AND jt.deleted_at IS NULL
          AND jt.role = 'diretor'
          AND j.created_at::date BETWEEN p_start_date AND p_end_date
        GROUP BY p.id, p.full_name
        ORDER BY total_revenue DESC
      ) t
    );
  ELSIF p_group_by = 'project_type' THEN
    RETURN (
      SELECT json_agg(row_to_json(t))
      FROM (
        SELECT
          j.project_type::text as group_id,
          j.project_type::text as group_label,
          count(*) as job_count,
          COALESCE(sum(j.closed_value), 0) as total_revenue,
          COALESCE(round(avg(j.margin_percentage)::numeric, 1), 0) as avg_margin,
          COALESCE(round(avg(j.health_score)::numeric, 0), 0) as avg_health_score,
          count(*) FILTER (WHERE j.status = 'finalizado') as completed_count,
          count(*) FILTER (WHERE j.status = 'cancelado') as cancelled_count
        FROM jobs j
        WHERE j.tenant_id = p_tenant_id
          AND j.deleted_at IS NULL
          AND j.created_at::date BETWEEN p_start_date AND p_end_date
        GROUP BY j.project_type
        ORDER BY total_revenue DESC
      ) t
    );
  ELSIF p_group_by = 'client' THEN
    RETURN (
      SELECT json_agg(row_to_json(t))
      FROM (
        SELECT
          c.id as group_id,
          c.name as group_label,
          count(*) as job_count,
          COALESCE(sum(j.closed_value), 0) as total_revenue,
          COALESCE(round(avg(j.margin_percentage)::numeric, 1), 0) as avg_margin,
          COALESCE(round(avg(j.health_score)::numeric, 0), 0) as avg_health_score,
          count(*) FILTER (WHERE j.status = 'finalizado') as completed_count,
          count(*) FILTER (WHERE j.status = 'cancelado') as cancelled_count
        FROM jobs j
        JOIN clients c ON c.id = j.client_id
        WHERE j.tenant_id = p_tenant_id
          AND j.deleted_at IS NULL
          AND j.created_at::date BETWEEN p_start_date AND p_end_date
        GROUP BY c.id, c.name
        ORDER BY total_revenue DESC
      ) t
    );
  ELSIF p_group_by = 'segment' THEN
    RETURN (
      SELECT json_agg(row_to_json(t))
      FROM (
        SELECT
          j.segment::text as group_id,
          j.segment::text as group_label,
          count(*) as job_count,
          COALESCE(sum(j.closed_value), 0) as total_revenue,
          COALESCE(round(avg(j.margin_percentage)::numeric, 1), 0) as avg_margin,
          COALESCE(round(avg(j.health_score)::numeric, 0), 0) as avg_health_score,
          count(*) FILTER (WHERE j.status = 'finalizado') as completed_count,
          count(*) FILTER (WHERE j.status = 'cancelado') as cancelled_count
        FROM jobs j
        WHERE j.tenant_id = p_tenant_id
          AND j.deleted_at IS NULL
          AND j.segment IS NOT NULL
          AND j.created_at::date BETWEEN p_start_date AND p_end_date
        GROUP BY j.segment
        ORDER BY total_revenue DESC
      ) t
    );
  ELSE
    RETURN '[]'::json;
  END IF;
END;
$$;

COMMENT ON FUNCTION get_report_performance(UUID, DATE, DATE, TEXT) IS 'Relatorio de performance agrupado por dimensao (director, project_type, client, segment). Inclui job_count, revenue, margem, health score.';

-- ----------------------------------------------------------
-- 6.8 get_report_team_utilization
-- Relatorio de utilizacao de equipe: dias alocados, percentual
-- de ocupacao e contagem de conflitos por pessoa.
-- Nota: people usa is_internal (boolean), nao type (text).
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION get_report_team_utilization(
  p_tenant_id UUID,
  p_start_date DATE DEFAULT (now() - interval '3 months')::date,
  p_end_date DATE DEFAULT (now())::date
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
    SELECT json_agg(row_to_json(t))
    FROM (
      SELECT
        p.id as person_id,
        p.full_name,
        -- people usa is_internal (boolean), nao type (text)
        CASE WHEN p.is_internal THEN 'staff' ELSE 'freelancer' END as person_type,
        count(DISTINCT a.job_id) as job_count,
        -- Dias alocados (capped ao range solicitado)
        COALESCE(sum(
          LEAST(a.allocation_end, p_end_date) - GREATEST(a.allocation_start, p_start_date) + 1
        ), 0) as allocated_days,
        -- Utilizacao como percentual
        COALESCE(round(
          (sum(
            LEAST(a.allocation_end, p_end_date) - GREATEST(a.allocation_start, p_start_date) + 1
          )::numeric / total_days) * 100, 1
        ), 0) as utilization_pct,
        -- Conflitos no periodo
        (
          SELECT count(*)
          FROM allocations a1
          JOIN allocations a2 ON a1.people_id = a2.people_id
            AND a1.id < a2.id
            AND a1.deleted_at IS NULL
            AND a2.deleted_at IS NULL
            AND a2.tenant_id = p_tenant_id
            AND a1.allocation_start <= a2.allocation_end
            AND a1.allocation_end >= a2.allocation_start
          WHERE a1.people_id = p.id
            AND a1.tenant_id = p_tenant_id
            AND a1.allocation_start <= p_end_date
            AND a1.allocation_end >= p_start_date
        ) as conflict_count
      FROM people p
      LEFT JOIN allocations a ON a.people_id = p.id
        AND a.tenant_id = p_tenant_id
        AND a.deleted_at IS NULL
        AND a.allocation_start <= p_end_date
        AND a.allocation_end >= p_start_date
      WHERE p.tenant_id = p_tenant_id
        AND p.deleted_at IS NULL
      GROUP BY p.id, p.full_name, p.is_internal
      ORDER BY utilization_pct DESC
    ) t
  );
END;
$$;

COMMENT ON FUNCTION get_report_team_utilization(UUID, DATE, DATE) IS 'Relatorio de utilizacao de equipe: dias alocados, percentual de ocupacao e conflitos por pessoa no periodo.';

-- ----------------------------------------------------------
-- 6.9 get_portal_timeline
-- Retorna dados completos do portal do cliente: sessao, timeline,
-- documentos, aprovacoes e mensagens. Acesso via token UUID publico.
-- Nota: job_files usa file_name (nao name), file_url (nao url).
-- ----------------------------------------------------------
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

  RETURN json_build_object(
    'session', json_build_object(
      'id', v_session.id,
      'job_title', v_session.job_title,
      'job_code', v_session.job_code,
      'job_status', v_session.job_status,
      'permissions', v_session.permissions
    ),
    'timeline', (
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
          -- Filtrar apenas eventos seguros para o cliente
          AND jh.event_type IN ('status_change', 'approval', 'file_upload')
        ORDER BY jh.created_at DESC
        LIMIT p_limit
      ) t
    ),
    'documents', (
      SELECT COALESCE(json_agg(row_to_json(d)), '[]'::json)
      FROM (
        SELECT
          jf.id,
          jf.file_name as name,
          jf.file_url as url,
          jf.category,
          jf.created_at
        FROM job_files jf
        WHERE jf.job_id = v_session.job_id
          AND jf.tenant_id = v_session.tenant_id
          AND jf.deleted_at IS NULL
          -- Apenas categorias seguras para o cliente
          AND jf.category IN ('briefing', 'aprovacoes', 'entregaveis')
        ORDER BY jf.created_at DESC
      ) d
    ),
    'approvals', (
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
    ),
    'messages', (
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
  );
END;
$$;

COMMENT ON FUNCTION get_portal_timeline(UUID, INT) IS 'Retorna dados completos do portal do cliente: sessao, timeline (filtrada para eventos seguros), documentos, aprovacoes e mensagens.';

-- ============================================================
-- 7. pg_cron: Cleanup de report_snapshots expirados
-- Roda a cada 6 horas. Deleta snapshots com expires_at < now().
-- ============================================================

DO $$
BEGIN
  -- Remover job existente se houver (idempotencia)
  PERFORM cron.unschedule('cleanup-expired-report-snapshots');
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'cleanup-expired-report-snapshots',
  '0 */6 * * *',
  $$DELETE FROM report_snapshots WHERE expires_at < now()$$
);

-- ============================================================
-- 8. VERIFICACAO FINAL (comentario informativo)
-- ============================================================
-- Apos aplicar esta migration, verificar:
--
-- 1. Tabelas criadas:
--    SELECT tablename FROM pg_tables
--    WHERE schemaname = 'public'
--      AND tablename IN ('client_portal_sessions', 'client_portal_messages', 'report_snapshots');
--
-- 2. RPCs criadas:
--    SELECT proname FROM pg_proc
--    WHERE proname IN (
--      'get_dashboard_kpis', 'get_pipeline_summary', 'get_revenue_by_month',
--      'get_alerts', 'get_recent_activity', 'get_report_financial_monthly',
--      'get_report_performance', 'get_report_team_utilization', 'get_portal_timeline'
--    );
--
-- 3. RLS habilitado:
--    SELECT tablename, rowsecurity FROM pg_tables
--    WHERE schemaname = 'public'
--      AND tablename IN ('client_portal_sessions', 'client_portal_messages', 'report_snapshots');
--
-- 4. pg_cron job:
--    SELECT jobname, schedule FROM cron.job WHERE jobname = 'cleanup-expired-report-snapshots';
--
-- 5. Testar RPC (sem dados retorna valores zerados/null):
--    SELECT get_dashboard_kpis('00000000-0000-0000-0000-000000000000');
--    SELECT get_pipeline_summary('00000000-0000-0000-0000-000000000000');
--    SELECT get_portal_timeline('00000000-0000-0000-0000-000000000000');
