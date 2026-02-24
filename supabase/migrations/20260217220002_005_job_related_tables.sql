-- ============================================================
-- Migration 005: Tabelas relacionadas a Jobs
-- job_team, job_deliverables, job_history, job_budgets, job_files
-- Fase 1 - Schema Base
-- ============================================================

-- ============================================================
-- Tabela: job_team (equipe do job)
-- Nota: spec chamava job_team_members, real e job_team
-- Nota: spec chamava fee, real e rate
-- Nota: spec chamava is_lead_producer, real e is_responsible_producer
-- ============================================================

CREATE TABLE IF NOT EXISTS job_team (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  person_id UUID NOT NULL REFERENCES people(id),
  role team_role NOT NULL,
  rate NUMERIC(12,2),                                  -- Cache/valor acordado (R$)
  hiring_status hiring_status NOT NULL DEFAULT 'orcado',
  is_responsible_producer BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,

  -- Uma pessoa nao pode ter a mesma funcao duplicada no mesmo job
  UNIQUE(job_id, person_id, role)
);

CREATE INDEX IF NOT EXISTS idx_job_team_tenant_id ON job_team(tenant_id);
CREATE INDEX IF NOT EXISTS idx_job_team_job_id ON job_team(job_id);
CREATE INDEX IF NOT EXISTS idx_job_team_person_id ON job_team(person_id);
CREATE INDEX IF NOT EXISTS idx_job_team_role ON job_team(job_id, role);
CREATE INDEX IF NOT EXISTS idx_job_team_responsible
  ON job_team(job_id, is_responsible_producer) WHERE is_responsible_producer = true;

-- Trigger updated_at
CREATE TRIGGER trg_job_team_updated_at
  BEFORE UPDATE ON job_team
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- Tabela: job_deliverables (entregaveis do job)
-- ============================================================

CREATE TABLE IF NOT EXISTS job_deliverables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES job_deliverables(id),      -- Hierarquia de entregaveis (versoes)
  description TEXT NOT NULL,
  format TEXT,                                          -- MP4, MOV, ProRes 422
  resolution TEXT,                                      -- 1080p, 4K, Vertical
  duration_seconds INTEGER,
  status deliverable_status NOT NULL DEFAULT 'pendente',
  version INTEGER DEFAULT 1,
  delivery_date DATE,
  link TEXT,                                            -- URL do entregavel (Drive, Vimeo, etc)
  notes TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_job_deliverables_tenant_id ON job_deliverables(tenant_id);
CREATE INDEX IF NOT EXISTS idx_job_deliverables_job_id ON job_deliverables(job_id);
CREATE INDEX IF NOT EXISTS idx_job_deliverables_status ON job_deliverables(job_id, status);
CREATE INDEX IF NOT EXISTS idx_job_deliverables_parent_id ON job_deliverables(parent_id);

-- Trigger updated_at
CREATE TRIGGER trg_job_deliverables_updated_at
  BEFORE UPDATE ON job_deliverables
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- Tabela: job_history (historico / audit trail)
-- Tabela APPEND-ONLY: nunca UPDATE ou DELETE
-- Nota: spec chamava previous_data/new_data, real e data_before/data_after
-- ============================================================

CREATE TABLE IF NOT EXISTS job_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  event_type history_event_type NOT NULL,
  user_id UUID REFERENCES profiles(id),
  data_before JSONB,                                   -- Estado anterior
  data_after JSONB,                                    -- Novo estado
  description TEXT,                                    -- Descricao legivel
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  -- Tabela append-only: sem updated_at ou deleted_at
);

CREATE INDEX IF NOT EXISTS idx_job_history_tenant_id ON job_history(tenant_id);
CREATE INDEX IF NOT EXISTS idx_job_history_job_id ON job_history(job_id);
CREATE INDEX IF NOT EXISTS idx_job_history_user_id ON job_history(user_id);
CREATE INDEX IF NOT EXISTS idx_job_history_event_type ON job_history(job_id, event_type);
CREATE INDEX IF NOT EXISTS idx_job_history_created_at ON job_history(job_id, created_at DESC);

-- ============================================================
-- Tabela: job_budgets (orcamentos / versoes)
-- Melhoria alem da spec: tabela dedicada com versionamento
-- ============================================================

