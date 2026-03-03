-- =============================================================================
-- Migration: T3.2 — Gestao de Locacoes
-- Data: 2026-03-03
--
-- Contexto:
--   Gestao centralizada de locacoes para filmagem. Locacoes podem ser
--   reutilizadas entre jobs (cadastro unico). A tabela job_locations faz
--   o vinculo entre jobs e locacoes, com controle de alvara/permissao e
--   vinculo opcional com custo (cost_items).
--
--   Fotos das locacoes sao armazenadas na tabela location_photos para
--   referencia visual da equipe de producao.
--
-- Novas tabelas: locations, location_photos, job_locations
-- =============================================================================

SET search_path TO public;

-- -------------------------------------------------------
-- 1. Tabela locations
-- -------------------------------------------------------

CREATE TABLE IF NOT EXISTS locations (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID          NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Identificacao
  name              TEXT          NOT NULL,

  -- Endereco
  address_street    TEXT,
  address_number    TEXT,
  address_complement TEXT,
  address_district  TEXT,
  address_city      TEXT,
  address_state     TEXT,
  address_zip       TEXT,

  -- Coordenadas
  latitude          NUMERIC(10,7),
  longitude         NUMERIC(10,7),

  -- Contato do responsavel pela locacao
  contact_name      TEXT,
  contact_phone     TEXT,
  contact_email     TEXT,

  -- Custo
  daily_rate        NUMERIC(12,2),

  -- Informacoes adicionais
  description       TEXT,
  notes             TEXT,
  is_active         BOOLEAN       DEFAULT true,

  created_at        TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT now(),
  deleted_at        TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT chk_locations_name_not_empty CHECK (
    length(trim(name)) > 0
  ),
  CONSTRAINT chk_locations_daily_rate_positive CHECK (
    daily_rate IS NULL OR daily_rate >= 0
  ),
  CONSTRAINT chk_locations_latitude_range CHECK (
    latitude IS NULL OR (latitude >= -90 AND latitude <= 90)
  ),
  CONSTRAINT chk_locations_longitude_range CHECK (
    longitude IS NULL OR (longitude >= -180 AND longitude <= 180)
  ),
  CONSTRAINT chk_locations_email_format CHECK (
    contact_email IS NULL OR contact_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
  )
);

-- -------------------------------------------------------
-- 2. Comentarios em colunas nao obvias — locations
-- -------------------------------------------------------

COMMENT ON TABLE locations IS 'Cadastro de locacoes para filmagem. Reutilizaveis entre jobs do mesmo tenant.';
COMMENT ON COLUMN locations.name IS 'Nome identificador da locacao: estudio, praia de Copacabana, galpao zona norte, etc.';
COMMENT ON COLUMN locations.address_zip IS 'CEP da locacao no formato XXXXX-XXX ou XXXXXXXX.';
COMMENT ON COLUMN locations.latitude IS 'Latitude em graus decimais (-90 a +90). Precisao de 7 casas = ~1cm.';
COMMENT ON COLUMN locations.longitude IS 'Longitude em graus decimais (-180 a +180). Precisao de 7 casas = ~1cm.';
COMMENT ON COLUMN locations.contact_name IS 'Nome do responsavel/proprietario da locacao para contato.';
COMMENT ON COLUMN locations.contact_phone IS 'Telefone do responsavel pela locacao.';
COMMENT ON COLUMN locations.daily_rate IS 'Custo por diaria de locacao em BRL. Zero para locacoes gratuitas.';
COMMENT ON COLUMN locations.is_active IS 'Locacoes inativas nao aparecem na busca mas mantem historico de uso.';

-- -------------------------------------------------------
-- 3. Tabela location_photos
-- -------------------------------------------------------

CREATE TABLE IF NOT EXISTS location_photos (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID          NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  location_id       UUID          NOT NULL REFERENCES locations(id) ON DELETE CASCADE,

  file_url          TEXT          NOT NULL,
  storage_path      TEXT,
  caption           TEXT,
  is_primary        BOOLEAN       DEFAULT false,

  created_at        TIMESTAMPTZ   NOT NULL DEFAULT now(),

  -- Constraints
  CONSTRAINT chk_location_photo_file_url_not_empty CHECK (
    length(trim(file_url)) > 0
  )
);

COMMENT ON TABLE location_photos IS 'Fotos de referencia das locacoes para avaliacao da equipe de producao.';
COMMENT ON COLUMN location_photos.file_url IS 'URL publica ou assinada do arquivo da foto.';
COMMENT ON COLUMN location_photos.storage_path IS 'Path no Supabase Storage para referencia interna.';
COMMENT ON COLUMN location_photos.is_primary IS 'Foto principal exibida como thumbnail na listagem de locacoes.';

