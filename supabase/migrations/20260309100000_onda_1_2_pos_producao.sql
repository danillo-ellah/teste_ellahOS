-- =============================================================================
-- Migration: Onda 1.2 — Pos-Producao
-- Data: 2026-03-09
--
-- Contexto:
--   Estende job_deliverables com colunas de pos-producao (stage, assignee,
--   drive URL, briefing). Cria tabela pos_cut_versions para versionamento
--   de cortes offline/online com ciclo de revisao/aprovacao.
--
-- Operacoes:
--   1. ADD COLUMN em job_deliverables (4 colunas)
--   2. CHECK CONSTRAINT em job_deliverables.pos_stage
--   3. Indices parciais em job_deliverables (2 indices)
--   4. CREATE TABLE pos_cut_versions (15 colunas)
--   5. Indices em pos_cut_versions (3 indices + 3 FK indices)
--   6. RLS policies em pos_cut_versions (4 policies)
--   7. Trigger updated_at em pos_cut_versions
--   8. security_invoker em pos_cut_versions
--   9. Comentarios
--
-- Tudo idempotente: IF NOT EXISTS, ADD COLUMN IF NOT EXISTS, DO $$ blocks
-- =============================================================================

SET search_path TO public;

-- =============================================================================
-- 1. Colunas novas em job_deliverables
--    4 colunas para suportar workflow de pos-producao por entregavel
-- =============================================================================

-- 1.1 pos_stage: estagio atual do entregavel no fluxo de pos-producao
ALTER TABLE job_deliverables
  ADD COLUMN IF NOT EXISTS pos_stage TEXT;

-- 1.2 pos_assignee_id: editor/finalizador responsavel pelo entregavel
ALTER TABLE job_deliverables
  ADD COLUMN IF NOT EXISTS pos_assignee_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- 1.3 pos_drive_url: link da pasta/arquivo no Drive para este entregavel
ALTER TABLE job_deliverables
  ADD COLUMN IF NOT EXISTS pos_drive_url TEXT;

-- 1.4 pos_briefing: briefing estruturado de pos-producao (ritmo, referencias, etc)
ALTER TABLE job_deliverables
  ADD COLUMN IF NOT EXISTS pos_briefing JSONB DEFAULT NULL;

-- =============================================================================
-- 2. CHECK CONSTRAINT em pos_stage
--    11 estagios do fluxo padrao de pos-producao audiovisual
-- =============================================================================

ALTER TABLE job_deliverables
  DROP CONSTRAINT IF EXISTS chk_deliverables_pos_stage;

ALTER TABLE job_deliverables
  ADD CONSTRAINT chk_deliverables_pos_stage CHECK (
    pos_stage IS NULL
    OR pos_stage IN (
      'ingest',
      'montagem',
      'apresentacao_offline',
      'revisao_offline',
      'aprovado_offline',
      'finalizacao',
      'apresentacao_online',
      'revisao_online',
      'aprovado_online',
      'copias',
      'entregue'
    )
  );

-- =============================================================================
-- 3. Indices parciais em job_deliverables para dashboard cross-jobs
--    Filtram por NOT NULL para performance (maioria dos deliverables nao tem pos)
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_job_deliverables_pos_stage
  ON job_deliverables(pos_stage)
  WHERE pos_stage IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_job_deliverables_pos_assignee
  ON job_deliverables(pos_assignee_id)
  WHERE pos_assignee_id IS NOT NULL;

-- Indice FK para pos_assignee_id (regra: indice em TODA foreign key)
CREATE INDEX IF NOT EXISTS idx_job_deliverables_pos_assignee_id
  ON job_deliverables(pos_assignee_id);

-- =============================================================================
-- 4. Tabela: pos_cut_versions
--    Versoes de cortes (offline/online) com ciclo de revisao/aprovacao.
--    Cada corte pertence a um deliverable e a um job. O par
--    (deliverable_id, version_type, version_number) e unico para evitar
--    duplicidade de versoes.
-- =============================================================================

