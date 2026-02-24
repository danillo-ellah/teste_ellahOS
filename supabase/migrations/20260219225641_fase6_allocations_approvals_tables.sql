
-- ============================================================
-- Migration 015: Fase 6 -- allocations, approval_requests, approval_logs
-- Idempotente: sim (IF NOT EXISTS, DROP IF EXISTS, CREATE OR REPLACE)
-- ============================================================
SET search_path = public;

-- ----------------------------------------------------------
-- 1. allocations
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS allocations (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  job_id           UUID        NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  people_id        UUID        NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  job_team_id      UUID        REFERENCES job_team(id) ON DELETE SET NULL,
  allocation_start DATE        NOT NULL,
  allocation_end   DATE        NOT NULL,
  notes            TEXT,
  created_by       UUID        NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at       TIMESTAMPTZ,
  CONSTRAINT chk_allocations_dates CHECK (allocation_end >= allocation_start)
);

COMMENT ON TABLE allocations IS 'Periodos de alocacao de membros de equipe em jobs. Fonte de verdade para deteccao de conflitos.';

-- ----------------------------------------------------------
-- 2. approval_requests
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS approval_requests (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  job_id               UUID        NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  approval_type        TEXT        NOT NULL,
  title                TEXT        NOT NULL,
  description          TEXT,
  file_url             TEXT,
  status               TEXT        NOT NULL DEFAULT 'pending',
  token                UUID        NOT NULL DEFAULT gen_random_uuid(),
  expires_at           TIMESTAMPTZ NOT NULL,
  approver_type        TEXT        NOT NULL,
  approver_email       TEXT,
  approver_people_id   UUID        REFERENCES people(id) ON DELETE SET NULL,
  approver_phone       TEXT,
  approved_at          TIMESTAMPTZ,
  rejection_reason     TEXT,
  approved_ip          TEXT,
  created_by           UUID        NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at           TIMESTAMPTZ,
  CONSTRAINT chk_approval_requests_type CHECK (
    approval_type IN ('briefing', 'orcamento_detalhado', 'corte', 'finalizacao', 'entrega')
  ),
  CONSTRAINT chk_approval_requests_status CHECK (
    status IN ('pending', 'approved', 'rejected', 'expired')
  ),
  CONSTRAINT chk_approval_requests_approver_type CHECK (
    approver_type IN ('external', 'internal')
  ),
  CONSTRAINT chk_approval_requests_external_email CHECK (
    approver_type != 'external' OR approver_email IS NOT NULL
  ),
  CONSTRAINT chk_approval_requests_internal_people CHECK (
    approver_type != 'internal' OR approver_people_id IS NOT NULL
  ),
  CONSTRAINT uq_approval_requests_token UNIQUE (token)
);

COMMENT ON TABLE approval_requests IS 'Solicitacoes de aprovacao de conteudo. Paralelo a aprovacao comercial. Token UUID para acesso publico sem auth.';

-- ----------------------------------------------------------
-- 3. approval_logs (IMUTAVEL)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS approval_logs (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  approval_request_id  UUID        NOT NULL REFERENCES approval_requests(id) ON DELETE CASCADE,
  action               TEXT        NOT NULL,
  actor_type           TEXT        NOT NULL,
  actor_id             UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  actor_ip             TEXT,
  comment              TEXT,
  metadata             JSONB,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_approval_logs_action CHECK (
    action IN ('created', 'sent', 'resent', 'approved', 'rejected', 'expired')
  ),
  CONSTRAINT chk_approval_logs_actor_type CHECK (
    actor_type IN ('user', 'external', 'system')
  )
);

COMMENT ON TABLE approval_logs IS 'Audit trail imutavel de acoes em solicitacoes de aprovacao. Somente INSERT permitido.';

-- ----------------------------------------------------------
-- 4. INDICES
-- ----------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_allocations_conflict_lookup
  ON allocations(tenant_id, people_id, allocation_start, allocation_end)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_allocations_tenant_id
  ON allocations(tenant_id);

CREATE INDEX IF NOT EXISTS idx_allocations_job_id
  ON allocations(job_id);

CREATE INDEX IF NOT EXISTS idx_allocations_people_id
  ON allocations(people_id);

CREATE INDEX IF NOT EXISTS idx_allocations_job_team_id
  ON allocations(job_team_id)
  WHERE job_team_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_approval_requests_job_status
  ON approval_requests(tenant_id, job_id, status)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_approval_requests_token
  ON approval_requests(token)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_approval_requests_tenant_id
  ON approval_requests(tenant_id);

CREATE INDEX IF NOT EXISTS idx_approval_requests_job_id
  ON approval_requests(job_id);

CREATE INDEX IF NOT EXISTS idx_approval_requests_created_by
  ON approval_requests(created_by);

CREATE INDEX IF NOT EXISTS idx_approval_requests_pending
  ON approval_requests(tenant_id, created_at)
  WHERE status = 'pending' AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_approval_logs_request_id
  ON approval_logs(approval_request_id, created_at);

