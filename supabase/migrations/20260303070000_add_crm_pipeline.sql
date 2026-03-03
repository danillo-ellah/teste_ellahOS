-- =============================================================================
-- Migration: T3.6 — CRM / Pipeline Comercial
-- Data: 2026-03-03
--
-- Contexto:
--   Modulo CRM para gestao de oportunidades comerciais, substitui controle
--   manual em planilhas. Pipeline Kanban com stages, versoes de proposta e
--   historico de atividades por oportunidade.
--
-- Novas tabelas:
--   opportunities            — oportunidades no pipeline comercial
--   opportunity_proposals    — versoes de proposta vinculadas a oportunidade
--   opportunity_activities   — historico de atividades/interacoes do CRM
-- =============================================================================

SET search_path TO public;

-- -------------------------------------------------------
-- 1. Tabela opportunities
-- -------------------------------------------------------

CREATE TABLE IF NOT EXISTS opportunities (
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID          NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Dados principais
  title               TEXT          NOT NULL,
  client_id           UUID          REFERENCES clients(id) ON DELETE SET NULL,
  agency_id           UUID          REFERENCES agencies(id) ON DELETE SET NULL,
  contact_id          UUID          REFERENCES contacts(id) ON DELETE SET NULL,

  -- Pipeline
  stage               TEXT          NOT NULL DEFAULT 'lead'
                        CHECK (stage IN ('lead', 'qualificado', 'proposta', 'negociacao', 'fechamento', 'ganho', 'perdido')),
  estimated_value     NUMERIC(12,2),
  probability         INT           DEFAULT 50 CHECK (probability >= 0 AND probability <= 100),
  expected_close_date DATE,
  actual_close_date   DATE,
  loss_reason         TEXT,

  -- Classificacao
  source              TEXT,         -- indicacao, site, redes_sociais, evento, cold_outreach, etc.
  project_type        TEXT,         -- tipo de producao: filme, comercial, serie, etc.
  notes               TEXT,

  -- Responsavel e conversao
  assigned_to         UUID          REFERENCES profiles(id) ON DELETE SET NULL,
  job_id              UUID          REFERENCES jobs(id) ON DELETE SET NULL, -- preenchido ao converter em job
  created_by          UUID          REFERENCES profiles(id) ON DELETE SET NULL,

  created_at          TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ   NOT NULL DEFAULT now(),
  deleted_at          TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT chk_opportunities_title_not_empty CHECK (length(trim(title)) > 0),
  CONSTRAINT chk_opportunities_value_positive CHECK (
    estimated_value IS NULL OR estimated_value >= 0
  ),
  CONSTRAINT chk_opportunities_close_date CHECK (
    actual_close_date IS NULL OR expected_close_date IS NULL
    OR actual_close_date >= expected_close_date - INTERVAL '2 years'
  )
);

COMMENT ON TABLE opportunities IS 'Oportunidades comerciais no pipeline CRM. Cada linha representa uma negociacao em andamento ou encerrada.';
COMMENT ON COLUMN opportunities.stage IS 'Estagio atual no pipeline: lead, qualificado, proposta, negociacao, fechamento, ganho, perdido.';
COMMENT ON COLUMN opportunities.probability IS 'Probabilidade estimada de fechamento em percentual (0-100).';
COMMENT ON COLUMN opportunities.source IS 'Canal de origem da oportunidade: indicacao, site, redes_sociais, evento, cold_outreach, etc.';
COMMENT ON COLUMN opportunities.job_id IS 'Preenchido quando a oportunidade e convertida em job. NULL enquanto ainda e prospecto.';
COMMENT ON COLUMN opportunities.loss_reason IS 'Motivo de perda quando stage = perdido. Usado para analise comercial.';

-- -------------------------------------------------------
-- 2. Tabela opportunity_proposals
-- -------------------------------------------------------

