# Arquitetura: Fase 7 -- Dashboard + Relatorios + Portal do Cliente

**Data:** 20/02/2026
**Status:** Em revisao
**Autor:** Tech Lead -- ELLAHOS
**Roadmap:** docs/architecture/full-roadmap.md (Fase 7)
**ADRs relacionados:** ADR-011, ADR-012, ADR-013

---

## 1. Visao Geral

A Fase 7 entrega tres subsistemas que dependem das 27 tabelas e 13 Edge Functions existentes:

1. **Dashboard Home** -- Visao executiva com KPIs, pipeline, alertas e graficos
2. **Relatorios** -- Performance, financeiro e equipe com export CSV
3. **Portal do Cliente** -- Acesso publico via token para acompanhamento e mensagens

### Posicao na Arquitetura

```
[Dashboard Home] (/dashboard)
   |-- KPIs: queries agregadas em jobs, financial_records, allocations
   |-- Pipeline mini: contagem por status (jobs)
   |-- Alertas: approval_requests pendentes, deliverables atrasados, margin < 15%
   |-- Atividades recentes: job_history (ultimas 48h)
   |-- Graficos: jobs por status, faturamento por mes

[Relatorios] (/reports)
   |-- RPCs de agregacao no PostgreSQL (performance critica)
   |-- Filtros por periodo, tipo, cliente, diretor
   |-- Export CSV (server-side via Edge Function)

[Portal do Cliente] (/portal/[token])
   |-- Token persistente por job (tabela client_portal_sessions)
   |-- Timeline de eventos (job_history filtrado)
   |-- Documentos compartilhados (job_files + drive_folders filtrados)
   |-- Aprovacoes pendentes (approval_requests)
   |-- Mensagens bidirecionais (client_portal_messages)

[Settings Portal] (/settings/portal)
   |-- Config do que cliente ve (per tenant)
   |-- Gestao de tokens ativos
```

### Principios

- **Performance acima de tudo:** queries agregadas DEVEM ser RPCs no PostgreSQL, nunca N+1 no frontend
- **Reutilizar patterns:** portal do cliente segue o mesmo pattern de /approve/[token] (CSR, sem auth, token UUID)
- **Dados sensíveis isolados:** portal do cliente NAO expoe dados financeiros internos (margem, custo de producao)
- **Multi-tenant:** todas as novas tabelas/RPCs filtram por tenant_id (via RLS ou parametro)
- **Idempotencia:** operacoes de escrita no portal (mensagens) sao idempotentes via idempotency_key

---

## 2. Schema do Banco de Dados

### 2.1 Tabelas Novas

#### 2.1.1 client_portal_sessions

Tokens de acesso ao portal. Um token por job por contato. Diferente de approval_requests (que e para uma aprovacao especifica com validade curta), esta tabela gerencia sessoes persistentes de acompanhamento.

```sql
CREATE TABLE IF NOT EXISTS client_portal_sessions (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  job_id            UUID        NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  contact_id        UUID        REFERENCES contacts(id) ON DELETE SET NULL,
  token             UUID        NOT NULL DEFAULT gen_random_uuid(),
  label             TEXT,       -- ex: "Joao - Campanha Verao 2026"
  permissions       JSONB       NOT NULL DEFAULT '{"timeline":true,"documents":true,"approvals":true,"messages":true}',
  is_active         BOOLEAN     NOT NULL DEFAULT true,
  last_accessed_at  TIMESTAMPTZ,
  expires_at        TIMESTAMPTZ,  -- NULL = nao expira
  created_by        UUID        NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at        TIMESTAMPTZ,

  -- Token unico
  CONSTRAINT uq_client_portal_sessions_token UNIQUE (token),

  -- Um token ativo por job por contato
  CONSTRAINT uq_client_portal_sessions_job_contact UNIQUE (tenant_id, job_id, contact_id)
    WHERE deleted_at IS NULL AND is_active = true
);

COMMENT ON TABLE client_portal_sessions IS 'Sessoes de acesso ao portal do cliente. Token UUID persistente por job.';
COMMENT ON COLUMN client_portal_sessions.permissions IS 'JSON com permissoes: timeline, documents, approvals, messages (booleans)';
COMMENT ON COLUMN client_portal_sessions.label IS 'Label descritivo para identificacao no settings (ex: nome do contato + job)';
COMMENT ON COLUMN client_portal_sessions.last_accessed_at IS 'Ultima vez que o token foi usado para acessar o portal';
```

**Indices:**
```sql
CREATE INDEX IF NOT EXISTS idx_client_portal_sessions_token
  ON client_portal_sessions(token) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_client_portal_sessions_tenant_job
  ON client_portal_sessions(tenant_id, job_id) WHERE deleted_at IS NULL;
```

**RLS:**
```sql
ALTER TABLE client_portal_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "client_portal_sessions_select" ON client_portal_sessions
  FOR SELECT TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()));

CREATE POLICY "client_portal_sessions_insert" ON client_portal_sessions
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = (SELECT get_tenant_id()));

CREATE POLICY "client_portal_sessions_update" ON client_portal_sessions
  FOR UPDATE TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()));
```

