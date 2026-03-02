-- Migration: Adicionar versionamento de PDFs em job_files
-- Contexto: Ao regenerar um PDF (orcamento, aprovacao interna, contrato),
-- a versao anterior precisa ser preservada com link para a nova versao.
-- A coluna 'version' ja existe (migration 005), mas faltava 'superseded_by'
-- para encadear versoes e 'metadata' para armazenar dados extras (folder_key, etc).
--
-- Spec: CA-953.4 — versoes anteriores nao sao deletadas, apenas marcadas com superseded_by.

SET search_path TO public;

-- -------------------------------------------------------
-- 1. Adicionar coluna superseded_by (FK self-referencing)
-- -------------------------------------------------------
-- Aponta para o registro da versao mais nova que substituiu este arquivo.
-- Quando superseded_by IS NOT NULL, este registro e uma versao antiga.
DO $$ BEGIN
  ALTER TABLE job_files ADD COLUMN IF NOT EXISTS superseded_by UUID REFERENCES job_files(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

COMMENT ON COLUMN job_files.superseded_by IS 'ID do registro em job_files que substituiu esta versao. NULL = versao corrente/ativa.';

-- -------------------------------------------------------
-- 2. Adicionar coluna metadata (JSONB)
-- -------------------------------------------------------
-- Armazena dados extras como folder_key do Drive, parametros de geracao, etc.
DO $$ BEGIN
  ALTER TABLE job_files ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

COMMENT ON COLUMN job_files.metadata IS 'Metadados adicionais do arquivo (ex: folder_key, parametros de geracao).';

-- -------------------------------------------------------
-- 3. Indice em superseded_by (FK deve ter indice)
-- -------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_job_files_superseded_by
  ON job_files(superseded_by) WHERE superseded_by IS NOT NULL;

-- -------------------------------------------------------
-- 4. Indice composto para busca de versao atual por job + categoria
-- -------------------------------------------------------
-- Usado pelo pdf-generator para encontrar a versao anterior ao gerar novo PDF.
-- Filtra por superseded_by IS NULL (versao ativa) e deleted_at IS NULL.
CREATE INDEX IF NOT EXISTS idx_job_files_job_category_active
  ON job_files(job_id, category) WHERE superseded_by IS NULL AND deleted_at IS NULL;

-- -------------------------------------------------------
-- 5. CHECK constraint: version >= 1
-- -------------------------------------------------------
DO $$ BEGIN
  ALTER TABLE job_files ADD CONSTRAINT chk_job_files_version_positive CHECK (version >= 1);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- -------------------------------------------------------
-- 6. CHECK constraint: superseded_by != id (nao pode apontar para si mesmo)
-- -------------------------------------------------------
DO $$ BEGIN
  ALTER TABLE job_files ADD CONSTRAINT chk_job_files_no_self_supersede CHECK (superseded_by IS NULL OR superseded_by != id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =============================================================================
-- FIM da migration — PDF versioning em job_files
-- Novas colunas: superseded_by (UUID FK self-ref), metadata (JSONB)
-- Novos indices: idx_job_files_superseded_by, idx_job_files_job_category_active
-- Novos constraints: chk_job_files_version_positive, chk_job_files_no_self_supersede
-- =============================================================================