CREATE TABLE IF NOT EXISTS job_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id),
  agency_id UUID REFERENCES agencies(id),
  title TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'rascunho',              -- rascunho, enviado, aprovado, rejeitado
  total_value NUMERIC(12,2),
  content_md TEXT,                                     -- Conteudo em Markdown
  doc_url TEXT,
  pdf_url TEXT,
  approved_at TIMESTAMPTZ,
  approved_by TEXT,                                    -- Nome de quem aprovou
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_job_budgets_tenant_id ON job_budgets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_job_budgets_job_id ON job_budgets(job_id);
CREATE INDEX IF NOT EXISTS idx_job_budgets_client_id ON job_budgets(client_id);
CREATE INDEX IF NOT EXISTS idx_job_budgets_agency_id ON job_budgets(agency_id);

-- Trigger updated_at
CREATE TRIGGER trg_job_budgets_updated_at
  BEFORE UPDATE ON job_budgets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- Tabela: job_files (anexos do job)
-- Nota: spec chamava job_attachments, real e job_files
-- ============================================================

CREATE TABLE IF NOT EXISTS job_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size_bytes BIGINT,
  file_type TEXT,                                      -- MIME type
  category TEXT NOT NULL DEFAULT 'outro',              -- briefing, contrato, referencias, etc (TEXT, nao ENUM)
  version INTEGER DEFAULT 1,
  uploaded_by UUID REFERENCES profiles(id),
  external_id TEXT,                                    -- ID em servico externo (Drive, etc)
  external_source TEXT,                                -- Fonte externa (google_drive, etc)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_job_files_tenant_id ON job_files(tenant_id);
CREATE INDEX IF NOT EXISTS idx_job_files_job_id ON job_files(job_id);
CREATE INDEX IF NOT EXISTS idx_job_files_uploaded_by ON job_files(uploaded_by);

-- Trigger updated_at
CREATE TRIGGER trg_job_files_updated_at
  BEFORE UPDATE ON job_files
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- RLS: job_team
-- ============================================================

ALTER TABLE job_team ENABLE ROW LEVEL SECURITY;

CREATE POLICY job_team_select_tenant ON job_team
  FOR SELECT TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()));

CREATE POLICY job_team_insert_tenant ON job_team
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = (SELECT get_tenant_id()));

CREATE POLICY job_team_update_tenant ON job_team
  FOR UPDATE TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()))
  WITH CHECK (tenant_id = (SELECT get_tenant_id()));

CREATE POLICY job_team_delete_tenant ON job_team
  FOR DELETE TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()));

-- ============================================================
-- RLS: job_deliverables
-- ============================================================

ALTER TABLE job_deliverables ENABLE ROW LEVEL SECURITY;

CREATE POLICY job_deliverables_select_tenant ON job_deliverables
  FOR SELECT TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()));

CREATE POLICY job_deliverables_insert_tenant ON job_deliverables
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = (SELECT get_tenant_id()));

CREATE POLICY job_deliverables_update_tenant ON job_deliverables
  FOR UPDATE TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()))
  WITH CHECK (tenant_id = (SELECT get_tenant_id()));

CREATE POLICY job_deliverables_delete_tenant ON job_deliverables
  FOR DELETE TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()));

-- ============================================================
-- RLS: job_history (append-only: SELECT + INSERT apenas)
-- ============================================================

ALTER TABLE job_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY job_history_select_tenant ON job_history
  FOR SELECT TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()));

CREATE POLICY job_history_insert_tenant ON job_history
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = (SELECT get_tenant_id()));

-- ============================================================
-- RLS: job_budgets
-- ============================================================

ALTER TABLE job_budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY job_budgets_select_tenant ON job_budgets
  FOR SELECT TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()));

CREATE POLICY job_budgets_insert_tenant ON job_budgets
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = (SELECT get_tenant_id()));

CREATE POLICY job_budgets_update_tenant ON job_budgets
  FOR UPDATE TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()))
  WITH CHECK (tenant_id = (SELECT get_tenant_id()));

CREATE POLICY job_budgets_delete_tenant ON job_budgets
  FOR DELETE TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()));

-- ============================================================
-- RLS: job_files
-- ============================================================

ALTER TABLE job_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY job_files_select_tenant ON job_files
  FOR SELECT TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()));

CREATE POLICY job_files_insert_tenant ON job_files
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = (SELECT get_tenant_id()));

CREATE POLICY job_files_update_tenant ON job_files
  FOR UPDATE TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()))
  WITH CHECK (tenant_id = (SELECT get_tenant_id()));

CREATE POLICY job_files_delete_tenant ON job_files
  FOR DELETE TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()));