#### 2.1.2 client_portal_messages

Mensagens bidirecionais entre cliente e produtora via portal.

```sql
CREATE TABLE IF NOT EXISTS client_portal_messages (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  session_id            UUID        NOT NULL REFERENCES client_portal_sessions(id) ON DELETE CASCADE,
  job_id                UUID        NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  direction             TEXT        NOT NULL,  -- 'client_to_producer' | 'producer_to_client'
  sender_name           TEXT        NOT NULL,  -- nome de quem enviou (cliente ou usuario interno)
  sender_user_id        UUID        REFERENCES profiles(id) ON DELETE SET NULL,  -- NULL se cliente
  content               TEXT        NOT NULL,
  attachments           JSONB       DEFAULT '[]',  -- [{name, url, size}]
  read_at               TIMESTAMPTZ,
  idempotency_key       TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Direcao valida
  CONSTRAINT chk_portal_messages_direction CHECK (
    direction IN ('client_to_producer', 'producer_to_client')
  ),

  -- Idempotencia
  CONSTRAINT uq_portal_messages_idempotency UNIQUE (idempotency_key)
);

COMMENT ON TABLE client_portal_messages IS 'Mensagens do portal do cliente. Canal bidirecional entre cliente e produtora.';
COMMENT ON COLUMN client_portal_messages.direction IS 'Direcao: client_to_producer ou producer_to_client';
COMMENT ON COLUMN client_portal_messages.sender_name IS 'Nome visivel do remetente (ex: "Joao Silva" ou "Ellah Producoes")';
COMMENT ON COLUMN client_portal_messages.attachments IS 'Array JSON de anexos: [{name, url, size}]';
```

**Indices:**
```sql
CREATE INDEX IF NOT EXISTS idx_portal_messages_session
  ON client_portal_messages(session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_portal_messages_tenant_job
  ON client_portal_messages(tenant_id, job_id);
```

**RLS:**
```sql
ALTER TABLE client_portal_messages ENABLE ROW LEVEL SECURITY;

-- Usuarios autenticados veem mensagens do seu tenant
CREATE POLICY "portal_messages_select" ON client_portal_messages
  FOR SELECT TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()));

-- Usuarios autenticados podem inserir (producer_to_client)
CREATE POLICY "portal_messages_insert" ON client_portal_messages
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = (SELECT get_tenant_id()));
```

**Nota:** Mensagens do cliente (client_to_producer) sao inseridas via service_role na Edge Function (endpoint publico sem auth, similar a approval respond).

#### 2.1.3 report_snapshots (cache de relatorios)

Cache opcional para relatorios pesados. Evita recalculo a cada acesso.

```sql
CREATE TABLE IF NOT EXISTS report_snapshots (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  report_type     TEXT        NOT NULL,
  parameters      JSONB       NOT NULL DEFAULT '{}',
  data            JSONB       NOT NULL,
  generated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at      TIMESTAMPTZ NOT NULL,
  created_by      UUID        REFERENCES profiles(id) ON DELETE SET NULL,

  -- Tipo valido
  CONSTRAINT chk_report_snapshots_type CHECK (
    report_type IN ('financial_monthly', 'performance_director', 'team_utilization', 'client_summary')
  )
);

COMMENT ON TABLE report_snapshots IS 'Cache de relatorios pre-calculados. TTL de 1h para relatorios pesados.';
COMMENT ON COLUMN report_snapshots.parameters IS 'Parametros usados para gerar: {period, client_id, director_id, etc}';
COMMENT ON COLUMN report_snapshots.expires_at IS 'Expiracao do cache. Apos expirar, sera recalculado sob demanda.';
```

**Indices:**
```sql
CREATE INDEX IF NOT EXISTS idx_report_snapshots_lookup
  ON report_snapshots(tenant_id, report_type, generated_at DESC);
```

**RLS:**
```sql
ALTER TABLE report_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "report_snapshots_select" ON report_snapshots
  FOR SELECT TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()));

CREATE POLICY "report_snapshots_insert" ON report_snapshots
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = (SELECT get_tenant_id()));
```

**Limpeza automatica via pg_cron:**
```sql
SELECT cron.schedule(
  'cleanup-expired-report-snapshots',
  '0 */6 * * *',  -- a cada 6 horas
  $$DELETE FROM report_snapshots WHERE expires_at < now()$$
);
```

### 2.2 RPCs de Agregacao (Performance Critica)

Todas as RPCs devem ser `SECURITY DEFINER` com `SET search_path = public` e receber `p_tenant_id` como parametro (obtido do JWT na Edge Function) para evitar bypass de RLS.

#### 2.2.1 get_dashboard_kpis

