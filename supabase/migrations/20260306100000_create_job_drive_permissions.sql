SET search_path = public;

-- Tabela de rastreabilidade de permissoes Google Drive concedidas a membros de jobs.
-- Cada linha representa uma permissao concedida (ou tentativa) a uma pasta especifica.
-- Permissoes revogadas ficam como historico (soft-delete via revoked_at).
CREATE TABLE IF NOT EXISTS job_drive_permissions (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  job_id                UUID        NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  job_team_id           UUID        NOT NULL REFERENCES job_team(id) ON DELETE CASCADE,
  person_id             UUID        NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  email                 TEXT        NOT NULL,
  folder_key            TEXT        NOT NULL,
  drive_folder_id       UUID        NOT NULL REFERENCES drive_folders(id) ON DELETE CASCADE,
  google_drive_id       TEXT        NOT NULL,
  drive_role            TEXT        NOT NULL,
  drive_permission_id   TEXT,
  granted_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  granted_by            UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  revoked_at            TIMESTAMPTZ,
  revoked_by            UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  error_message         TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- drive_role e 'writer' ou 'reader' (Drive API)
  CONSTRAINT chk_jdp_drive_role CHECK (drive_role IN ('writer', 'reader'))
);

COMMENT ON TABLE job_drive_permissions IS 'Rastreabilidade de permissoes Google Drive concedidas a membros de jobs.';
COMMENT ON COLUMN job_drive_permissions.drive_permission_id IS 'ID retornado pela Drive API permissions.create. Usado para revogar.';
COMMENT ON COLUMN job_drive_permissions.drive_role IS 'Nivel de permissao no Drive: writer ou reader';
COMMENT ON COLUMN job_drive_permissions.error_message IS 'Mensagem de erro se a concessao/revogacao falhou no Drive';
COMMENT ON COLUMN job_drive_permissions.google_drive_id IS 'ID da pasta no Drive (desnormalizacao para nao precisar JOIN na hora de revogar)';
COMMENT ON COLUMN job_drive_permissions.email IS 'Snapshot do email no momento da concessao';

-- Indices de performance
CREATE INDEX IF NOT EXISTS idx_jdp_tenant_id   ON job_drive_permissions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_jdp_job_id       ON job_drive_permissions(job_id);
CREATE INDEX IF NOT EXISTS idx_jdp_job_team_id  ON job_drive_permissions(job_team_id);
CREATE INDEX IF NOT EXISTS idx_jdp_person_id    ON job_drive_permissions(person_id);

-- Indice parcial para permissoes ativas (revoked_at IS NULL)
CREATE INDEX IF NOT EXISTS idx_jdp_active
  ON job_drive_permissions(job_id, person_id)
  WHERE revoked_at IS NULL;

-- Unique parcial: apenas uma permissao ativa por pessoa+pasta por job.
-- Permissoes revogadas (revoked_at IS NOT NULL) nao contam.
-- Usamos partial unique index (compativel com PG < 15) em vez de UNIQUE NULLS NOT DISTINCT.
CREATE UNIQUE INDEX IF NOT EXISTS uq_jdp_active_permission
  ON job_drive_permissions(job_id, person_id, folder_key)
  WHERE revoked_at IS NULL;

-- RLS (padrao tenant_id via get_tenant_id())
ALTER TABLE job_drive_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "jdp_select_tenant" ON job_drive_permissions;
CREATE POLICY "jdp_select_tenant" ON job_drive_permissions
  FOR SELECT USING (tenant_id = get_tenant_id());

DROP POLICY IF EXISTS "jdp_insert_tenant" ON job_drive_permissions;
CREATE POLICY "jdp_insert_tenant" ON job_drive_permissions
  FOR INSERT WITH CHECK (tenant_id = get_tenant_id());

DROP POLICY IF EXISTS "jdp_update_tenant" ON job_drive_permissions;
CREATE POLICY "jdp_update_tenant" ON job_drive_permissions
  FOR UPDATE
  USING (tenant_id = get_tenant_id())
  WITH CHECK (tenant_id = get_tenant_id());

DROP POLICY IF EXISTS "jdp_delete_tenant" ON job_drive_permissions;
CREATE POLICY "jdp_delete_tenant" ON job_drive_permissions
  FOR DELETE USING (tenant_id = get_tenant_id());

-- Grants
GRANT ALL ON job_drive_permissions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON job_drive_permissions TO authenticated;