CREATE INDEX IF NOT EXISTS idx_approval_logs_tenant_id
  ON approval_logs(tenant_id);

-- ----------------------------------------------------------
-- 5. RLS POLICIES
-- ----------------------------------------------------------

-- allocations
ALTER TABLE allocations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allocations_select_tenant" ON allocations;
CREATE POLICY "allocations_select_tenant" ON allocations
  FOR SELECT USING (tenant_id = get_tenant_id());

DROP POLICY IF EXISTS "allocations_insert_tenant" ON allocations;
CREATE POLICY "allocations_insert_tenant" ON allocations
  FOR INSERT WITH CHECK (tenant_id = get_tenant_id());

DROP POLICY IF EXISTS "allocations_update_tenant" ON allocations;
CREATE POLICY "allocations_update_tenant" ON allocations
  FOR UPDATE
  USING (tenant_id = get_tenant_id())
  WITH CHECK (tenant_id = get_tenant_id());

-- approval_requests
ALTER TABLE approval_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "approval_requests_select_tenant" ON approval_requests;
CREATE POLICY "approval_requests_select_tenant" ON approval_requests
  FOR SELECT USING (tenant_id = get_tenant_id());

DROP POLICY IF EXISTS "approval_requests_insert_tenant" ON approval_requests;
CREATE POLICY "approval_requests_insert_tenant" ON approval_requests
  FOR INSERT WITH CHECK (tenant_id = get_tenant_id());

DROP POLICY IF EXISTS "approval_requests_update_tenant" ON approval_requests;
CREATE POLICY "approval_requests_update_tenant" ON approval_requests
  FOR UPDATE
  USING (tenant_id = get_tenant_id())
  WITH CHECK (tenant_id = get_tenant_id());

-- approval_logs (somente SELECT e INSERT)
ALTER TABLE approval_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "approval_logs_select_tenant" ON approval_logs;
CREATE POLICY "approval_logs_select_tenant" ON approval_logs
  FOR SELECT USING (tenant_id = get_tenant_id());

DROP POLICY IF EXISTS "approval_logs_insert_tenant" ON approval_logs;
CREATE POLICY "approval_logs_insert_tenant" ON approval_logs
  FOR INSERT WITH CHECK (tenant_id = get_tenant_id());

-- ----------------------------------------------------------
-- 6. TRIGGERS (updated_at)
-- ----------------------------------------------------------
DROP TRIGGER IF EXISTS trg_allocations_updated_at ON allocations;
CREATE TRIGGER trg_allocations_updated_at
  BEFORE UPDATE ON allocations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_approval_requests_updated_at ON approval_requests;
CREATE TRIGGER trg_approval_requests_updated_at
  BEFORE UPDATE ON approval_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ----------------------------------------------------------
-- 7. GRANTS
-- ----------------------------------------------------------
GRANT ALL ON allocations TO service_role;
GRANT ALL ON approval_requests TO service_role;
GRANT ALL ON approval_logs TO service_role;

GRANT SELECT, INSERT, UPDATE ON allocations TO authenticated;
GRANT SELECT, INSERT, UPDATE ON approval_requests TO authenticated;
GRANT SELECT, INSERT ON approval_logs TO authenticated;

-- ----------------------------------------------------------
-- 8. REALTIME (approval_requests)
-- ----------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'approval_requests'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE approval_requests;
    END IF;
  END IF;
END $$;

-- ----------------------------------------------------------
-- 9. pg_cron: Expiracao automatica de aprovacoes pendentes
-- ----------------------------------------------------------
SELECT cron.schedule(
  'expire-pending-approvals',
  '1 3 * * *',
  $$
  UPDATE approval_requests
  SET status = 'expired', updated_at = now()
  WHERE status = 'pending'
    AND expires_at < now()
    AND deleted_at IS NULL;

  INSERT INTO approval_logs (tenant_id, approval_request_id, action, actor_type, metadata)
  SELECT
    ar.tenant_id,
    ar.id,
    'expired',
    'system',
    jsonb_build_object('reason', 'Token expirado automaticamente', 'expired_at', now())
  FROM approval_requests ar
  WHERE ar.status = 'expired'
    AND ar.updated_at >= now() - interval '2 minutes'
    AND ar.deleted_at IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM approval_logs al
      WHERE al.approval_request_id = ar.id
        AND al.action = 'expired'
    );
  $$
);

-- ----------------------------------------------------------
-- 10. Atualizar CHECK constraint de notifications.type
-- ----------------------------------------------------------
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS chk_notifications_type;
ALTER TABLE notifications ADD CONSTRAINT chk_notifications_type CHECK (
  type IN (
    'job_approved', 'status_changed', 'team_added',
    'deadline_approaching', 'margin_alert', 'deliverable_overdue',
    'shooting_date_approaching', 'integration_failed',
    'approval_requested', 'approval_responded'
  )
);