```sql
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
      SELECT count(*)
      FROM job_deliverables jd
      JOIN jobs j ON j.id = jd.job_id
      WHERE j.tenant_id = p_tenant_id
        AND jd.deleted_at IS NULL
        AND j.deleted_at IS NULL
        AND jd.status NOT IN ('aprovado', 'entregue')
        AND jd.due_date < now()
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
```

#### 2.2.2 get_pipeline_summary

```sql
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
        status,
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
```

#### 2.2.3 get_revenue_by_month

```sql
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
```

#### 2.2.4 get_alerts

```sql
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
      -- Margin alerts: jobs com margem < 15%
      (SELECT
        'margin_alert' as alert_type,
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
      LIMIT 5)

      UNION ALL

      -- Overdue deliverables
      (SELECT
        'overdue_deliverable' as alert_type,
        jd.id as entity_id,
        jd.title as entity_title,
        j.code as entity_code,
        json_build_object('due_date', jd.due_date, 'job_title', j.title) as metadata,
        jd.due_date::timestamptz as alert_date
      FROM job_deliverables jd
      JOIN jobs j ON j.id = jd.job_id
      WHERE j.tenant_id = p_tenant_id
        AND jd.deleted_at IS NULL
        AND j.deleted_at IS NULL
        AND jd.status NOT IN ('aprovado', 'entregue')
        AND jd.due_date < now()
      ORDER BY jd.due_date ASC
      LIMIT 5)

      UNION ALL

      -- Low health score (< 50)
      (SELECT
        'low_health_score' as alert_type,
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
      LIMIT 5)

      UNION ALL

      -- Pending approvals expiring soon (< 7 days)
      (SELECT
        'approval_expiring' as alert_type,
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
        AND ar.expires_at < now() + interval '7 days'
      ORDER BY ar.expires_at ASC
      LIMIT 5)

      ORDER BY alert_date ASC
      LIMIT p_limit
    ) t
  );
END;
$$;
```

#### 2.2.5 get_recent_activity

```sql
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
        jh.event_type,
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
```

#### 2.2.6 get_report_financial_monthly

```sql
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
            category,
            type,
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
        -- Projecao simples: media dos ultimos 3 meses * meses restantes do ano
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
```

#### 2.2.7 get_report_performance

```sql
CREATE OR REPLACE FUNCTION get_report_performance(
  p_tenant_id UUID,
  p_start_date DATE DEFAULT (now() - interval '12 months')::date,
  p_end_date DATE DEFAULT (now())::date,
  p_group_by TEXT DEFAULT 'director'  -- 'director' | 'project_type' | 'client' | 'segment'
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
```

#### 2.2.8 get_report_team_utilization

```sql
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
        p.type as person_type,
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
      GROUP BY p.id, p.full_name, p.type
      ORDER BY utilization_pct DESC
    ) t
  );
END;
$$;
```

#### 2.2.9 get_portal_timeline

```sql
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
  SELECT cps.*, j.title as job_title, j.code as job_code, j.status as job_status
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
          jh.event_type,
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
          jf.name,
          jf.url,
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
        ORDER BY cpm.created_at ASC
      ) m
    )
  );
END;
$$;
```

### 2.3 Alteracoes em Tabelas Existentes

Nenhuma alteracao em tabelas existentes e necessaria para a Fase 7. Todas as queries de dashboard e relatorios operam sobre dados ja presentes em:
- `jobs` (KPIs, pipeline, performance)
- `financial_records` (relatorio financeiro)
- `allocations` (utilizacao de equipe)
- `approval_requests` (alertas)
- `job_deliverables` (alertas de atraso)
- `job_history` (atividades recentes)
- `job_files` (documentos no portal)

### 2.4 Triggers

```sql
-- updated_at automatico para novas tabelas
CREATE TRIGGER trg_client_portal_sessions_updated_at
  BEFORE UPDATE ON client_portal_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_client_portal_messages_updated_at
  BEFORE UPDATE ON client_portal_messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

---

## 3. Edge Functions Novas

### 3.1 dashboard (Edge Function #14)

Endpoint dedicado para queries agregadas do dashboard. Agrupa todas as chamadas de KPIs em uma unica Edge Function para minimizar cold starts.

**Estrutura:**
```
supabase/functions/dashboard/
  index.ts
  handlers/
    kpis.ts
    pipeline.ts
    alerts.ts
    activity.ts
    revenue-chart.ts
