-- =============================================================================
-- Migration: Onda 2.3 — Extensao do Diario de Producao v2
-- Data: 2026-03-08
--
-- Contexto:
--   Alinha nomes de colunas de production_diary_entries e production_diary_photos
--   com os nomes usados na Edge Function e frontend. Adiciona colunas novas para
--   suportar lista de cenas, presenca, equipamentos, assinatura do diretor, etc.
--   Migra photo_type de ingles para portugues.
--
-- Operacoes:
--   1. RENAME COLUMN em production_diary_entries (6 renames)
--   2. RENAME COLUMN em production_diary_photos (2 renames)
--   3. ADD COLUMN em production_diary_entries (12 novas colunas)
--   4. ADD COLUMN em production_diary_photos (3 novas colunas)
--   5. CHECK CONSTRAINTS (5 constraints)
--   6. photo_type: ingles -> portugues (drop + migrate + recreate)
--   7. Indice novo em shooting_date_id
--
-- Total: 6 + 2 + 12 + 3 + 5 + 3 + 1 = 32 operacoes
-- =============================================================================

SET search_path TO public;

-- =============================================================================
-- 1. RENAME COLUMN em production_diary_entries (6 renames)
--    Cada rename verifica via pg_attribute que a coluna antiga existe E a nova
--    NAO existe, garantindo idempotencia.
-- =============================================================================

-- 1.1 weather -> weather_condition
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_attribute
    WHERE attrelid = 'production_diary_entries'::regclass
      AND attname = 'weather' AND NOT attisdropped
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_attribute
    WHERE attrelid = 'production_diary_entries'::regclass
      AND attname = 'weather_condition' AND NOT attisdropped
  ) THEN
    ALTER TABLE production_diary_entries RENAME COLUMN weather TO weather_condition;
  END IF;
END $$;

-- 1.2 scenes_planned -> planned_scenes
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_attribute
    WHERE attrelid = 'production_diary_entries'::regclass
      AND attname = 'scenes_planned' AND NOT attisdropped
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_attribute
    WHERE attrelid = 'production_diary_entries'::regclass
      AND attname = 'planned_scenes' AND NOT attisdropped
  ) THEN
    ALTER TABLE production_diary_entries RENAME COLUMN scenes_planned TO planned_scenes;
  END IF;
END $$;

-- 1.3 scenes_completed -> filmed_scenes
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_attribute
    WHERE attrelid = 'production_diary_entries'::regclass
      AND attname = 'scenes_completed' AND NOT attisdropped
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_attribute
    WHERE attrelid = 'production_diary_entries'::regclass
      AND attname = 'filmed_scenes' AND NOT attisdropped
  ) THEN
    ALTER TABLE production_diary_entries RENAME COLUMN scenes_completed TO filmed_scenes;
  END IF;
END $$;

-- 1.4 takes_count -> total_takes
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_attribute
    WHERE attrelid = 'production_diary_entries'::regclass
      AND attname = 'takes_count' AND NOT attisdropped
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_attribute
    WHERE attrelid = 'production_diary_entries'::regclass
      AND attname = 'total_takes' AND NOT attisdropped
  ) THEN
    ALTER TABLE production_diary_entries RENAME COLUMN takes_count TO total_takes;
  END IF;
END $$;

-- 1.5 notes -> observations
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_attribute
    WHERE attrelid = 'production_diary_entries'::regclass
      AND attname = 'notes' AND NOT attisdropped
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_attribute
    WHERE attrelid = 'production_diary_entries'::regclass
      AND attname = 'observations' AND NOT attisdropped
  ) THEN
    ALTER TABLE production_diary_entries RENAME COLUMN notes TO observations;
  END IF;
END $$;

-- 1.6 problems -> issues
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_attribute
    WHERE attrelid = 'production_diary_entries'::regclass
      AND attname = 'problems' AND NOT attisdropped
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_attribute
    WHERE attrelid = 'production_diary_entries'::regclass
      AND attname = 'issues' AND NOT attisdropped
  ) THEN
    ALTER TABLE production_diary_entries RENAME COLUMN problems TO issues;
  END IF;
END $$;

-- =============================================================================
-- 2. RENAME COLUMN em production_diary_photos (2 renames)
-- =============================================================================

-- 2.1 diary_entry_id -> entry_id
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_attribute
    WHERE attrelid = 'production_diary_photos'::regclass
      AND attname = 'diary_entry_id' AND NOT attisdropped
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_attribute
    WHERE attrelid = 'production_diary_photos'::regclass
      AND attname = 'entry_id' AND NOT attisdropped
  ) THEN
    ALTER TABLE production_diary_photos RENAME COLUMN diary_entry_id TO entry_id;
  END IF;
