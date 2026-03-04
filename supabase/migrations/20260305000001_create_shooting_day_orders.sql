-- Ordem do Dia (OD) — documento de producao com timeline, equipe, elenco e blocos de filmagem
-- Cada registro representa uma OD gerada para um dia de filmagem especifico de um job
SET search_path TO public;

CREATE TABLE IF NOT EXISTS shooting_day_orders (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  job_id            UUID        NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  shooting_date_id  UUID        REFERENCES job_shooting_dates(id) ON DELETE SET NULL,

  -- Metadata
  title             TEXT        NOT NULL DEFAULT '',
  day_number        INT,
  general_location  TEXT,
  weather_summary   TEXT,
  weather_data      JSONB,

  -- Timeline (TEXT "HH:MM" — evita problemas de timezone)
  first_call        TEXT,
  production_call   TEXT,
  filming_start     TEXT,
  breakfast_time    TEXT,
  lunch_time        TEXT,
  camera_wrap       TEXT,
  deproduction      TEXT,

  -- Dados estruturados (JSONB arrays)
  crew_calls        JSONB       DEFAULT '[]'::jsonb,
  -- formato: [{ department: "Producao", call_time: "04:45" }, ...]
  filming_blocks    JSONB       DEFAULT '[]'::jsonb,
  -- formato: [{ start_time, end_time, scene_ids: uuid[], scenes_label, location, cast_names, notes, adjustment_minutes }, ...]
  cast_schedule     JSONB       DEFAULT '[]'::jsonb,
  -- formato: [{ cast_id, name, character, call_time, makeup_time, on_set_time, wrap_time }, ...]
  important_info    TEXT        DEFAULT '',

  -- Template & Status
  pdf_template      TEXT        NOT NULL DEFAULT 'classico'
    CHECK (pdf_template IN ('classico', 'moderno')),
  status            TEXT        NOT NULL DEFAULT 'rascunho'
    CHECK (status IN ('rascunho', 'publicada', 'compartilhada')),
  pdf_url           TEXT,
  shared_at         TIMESTAMPTZ,

  -- Controle
  created_by        UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_shooting_day_orders_tenant ON shooting_day_orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_shooting_day_orders_job ON shooting_day_orders(job_id);
CREATE INDEX IF NOT EXISTS idx_shooting_day_orders_shooting_date ON shooting_day_orders(shooting_date_id);

-- updated_at trigger
DROP TRIGGER IF EXISTS trg_shooting_day_orders_updated_at ON shooting_day_orders;
CREATE TRIGGER trg_shooting_day_orders_updated_at
  BEFORE UPDATE ON shooting_day_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE shooting_day_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS shooting_day_orders_select ON shooting_day_orders;
CREATE POLICY shooting_day_orders_select ON shooting_day_orders
  FOR SELECT TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()));

DROP POLICY IF EXISTS shooting_day_orders_insert ON shooting_day_orders;
CREATE POLICY shooting_day_orders_insert ON shooting_day_orders
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = (SELECT get_tenant_id()));

DROP POLICY IF EXISTS shooting_day_orders_update ON shooting_day_orders;
CREATE POLICY shooting_day_orders_update ON shooting_day_orders
  FOR UPDATE TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()))
  WITH CHECK (tenant_id = (SELECT get_tenant_id()));

DROP POLICY IF EXISTS shooting_day_orders_delete ON shooting_day_orders;
CREATE POLICY shooting_day_orders_delete ON shooting_day_orders
  FOR DELETE TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()));

COMMENT ON TABLE shooting_day_orders IS 'Ordem do Dia — documento de producao com timeline, chamadas de equipe, blocos de filmagem e escala de elenco';
COMMENT ON COLUMN shooting_day_orders.crew_calls IS 'Array JSONB: [{ department, call_time }]';
COMMENT ON COLUMN shooting_day_orders.filming_blocks IS 'Array JSONB: [{ start_time, end_time, scene_ids, scenes_label, location, cast_names, notes, adjustment_minutes }]';
COMMENT ON COLUMN shooting_day_orders.cast_schedule IS 'Array JSONB: [{ cast_id, name, character, call_time, makeup_time, on_set_time, wrap_time }]';
COMMENT ON COLUMN shooting_day_orders.weather_data IS 'Cache do retorno da API de clima (OpenWeather) para o dia/local';
COMMENT ON COLUMN shooting_day_orders.pdf_template IS 'Template de exportacao PDF: classico (tabular) ou moderno (visual)';

-- OD settings are stored in tenants.settings JSONB at path:
-- settings.od_settings = {
--   safety_text: TEXT (default safety/important info),
--   default_departments: TEXT[] (default department list for crew calls)
-- }
-- No schema change needed — tenants.settings already exists as JSONB.