CREATE TABLE IF NOT EXISTS pos_cut_versions (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID          NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  deliverable_id    UUID          NOT NULL REFERENCES job_deliverables(id) ON DELETE CASCADE,
  job_id            UUID          NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  version_number    INTEGER       NOT NULL,
  version_type      TEXT          NOT NULL,
  review_url        TEXT,
  status            TEXT          NOT NULL DEFAULT 'rascunho',
  revision_notes    TEXT,
  created_by        UUID          REFERENCES profiles(id) ON DELETE SET NULL,
  approved_by       UUID          REFERENCES profiles(id) ON DELETE SET NULL,
  approved_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT now(),

  -- Constraints
  CONSTRAINT chk_pos_cut_versions_version_type CHECK (
    version_type IN ('offline', 'online')
  ),
  CONSTRAINT chk_pos_cut_versions_status CHECK (
    status IN ('rascunho', 'enviado', 'aprovado', 'rejeitado')
  ),
  CONSTRAINT chk_pos_cut_versions_version_number_positive CHECK (
    version_number > 0
  ),
  CONSTRAINT chk_pos_cut_versions_approved_consistency CHECK (
    (status != 'aprovado')
    OR (approved_by IS NOT NULL AND approved_at IS NOT NULL)
  ),
  CONSTRAINT uq_pos_cut_versions_deliverable_type_number UNIQUE (
    deliverable_id, version_type, version_number
  )
);

-- =============================================================================
-- 5. Indices em pos_cut_versions
-- =============================================================================

-- Busca por deliverable (listagem de versoes de um entregavel)
CREATE INDEX IF NOT EXISTS idx_pos_cut_versions_deliverable
  ON pos_cut_versions(deliverable_id);

-- Busca por job (listagem de todos os cortes de um job)
CREATE INDEX IF NOT EXISTS idx_pos_cut_versions_job
  ON pos_cut_versions(job_id);

-- Dashboard: cortes enviados/aprovados (filtro parcial)
CREATE INDEX IF NOT EXISTS idx_pos_cut_versions_status
  ON pos_cut_versions(status)
  WHERE status IN ('enviado', 'aprovado');

-- FK indices (regra: indice em TODA foreign key)
CREATE INDEX IF NOT EXISTS idx_pos_cut_versions_tenant_id
  ON pos_cut_versions(tenant_id);

CREATE INDEX IF NOT EXISTS idx_pos_cut_versions_created_by
  ON pos_cut_versions(created_by);

CREATE INDEX IF NOT EXISTS idx_pos_cut_versions_approved_by
  ON pos_cut_versions(approved_by);

-- =============================================================================
-- 6. RLS — Row Level Security em pos_cut_versions
--    Tenant isolation via get_tenant_id() (padrao do projeto)
--    Idempotente via DO $$ + check pg_policies
-- =============================================================================

ALTER TABLE pos_cut_versions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  -- SELECT: qualquer usuario autenticado do mesmo tenant
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'pos_cut_versions_select'
      AND tablename = 'pos_cut_versions'
  ) THEN
    CREATE POLICY pos_cut_versions_select ON pos_cut_versions
      FOR SELECT TO authenticated
      USING (tenant_id = (SELECT get_tenant_id()));
  END IF;

  -- INSERT: qualquer usuario autenticado do mesmo tenant
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'pos_cut_versions_insert'
      AND tablename = 'pos_cut_versions'
  ) THEN
    CREATE POLICY pos_cut_versions_insert ON pos_cut_versions
      FOR INSERT TO authenticated
      WITH CHECK (tenant_id = (SELECT get_tenant_id()));
  END IF;

  -- UPDATE: qualquer usuario autenticado do mesmo tenant
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'pos_cut_versions_update'
      AND tablename = 'pos_cut_versions'
  ) THEN
    CREATE POLICY pos_cut_versions_update ON pos_cut_versions
      FOR UPDATE TO authenticated
      USING (tenant_id = (SELECT get_tenant_id()))
      WITH CHECK (tenant_id = (SELECT get_tenant_id()));
  END IF;

  -- DELETE: qualquer usuario autenticado do mesmo tenant (soft delete via app, policy por seguranca)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'pos_cut_versions_delete'
      AND tablename = 'pos_cut_versions'
  ) THEN
    CREATE POLICY pos_cut_versions_delete ON pos_cut_versions
      FOR DELETE TO authenticated
      USING (tenant_id = (SELECT get_tenant_id()));
  END IF;
