-- =============================================================================
-- Migration: T3.5 — Controle de Horas Extras
-- Data: 2026-03-03
--
-- Contexto:
--   Registro de ponto (check-in/check-out) para membros da equipe de cada job.
--   O sistema calcula automaticamente horas totais trabalhadas e horas extras
--   (acima de 8h/dia) via generated columns stored.
--
--   overtime_hours: horas acima de 8h na jornada do dia.
--   overtime_rate: valor acordado para 1h extra (definido por entrada).
--
-- Novas tabelas: time_entries
-- =============================================================================

SET search_path TO public;

-- -------------------------------------------------------
-- 1. Tabela time_entries
-- -------------------------------------------------------

CREATE TABLE IF NOT EXISTS time_entries (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID          NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  job_id            UUID          NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  team_member_id    UUID          NOT NULL REFERENCES job_team(id) ON DELETE CASCADE,

  -- Ponto
  entry_date        DATE          NOT NULL,
  check_in          TIME          NOT NULL,
  check_out         TIME,
  break_minutes     INT           NOT NULL DEFAULT 60,

  -- Horas calculadas (generated columns stored)
  total_hours       NUMERIC(5,2)  GENERATED ALWAYS AS (
    CASE
      WHEN check_out IS NOT NULL THEN
        GREATEST(
          ROUND(
            (EXTRACT(EPOCH FROM (check_out - check_in)) / 3600.0
             - (break_minutes::numeric / 60.0))::numeric,
            2
          ),
          0.0
        )
      ELSE NULL
    END
  ) STORED,

  overtime_hours    NUMERIC(5,2)  GENERATED ALWAYS AS (
    CASE
      WHEN check_out IS NOT NULL AND
           (EXTRACT(EPOCH FROM (check_out - check_in)) / 3600.0
            - (break_minutes::numeric / 60.0)) > 8.0 THEN
        ROUND(
          ((EXTRACT(EPOCH FROM (check_out - check_in)) / 3600.0
            - (break_minutes::numeric / 60.0)) - 8.0)::numeric,
          2
        )
      ELSE 0.0
    END
  ) STORED,

  -- Valor da hora extra acordado (por lancamento — pode variar por membro/data)
  overtime_rate     NUMERIC(12,2) NOT NULL DEFAULT 0,

  -- Observacoes e aprovacao
  notes             TEXT,
  approved_by       UUID          REFERENCES profiles(id) ON DELETE SET NULL,
  approved_at       TIMESTAMPTZ,

  -- Auditoria
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT now(),
  deleted_at        TIMESTAMPTZ,

  -- Unicidade: um membro so tem um lancamento por data/job/tenant
  CONSTRAINT uq_time_entry_member_date UNIQUE (job_id, team_member_id, entry_date, tenant_id),

  -- Constraints
  CONSTRAINT chk_time_entry_break_positive CHECK (
    break_minutes >= 0
  ),
  CONSTRAINT chk_time_entry_overtime_rate_positive CHECK (
    overtime_rate >= 0
  ),
  CONSTRAINT chk_time_entry_checkout_after_checkin CHECK (
    check_out IS NULL OR check_out > check_in
  ),
  CONSTRAINT chk_time_entry_approval_consistent CHECK (
    (approved_by IS NULL AND approved_at IS NULL)
    OR (approved_by IS NOT NULL AND approved_at IS NOT NULL)
  )
);

-- -------------------------------------------------------
-- 2. Comentarios em colunas nao obvias
-- -------------------------------------------------------