```

**Rotas:**
```
GET /dashboard/kpis                              -> KPIs agregados
GET /dashboard/pipeline                          -> Contagem por status
GET /dashboard/alerts?limit=20                   -> Alertas urgentes
GET /dashboard/activity?hours=48&limit=30        -> Atividades recentes
GET /dashboard/revenue?months=12                 -> Faturamento por mes (grafico)
```

**Response KPIs:**
```json
{
  "data": {
    "active_jobs": 12,
    "total_jobs_month": 3,
    "total_revenue": 850000.00,
    "revenue_month": 120000.00,
    "avg_margin": 22.5,
    "avg_health_score": 68,
    "pending_approvals": 4,
    "overdue_deliverables": 2,
    "team_allocated": 8
  }
}
```

**Response Pipeline:**
```json
{
  "data": [
    { "status": "briefing_recebido", "count": 2, "total_value": 0 },
    { "status": "pre_producao", "count": 3, "total_value": 250000 },
    { "status": "producao_filmagem", "count": 2, "total_value": 180000 }
  ]
}
```

**Response Alerts:**
```json
{
  "data": [
    {
      "alert_type": "margin_alert",
      "entity_id": "uuid",
      "entity_title": "Campanha Verao",
      "entity_code": "ELH-2026-001",
      "metadata": { "margin": 8.5 },
      "alert_date": "2026-02-20T10:00:00Z"
    }
  ]
}
```

**Implementacao:** Cada handler chama a RPC correspondente via service_role client, passando o tenant_id do auth context.

### 3.2 reports (Edge Function #15)

Relatorios com filtros e export CSV.

**Estrutura:**
```
supabase/functions/reports/
  index.ts
  handlers/
    financial.ts
    performance.ts
    team.ts
    export-csv.ts
```

**Rotas:**
```
GET  /reports/financial?start_date=X&end_date=Y           -> Relatorio financeiro
GET  /reports/performance?group_by=director&start_date=X   -> Performance
GET  /reports/team?start_date=X&end_date=Y                -> Utilizacao equipe
POST /reports/export                                       -> Export CSV
```

**Payload Export CSV:**
```json
{
  "report_type": "financial_monthly",
  "parameters": {
    "start_date": "2026-01-01",
    "end_date": "2026-02-28"
  },
  "format": "csv"
}
```

**Response Export CSV:**
```
HTTP 200
Content-Type: text/csv
Content-Disposition: attachment; filename="relatorio-financeiro-2026-02.csv"

Data,Tipo,Categoria,Descricao,Valor,Status
2026-02-15,despesa,cache_equipe,"Diretor - Job ELH-001",15000.00,pago
...
```

**Decisao: Export CSV server-side na Edge Function (ver ADR-011).**

### 3.3 client-portal (Edge Function #16)

Portal do cliente com endpoints publicos e autenticados.

**Estrutura:**
```
supabase/functions/client-portal/
  index.ts
  handlers/
    -- PUBLICAS (sem auth)
    get-by-token.ts         -- dados do portal
    send-message.ts         -- enviar mensagem do cliente
    -- AUTENTICADAS
    list-sessions.ts        -- listar tokens do tenant
    create-session.ts       -- criar novo token
    update-session.ts       -- ativar/desativar token
    delete-session.ts       -- soft delete token
    list-messages.ts        -- mensagens de uma sessao
    reply-message.ts        -- responder mensagem (producer)
```

**Rotas:**
```
--- PUBLICAS (sem auth) ---
GET  /client-portal/public/:token              -> get-by-token (timeline + docs + approvals + messages)
POST /client-portal/public/:token/message      -> send-message (cliente envia mensagem)