END $$;

-- 2.2 file_url -> url
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_attribute
    WHERE attrelid = 'production_diary_photos'::regclass
      AND attname = 'file_url' AND NOT attisdropped
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_attribute
    WHERE attrelid = 'production_diary_photos'::regclass
      AND attname = 'url' AND NOT attisdropped
  ) THEN
    ALTER TABLE production_diary_photos RENAME COLUMN file_url TO url;
  END IF;
END $$;

-- =============================================================================
-- 3. ADD COLUMN em production_diary_entries (12 novas colunas)
--    Todas idempotentes via verificacao pg_attribute.
-- =============================================================================

-- 3.1 shooting_date_id (FK para job_shooting_dates)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_attribute
    WHERE attrelid = 'production_diary_entries'::regclass
      AND attname = 'shooting_date_id' AND NOT attisdropped
  ) THEN
    ALTER TABLE production_diary_entries
      ADD COLUMN shooting_date_id UUID
      REFERENCES job_shooting_dates(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 3.2 location
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_attribute
    WHERE attrelid = 'production_diary_entries'::regclass
      AND attname = 'location' AND NOT attisdropped
  ) THEN
    ALTER TABLE production_diary_entries ADD COLUMN location TEXT;
  END IF;
END $$;

-- 3.3 filming_start_time
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_attribute
    WHERE attrelid = 'production_diary_entries'::regclass
      AND attname = 'filming_start_time' AND NOT attisdropped
  ) THEN
    ALTER TABLE production_diary_entries ADD COLUMN filming_start_time TEXT;
  END IF;
END $$;

-- 3.4 lunch_time
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_attribute
    WHERE attrelid = 'production_diary_entries'::regclass
      AND attname = 'lunch_time' AND NOT attisdropped
  ) THEN
    ALTER TABLE production_diary_entries ADD COLUMN lunch_time TEXT;
  END IF;
END $$;

-- 3.5 scenes_list (JSONB array de cenas)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_attribute
    WHERE attrelid = 'production_diary_entries'::regclass
      AND attname = 'scenes_list' AND NOT attisdropped
  ) THEN
    ALTER TABLE production_diary_entries
      ADD COLUMN scenes_list JSONB NOT NULL DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- 3.6 day_status
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_attribute
    WHERE attrelid = 'production_diary_entries'::regclass
      AND attname = 'day_status' AND NOT attisdropped
  ) THEN
    ALTER TABLE production_diary_entries ADD COLUMN day_status TEXT;
  END IF;
END $$;

-- 3.7 executive_summary
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_attribute
    WHERE attrelid = 'production_diary_entries'::regclass
      AND attname = 'executive_summary' AND NOT attisdropped
  ) THEN
    ALTER TABLE production_diary_entries ADD COLUMN executive_summary TEXT;
  END IF;
END $$;

-- 3.8 attendance_list (JSONB array de presenca)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_attribute
    WHERE attrelid = 'production_diary_entries'::regclass
      AND attname = 'attendance_list' AND NOT attisdropped
  ) THEN
    ALTER TABLE production_diary_entries
      ADD COLUMN attendance_list JSONB NOT NULL DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- 3.9 equipment_list (JSONB array de equipamentos)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_attribute
    WHERE attrelid = 'production_diary_entries'::regclass
      AND attname = 'equipment_list' AND NOT attisdropped
  ) THEN
    ALTER TABLE production_diary_entries
      ADD COLUMN equipment_list JSONB NOT NULL DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- 3.10 next_steps
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_attribute
    WHERE attrelid = 'production_diary_entries'::regclass
      AND attname = 'next_steps' AND NOT attisdropped
  ) THEN
    ALTER TABLE production_diary_entries ADD COLUMN next_steps TEXT;
  END IF;
END $$;

-- 3.11 director_signature
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_attribute
    WHERE attrelid = 'production_diary_entries'::regclass
      AND attname = 'director_signature' AND NOT attisdropped
  ) THEN
    ALTER TABLE production_diary_entries ADD COLUMN director_signature TEXT;
  END IF;
END $$;

-- 3.12 updated_by (FK para profiles)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_attribute
    WHERE attrelid = 'production_diary_entries'::regclass
      AND attname = 'updated_by' AND NOT attisdropped
  ) THEN
    ALTER TABLE production_diary_entries
      ADD COLUMN updated_by UUID
      REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- =============================================================================
