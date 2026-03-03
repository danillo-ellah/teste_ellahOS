-- =============================================================================
-- Migration: T3.1 — Diario de Producao Digital
-- Data: 2026-03-03
--
-- Contexto:
--   Diario de producao digital substitui planilhas e anotacoes em papel.
--   Cada entry corresponde a um dia de filmagem de um job, com informacoes
--   sobre clima, horarios, cenas, takes, problemas e destaques.
--
--   Fotos de referencia, BTS, continuidade e problemas sao armazenadas
--   na tabela production_diary_photos vinculada ao entry.
--
-- Novas tabelas: production_diary_entries, production_diary_photos
-- =============================================================================

SET search_path TO public;

-- -------------------------------------------------------
-- 1. Tabela production_diary_entries
-- -------------------------------------------------------

CREATE TABLE IF NOT EXISTS production_diary_entries (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID          NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  job_id            UUID          NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,

  -- Dia de filmagem
  shooting_date     DATE          NOT NULL,
  day_number        INT,

  -- Condicoes e horarios
  weather           TEXT,
  call_time         TIME,
  wrap_time         TIME,

  -- Cenas e takes
  scenes_planned    TEXT,
  scenes_completed  TEXT,
  takes_count       INT           DEFAULT 0,

  -- Observacoes
  notes             TEXT,
  problems          TEXT,
  highlights        TEXT,

  -- Autor
  created_by        UUID          REFERENCES profiles(id) ON DELETE SET NULL,

  created_at        TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT now(),
  deleted_at        TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT uq_diary_entry_per_day UNIQUE (job_id, shooting_date, tenant_id),

  CONSTRAINT chk_diary_day_number_positive CHECK (
    day_number IS NULL OR day_number > 0
  ),
  CONSTRAINT chk_diary_takes_count_non_negative CHECK (
    takes_count IS NULL OR takes_count >= 0
  ),
  CONSTRAINT chk_diary_wrap_after_call CHECK (
    call_time IS NULL OR wrap_time IS NULL OR wrap_time > call_time
  )
);

-- -------------------------------------------------------
-- 2. Comentarios em colunas nao obvias
-- -------------------------------------------------------

COMMENT ON TABLE production_diary_entries IS 'Diario de producao digital. Um registro por dia de filmagem por job.';
COMMENT ON COLUMN production_diary_entries.shooting_date IS 'Data do dia de filmagem. Unica por job (constraint uq_diary_entry_per_day).';
COMMENT ON COLUMN production_diary_entries.day_number IS 'Numero sequencial do dia de filmagem (dia 1, dia 2...). Preenchido pelo usuario.';
COMMENT ON COLUMN production_diary_entries.weather IS 'Condicoes climaticas do dia: sol, nublado, chuva, etc.';
COMMENT ON COLUMN production_diary_entries.call_time IS 'Horario de chamada da equipe no set.';
COMMENT ON COLUMN production_diary_entries.wrap_time IS 'Horario de encerramento das atividades no set.';
COMMENT ON COLUMN production_diary_entries.scenes_planned IS 'Descricao das cenas planejadas para o dia conforme ordem do dia.';
COMMENT ON COLUMN production_diary_entries.scenes_completed IS 'Descricao das cenas efetivamente filmadas no dia.';
COMMENT ON COLUMN production_diary_entries.takes_count IS 'Numero total de takes realizados no dia.';
COMMENT ON COLUMN production_diary_entries.problems IS 'Problemas encontrados durante a filmagem: equipamento, clima, logistica, etc.';
COMMENT ON COLUMN production_diary_entries.highlights IS 'Destaques positivos do dia: cenas memoraveis, eficiencia, etc.';
COMMENT ON COLUMN production_diary_entries.created_by IS 'Profile do usuario que criou o registro (normalmente o diretor de producao).';

-- -------------------------------------------------------
-- 3. Tabela production_diary_photos
-- -------------------------------------------------------

CREATE TABLE IF NOT EXISTS production_diary_photos (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID          NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  diary_entry_id    UUID          NOT NULL REFERENCES production_diary_entries(id) ON DELETE CASCADE,

  file_url          TEXT          NOT NULL,
  storage_path      TEXT,
  caption           TEXT,
  photo_type        TEXT          DEFAULT 'reference',

  created_at        TIMESTAMPTZ   NOT NULL DEFAULT now(),

  -- Constraints
  CONSTRAINT chk_diary_photo_type CHECK (
    photo_type IN ('reference', 'bts', 'continuity', 'problem')
  ),
  CONSTRAINT chk_diary_photo_file_url_not_empty CHECK (
    length(trim(file_url)) > 0
  )
);

COMMENT ON TABLE production_diary_photos IS 'Fotos vinculadas a um dia do diario de producao.';
COMMENT ON COLUMN production_diary_photos.file_url IS 'URL publica ou assinada do arquivo da foto.';
COMMENT ON COLUMN production_diary_photos.storage_path IS 'Path no Supabase Storage para referencia interna.';
COMMENT ON COLUMN production_diary_photos.photo_type IS 'Tipo da foto: reference (referencia visual), bts (behind the scenes), continuity (continuidade), problem (registro de problema).';

-- -------------------------------------------------------
-- 4. Indices
-- -------------------------------------------------------

