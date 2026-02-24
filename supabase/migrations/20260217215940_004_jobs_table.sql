-- ============================================================
-- Migration 004: Tabela Jobs (~90 colunas)
-- Fase 1 - Schema Base (Tabela Principal)
-- ============================================================

CREATE TABLE IF NOT EXISTS jobs (
  -- Identificacao
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  index_number INTEGER NOT NULL,
  code TEXT NOT NULL,                                  -- Codigo numerico padded (ex: 015)
  job_aba TEXT NOT NULL,                               -- Codigo completo: {INDEX}_{NomeJob}_{Agencia}
  title TEXT NOT NULL,
  client_id UUID NOT NULL REFERENCES clients(id),
  agency_id UUID REFERENCES agencies(id),
  brand TEXT,

  -- Classificacao
  project_type project_type NOT NULL DEFAULT 'filme_publicitario',
  media_type TEXT,                                     -- Tipo de midia (15", 30", Serie, Social Media)
  format TEXT,                                         -- Formato do deliverable principal
  segment client_segment,
  complexity_level TEXT,                               -- Baixo, Medio, Alto (TEXT, nao ENUM)
  tags TEXT[] DEFAULT '{}',

  -- Status e Lifecycle
  status job_status NOT NULL DEFAULT 'briefing_recebido',
  pos_sub_status pos_sub_status,                       -- Sub-status tipado, apenas para pos-producao
  status_updated_at TIMESTAMPTZ DEFAULT now(),
  status_updated_by UUID REFERENCES profiles(id),
  priority priority_level DEFAULT 'media',
  is_archived BOOLEAN NOT NULL DEFAULT false,
  cancellation_reason TEXT,

  -- Hierarquia (Job Pai / Sub-jobs)
  parent_job_id UUID REFERENCES jobs(id),
  is_parent_job BOOLEAN NOT NULL DEFAULT false,
  display_order INTEGER DEFAULT 0,

  -- Contatos do job
  client_contact_id UUID REFERENCES contacts(id),
  agency_contact_id UUID REFERENCES contacts(id),

  -- Datas Importantes
  briefing_date DATE,
  budget_sent_date DATE,
  client_approval_deadline DATE,
  approval_date DATE,
  kickoff_ppm_date DATE,                               -- Data do kickoff / PPM
  post_start_date DATE,
  post_deadline DATE,                                  -- Deadline interno pos
  expected_delivery_date DATE,
  actual_delivery_date DATE,
  payment_date DATE,
  shooting_dates DATE[],                               -- Array de datas de filmagem (tambem tem tabela separada)

  -- Financeiro (modelo real da Ellah)
  closed_value NUMERIC(12,2),
  production_cost NUMERIC(12,2),
  tax_percentage NUMERIC(5,2) NOT NULL DEFAULT 12.00,
  tax_value NUMERIC(12,2),                             -- Auto-calculado: closed * tax% / 100
  other_costs NUMERIC(12,2),                           -- Custos extras
  risk_buffer NUMERIC(12,2),                           -- Reserva de risco
  gross_profit NUMERIC(12,2),                          -- Auto-calculado: closed - production - tax - other - risk
  net_profit NUMERIC(12,2),
  margin_percentage NUMERIC(5,2),                      -- Auto-calculado: gross / closed * 100
  currency TEXT NOT NULL DEFAULT 'BRL',
  payment_terms TEXT,
  po_number TEXT,

  -- Health Score
  health_score INTEGER DEFAULT 0,

  -- URLs e Links (Google Drive - expandido)
  drive_folder_url TEXT,
  budget_letter_url TEXT,
  schedule_url TEXT,
  script_url TEXT,
  ppm_url TEXT,
  production_sheet_url TEXT,
  contracts_folder_url TEXT,
  raw_material_url TEXT,
  team_sheet_url TEXT,
  team_form_url TEXT,
  cast_sheet_url TEXT,
  pre_production_url TEXT,
  pre_art_url TEXT,
  pre_costume_url TEXT,
  closing_production_url TEXT,
  closing_art_url TEXT,
  closing_costume_url TEXT,
  final_delivery_url TEXT,

  -- Briefing e Observacoes
  briefing_text TEXT,
  notes TEXT,
  internal_notes TEXT,
  references_text TEXT,                                -- Referencias visuais em texto

  -- Producao
  total_duration_seconds INTEGER,
  has_contracted_audio BOOLEAN,
  has_mockup_scenography BOOLEAN,
  has_computer_graphics BOOLEAN,
  audio_company TEXT,                                  -- Empresa de audio contratada
  commercial_responsible TEXT,                         -- Responsavel comercial
  ancine_number TEXT,                                  -- Numero ANCINE (compliance)
  proposal_validity TEXT,                              -- Validade da proposta comercial

  -- Aprovacao
  approval_type approval_type,
  approved_by_name TEXT,
  approved_by_email TEXT,
  internal_approval_doc_url TEXT,

  -- Campos Customizaveis
  custom_fields JSONB DEFAULT '{}',

  -- Auditoria
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,

  -- Constraints
  UNIQUE(tenant_id, code)
);

-- ============================================================
-- Indices da tabela jobs
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_jobs_tenant_id ON jobs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_jobs_client_id ON jobs(client_id);
CREATE INDEX IF NOT EXISTS idx_jobs_agency_id ON jobs(agency_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_jobs_parent_job_id ON jobs(parent_job_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status_updated_by ON jobs(status_updated_by);
CREATE INDEX IF NOT EXISTS idx_jobs_client_contact_id ON jobs(client_contact_id);
CREATE INDEX IF NOT EXISTS idx_jobs_agency_contact_id ON jobs(agency_contact_id);
CREATE INDEX IF NOT EXISTS idx_jobs_created_by ON jobs(created_by);
CREATE INDEX IF NOT EXISTS idx_jobs_code ON jobs(tenant_id, code);
CREATE INDEX IF NOT EXISTS idx_jobs_title ON jobs(tenant_id, title);
CREATE INDEX IF NOT EXISTS idx_jobs_expected_delivery ON jobs(tenant_id, expected_delivery_date);
CREATE INDEX IF NOT EXISTS idx_jobs_is_archived ON jobs(tenant_id, is_archived);
CREATE INDEX IF NOT EXISTS idx_jobs_tags ON jobs USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_jobs_custom_fields ON jobs USING GIN(custom_fields);
CREATE INDEX IF NOT EXISTS idx_jobs_health_score ON jobs(tenant_id, health_score);

-- Trigger updated_at
CREATE TRIGGER trg_jobs_updated_at
  BEFORE UPDATE ON jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- RLS: jobs
-- ============================================================

ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY jobs_select_tenant ON jobs
  FOR SELECT TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()));

CREATE POLICY jobs_insert_tenant ON jobs
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = (SELECT get_tenant_id()));

CREATE POLICY jobs_update_tenant ON jobs
  FOR UPDATE TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()))
  WITH CHECK (tenant_id = (SELECT get_tenant_id()));

CREATE POLICY jobs_delete_tenant ON jobs
  FOR DELETE TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()));