-- -------------------------------------------------------
-- 4. Tabela job_locations (vinculo job <-> locacao)
-- -------------------------------------------------------

CREATE TABLE IF NOT EXISTS job_locations (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID          NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  job_id            UUID          NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  location_id       UUID          NOT NULL REFERENCES locations(id) ON DELETE CASCADE,

  -- Datas de filmagem nesta locacao
  shooting_dates    DATE[],

  -- Alvara/permissao
  permit_status     TEXT          DEFAULT 'pending',
  permit_document_url TEXT,

  -- Vinculo com custo
  cost_item_id      UUID          REFERENCES cost_items(id) ON DELETE SET NULL,

  notes             TEXT,

  created_at        TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT now(),
  deleted_at        TIMESTAMPTZ,

  -- Unicidade: uma locacao so pode ser vinculada uma vez ao mesmo job
  CONSTRAINT uq_job_location UNIQUE (job_id, location_id, tenant_id),

  -- Constraints
  CONSTRAINT chk_job_location_permit_status CHECK (
    permit_status IN ('pending', 'requested', 'approved', 'denied', 'not_required')
  )
);

COMMENT ON TABLE job_locations IS 'Vinculo entre jobs e locacoes, com controle de alvara e datas de filmagem.';
COMMENT ON COLUMN job_locations.shooting_dates IS 'Array de datas em que esta locacao sera usada para filmagem neste job.';
COMMENT ON COLUMN job_locations.permit_status IS 'Status do alvara/permissao: pending (aguardando), requested (solicitado), approved (aprovado), denied (negado), not_required (nao necessario).';
COMMENT ON COLUMN job_locations.permit_document_url IS 'URL do documento de alvara/permissao aprovado (PDF, imagem).';
COMMENT ON COLUMN job_locations.cost_item_id IS 'Vinculo opcional com item de custo no financeiro do job. SET NULL se cost item for excluido.';

-- -------------------------------------------------------
-- 5. Indices
-- -------------------------------------------------------

-- locations
CREATE INDEX IF NOT EXISTS idx_locations_tenant
  ON locations(tenant_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_locations_name
  ON locations(tenant_id, name) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_locations_city
  ON locations(tenant_id, address_city)
  WHERE address_city IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_locations_active
  ON locations(tenant_id, is_active) WHERE deleted_at IS NULL;

-- location_photos
CREATE INDEX IF NOT EXISTS idx_location_photos_tenant
  ON location_photos(tenant_id);

CREATE INDEX IF NOT EXISTS idx_location_photos_location
  ON location_photos(location_id);

-- job_locations
CREATE INDEX IF NOT EXISTS idx_job_locations_tenant
  ON job_locations(tenant_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_job_locations_job
  ON job_locations(job_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_job_locations_location
  ON job_locations(location_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_job_locations_cost_item
  ON job_locations(cost_item_id)
  WHERE cost_item_id IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_job_locations_permit_status
  ON job_locations(tenant_id, permit_status) WHERE deleted_at IS NULL;

-- -------------------------------------------------------
-- 6. Triggers updated_at (locations e job_locations — photos nao tem updated_at)
-- -------------------------------------------------------

DROP TRIGGER IF EXISTS trg_locations_updated_at ON locations;
CREATE TRIGGER trg_locations_updated_at
  BEFORE UPDATE ON locations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_job_locations_updated_at ON job_locations;
CREATE TRIGGER trg_job_locations_updated_at
  BEFORE UPDATE ON job_locations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- -------------------------------------------------------
-- 7. RLS: locations (tenant isolation)
-- -------------------------------------------------------

ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

-- SELECT: qualquer usuario autenticado ve locacoes do seu tenant
DROP POLICY IF EXISTS locations_select_tenant ON locations;
CREATE POLICY locations_select_tenant ON locations
  FOR SELECT TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()));

-- INSERT: qualquer usuario autenticado insere no seu tenant
DROP POLICY IF EXISTS locations_insert_tenant ON locations;
CREATE POLICY locations_insert_tenant ON locations
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = (SELECT get_tenant_id()));

-- UPDATE: qualquer usuario autenticado atualiza no seu tenant
DROP POLICY IF EXISTS locations_update_tenant ON locations;
CREATE POLICY locations_update_tenant ON locations
  FOR UPDATE TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()))
  WITH CHECK (tenant_id = (SELECT get_tenant_id()));

