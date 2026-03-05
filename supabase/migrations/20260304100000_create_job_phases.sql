-- ============================================================
-- Migration: Cronograma/Timeline — tabela job_phases
-- Cada job tem ~8 fases de producao com datas e status
-- Tambem adiciona logo_url em clients e agencies
-- ============================================================

SET search_path TO public;

-- ============================================================
-- ALTER: adicionar logo_url em clients e agencies
-- ============================================================

ALTER TABLE clients ADD COLUMN IF NOT EXISTS logo_url TEXT;
COMMENT ON COLUMN clients.logo_url IS 'URL do logo do cliente (usado no PDF do cronograma e materiais)';

ALTER TABLE agencies ADD COLUMN IF NOT EXISTS logo_url TEXT;
COMMENT ON COLUMN agencies.logo_url IS 'URL do logo da agencia (usado no PDF do cronograma e materiais)';

-- ============================================================
-- Tabela: job_phases (fases do cronograma de producao)
-- ============================================================

CREATE TABLE IF NOT EXISTS job_phases (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  job_id        UUID        NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,

  -- Identificacao da fase
  phase_key     TEXT        NOT NULL,
  phase_label   TEXT        NOT NULL,
  phase_emoji   TEXT,
  phase_color   TEXT,

  -- Datas
  start_date    DATE,
  end_date      DATE,

  -- Anotacao livre (ex: "Aprovacao 10hrs", "Somente manha")
  complement    TEXT,

  -- Configuracao
  skip_weekends BOOLEAN     NOT NULL DEFAULT false,
  status        TEXT        NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_progress', 'completed')),
  sort_order    INTEGER     NOT NULL DEFAULT 0,

  -- Controle
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at    TIMESTAMPTZ
);

-- CHECK: end_date >= start_date (quando ambas preenchidas)
ALTER TABLE job_phases ADD CONSTRAINT chk_job_phases_date_range
  CHECK (start_date IS NULL OR end_date IS NULL OR end_date >= start_date);

-- CHECK: phase_color e hex valido (quando preenchido)
ALTER TABLE job_phases ADD CONSTRAINT chk_job_phases_color_hex
  CHECK (phase_color IS NULL OR phase_color ~ '^#[0-9A-Fa-f]{6}$');

-- UNIQUE: um phase_key por job (soft delete safe)
CREATE UNIQUE INDEX IF NOT EXISTS idx_job_phases_job_phase_key
  ON job_phases(job_id, phase_key) WHERE deleted_at IS NULL;

-- Indexes em foreign keys
CREATE INDEX IF NOT EXISTS idx_job_phases_tenant_id ON job_phases(tenant_id);
CREATE INDEX IF NOT EXISTS idx_job_phases_job_id ON job_phases(job_id) WHERE deleted_at IS NULL;

-- Comentarios
COMMENT ON COLUMN job_phases.phase_key IS 'Chave unica da fase: orcamento, briefing, pre_producao, ppm, filmagem, pos_producao, finalizacao, entrega';
COMMENT ON COLUMN job_phases.phase_emoji IS 'Emoji representativo da fase (ex: U+1F4B0, U+1F3AC)';
COMMENT ON COLUMN job_phases.complement IS 'Anotacao livre sobre a fase (ex: horario de aprovacao, observacoes)';
COMMENT ON COLUMN job_phases.skip_weekends IS 'Se true, o calculo de dias uteis pula sabados e domingos';

-- ============================================================
-- Trigger: updated_at automatico
-- ============================================================

DROP TRIGGER IF EXISTS trg_job_phases_updated_at ON job_phases;
CREATE TRIGGER trg_job_phases_updated_at
  BEFORE UPDATE ON job_phases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- RLS: job_phases — isolamento por tenant
-- ============================================================

ALTER TABLE job_phases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS job_phases_select ON job_phases;
CREATE POLICY job_phases_select ON job_phases
  FOR SELECT TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()));

DROP POLICY IF EXISTS job_phases_insert ON job_phases;
CREATE POLICY job_phases_insert ON job_phases
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = (SELECT get_tenant_id()));

DROP POLICY IF EXISTS job_phases_update ON job_phases;
CREATE POLICY job_phases_update ON job_phases
  FOR UPDATE TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()))
  WITH CHECK (tenant_id = (SELECT get_tenant_id()));

DROP POLICY IF EXISTS job_phases_delete ON job_phases;
CREATE POLICY job_phases_delete ON job_phases
  FOR DELETE TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()));

-- ============================================================
-- Referencia: fases default para inserir via aplicacao
-- ============================================================
-- sort_order | emoji | phase_key      | phase_label            | phase_color
-- 0          | U+1F4B0 | orcamento      | Orcamento              | #F59E0B (amber)
-- 1          | U+1F5D3 | briefing       | Reuniao de Briefing    | #8B5CF6 (violet)
-- 2          | U+1F4CB | pre_producao   | Pre-Producao           | #3B82F6 (blue)
-- 3          | U+1F4C5 | ppm            | PPM                    | #06B6D4 (cyan)
-- 4          | U+1F3AC | filmagem       | Filmagem               | #EF4444 (red)
-- 5          | U+2702  | pos_producao   | Pos-Producao           | #F97316 (orange)
-- 6          | U+1F3A8 | finalizacao    | Finalizacao            | #EC4899 (pink)
-- 7          | U+1F3C1 | entrega        | Entrega                | #10B981 (emerald)