-- 4. ADD COLUMN em production_diary_photos (3 novas colunas)
-- =============================================================================

-- 4.1 thumbnail_url
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_attribute
    WHERE attrelid = 'production_diary_photos'::regclass
      AND attname = 'thumbnail_url' AND NOT attisdropped
  ) THEN
    ALTER TABLE production_diary_photos ADD COLUMN thumbnail_url TEXT;
  END IF;
END $$;

-- 4.2 taken_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_attribute
    WHERE attrelid = 'production_diary_photos'::regclass
      AND attname = 'taken_at' AND NOT attisdropped
  ) THEN
    ALTER TABLE production_diary_photos ADD COLUMN taken_at TIMESTAMPTZ;
  END IF;
END $$;

-- 4.3 uploaded_by (FK para profiles)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_attribute
    WHERE attrelid = 'production_diary_photos'::regclass
      AND attname = 'uploaded_by' AND NOT attisdropped
  ) THEN
    ALTER TABLE production_diary_photos
      ADD COLUMN uploaded_by UUID
      REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- =============================================================================
-- 5. CHECK CONSTRAINTS
--    Drop + recreate para garantir idempotencia e valores corretos.
-- =============================================================================

-- 5.1 weather_condition: valores validos em portugues
--     (dropar constraint antiga que referenciava coluna 'weather' se existir)
ALTER TABLE production_diary_entries
  DROP CONSTRAINT IF EXISTS chk_diary_weather_condition;

ALTER TABLE production_diary_entries
  ADD CONSTRAINT chk_diary_weather_condition CHECK (
    weather_condition IS NULL
    OR weather_condition IN ('sol', 'nublado', 'chuva', 'noturna', 'indoor')
  );

-- 5.2 day_status: status do dia em relacao ao cronograma
ALTER TABLE production_diary_entries
  DROP CONSTRAINT IF EXISTS chk_diary_day_status;

ALTER TABLE production_diary_entries
  ADD CONSTRAINT chk_diary_day_status CHECK (
    day_status IS NULL
    OR day_status IN ('no_cronograma', 'adiantado', 'atrasado')
  );

-- 5.3 executive_summary: maximo 2000 caracteres
ALTER TABLE production_diary_entries
  DROP CONSTRAINT IF EXISTS chk_diary_executive_summary_length;

ALTER TABLE production_diary_entries
  ADD CONSTRAINT chk_diary_executive_summary_length CHECK (
    executive_summary IS NULL
    OR length(executive_summary) <= 2000
  );

-- 5.4 filming_start_time: formato HH:MM
ALTER TABLE production_diary_entries
  DROP CONSTRAINT IF EXISTS chk_diary_filming_start_time_format;

ALTER TABLE production_diary_entries
  ADD CONSTRAINT chk_diary_filming_start_time_format CHECK (
    filming_start_time IS NULL
    OR filming_start_time ~ '^\d{2}:\d{2}$'
  );

-- 5.5 lunch_time: formato HH:MM
ALTER TABLE production_diary_entries
  DROP CONSTRAINT IF EXISTS chk_diary_lunch_time_format;

ALTER TABLE production_diary_entries
  ADD CONSTRAINT chk_diary_lunch_time_format CHECK (
    lunch_time IS NULL
    OR lunch_time ~ '^\d{2}:\d{2}$'
  );

-- =============================================================================
-- 6. photo_type CHECK: ingles -> portugues
--    Dropar constraint existente, migrar dados, recriar com valores PT-BR.
-- =============================================================================

-- 6.1 Dropar constraint antiga
ALTER TABLE production_diary_photos
  DROP CONSTRAINT IF EXISTS chk_diary_photo_type;

-- 6.2 Migrar valores existentes de ingles para portugues
--     (noop se nao houver dados ou se ja estiverem em portugues)
UPDATE production_diary_photos
  SET photo_type = CASE photo_type
    WHEN 'reference'   THEN 'referencia'
    WHEN 'continuity'  THEN 'continuidade'
    WHEN 'problem'     THEN 'problema'
    ELSE photo_type  -- 'bts' permanece 'bts'
  END
  WHERE photo_type IN ('reference', 'continuity', 'problem');

-- 6.3 Recriar constraint com valores em portugues
ALTER TABLE production_diary_photos
  ADD CONSTRAINT chk_diary_photo_type CHECK (
    photo_type IN ('referencia', 'bts', 'continuidade', 'problema')
  );