-- DELETE fisico: SEM policy — delecao fisica bloqueada. Usar soft delete (deleted_at).

-- -------------------------------------------------------
-- 8. RLS: location_photos (tenant isolation)
-- -------------------------------------------------------

ALTER TABLE location_photos ENABLE ROW LEVEL SECURITY;

-- SELECT: qualquer usuario autenticado ve fotos do seu tenant
DROP POLICY IF EXISTS location_photos_select_tenant ON location_photos;
CREATE POLICY location_photos_select_tenant ON location_photos
  FOR SELECT TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()));

-- INSERT: qualquer usuario autenticado insere no seu tenant
DROP POLICY IF EXISTS location_photos_insert_tenant ON location_photos;
CREATE POLICY location_photos_insert_tenant ON location_photos
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = (SELECT get_tenant_id()));

-- UPDATE: qualquer usuario autenticado atualiza no seu tenant
DROP POLICY IF EXISTS location_photos_update_tenant ON location_photos;
CREATE POLICY location_photos_update_tenant ON location_photos
  FOR UPDATE TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()))
  WITH CHECK (tenant_id = (SELECT get_tenant_id()));

-- DELETE: fotos podem ser removidas fisicamente (nao tem soft delete)
DROP POLICY IF EXISTS location_photos_delete_tenant ON location_photos;
CREATE POLICY location_photos_delete_tenant ON location_photos
  FOR DELETE TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()));

-- -------------------------------------------------------
-- 9. RLS: job_locations (tenant isolation)
-- -------------------------------------------------------

ALTER TABLE job_locations ENABLE ROW LEVEL SECURITY;

-- SELECT: qualquer usuario autenticado ve vinculos do seu tenant
DROP POLICY IF EXISTS job_locations_select_tenant ON job_locations;
CREATE POLICY job_locations_select_tenant ON job_locations
  FOR SELECT TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()));

-- INSERT: qualquer usuario autenticado insere no seu tenant
DROP POLICY IF EXISTS job_locations_insert_tenant ON job_locations;
CREATE POLICY job_locations_insert_tenant ON job_locations
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = (SELECT get_tenant_id()));

-- UPDATE: qualquer usuario autenticado atualiza no seu tenant
DROP POLICY IF EXISTS job_locations_update_tenant ON job_locations;
CREATE POLICY job_locations_update_tenant ON job_locations
  FOR UPDATE TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()))
  WITH CHECK (tenant_id = (SELECT get_tenant_id()));

-- DELETE fisico: SEM policy — delecao fisica bloqueada. Usar soft delete (deleted_at).

-- -------------------------------------------------------
-- 10. Verificacao de isolamento de tenant (teste mental)
-- -------------------------------------------------------
-- locations:
--   SELECT: tenant_id = get_tenant_id() -> Tenant A NAO ve locacoes do Tenant B. OK.
--   INSERT: WITH CHECK -> So insere com seu proprio tenant_id. OK.
--   UPDATE: USING + WITH CHECK duplo -> So atualiza registros do seu tenant. OK.
--   DELETE fisico: SEM policy -> bloqueado para todos. OK.
--
-- location_photos:
--   SELECT: tenant_id = get_tenant_id() -> Tenant A NAO ve fotos do Tenant B. OK.
--   INSERT: WITH CHECK -> So insere com seu proprio tenant_id. OK.
--   UPDATE: USING + WITH CHECK duplo -> So atualiza fotos do seu tenant. OK.
--   DELETE: USING tenant_id -> So remove fotos do seu tenant. OK.
--     (DELETE real permitido: fotos nao tem soft delete, remover foto e operacao normal)
--
-- job_locations:
--   SELECT: tenant_id = get_tenant_id() -> Tenant A NAO ve vinculos do Tenant B. OK.
--   INSERT: WITH CHECK -> So insere com seu proprio tenant_id. OK.
--   UPDATE: USING + WITH CHECK duplo -> So atualiza vinculos do seu tenant. OK.
--   DELETE fisico: SEM policy -> bloqueado para todos. Usar soft delete. OK.

-- =============================================================================
-- FIM da migration — T3.2 Gestao de Locacoes
-- Novas tabelas: locations, location_photos, job_locations (total: 46)
-- Indices: 11 (locations: 4, photos: 2, job_locations: 5)
-- RLS: 10 policies (locations: 3, photos: 4, job_locations: 3)
-- Triggers: 2 (updated_at em locations e job_locations)
-- Constraints: 7 (locations: 5, photos: 1, job_locations: 2 incluindo UNIQUE)
-- =============================================================================