CREATE TABLE IF NOT EXISTS opportunity_proposals (
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID          NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  opportunity_id      UUID          NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,

  version             INT           NOT NULL DEFAULT 1,
  title               TEXT          NOT NULL,
  content             TEXT,         -- conteudo em markdown
  value               NUMERIC(12,2),
  file_url            TEXT,         -- URL publica do PDF da proposta
  storage_path        TEXT,         -- path no Supabase Storage

  status              TEXT          DEFAULT 'draft'
                        CHECK (status IN ('draft', 'sent', 'accepted', 'rejected', 'expired')),

  sent_at             TIMESTAMPTZ,
  responded_at        TIMESTAMPTZ,
  valid_until         DATE,

  created_by          UUID          REFERENCES profiles(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ   NOT NULL DEFAULT now(),
  deleted_at          TIMESTAMPTZ,

  -- Um par (opportunity_id, version) e unico por tenant
  CONSTRAINT uq_opportunity_proposal_version UNIQUE (opportunity_id, version, tenant_id),

  -- Constraints
  CONSTRAINT chk_proposals_title_not_empty CHECK (length(trim(title)) > 0),
  CONSTRAINT chk_proposals_value_positive CHECK (
    value IS NULL OR value >= 0
  ),
  CONSTRAINT chk_proposals_version_positive CHECK (version >= 1)
);

COMMENT ON TABLE opportunity_proposals IS 'Versoes de proposta comercial vinculadas a uma oportunidade. Um opportunity pode ter N propostas com versoes incrementais.';
COMMENT ON COLUMN opportunity_proposals.version IS 'Numero sequencial da versao da proposta dentro da oportunidade. Comeca em 1.';
COMMENT ON COLUMN opportunity_proposals.content IS 'Conteudo da proposta em formato Markdown. Pode ser vazio se houver apenas arquivo PDF.';
COMMENT ON COLUMN opportunity_proposals.storage_path IS 'Path interno no Supabase Storage. Permite gerar URLs assinadas quando necessario.';

-- -------------------------------------------------------
-- 3. Tabela opportunity_activities
-- -------------------------------------------------------

CREATE TABLE IF NOT EXISTS opportunity_activities (
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID          NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  opportunity_id      UUID          NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,

  activity_type       TEXT          NOT NULL
                        CHECK (activity_type IN ('note', 'call', 'email', 'meeting', 'proposal', 'follow_up')),

  description         TEXT          NOT NULL,
  scheduled_at        TIMESTAMPTZ,  -- quando estava agendada a atividade
  completed_at        TIMESTAMPTZ,  -- quando foi concluida (NULL = pendente)

  created_by          UUID          REFERENCES profiles(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT now(),

  CONSTRAINT chk_activities_description_not_empty CHECK (length(trim(description)) > 0)
);

COMMENT ON TABLE opportunity_activities IS 'Historico de atividades e interacoes de cada oportunidade CRM: notas, ligacoes, emails, reunioes.';
COMMENT ON COLUMN opportunity_activities.activity_type IS 'Tipo: note (anotacao), call (ligacao), email, meeting (reuniao), proposal (envio de proposta), follow_up (acompanhamento).';
COMMENT ON COLUMN opportunity_activities.scheduled_at IS 'Data/hora agendada para a atividade. NULL para atividades sem agendamento (ex: notas retroativas).';
COMMENT ON COLUMN opportunity_activities.completed_at IS 'Data/hora de conclusao. NULL indica atividade pendente/futura.';

-- -------------------------------------------------------
-- 4. Indices
-- -------------------------------------------------------

-- opportunities — busca por tenant, stage, responsavel e cliente
CREATE INDEX IF NOT EXISTS idx_opportunities_tenant
  ON opportunities(tenant_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_opportunities_tenant_stage
  ON opportunities(tenant_id, stage) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_opportunities_assigned_to
  ON opportunities(assigned_to) WHERE assigned_to IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_opportunities_client
  ON opportunities(client_id) WHERE client_id IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_opportunities_job
  ON opportunities(job_id) WHERE job_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_opportunities_expected_close
  ON opportunities(tenant_id, expected_close_date) WHERE deleted_at IS NULL AND expected_close_date IS NOT NULL;

-- opportunity_proposals — busca por oportunidade
CREATE INDEX IF NOT EXISTS idx_opportunity_proposals_opportunity
  ON opportunity_proposals(opportunity_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_opportunity_proposals_tenant
  ON opportunity_proposals(tenant_id) WHERE deleted_at IS NULL;

-- opportunity_activities — busca por oportunidade e por data
CREATE INDEX IF NOT EXISTS idx_opportunity_activities_opportunity
  ON opportunity_activities(opportunity_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_opportunity_activities_tenant
  ON opportunity_activities(tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_opportunity_activities_scheduled
  ON opportunity_activities(tenant_id, scheduled_at)
  WHERE scheduled_at IS NOT NULL AND completed_at IS NULL;

-- -------------------------------------------------------
-- 5. Triggers updated_at
-- -------------------------------------------------------

DROP TRIGGER IF EXISTS trg_opportunities_updated_at ON opportunities;
CREATE TRIGGER trg_opportunities_updated_at
  BEFORE UPDATE ON opportunities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_opportunity_proposals_updated_at ON opportunity_proposals;
CREATE TRIGGER trg_opportunity_proposals_updated_at
  BEFORE UPDATE ON opportunity_proposals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- opportunity_activities nao tem updated_at (append-only)

-- -------------------------------------------------------
-- 6. RLS: opportunities (tenant isolation)
-- -------------------------------------------------------

ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;

-- SELECT: todos usuarios autenticados veem oportunidades do seu tenant
DROP POLICY IF EXISTS opportunities_select_tenant ON opportunities;
CREATE POLICY opportunities_select_tenant ON opportunities
  FOR SELECT TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()));

-- INSERT: usuarios autenticados do tenant podem criar oportunidades
DROP POLICY IF EXISTS opportunities_insert_tenant ON opportunities;
CREATE POLICY opportunities_insert_tenant ON opportunities
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = (SELECT get_tenant_id()));

-- UPDATE: usuarios autenticados do tenant podem editar oportunidades
DROP POLICY IF EXISTS opportunities_update_tenant ON opportunities;
CREATE POLICY opportunities_update_tenant ON opportunities
  FOR UPDATE TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()))
  WITH CHECK (tenant_id = (SELECT get_tenant_id()));

-- DELETE: apenas soft delete via updated_at / deleted_at — sem DELETE fisico
-- (sem policy FOR DELETE = bloqueado para todos via RLS)

-- -------------------------------------------------------
-- 7. RLS: opportunity_proposals (tenant isolation)
-- -------------------------------------------------------

ALTER TABLE opportunity_proposals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS opportunity_proposals_select_tenant ON opportunity_proposals;
CREATE POLICY opportunity_proposals_select_tenant ON opportunity_proposals
  FOR SELECT TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()));

