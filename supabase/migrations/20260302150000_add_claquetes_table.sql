-- =============================================================================
-- Migration: Tabela claquetes (documento regulatorio ANCINE)
-- Data: 2026-03-02
--
-- Contexto:
--   A claquete e um documento obrigatorio da ANCINE para obras audiovisuais
--   veiculadas em TV aberta no Brasil. Contem dados da peca publicitaria,
--   produtora, agencia, diretor, numero CRT e flags de acessibilidade.
--
-- Campos do job reutilizados (ja existem em jobs):
--   ancine_number, audio_company, media_type
--   Nao e necessario ALTER TABLE no jobs.
--
-- Nova tabela: claquetes (total de tabelas apos migration: 37)
-- =============================================================================

SET search_path TO public;

-- -------------------------------------------------------
-- 1. Tabela claquetes
-- -------------------------------------------------------

CREATE TABLE IF NOT EXISTS claquetes (
  -- Identificacao
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  job_id              UUID        NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,

  -- Versionamento: permite multiplas claquetes por job (ex: pecas com duracoes diferentes)
  version             INT         NOT NULL DEFAULT 1,

  -- Dados da peca (podem diferir dos dados do job)
  title               VARCHAR(500),
  duration            VARCHAR(20),
  product             VARCHAR(300),
  advertiser          VARCHAR(300),
  agency              VARCHAR(300),
  director            VARCHAR(300),

  -- Classificacao ANCINE
  type                VARCHAR(100)  DEFAULT 'COMUM',
  segment             VARCHAR(300)  DEFAULT 'TODOS OS SEGMENTOS DE MERCADO',
  crt                 VARCHAR(50),

  -- Produtora (defaults preenchidos pela aplicacao a partir do tenant)
  production_company  VARCHAR(300),
  cnpj                VARCHAR(20),
  audio_company       VARCHAR(300),
  production_year     INT,

  -- Acessibilidade
  closed_caption      BOOLEAN     NOT NULL DEFAULT false,
  sap_key             BOOLEAN     NOT NULL DEFAULT false,
  libras              BOOLEAN     NOT NULL DEFAULT false,
  audio_description   BOOLEAN     NOT NULL DEFAULT false,

  -- Arquivos gerados
  pdf_url             TEXT,
  png_url             TEXT,
  drive_file_id       TEXT,

  -- Auditoria
  created_by          UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at          TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT uq_claquetes_job_version UNIQUE (job_id, version, deleted_at),
  CONSTRAINT chk_claquetes_version_positive CHECK (version >= 1),
  CONSTRAINT chk_claquetes_production_year CHECK (
    production_year IS NULL OR (production_year >= 1900 AND production_year <= 2100)
  ),
  CONSTRAINT chk_claquetes_type CHECK (
    type IS NULL OR type IN ('COMUM', 'ANIMACAO', 'DOCUMENTARIO', 'FICCAO', 'MUSICAL', 'OUTRO')
  ),
  CONSTRAINT chk_claquetes_cnpj_format CHECK (
    cnpj IS NULL OR cnpj ~ '^\d{2}\.\d{3}\.\d{3}/\d{4}-\d{2}$'
  )
);

-- -------------------------------------------------------
-- 2. Comentarios em colunas nao obvias
-- -------------------------------------------------------

COMMENT ON TABLE claquetes IS 'Documento regulatorio ANCINE obrigatorio para obras audiovisuais veiculadas em TV aberta no Brasil.';
COMMENT ON COLUMN claquetes.version IS 'Versao da claquete para o mesmo job. Permite multiplas pecas (ex: 30s e 120s).';
COMMENT ON COLUMN claquetes.title IS 'Titulo da peca publicitaria. Pode diferir do titulo do job (ex: nome comercial da campanha).';
COMMENT ON COLUMN claquetes.duration IS 'Duracao da peca em formato texto (ex: 30", 120", 15"). Inclui aspas duplas como no padrao ANCINE.';
COMMENT ON COLUMN claquetes.product IS 'Produto ou servico anunciado na peca (ex: INSTITUCIONAL, IMOBILIARIO).';
COMMENT ON COLUMN claquetes.advertiser IS 'Razao social do anunciante. Pode diferir do client name do job.';
COMMENT ON COLUMN claquetes.agency IS 'Nome da agencia de publicidade. Pode diferir do agency name do job.';
COMMENT ON COLUMN claquetes.director IS 'Nome do diretor de cena da peca.';
COMMENT ON COLUMN claquetes.type IS 'Tipo da obra: COMUM, ANIMACAO, DOCUMENTARIO, FICCAO, MUSICAL, OUTRO.';
COMMENT ON COLUMN claquetes.segment IS 'Segmento de mercado ANCINE. Default: TODOS OS SEGMENTOS DE MERCADO.';
COMMENT ON COLUMN claquetes.crt IS 'Numero CRT (Certificado de Registro de Titulo) emitido pela ANCINE. Formato variavel.';
COMMENT ON COLUMN claquetes.production_company IS 'Razao social da produtora. Default preenchido pela aplicacao a partir de tenants.name.';
COMMENT ON COLUMN claquetes.cnpj IS 'CNPJ da produtora no formato XX.XXX.XXX/XXXX-XX. Default preenchido a partir de tenants.cnpj.';
COMMENT ON COLUMN claquetes.audio_company IS 'Nome da produtora de audio terceirizada (ex: IELOW SOUND).';
COMMENT ON COLUMN claquetes.sap_key IS 'Flag Tecla SAP (Segundo Audio em Portugues) — acessibilidade ANCINE.';
COMMENT ON COLUMN claquetes.libras IS 'Flag de interpretacao em LIBRAS — acessibilidade ANCINE.';
COMMENT ON COLUMN claquetes.audio_description IS 'Flag de audiodescricao — acessibilidade ANCINE.';
COMMENT ON COLUMN claquetes.pdf_url IS 'URL do PDF da claquete gerado pelo sistema (Supabase Storage ou Drive).';
COMMENT ON COLUMN claquetes.png_url IS 'URL do PNG da claquete gerado para preview rapido.';
COMMENT ON COLUMN claquetes.drive_file_id IS 'ID do arquivo da claquete no Google Drive do job.';