END $$;

-- =============================================================================
-- 7. Trigger updated_at
--    Reutiliza funcao existente: public.update_updated_at()
--    Idempotente via check pg_trigger
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_pos_cut_versions_updated_at'
  ) THEN
    CREATE TRIGGER trg_pos_cut_versions_updated_at
      BEFORE UPDATE ON pos_cut_versions
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;

-- =============================================================================
-- 8. Comentarios
-- =============================================================================

-- Colunas novas em job_deliverables
COMMENT ON COLUMN job_deliverables.pos_stage IS
  'Estagio atual no fluxo de pos-producao: ingest, montagem, apresentacao_offline, revisao_offline, aprovado_offline, finalizacao, apresentacao_online, revisao_online, aprovado_online, copias, entregue.';
COMMENT ON COLUMN job_deliverables.pos_assignee_id IS
  'Editor ou finalizador responsavel por este entregavel na pos-producao. FK para profiles.';
COMMENT ON COLUMN job_deliverables.pos_drive_url IS
  'URL da pasta ou arquivo no Google Drive contendo o material de pos-producao deste entregavel.';
COMMENT ON COLUMN job_deliverables.pos_briefing IS
  'Briefing estruturado de pos-producao em JSONB. Campos sugeridos: ritmo, referencias, musica, observacoes_cor, observacoes_audio.';

-- Tabela pos_cut_versions
COMMENT ON TABLE pos_cut_versions IS
  'Versoes de cortes (offline/online) para aprovacao de entregaveis na pos-producao. Cada versao possui ciclo de revisao: rascunho -> enviado -> aprovado/rejeitado.';
COMMENT ON COLUMN pos_cut_versions.deliverable_id IS
  'Entregavel ao qual este corte pertence. FK para job_deliverables.';
COMMENT ON COLUMN pos_cut_versions.job_id IS
  'Job desnormalizado para facilitar queries cross-job sem JOIN. FK para jobs.';
COMMENT ON COLUMN pos_cut_versions.version_number IS
  'Numero sequencial da versao dentro do tipo (ex: offline v1, offline v2). Sempre positivo.';
COMMENT ON COLUMN pos_cut_versions.version_type IS
  'Tipo de corte: offline (montagem sem finalizacao) ou online (corte finalizado com cor e audio).';
COMMENT ON COLUMN pos_cut_versions.review_url IS
  'URL para review do corte (Frame.io, Vimeo, Google Drive, etc).';
COMMENT ON COLUMN pos_cut_versions.status IS
  'Status do corte: rascunho (em edicao), enviado (aguardando aprovacao), aprovado (OK), rejeitado (precisa revisao).';
COMMENT ON COLUMN pos_cut_versions.revision_notes IS
  'Notas de revisao: feedback do cliente ou do diretor sobre o corte.';
COMMENT ON COLUMN pos_cut_versions.created_by IS
  'Perfil que criou/subiu esta versao do corte.';
COMMENT ON COLUMN pos_cut_versions.approved_by IS
  'Perfil que aprovou o corte. Obrigatorio quando status = aprovado (CHECK constraint).';
COMMENT ON COLUMN pos_cut_versions.approved_at IS
  'Data/hora da aprovacao. Obrigatorio quando status = aprovado (CHECK constraint).';

-- =============================================================================
-- FIM da migration — Onda 1.2 Pos-Producao
--
-- Resumo:
--   ADD COLUMN em job_deliverables: 4 (pos_stage, pos_assignee_id, pos_drive_url, pos_briefing)
--   CHECK CONSTRAINTS: 1 em job_deliverables (pos_stage), 4 em pos_cut_versions
--   CREATE TABLE: pos_cut_versions (14 colunas + constraints)
--   INDICES: 2 parciais em job_deliverables + 1 FK + 6 em pos_cut_versions = 9 total
--   RLS POLICIES: 4 (SELECT, INSERT, UPDATE, DELETE) com tenant isolation
--   TRIGGER: 1 (updated_at)
--   SECURITY: security_invoker = on
--   COMENTARIOS: 4 + 11 = 15 total
-- =============================================================================