DROP POLICY IF EXISTS opportunity_proposals_insert_tenant ON opportunity_proposals;
CREATE POLICY opportunity_proposals_insert_tenant ON opportunity_proposals
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = (SELECT get_tenant_id()));

DROP POLICY IF EXISTS opportunity_proposals_update_tenant ON opportunity_proposals;
CREATE POLICY opportunity_proposals_update_tenant ON opportunity_proposals
  FOR UPDATE TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()))
  WITH CHECK (tenant_id = (SELECT get_tenant_id()));

-- -------------------------------------------------------
-- 8. RLS: opportunity_activities (tenant isolation)
-- -------------------------------------------------------

ALTER TABLE opportunity_activities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS opportunity_activities_select_tenant ON opportunity_activities;
CREATE POLICY opportunity_activities_select_tenant ON opportunity_activities
  FOR SELECT TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()));

DROP POLICY IF EXISTS opportunity_activities_insert_tenant ON opportunity_activities;
CREATE POLICY opportunity_activities_insert_tenant ON opportunity_activities
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = (SELECT get_tenant_id()));

-- Activities sao append-only: sem UPDATE e sem DELETE

-- -------------------------------------------------------
-- 9. Verificacao de isolamento (teste mental)
-- -------------------------------------------------------
-- opportunities:
--   SELECT: tenant_id = get_tenant_id() -> Tenant A NAO ve oportunidades do Tenant B. OK.
--   INSERT: WITH CHECK -> So insere com seu proprio tenant_id. OK.
--   UPDATE: USING + WITH CHECK -> So edita registros do seu tenant. OK.
--   DELETE fisico: SEM policy -> bloqueado. OK.
--
-- opportunity_proposals:
--   Mesma logica. Sem DELETE fisico. OK.
--
-- opportunity_activities:
--   SELECT + INSERT apenas. Sem UPDATE/DELETE (append-only). OK.

-- =============================================================================
-- FIM da migration — T3.6 CRM / Pipeline Comercial
-- Novas tabelas: opportunities, opportunity_proposals, opportunity_activities (total: +3)
-- Indices: 12 (opportunities: 6, proposals: 2, activities: 3)
-- RLS: 8 policies (opportunities: 3, proposals: 3, activities: 2)
-- Triggers: 2 updated_at (opportunities, proposals)
-- Constraints: 7 (opportunities: 3, proposals: 3, activities: 1)
-- =============================================================================