--- AUTENTICADAS ---
GET    /client-portal/sessions?job_id=X        -> listar sessoes
POST   /client-portal/sessions                 -> criar sessao
PATCH  /client-portal/sessions/:id             -> atualizar (ativar/desativar, permissoes)
DELETE /client-portal/sessions/:id             -> soft delete
GET    /client-portal/sessions/:id/messages    -> listar mensagens de uma sessao
POST   /client-portal/sessions/:id/messages    -> responder mensagem (producer)
```

**Payload Criar Sessao:**
```json
{
  "job_id": "uuid",
  "contact_id": "uuid",
  "label": "Joao - Campanha Verao",
  "permissions": {
    "timeline": true,
    "documents": true,
    "approvals": true,
    "messages": true
  },
  "expires_at": null
}
```

**Response Portal Publico (GET /client-portal/public/:token):**
```json
{
  "data": {
    "session": {
      "id": "uuid",
      "job_title": "Campanha Verao 2026",
      "job_code": "ELH-2026-042",
      "job_status": "pos_producao",
      "permissions": { "timeline": true, "documents": true, "approvals": true, "messages": true }
    },
    "timeline": [
      {
        "id": "uuid",
        "event_type": "status_change",
        "description": "Status alterado para Pos-Producao",
        "created_at": "2026-02-18T14:00:00Z"
      }
    ],
    "documents": [
      {
        "id": "uuid",
        "name": "Briefing-Aprovado.pdf",
        "url": "https://...",
        "category": "briefing",
        "created_at": "2026-02-01T10:00:00Z"
      }
    ],
    "approvals": [
      {
        "id": "uuid",
        "approval_type": "corte",
        "title": "Aprovacao do primeiro corte",
        "status": "pending",
        "approval_token": "uuid-for-approve-page",
        "expires_at": "2026-03-15T23:59:59Z"
      }
    ],
    "messages": [
      {
        "id": "uuid",
        "direction": "producer_to_client",
        "sender_name": "Ellah Producoes",
        "content": "Ola! Primeiro corte esta pronto para aprovacao.",
        "created_at": "2026-02-19T16:00:00Z"
      }
    ]
  }
}
```

**Seguranca do endpoint publico:**
- Rate limiting via contagem de client_portal_messages na ultima hora (mesmo pattern ADR-010)
- Token UUID v4 e inviavel de adivinhar (2^122 combinacoes)
- Dados financeiros NUNCA expostos (closed_value, production_cost, margin)
- Eventos de historico filtrados (somente status_change, approval, file_upload)
- Arquivos filtrados (somente briefing, aprovacoes, entregaveis)

---

## 4. Alteracoes em Edge Functions Existentes

### 4.1 notifications

Adicionar tipo de notificacao `portal_message_received` ao CHECK constraint para notificar a equipe quando cliente envia mensagem pelo portal.

### 4.2 integration_events

Adicionar event_type `portal_message_whatsapp` ao CHECK constraint para opcionalmente enviar mensagem do portal tambem via WhatsApp.

---

## 5. Frontend

### 5.1 Novas Paginas

#### 5.1.1 Dashboard Home -- /(dashboard)/dashboard

Rota: `/dashboard` (primeira pagina apos login, substituindo redirect para /jobs)

**Componentes:**
- `DashboardKPICards` -- 4-6 cards com metricas principais
- `DashboardPipelineMini` -- Barra horizontal com contagem por status
- `DashboardAlerts` -- Lista compacta de alertas urgentes
- `DashboardActivityFeed` -- Feed de atividades recentes
- `DashboardRevenueChart` -- Grafico de faturamento por mes (area chart)
- `DashboardJobsChart` -- Grafico de jobs por status (donut/bar chart)

**Layout:**
```
+----------------------------------+
| KPI Cards (4 cols)               |
| Active | Revenue | Margin | Health|
+----------------------------------+
| Pipeline Mini (barra horizontal) |
+----------------------------------+
| Revenue Chart    | Alerts        |
| (2/3 width)     | (1/3 width)   |
+----------------------------------+
| Activity Feed    | Jobs Chart    |
| (2/3 width)     | (1/3 width)   |
+----------------------------------+
```

**Hooks novos:**
- `useDashboardKPIs()` -- GET /dashboard/kpis
- `useDashboardPipeline()` -- GET /dashboard/pipeline
- `useDashboardAlerts()` -- GET /dashboard/alerts
- `useDashboardActivity()` -- GET /dashboard/activity
- `useDashboardRevenue()` -- GET /dashboard/revenue

**Refresh:** staleTime de 60s (dashboard nao precisa ser real-time, atualiza a cada visita ou a cada minuto).

#### 5.1.2 Relatorios -- /(dashboard)/reports

Rota: `/reports`

**Componentes:**
- `ReportTabs` -- Abas: Financeiro | Performance | Equipe
- `ReportFilters` -- Filtros de periodo, tipo, cliente, diretor
- `ReportFinancialSummary` -- Cards de resumo (receita, despesa, saldo)
- `ReportFinancialChart` -- Grafico mensal (barras empilhadas: receita vs despesa)
- `ReportFinancialByCategory` -- Treemap ou donut por categoria
- `ReportPerformanceTable` -- Tabela de performance por agrupamento
- `ReportPerformanceChart` -- Grafico de barras horizontais (top 10)
- `ReportTeamTable` -- Tabela de utilizacao de equipe
- `ReportTeamChart` -- Grafico de barras de utilizacao (%)
- `ReportExportButton` -- Botao para export CSV

**Hooks novos:**
- `useReportFinancial(params)` -- GET /reports/financial
- `useReportPerformance(params)` -- GET /reports/performance
- `useReportTeam(params)` -- GET /reports/team
- `useExportCSV()` -- POST /reports/export (mutation)

#### 5.1.3 Portal do Cliente -- /portal/[token]

Rota: `/portal/[token]` (publica, sem auth, sem sidebar)

**Componentes:**
- `PortalLayout` -- Layout publico minimalista (reutilizar pattern de /approve/[token])
- `PortalHeader` -- Job title, code, status badge
- `PortalTimeline` -- Lista vertical de eventos
- `PortalDocuments` -- Grid de documentos para download
- `PortalApprovals` -- Cards de aprovacao pendente (com link para /approve/[token])
- `PortalMessages` -- Chat simples (lista de mensagens + input)
- `PortalTabs` -- Abas: Timeline | Documentos | Aprovacoes | Mensagens

**Hooks novos:**
- `usePortalData(token)` -- GET /client-portal/public/:token
- `usePortalSendMessage(token)` -- POST /client-portal/public/:token/message

**Decisao: CSR puro (Client Component) seguindo ADR-009.**

#### 5.1.4 Settings Portal -- /(dashboard)/settings/portal

Rota: `/settings/portal`

**Componentes:**
- `PortalSessionsTable` -- Tabela de tokens ativos
- `CreateSessionDialog` -- Modal para criar novo token
- `SessionPermissionsEditor` -- Toggle de permissoes por token
- `CopyTokenButton` -- Copiar link do portal

**Hooks novos:**
- `usePortalSessions(jobId?)` -- GET /client-portal/sessions
- `useCreatePortalSession()` -- POST /client-portal/sessions
- `useUpdatePortalSession()` -- PATCH /client-portal/sessions/:id
- `useDeletePortalSession()` -- DELETE /client-portal/sessions/:id

### 5.2 Alteracoes no Frontend Existente

#### 5.2.1 Root redirect

Alterar `frontend/src/app/page.tsx` de redirect para `/jobs` para redirect para `/dashboard`.

#### 5.2.2 Sidebar

Adicionar itens:
- "Dashboard" (icone: LayoutDashboard) -- posicao 1 (antes de Jobs)
- "Relatorios" (icone: BarChart3) -- apos Financial
- Aba "Portal" em Settings (reutilizar pattern de settings/integrations e settings/notifications)

#### 5.2.3 Job Detail -- link para portal

No header do Job Detail, adicionar botao "Portal do Cliente" que lista tokens ativos do job ou permite criar um novo.

### 5.3 Biblioteca de Graficos

**Decisao: Recharts (ver ADR-012).**

Componentes de grafico necessarios:
- `AreaChart` -- faturamento mensal (dashboard + relatorios)
- `BarChart` -- jobs por status, performance por diretor/tipo
- `PieChart/DonutChart` -- distribuicao por status, por categoria financeira
- `StackedBarChart` -- receita vs despesa mensal

---

## 6. Sub-fases de Implementacao

### Sub-fase 7.1 -- Migration + RPCs (2-3 dias)

**Dependencias:** Nenhuma

**Entregas:**
1. Migration com 3 tabelas novas (client_portal_sessions, client_portal_messages, report_snapshots)
2. 9 RPCs de agregacao
3. RLS policies
4. Triggers updated_at
5. pg_cron para cleanup de report_snapshots
6. Teste manual das RPCs via SQL Editor

**Criterio de done:** Todas as RPCs retornam dados corretos para o tenant de teste.

### Sub-fase 7.2 -- Edge Function dashboard (2-3 dias)

**Dependencias:** 7.1

**Entregas:**
1. Edge Function `dashboard` com 5 handlers
2. Testes manuais dos 5 endpoints
3. Deploy

**Criterio de done:** `GET /dashboard/kpis` retorna dados corretos para o tenant autenticado.

### Sub-fase 7.3 -- Edge Function reports (2-3 dias)

**Dependencias:** 7.1

**Entregas:**
1. Edge Function `reports` com 4 handlers (financial, performance, team, export-csv)
2. Gerador de CSV server-side
3. Testes manuais
4. Deploy

**Criterio de done:** `POST /reports/export` retorna CSV valido com dados corretos.

### Sub-fase 7.4 -- Edge Function client-portal (3-4 dias)

**Dependencias:** 7.1

**Entregas:**
1. Edge Function `client-portal` com 8 handlers (2 publicos + 6 autenticados)
2. Rate limiting no endpoint publico de mensagem
3. Filtros de seguranca (dados sensiveis nunca expostos)
4. Testes manuais
5. Deploy

**Criterio de done:** Token publico retorna timeline, documentos e aprovacoes. Mensagem do cliente e salva.

### Sub-fase 7.5 -- Frontend Dashboard (3-4 dias)

**Dependencias:** 7.2

**Entregas:**
1. Pagina /dashboard com 6 componentes
2. 5 hooks novos
3. Instalacao e configuracao do Recharts
4. Responsivo mobile
5. Dark mode
6. Alterar redirect root para /dashboard

**Criterio de done:** CEO abre o dashboard e ve KPIs, pipeline, alertas, graficos em < 3 segundos.

### Sub-fase 7.6 -- Frontend Relatorios (3-4 dias)

**Dependencias:** 7.3, 7.5 (Recharts ja instalado)

**Entregas:**
1. Pagina /reports com 3 abas
2. Filtros de periodo/tipo/cliente/diretor
3. Graficos com Recharts
4. Export CSV (download via fetch blob)
5. 4 hooks novos

**Criterio de done:** Gerar relatorio financeiro mensal com grafico e exportar CSV.

### Sub-fase 7.7 -- Frontend Portal do Cliente (3-4 dias)

**Dependencias:** 7.4

**Entregas:**
1. Pagina publica /portal/[token]
2. Layout publico com abas (timeline, documentos, aprovacoes, mensagens)
3. Chat simples para mensagens
4. 2 hooks publicos
5. Pagina /settings/portal
6. 4 hooks autenticados
7. Botao "Portal do Cliente" no Job Detail

**Criterio de done:** Cliente acessa link, ve timeline do job, envia mensagem. Produtora ve mensagem e responde.

### Sub-fase 7.8 -- QA + Polimento (2 dias)

**Dependencias:** 7.5, 7.6, 7.7

**Entregas:**
1. Testes end-to-end de todos os fluxos
2. Performance: verificar que dashboard carrega em < 3s
3. Acessibilidade: labels, keyboard navigation, contrast
4. Mobile: responsivo em todos os breakpoints
5. Dark mode: verificar todos os graficos e componentes
6. Correcao de bugs encontrados

---

## 7. Decisoes Arquiteturais

### 7.1 RPCs vs agregacao na Edge Function

**Decisao:** RPCs no PostgreSQL para TODAS as queries de agregacao.

**Justificativa:** Queries agregadas que fazem COUNT, SUM, AVG em tabelas com milhares de rows sao ordens de magnitude mais rapidas quando executadas direto no PostgreSQL (single query plan, indices, sem overhead de rede). Fazer N queries na Edge Function e agregar em TypeScript seria inaceitavel em performance.

**Trade-off:** RPCs sao SECURITY DEFINER (rodam com permissoes do criador, nao do usuario). O tenant_id e passado como parametro pela Edge Function (obtido do JWT), garantindo isolamento.

### 7.2 Por que nao Materialized Views?

Materialized Views seriam mais performantes para queries muito pesadas, mas:
- Precisam de REFRESH (delay nos dados)
- Nao aceitam parametros (teriamos uma view por tenant -- inviavel)
- RPCs com `WHERE tenant_id = p_tenant_id` sao eficientes o suficiente para o volume esperado (< 10k jobs por tenant)
- Se performance degradar no futuro (> 50k jobs), migrar para materialized views parciais com REFRESH periodico

### 7.3 Portal do cliente vs reutilizar approval_requests

**Decisao:** Criar tabela separada `client_portal_sessions` em vez de reutilizar `approval_requests`.

**Justificativa:**
- `approval_requests` e desenhada para uma acao unica (aprovar/rejeitar) com expiracao curta (30 dias)
- O portal e uma sessao persistente de acompanhamento (pode nao expirar)
- O portal tem permissoes granulares (timeline, documentos, aprovacoes, mensagens)
- O portal tem mensagens bidirecionais (inexistente em approvals)
- Misturar semanticas diferentes na mesma tabela violaria SRP

**Reutilizacao:** O portal REUTILIZA o pattern de pagina publica (CSR, sem auth, PublicLayout, token UUID na URL) e os links de aprovacao existentes (o portal exibe links para /approve/[token] para cada approval_request pendente). O portal NAO substitui o fluxo de aprovacao.

---

## 8. Consideracoes de Performance

### 8.1 Dashboard

- **Todas as queries via RPC:** Single round-trip ao banco por handler
- **staleTime de 60s:** Dashboard nao precisa ser real-time
- **Parallel fetch:** Frontend faz 5 requests em paralelo (KPIs, pipeline, alerts, activity, revenue)
- **Indices existentes:** tenant_id e indexado em todas as tabelas (PK/FK), status indexado em jobs
- **Volume esperado:** < 5.000 jobs por tenant no primeiro ano. RPCs escalam ate ~50k sem problemas

### 8.2 Relatorios

- **Cache via report_snapshots:** Relatorios pesados sao cacheados por 1h
- **Edge Function verifica cache antes de recalcular:**
  1. Buscar snapshot com mesmos parametros e expires_at > now()
  2. Se encontrar, retornar dados cacheados
  3. Se nao, executar RPC, salvar snapshot, retornar
- **Export CSV:** Gerado na Edge Function (nao no frontend) para nao bloquear a UI
- **Limite de periodo:** Maximo 24 meses por consulta (previne full table scans)

### 8.3 Portal do Cliente

- **RPC get_portal_timeline:** Busca tudo em uma unica query (timeline + docs + approvals + messages)
- **Filtragem no banco:** Apenas eventos seguros sao retornados (filtro no SQL, nao no frontend)
- **last_accessed_at:** Atualizado a cada acesso para tracking de uso

### 8.4 Indices adicionais recomendados

```sql
-- Para performance das RPCs de dashboard
CREATE INDEX IF NOT EXISTS idx_jobs_tenant_status_active
  ON jobs(tenant_id, status)
  WHERE deleted_at IS NULL AND status NOT IN ('finalizado', 'cancelado');

