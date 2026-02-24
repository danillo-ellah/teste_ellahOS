
-- ============================================================
-- Migration: Fase 7.1 Part 1 -- Tabelas, Triggers, RLS, Indices, Grants
-- ============================================================

SET search_path = public, extensions;

-- 1.1 client_portal_sessions
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
  CONSTRAINT uq_client_portal_sessions_token UNIQUE (token)
);

COMMENT ON TABLE client_portal_sessions IS 'Sessoes de acesso ao portal do cliente. Token UUID persistente por job.';
COMMENT ON COLUMN client_portal_sessions.permissions IS 'JSON com permissoes: timeline, documents, approvals, messages (booleans)';
COMMENT ON COLUMN client_portal_sessions.label IS 'Label descritivo para identificacao no settings';
COMMENT ON COLUMN client_portal_sessions.last_accessed_at IS 'Ultima vez que o token foi usado';
COMMENT ON COLUMN client_portal_sessions.expires_at IS 'Data de expiracao. NULL = nao expira.';

CREATE UNIQUE INDEX IF NOT EXISTS idx_client_portal_sessions_active_job_contact
  ON client_portal_sessions(tenant_id, job_id, contact_id)
  WHERE deleted_at IS NULL AND is_active = true;

-- 1.2 client_portal_messages
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
  CONSTRAINT chk_portal_messages_direction CHECK (
    direction IN ('client_to_producer', 'producer_to_client')
  ),
  CONSTRAINT chk_portal_messages_direction_sender CHECK (
    (direction = 'client_to_producer' AND sender_user_id IS NULL)
    OR
    (direction = 'producer_to_client' AND sender_user_id IS NOT NULL)
  ),
  CONSTRAINT chk_portal_messages_idempotency_required CHECK (
    direction = 'producer_to_client' OR idempotency_key IS NOT NULL
  ),
  CONSTRAINT uq_portal_messages_idempotency UNIQUE (idempotency_key)
);

COMMENT ON TABLE client_portal_messages IS 'Mensagens do portal do cliente. Canal bidirecional.';
COMMENT ON COLUMN client_portal_messages.direction IS 'client_to_producer ou producer_to_client';
COMMENT ON COLUMN client_portal_messages.sender_name IS 'Nome visivel do remetente';
COMMENT ON COLUMN client_portal_messages.attachments IS 'Array JSON de anexos: [{name, url, size}]';
COMMENT ON COLUMN client_portal_messages.sender_user_id IS 'ID do usuario interno. NULL se cliente.';

-- 1.3 report_snapshots
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
  CONSTRAINT chk_report_snapshots_type CHECK (
    report_type IN ('financial_monthly', 'performance_director', 'team_utilization', 'client_summary')
  )
);

COMMENT ON TABLE report_snapshots IS 'Cache de relatorios pre-calculados. TTL de 1h.';
COMMENT ON COLUMN report_snapshots.parameters IS 'Parametros: {period, client_id, director_id, etc}';
COMMENT ON COLUMN report_snapshots.expires_at IS 'Expiracao do cache.';

-- 2. TRIGGERS
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

-- 3. RLS
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

ALTER TABLE report_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "report_snapshots_select" ON report_snapshots;
CREATE POLICY "report_snapshots_select" ON report_snapshots
  FOR SELECT TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()));

DROP POLICY IF EXISTS "report_snapshots_insert" ON report_snapshots;
CREATE POLICY "report_snapshots_insert" ON report_snapshots
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = (SELECT get_tenant_id()));

-- 4. INDICES
CREATE INDEX IF NOT EXISTS idx_client_portal_sessions_token
  ON client_portal_sessions(token) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_client_portal_sessions_tenant_job
  ON client_portal_sessions(tenant_id, job_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_client_portal_sessions_tenant_id
  ON client_portal_sessions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_client_portal_sessions_job_id
  ON client_portal_sessions(job_id);
CREATE INDEX IF NOT EXISTS idx_client_portal_sessions_contact_id
  ON client_portal_sessions(contact_id) WHERE contact_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_client_portal_sessions_created_by
  ON client_portal_sessions(created_by);

CREATE INDEX IF NOT EXISTS idx_portal_messages_session
  ON client_portal_messages(session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_portal_messages_tenant_job
  ON client_portal_messages(tenant_id, job_id);
CREATE INDEX IF NOT EXISTS idx_portal_messages_tenant_id
  ON client_portal_messages(tenant_id);
CREATE INDEX IF NOT EXISTS idx_portal_messages_job_id
  ON client_portal_messages(job_id);
CREATE INDEX IF NOT EXISTS idx_portal_messages_session_id
  ON client_portal_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_portal_messages_sender_user_id
  ON client_portal_messages(sender_user_id) WHERE sender_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_report_snapshots_lookup
  ON report_snapshots(tenant_id, report_type, generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_report_snapshots_tenant_id
  ON report_snapshots(tenant_id);
CREATE INDEX IF NOT EXISTS idx_report_snapshots_created_by
  ON report_snapshots(created_by) WHERE created_by IS NOT NULL;

-- Performance indices for dashboard RPCs
CREATE INDEX IF NOT EXISTS idx_jobs_tenant_status_active
  ON jobs(tenant_id, status)
  WHERE deleted_at IS NULL AND status NOT IN ('finalizado', 'cancelado');
CREATE INDEX IF NOT EXISTS idx_deliverables_overdue_dashboard
  ON job_deliverables(delivery_date)
  WHERE deleted_at IS NULL AND status NOT IN ('aprovado', 'entregue');
CREATE INDEX IF NOT EXISTS idx_job_history_tenant_recent
  ON job_history(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_financial_records_tenant_date
  ON financial_records(tenant_id, created_at) WHERE deleted_at IS NULL;

-- 5. GRANTS
GRANT ALL ON client_portal_sessions TO service_role;
GRANT ALL ON client_portal_messages TO service_role;
GRANT ALL ON report_snapshots TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON client_portal_sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON client_portal_messages TO authenticated;
GRANT SELECT, INSERT ON report_snapshots TO authenticated;