COMMENT ON TABLE time_entries IS 'Registro de ponto (check-in/check-out) para membros da equipe de cada job. Calcula horas extras automaticamente.';
COMMENT ON COLUMN time_entries.team_member_id IS 'FK para job_team(id) — identifica o membro da equipe do job especifico.';
COMMENT ON COLUMN time_entries.entry_date IS 'Data do lancamento. Junto com team_member_id e job_id forma a chave unica de ponto.';
COMMENT ON COLUMN time_entries.check_in IS 'Horario de entrada (inicio da jornada). Formato HH:MM:SS.';
COMMENT ON COLUMN time_entries.check_out IS 'Horario de saida (fim da jornada). NULL significa que o membro ainda esta no set.';
COMMENT ON COLUMN time_entries.break_minutes IS 'Minutos de intervalo (almoco/descanso) a descontar da jornada. Default: 60 min.';
COMMENT ON COLUMN time_entries.total_hours IS 'GENERATED: total de horas trabalhadas = (check_out - check_in) em horas - break_minutes/60. NULL se check_out ausente.';
COMMENT ON COLUMN time_entries.overtime_hours IS 'GENERATED: horas extras = MAX(0, total_hours - 8). Zero se total <= 8h. NULL impossivel — retorna 0 se check_out ausente.';
COMMENT ON COLUMN time_entries.overtime_rate IS 'Valor acordado por hora extra em BRL para este lancamento especifico. Permite variar por membro.';
COMMENT ON COLUMN time_entries.approved_by IS 'UUID do usuario que aprovou o lancamento de HE. NULL = nao aprovado ainda.';
COMMENT ON COLUMN time_entries.approved_at IS 'Timestamp da aprovacao. Deve ser preenchido junto com approved_by.';

-- -------------------------------------------------------
-- 3. Indices
-- -------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_time_entries_tenant
  ON time_entries(tenant_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_time_entries_job
  ON time_entries(job_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_time_entries_job_date
  ON time_entries(job_id, entry_date) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_time_entries_team_member
  ON time_entries(team_member_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_time_entries_job_member
  ON time_entries(job_id, team_member_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_time_entries_approved
  ON time_entries(job_id, approved_by)
  WHERE approved_by IS NOT NULL AND deleted_at IS NULL;

-- -------------------------------------------------------
-- 4. Trigger updated_at
-- -------------------------------------------------------

DROP TRIGGER IF EXISTS trg_time_entries_updated_at ON time_entries;
CREATE TRIGGER trg_time_entries_updated_at
  BEFORE UPDATE ON time_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- -------------------------------------------------------
-- 5. RLS: time_entries (tenant isolation)
-- -------------------------------------------------------

ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;

-- SELECT: qualquer usuario autenticado ve lancamentos do seu tenant
DROP POLICY IF EXISTS time_entries_select_tenant ON time_entries;
CREATE POLICY time_entries_select_tenant ON time_entries
  FOR SELECT TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()));

-- INSERT: qualquer usuario autenticado insere no seu tenant
DROP POLICY IF EXISTS time_entries_insert_tenant ON time_entries;
CREATE POLICY time_entries_insert_tenant ON time_entries
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = (SELECT get_tenant_id()));

-- UPDATE: qualquer usuario autenticado atualiza no seu tenant
DROP POLICY IF EXISTS time_entries_update_tenant ON time_entries;
CREATE POLICY time_entries_update_tenant ON time_entries
  FOR UPDATE TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()))
  WITH CHECK (tenant_id = (SELECT get_tenant_id()));

-- DELETE fisico: SEM policy — delecao fisica bloqueada. Usar soft delete (deleted_at).

-- -------------------------------------------------------
-- 6. Verificacao de isolamento de tenant (teste mental)
-- -------------------------------------------------------
-- time_entries:
--   SELECT: tenant_id = get_tenant_id() -> Tenant A NAO ve lancamentos do Tenant B. OK.
--   INSERT: WITH CHECK -> So insere com seu proprio tenant_id. OK.
--   UPDATE: USING + WITH CHECK duplo -> So atualiza registros do seu tenant. OK.
--   DELETE fisico: SEM policy -> bloqueado para todos. Usar soft delete. OK.

-- =============================================================================
-- FIM da migration — T3.5 Controle de Horas Extras
-- Novas tabelas: time_entries (total: +1)
-- Indices: 6 (tenant, job, job+date, team_member, job+member, job+approved)
-- RLS: 3 policies (SELECT, INSERT, UPDATE)
-- Triggers: 1 (updated_at)
-- Constraints: 5 (break positive, rate positive, checkout after checkin, approval consistent, UNIQUE member+date)
-- Generated columns: 2 (total_hours, overtime_hours — STORED)
-- =============================================================================