-- Para alertas de entregaveis atrasados
CREATE INDEX IF NOT EXISTS idx_deliverables_overdue
  ON job_deliverables(due_date)
  WHERE deleted_at IS NULL AND status NOT IN ('aprovado', 'entregue');

-- Para atividades recentes
CREATE INDEX IF NOT EXISTS idx_job_history_tenant_recent
  ON job_history(tenant_id, created_at DESC);

-- Para relatorio financeiro por periodo
CREATE INDEX IF NOT EXISTS idx_financial_records_tenant_date
  ON financial_records(tenant_id, created_at)
  WHERE deleted_at IS NULL;
```

---

## 9. Seguranca

### 9.1 Dashboard e Relatorios

- Endpoints autenticados (Bearer token JWT)
- tenant_id extraido do JWT, nunca do payload
- RPCs recebem tenant_id como parametro (nao confiam no RLS porque sao SECURITY DEFINER)
- Roles: qualquer usuario autenticado pode ver dashboard e relatorios do seu tenant (RBAC granular fica para Fase 9)

### 9.2 Portal do Cliente

- Token UUID v4 (2^122 combinacoes) -- brute force inviavel
- Rate limiting via contagem de mensagens na ultima hora (max 20 por sessao)
- Dados financeiros NUNCA expostos: closed_value, production_cost, gross_profit, margin_percentage, net_profit, tax_value, other_costs, risk_buffer
- Eventos de historico filtrados: somente status_change, approval, file_upload (nunca field_update, financial_update, team_change)
- Arquivos filtrados: somente categorias briefing, aprovacoes, entregaveis (nunca contrato)
- Sessao pode ser desativada a qualquer momento (is_active = false)
- Sessao pode ter data de expiracao

### 9.3 Notificacoes

- Quando cliente envia mensagem, notificar equipe do job via notifications (in-app)
- Opcionalmente, notificar via WhatsApp (integration_event com tipo portal_message_whatsapp)

---

## 10. Estimativa de Tempo

| Sub-fase | Descricao | Estimativa | Acumulado |
|----------|-----------|------------|-----------|
| 7.1 | Migration + RPCs | 2-3 dias | 3 dias |
| 7.2 | Edge Function dashboard | 2-3 dias | 6 dias |
| 7.3 | Edge Function reports | 2-3 dias | 9 dias |
| 7.4 | Edge Function client-portal | 3-4 dias | 13 dias |
| 7.5 | Frontend Dashboard | 3-4 dias | 17 dias |
| 7.6 | Frontend Relatorios | 3-4 dias | 21 dias |
| 7.7 | Frontend Portal | 3-4 dias | 25 dias |
| 7.8 | QA + Polimento | 2 dias | 27 dias |

**Total estimado: 4-6 semanas** (alinhado com o roadmap).

**Nota:** Sub-fases 7.2, 7.3 e 7.4 podem ser executadas em paralelo (todas dependem apenas de 7.1).

---

## 11. Riscos e Mitigacoes

| Risco | Impacto | Probabilidade | Mitigacao |
|-------|---------|---------------|-----------|
| RPCs lentas com > 10k jobs | Dashboard lento | Baixa (ano 1) | Indices parciais + cache via report_snapshots |
| Recharts incompativel com dark mode | Graficos invisiveis | Media | Testar temas dark na sub-fase 7.5 antes de prosseguir |
| Portal do cliente abusado (spam) | Mensagens excessivas | Baixa | Rate limiting + desativacao de sessao |
| Cold start da Edge Function dashboard | Dashboard lento no primeiro acesso | Alta | Keep-alive via pg_cron a cada 5 min (opcional) |
| CSV muito grande | Timeout na Edge Function | Baixa | Limitar periodo maximo (24 meses) + paginacao |

---

## 12. Arquivos a Criar

### Migration
- `supabase/migrations/20260220_fase7_dashboard_portal.sql`

### Edge Functions
- `supabase/functions/dashboard/index.ts` + handlers/
- `supabase/functions/reports/index.ts` + handlers/
- `supabase/functions/client-portal/index.ts` + handlers/

### Frontend
- `frontend/src/app/(dashboard)/dashboard/page.tsx`
- `frontend/src/app/(dashboard)/reports/page.tsx`
- `frontend/src/app/portal/[token]/page.tsx`
- `frontend/src/app/(dashboard)/settings/portal/page.tsx`
- `frontend/src/hooks/useDashboard.ts`
- `frontend/src/hooks/useReports.ts`
- `frontend/src/hooks/usePortal.ts`
- `frontend/src/hooks/usePortalPublic.ts`
- `frontend/src/components/dashboard/` (6+ componentes)
- `frontend/src/components/reports/` (10+ componentes)
- `frontend/src/components/portal/` (6+ componentes)
- `frontend/src/types/dashboard.ts`
- `frontend/src/types/reports.ts`
- `frontend/src/types/portal.ts`

### ADRs
- `docs/decisions/ADR-011-csv-export-server-side.md`
- `docs/decisions/ADR-012-recharts-chart-library.md`
- `docs/decisions/ADR-013-portal-separate-from-approvals.md`

---

## 13. Referencias

- docs/architecture/full-roadmap.md (Fase 7)
- docs/architecture/jobs-module.md (schema de referencia)
- docs/decisions/ADR-001-edge-functions-architecture.md (pattern de Edge Functions)
- docs/decisions/ADR-002-frontend-architecture.md (pattern de frontend)
- docs/decisions/ADR-009-public-approval-page-csr.md (pattern de pagina publica)
- docs/decisions/ADR-010-public-endpoint-rate-limiting.md (pattern de rate limiting)
- frontend/src/app/approve/[token]/page.tsx (referencia de pagina publica)
- supabase/functions/approvals/handlers/get-by-token.ts (referencia de endpoint publico)