-- -------------------------------------------------------
-- 3. Indices
-- -------------------------------------------------------

-- FK indices (obrigatorio por convencao)
CREATE INDEX IF NOT EXISTS idx_claquetes_tenant_id
  ON claquetes(tenant_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_claquetes_job_id
  ON claquetes(job_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_claquetes_created_by
  ON claquetes(created_by) WHERE created_by IS NOT NULL;

-- Indice composto para busca de claquetes por job + version (query principal)
CREATE INDEX IF NOT EXISTS idx_claquetes_job_version
  ON claquetes(job_id, version) WHERE deleted_at IS NULL;

-- Indice para busca por CRT (consultas regulatorias)
CREATE INDEX IF NOT EXISTS idx_claquetes_crt
  ON claquetes(tenant_id, crt) WHERE crt IS NOT NULL AND deleted_at IS NULL;

-- Indice para listagem por tenant ordenada por data
CREATE INDEX IF NOT EXISTS idx_claquetes_tenant_created
  ON claquetes(tenant_id, created_at DESC) WHERE deleted_at IS NULL;

-- -------------------------------------------------------
-- 4. Trigger updated_at
-- -------------------------------------------------------

DROP TRIGGER IF EXISTS trg_claquetes_updated_at ON claquetes;
CREATE TRIGGER trg_claquetes_updated_at
  BEFORE UPDATE ON claquetes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- -------------------------------------------------------
-- 5. RLS: claquetes (tenant isolation)
-- -------------------------------------------------------

ALTER TABLE claquetes ENABLE ROW LEVEL SECURITY;

-- SELECT: qualquer usuario autenticado ve claquetes do seu tenant
DROP POLICY IF EXISTS claquetes_select_tenant ON claquetes;
CREATE POLICY claquetes_select_tenant ON claquetes
  FOR SELECT TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()));

-- INSERT: qualquer usuario autenticado insere no seu tenant
DROP POLICY IF EXISTS claquetes_insert_tenant ON claquetes;
CREATE POLICY claquetes_insert_tenant ON claquetes
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = (SELECT get_tenant_id()));

-- UPDATE: qualquer usuario autenticado atualiza no seu tenant
DROP POLICY IF EXISTS claquetes_update_tenant ON claquetes;
CREATE POLICY claquetes_update_tenant ON claquetes
  FOR UPDATE TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()))
  WITH CHECK (tenant_id = (SELECT get_tenant_id()));

-- DELETE: soft delete controlado pela aplicacao (admin/ceo setam deleted_at via UPDATE)
-- Nao ha policy FOR DELETE — delecao fisica e bloqueada.
-- O soft delete funciona via UPDATE SET deleted_at = now(), coberto pela policy de UPDATE.

-- -------------------------------------------------------
-- 6. Verificacao de isolamento de tenant (teste mental)
-- -------------------------------------------------------
-- SELECT: tenant_id = get_tenant_id() do JWT -> Usuario A (tenant X) NAO ve dados do tenant Y. OK.
-- INSERT: WITH CHECK garante que so insere com seu proprio tenant_id. OK.
-- UPDATE: USING + WITH CHECK duplo garante que so atualiza registros do seu tenant. OK.
-- DELETE fisico: SEM policy FOR DELETE = bloqueado para todos. OK.

-- =============================================================================
-- FIM da migration — claquetes
-- Nova tabela: claquetes (total: 37)
-- Indices: 6 (tenant_id, job_id, created_by, job+version, crt, tenant+created)
-- RLS: 3 policies (select, insert, update) + sem delete fisico
-- Trigger: updated_at
-- Constraints: 4 (unique job+version, version >= 1, production_year range, type enum, cnpj format)
-- =============================================================================