-- =============================================================================
-- 7. Indice novo em shooting_date_id (parcial: exclui nulos e soft-deleted)
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_production_diary_entries_shooting_date_id
  ON production_diary_entries(shooting_date_id)
  WHERE shooting_date_id IS NOT NULL AND deleted_at IS NULL;

-- =============================================================================
-- 8. Comentarios nas novas colunas e colunas renomeadas
-- =============================================================================

COMMENT ON COLUMN production_diary_entries.weather_condition
  IS 'Condicao climatica do dia: sol, nublado, chuva, noturna (filmagem noturna), indoor (estudio/locacao fechada).';
COMMENT ON COLUMN production_diary_entries.planned_scenes
  IS 'Descricao das cenas planejadas para o dia conforme ordem do dia.';
COMMENT ON COLUMN production_diary_entries.filmed_scenes
  IS 'Descricao das cenas efetivamente filmadas no dia.';
COMMENT ON COLUMN production_diary_entries.total_takes
  IS 'Numero total de takes realizados no dia.';
COMMENT ON COLUMN production_diary_entries.observations
  IS 'Observacoes gerais do dia de filmagem.';
COMMENT ON COLUMN production_diary_entries.issues
  IS 'Problemas encontrados durante a filmagem: equipamento, clima, logistica, etc.';

COMMENT ON COLUMN production_diary_entries.shooting_date_id
  IS 'Referencia ao registro de data de filmagem em job_shooting_dates. Permite vincular o diario a uma data agendada.';
COMMENT ON COLUMN production_diary_entries.location
  IS 'Local/endereco da filmagem no dia.';
COMMENT ON COLUMN production_diary_entries.filming_start_time
  IS 'Horario de inicio efetivo da filmagem (formato HH:MM). Diferente de call_time que e o horario de chamada.';
COMMENT ON COLUMN production_diary_entries.lunch_time
  IS 'Horario do almoco/refeicao no set (formato HH:MM).';
COMMENT ON COLUMN production_diary_entries.scenes_list
  IS 'Array JSONB com detalhes de cada cena: [{scene_number, description, status, takes, observations}].';
COMMENT ON COLUMN production_diary_entries.day_status
  IS 'Status do dia em relacao ao cronograma: no_cronograma, adiantado, atrasado.';
COMMENT ON COLUMN production_diary_entries.executive_summary
  IS 'Resumo executivo do dia para gestores e clientes (max 2000 chars).';
COMMENT ON COLUMN production_diary_entries.attendance_list
  IS 'Array JSONB com lista de presenca: [{name, role, arrived_at, left_at}].';
COMMENT ON COLUMN production_diary_entries.equipment_list
  IS 'Array JSONB com equipamentos utilizados: [{name, quantity, condition, notes}].';
COMMENT ON COLUMN production_diary_entries.next_steps
  IS 'Proximos passos planejados para o dia seguinte ou acoes pendentes.';
COMMENT ON COLUMN production_diary_entries.director_signature
  IS 'Assinatura digital do diretor (texto ou referencia a imagem).';
COMMENT ON COLUMN production_diary_entries.updated_by
  IS 'Profile do ultimo usuario que editou o registro.';

COMMENT ON COLUMN production_diary_photos.thumbnail_url
  IS 'URL da versao thumbnail da foto (gerada automaticamente).';
COMMENT ON COLUMN production_diary_photos.taken_at
  IS 'Data/hora em que a foto foi tirada (EXIF ou manual).';
COMMENT ON COLUMN production_diary_photos.uploaded_by
  IS 'Profile do usuario que fez o upload da foto.';

-- Atualizar comentario da coluna renomeada url (antes file_url)
COMMENT ON COLUMN production_diary_photos.url
  IS 'URL publica ou assinada do arquivo da foto.';
-- Atualizar comentario da coluna renomeada entry_id (antes diary_entry_id)
COMMENT ON COLUMN production_diary_photos.entry_id
  IS 'Referencia ao registro do diario (production_diary_entries) ao qual esta foto pertence.';

-- =============================================================================
-- FIM da migration — Onda 2.3 Extensao do Diario de Producao v2
--
-- Resumo:
--   RENAME COLUMN: 8 (entries: 6, photos: 2)
--   ADD COLUMN: 15 (entries: 12, photos: 3)
--   CHECK CONSTRAINTS: 5 novos + 1 recriado (photo_type)
--   DATA MIGRATION: photo_type ingles -> portugues
--   INDICES: 1 novo (shooting_date_id parcial)
--   COMENTARIOS: 19 (13 entries + 6 photos)
--   Total: 32 operacoes
-- =============================================================================