-- production_diary_entries
CREATE INDEX IF NOT EXISTS idx_production_diary_entries_tenant
  ON production_diary_entries(tenant_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_production_diary_entries_job
  ON production_diary_entries(job_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_production_diary_entries_job_date
  ON production_diary_entries(tenant_id, job_id, shooting_date) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_production_diary_entries_created_by
  ON production_diary_entries(created_by)
  WHERE created_by IS NOT NULL AND deleted_at IS NULL;

-- production_diary_photos
CREATE INDEX IF NOT EXISTS idx_production_diary_photos_tenant
  ON production_diary_photos(tenant_id);

CREATE INDEX IF NOT EXISTS idx_production_diary_photos_entry
  ON production_diary_photos(diary_entry_id);

CREATE INDEX IF NOT EXISTS idx_production_diary_photos_type
  ON production_diary_photos(diary_entry_id, photo_type);

-- -------------------------------------------------------
-- 5. Trigger updated_at (apenas entries — photos nao tem updated_at)
-- -------------------------------------------------------

DROP TRIGGER IF EXISTS trg_production_diary_entries_updated_at ON production_diary_entries;
CREATE TRIGGER trg_production_diary_entries_updated_at
  BEFORE UPDATE ON production_diary_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- -------------------------------------------------------
-- 6. RLS: production_diary_entries (tenant isolation)
-- -------------------------------------------------------

ALTER TABLE production_diary_entries ENABLE ROW LEVEL SECURITY;

-- SELECT: qualquer usuario autenticado ve entries do seu tenant
DROP POLICY IF EXISTS production_diary_entries_select_tenant ON production_diary_entries;
CREATE POLICY production_diary_entries_select_tenant ON production_diary_entries
  FOR SELECT TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()));

-- INSERT: qualquer usuario autenticado insere no seu tenant
DROP POLICY IF EXISTS production_diary_entries_insert_tenant ON production_diary_entries;
CREATE POLICY production_diary_entries_insert_tenant ON production_diary_entries
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = (SELECT get_tenant_id()));

-- UPDATE: qualquer usuario autenticado atualiza no seu tenant
DROP POLICY IF EXISTS production_diary_entries_update_tenant ON production_diary_entries;
CREATE POLICY production_diary_entries_update_tenant ON production_diary_entries
  FOR UPDATE TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()))
  WITH CHECK (tenant_id = (SELECT get_tenant_id()));

-- DELETE fisico: SEM policy — delecao fisica bloqueada. Usar soft delete (deleted_at).

-- -------------------------------------------------------
-- 7. RLS: production_diary_photos (tenant isolation)
-- -------------------------------------------------------

ALTER TABLE production_diary_photos ENABLE ROW LEVEL SECURITY;

-- SELECT: qualquer usuario autenticado ve fotos do seu tenant
DROP POLICY IF EXISTS production_diary_photos_select_tenant ON production_diary_photos;
CREATE POLICY production_diary_photos_select_tenant ON production_diary_photos
  FOR SELECT TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()));

-- INSERT: qualquer usuario autenticado insere no seu tenant
DROP POLICY IF EXISTS production_diary_photos_insert_tenant ON production_diary_photos;
CREATE POLICY production_diary_photos_insert_tenant ON production_diary_photos
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = (SELECT get_tenant_id()));

-- UPDATE: qualquer usuario autenticado atualiza no seu tenant
DROP POLICY IF EXISTS production_diary_photos_update_tenant ON production_diary_photos;
CREATE POLICY production_diary_photos_update_tenant ON production_diary_photos
  FOR UPDATE TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()))
  WITH CHECK (tenant_id = (SELECT get_tenant_id()));

-- DELETE: fotos podem ser removidas fisicamente (nao tem soft delete)
DROP POLICY IF EXISTS production_diary_photos_delete_tenant ON production_diary_photos;
CREATE POLICY production_diary_photos_delete_tenant ON production_diary_photos
  FOR DELETE TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()));

-- -------------------------------------------------------
-- 8. Verificacao de isolamento de tenant (teste mental)
-- -------------------------------------------------------
-- production_diary_entries:
--   SELECT: tenant_id = get_tenant_id() -> Tenant A NAO ve diarios do Tenant B. OK.
--   INSERT: WITH CHECK -> So insere com seu proprio tenant_id. OK.
--   UPDATE: USING + WITH CHECK duplo -> So atualiza registros do seu tenant. OK.
--   DELETE fisico: SEM policy -> bloqueado para todos. OK.
--
-- production_diary_photos:
--   SELECT: tenant_id = get_tenant_id() -> Tenant A NAO ve fotos do Tenant B. OK.
--   INSERT: WITH CHECK -> So insere com seu proprio tenant_id. OK.
--   UPDATE: USING + WITH CHECK duplo -> So atualiza fotos do seu tenant. OK.
--   DELETE: USING tenant_id -> So remove fotos do seu tenant. OK.
--     (DELETE real permitido: fotos nao tem soft delete, remover foto e operacao normal)

-- =============================================================================
-- FIM da migration — T3.1 Diario de Producao Digital
-- Novas tabelas: production_diary_entries, production_diary_photos (total: 43)
-- Indices: 7 (entries: 4, photos: 3)
-- RLS: 7 policies (entries: 3, photos: 4 incluindo DELETE)
-- Triggers: 1 (updated_at em production_diary_entries)
-- Constraints: 6 (entries: 4 incluindo UNIQUE, photos: 2)
-- =============================================================================
