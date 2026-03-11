-- ============================================================
-- Migration: Job Workflow Steps — ciclo de aprovacao pre-producao
-- 16 fases por job (ERPNext legacy) com sub-ciclos OBJ/LOC/FIG
-- Cada sub-ciclo: Solicitacao → Aprovacao → Compra → Conferencia
-- Conferencia exige evidencia (foto/NF/recibo) para concluir
-- ============================================================

SET search_path TO public;

-- ============================================================
-- Tabela: job_workflow_steps (passos do workflow de cada job)
-- ============================================================

CREATE TABLE IF NOT EXISTS job_workflow_steps (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID          NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  job_id            UUID          NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,

  -- Identificacao do passo
  step_key          TEXT          NOT NULL,
  step_label        TEXT          NOT NULL,
  category          TEXT          NOT NULL
    CHECK (category IN ('vendas', 'producao', 'objetos', 'locacao', 'figurino', 'pos', 'qa', 'entrega')),
  step_type         TEXT          NOT NULL DEFAULT 'geral'
    CHECK (step_type IN ('geral', 'solicitacao', 'aprovacao', 'compra', 'conferencia')),
  sort_order        INTEGER       NOT NULL DEFAULT 0,

  -- Status do passo
  status            TEXT          NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped', 'blocked', 'rejected')),

  -- Atribuicao
  assigned_to       UUID          REFERENCES profiles(id) ON DELETE SET NULL,

  -- Dados de aprovacao
  approved_by       UUID          REFERENCES profiles(id) ON DELETE SET NULL,
  approved_at       TIMESTAMPTZ,
  rejection_reason  TEXT,

  -- Valores financeiros
  estimated_value   NUMERIC(14,2),
  actual_value      NUMERIC(14,2),

  -- Notas e observacoes
  notes             TEXT,

  -- Datas do ciclo de vida
  started_at        TIMESTAMPTZ,
  completed_at      TIMESTAMPTZ,

  -- Controle
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT now(),
  deleted_at        TIMESTAMPTZ
);

-- UNIQUE: um step_key por job (soft delete safe)
CREATE UNIQUE INDEX IF NOT EXISTS idx_wf_steps_job_step_key
  ON job_workflow_steps(job_id, step_key) WHERE deleted_at IS NULL;

-- Indices em foreign keys
CREATE INDEX IF NOT EXISTS idx_wf_steps_tenant_id ON job_workflow_steps(tenant_id);
CREATE INDEX IF NOT EXISTS idx_wf_steps_job_id ON job_workflow_steps(job_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_wf_steps_assigned_to ON job_workflow_steps(assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_wf_steps_approved_by ON job_workflow_steps(approved_by) WHERE approved_by IS NOT NULL;

-- Index para queries de dashboard: steps pendentes/em andamento por tenant
CREATE INDEX IF NOT EXISTS idx_wf_steps_status ON job_workflow_steps(tenant_id, status)
  WHERE deleted_at IS NULL AND status IN ('pending', 'in_progress', 'blocked');

-- Comentarios
COMMENT ON TABLE job_workflow_steps IS 'Passos do workflow de producao de cada job — 16 fases com ciclo de aprovacao para OBJ/LOC/FIG';
COMMENT ON COLUMN job_workflow_steps.step_key IS 'Chave unica do passo: comercial, pre_producao, obj_solicitacao, obj_aprovacao, obj_compra, obj_conferencia, etc.';
COMMENT ON COLUMN job_workflow_steps.category IS 'Categoria do passo: vendas, producao, objetos, locacao, figurino, pos, qa, entrega';
COMMENT ON COLUMN job_workflow_steps.step_type IS 'Tipo do passo no ciclo: geral, solicitacao, aprovacao, compra, conferencia';
COMMENT ON COLUMN job_workflow_steps.status IS 'Estado: pending, in_progress, completed, skipped, blocked, rejected';
COMMENT ON COLUMN job_workflow_steps.assigned_to IS 'Responsavel pelo passo (membro da equipe do job)';
COMMENT ON COLUMN job_workflow_steps.approved_by IS 'Quem aprovou (preenchido em passos de aprovacao)';
COMMENT ON COLUMN job_workflow_steps.approved_at IS 'Data/hora da aprovacao';
COMMENT ON COLUMN job_workflow_steps.rejection_reason IS 'Motivo da rejeicao (preenchido quando status = rejected)';
COMMENT ON COLUMN job_workflow_steps.estimated_value IS 'Valor estimado na solicitacao (preenchido pelo solicitante)';
COMMENT ON COLUMN job_workflow_steps.actual_value IS 'Valor real da compra/aluguel (preenchido na fase de compra)';

-- ============================================================
-- Tabela: job_workflow_evidence (evidencias da conferencia)
-- ============================================================

CREATE TABLE IF NOT EXISTS job_workflow_evidence (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID          NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  workflow_step_id  UUID          NOT NULL REFERENCES job_workflow_steps(id) ON DELETE CASCADE,

  -- Dados do arquivo
  evidence_type     TEXT          NOT NULL
    CHECK (evidence_type IN ('foto', 'nota_fiscal', 'recibo', 'outro')),
  file_url          TEXT          NOT NULL,
  file_name         TEXT          NOT NULL,

  -- Quem enviou
  uploaded_by       UUID          REFERENCES profiles(id) ON DELETE SET NULL,

  -- Observacoes
  notes             TEXT,

  -- Controle
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- Indices em foreign keys
CREATE INDEX IF NOT EXISTS idx_wf_evidence_tenant_id ON job_workflow_evidence(tenant_id);
CREATE INDEX IF NOT EXISTS idx_wf_evidence_step_id ON job_workflow_evidence(workflow_step_id);
CREATE INDEX IF NOT EXISTS idx_wf_evidence_uploaded_by ON job_workflow_evidence(uploaded_by) WHERE uploaded_by IS NOT NULL;

-- Comentarios
COMMENT ON TABLE job_workflow_evidence IS 'Evidencias da fase de conferencia — fotos, NFs e recibos obrigatorios para fechar o passo';
COMMENT ON COLUMN job_workflow_evidence.evidence_type IS 'Tipo da evidencia: foto, nota_fiscal, recibo, outro';
COMMENT ON COLUMN job_workflow_evidence.file_url IS 'URL do arquivo no Storage (Supabase ou externo)';
COMMENT ON COLUMN job_workflow_evidence.file_name IS 'Nome original do arquivo enviado';

-- ============================================================
-- Triggers: updated_at automatico
-- ============================================================

DROP TRIGGER IF EXISTS trg_wf_steps_updated_at ON job_workflow_steps;
CREATE TRIGGER trg_wf_steps_updated_at
  BEFORE UPDATE ON job_workflow_steps
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- RLS: job_workflow_steps — isolamento por tenant
-- ============================================================

ALTER TABLE job_workflow_steps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS wf_steps_select ON job_workflow_steps;
CREATE POLICY wf_steps_select ON job_workflow_steps
  FOR SELECT TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()));

DROP POLICY IF EXISTS wf_steps_insert ON job_workflow_steps;
CREATE POLICY wf_steps_insert ON job_workflow_steps
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = (SELECT get_tenant_id()));

DROP POLICY IF EXISTS wf_steps_update ON job_workflow_steps;
CREATE POLICY wf_steps_update ON job_workflow_steps
  FOR UPDATE TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()))
  WITH CHECK (tenant_id = (SELECT get_tenant_id()));

DROP POLICY IF EXISTS wf_steps_delete ON job_workflow_steps;
CREATE POLICY wf_steps_delete ON job_workflow_steps
  FOR DELETE TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()));

-- ============================================================
-- RLS: job_workflow_evidence — isolamento por tenant
-- ============================================================

ALTER TABLE job_workflow_evidence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS wf_evidence_select ON job_workflow_evidence;
CREATE POLICY wf_evidence_select ON job_workflow_evidence
  FOR SELECT TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()));

DROP POLICY IF EXISTS wf_evidence_insert ON job_workflow_evidence;
CREATE POLICY wf_evidence_insert ON job_workflow_evidence
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = (SELECT get_tenant_id()));

DROP POLICY IF EXISTS wf_evidence_update ON job_workflow_evidence;
CREATE POLICY wf_evidence_update ON job_workflow_evidence
  FOR UPDATE TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()))
  WITH CHECK (tenant_id = (SELECT get_tenant_id()));

DROP POLICY IF EXISTS wf_evidence_delete ON job_workflow_evidence;
CREATE POLICY wf_evidence_delete ON job_workflow_evidence
  FOR DELETE TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()));

-- ============================================================
-- RPC: create_job_workflow_steps — insere os 16 passos padrao
-- Chamada apos criar um job ou sob demanda
-- SECURITY DEFINER para acessar tenant_id do JWT
-- Idempotente: nao duplica se ja existem steps
-- ============================================================

CREATE OR REPLACE FUNCTION create_job_workflow_steps(p_job_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_tenant_id UUID;
  v_existing  INTEGER;
BEGIN
  -- Obter tenant_id do JWT
  v_tenant_id := get_tenant_id();
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Tenant nao identificado no JWT';
  END IF;

  -- Verificar se o job pertence ao tenant
  IF NOT EXISTS (
    SELECT 1 FROM jobs WHERE id = p_job_id AND tenant_id = v_tenant_id
  ) THEN
    RAISE EXCEPTION 'Job nao encontrado ou nao pertence ao tenant';
  END IF;

  -- Idempotencia: nao duplicar se ja existem steps ativos
  SELECT COUNT(*) INTO v_existing
  FROM job_workflow_steps
  WHERE job_id = p_job_id AND tenant_id = v_tenant_id AND deleted_at IS NULL;

  IF v_existing > 0 THEN
    RETURN; -- Ja existem steps, nao duplicar
  END IF;

  -- Inserir os 16 passos padrao
  INSERT INTO job_workflow_steps (tenant_id, job_id, step_key, step_label, category, step_type, sort_order) VALUES
    -- 1. Comercial & Orcamento
    (v_tenant_id, p_job_id, 'comercial',          'Comercial & Orcamento',               'vendas',    'geral',        1),
    -- 2. Pre-producao (geral)
    (v_tenant_id, p_job_id, 'pre_producao',        'Pre-producao',                        'producao',  'geral',        2),
    -- 3-6. Objetos de cena (ciclo completo)
    (v_tenant_id, p_job_id, 'obj_solicitacao',     'OBJ - Solicitacao',                   'objetos',   'solicitacao',  3),
    (v_tenant_id, p_job_id, 'obj_aprovacao',       'OBJ - Aprovacao',                     'objetos',   'aprovacao',    4),
    (v_tenant_id, p_job_id, 'obj_compra',          'OBJ - Compra/Aluguel',                'objetos',   'compra',       5),
    (v_tenant_id, p_job_id, 'obj_conferencia',     'OBJ - Conferencia (Fotos/NF/Recibo)', 'objetos',   'conferencia',  6),
    -- 7-8. Locacao (ciclo curto)
    (v_tenant_id, p_job_id, 'loc_solicitacao',     'LOC - Solicitacao',                   'locacao',   'solicitacao',  7),
    (v_tenant_id, p_job_id, 'loc_aprovacao',       'LOC - Aprovacao para PPM',            'locacao',   'aprovacao',    8),
    -- 9-12. Figurino (ciclo completo)
    (v_tenant_id, p_job_id, 'fig_solicitacao',     'FIG - Solicitacao',                   'figurino',  'solicitacao',  9),
    (v_tenant_id, p_job_id, 'fig_aprovacao',       'FIG - Aprovacao',                     'figurino',  'aprovacao',   10),
    (v_tenant_id, p_job_id, 'fig_compra',          'FIG - Compra/Aluguel',                'figurino',  'compra',      11),
    (v_tenant_id, p_job_id, 'fig_conferencia',     'FIG - Conferencia (Fotos/NF/Recibo)', 'figurino',  'conferencia', 12),
    -- 13. Producao
    (v_tenant_id, p_job_id, 'producao',            'Producao',                            'producao',  'geral',       13),
    -- 14. Pos-producao
    (v_tenant_id, p_job_id, 'pos_producao',        'Pos-producao',                        'pos',       'geral',       14),
    -- 15. Qualidade & Aprovacao
    (v_tenant_id, p_job_id, 'qualidade_aprovacao', 'Qualidade & Aprovacao',               'qa',        'geral',       15),
    -- 16. Entrega & Encerramento
    (v_tenant_id, p_job_id, 'entrega_encerramento','Entrega & Encerramento',              'entrega',   'geral',       16);
END;
$$;

COMMENT ON FUNCTION create_job_workflow_steps(UUID) IS 'Cria os 16 passos padrao do workflow de producao para um job. Idempotente.';

-- ============================================================
-- Funcao: validate_workflow_step_transition
-- Valida regras de negocio antes de mudar status de um step
-- Retorna mensagem de erro ou NULL se valido
-- ============================================================

CREATE OR REPLACE FUNCTION validate_workflow_step_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_prev_step    RECORD;
  v_evidence_cnt INTEGER;
BEGIN
  -- Ignora soft deletes
  IF NEW.deleted_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- So validar quando status muda
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- REGRA 1: Passo de conferencia so pode completar com evidencia
  IF NEW.step_type = 'conferencia' AND NEW.status = 'completed' THEN
    SELECT COUNT(*) INTO v_evidence_cnt
    FROM job_workflow_evidence
    WHERE workflow_step_id = NEW.id;

    IF v_evidence_cnt = 0 THEN
      RAISE EXCEPTION 'Conferencia exige pelo menos 1 evidencia (foto/NF/recibo) para ser concluida';
    END IF;
  END IF;

  -- REGRA 2: Passos sequenciais — dentro da mesma categoria,
  -- o passo anterior deve estar completed ou skipped para iniciar
  IF NEW.status = 'in_progress' THEN
    SELECT * INTO v_prev_step
    FROM job_workflow_steps
    WHERE job_id = NEW.job_id
      AND category = NEW.category
      AND sort_order < NEW.sort_order
      AND deleted_at IS NULL
    ORDER BY sort_order DESC
    LIMIT 1;

    IF v_prev_step IS NOT NULL
      AND v_prev_step.status NOT IN ('completed', 'skipped')
    THEN
      RAISE EXCEPTION 'O passo anterior (%) deve estar concluido ou pulado antes de iniciar este',
        v_prev_step.step_label;
    END IF;
  END IF;

  -- REGRA 3: Aprovacao deve ter approved_by e approved_at
  IF NEW.step_type = 'aprovacao' AND NEW.status = 'completed' THEN
    IF NEW.approved_by IS NULL OR NEW.approved_at IS NULL THEN
      RAISE EXCEPTION 'Aprovacao exige approved_by e approved_at preenchidos';
    END IF;
  END IF;

  -- REGRA 4: Rejeicao deve ter motivo
  IF NEW.status = 'rejected' AND (NEW.rejection_reason IS NULL OR TRIM(NEW.rejection_reason) = '') THEN
    RAISE EXCEPTION 'Rejeicao exige motivo (rejection_reason)';
  END IF;

  -- REGRA 5: Ao rejeitar uma aprovacao, voltar o passo de solicitacao
  -- para in_progress (permite corrigir e resubmeter)
  IF NEW.step_type = 'aprovacao' AND NEW.status = 'rejected' THEN
    UPDATE job_workflow_steps
    SET status = 'in_progress',
        completed_at = NULL
    WHERE job_id = NEW.job_id
      AND category = NEW.category
      AND step_type = 'solicitacao'
      AND deleted_at IS NULL;
  END IF;

  -- Preencher timestamps automaticamente
  IF NEW.status = 'in_progress' AND NEW.started_at IS NULL THEN
    NEW.started_at := now();
  END IF;

  IF NEW.status IN ('completed', 'skipped') AND NEW.completed_at IS NULL THEN
    NEW.completed_at := now();
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION validate_workflow_step_transition() IS 'Trigger: valida transicoes de status no workflow — sequencia, evidencia obrigatoria, aprovacao, rejeicao';

DROP TRIGGER IF EXISTS trg_wf_steps_validate_transition ON job_workflow_steps;
CREATE TRIGGER trg_wf_steps_validate_transition
  BEFORE UPDATE ON job_workflow_steps
  FOR EACH ROW EXECUTE FUNCTION validate_workflow_step_transition();

-- ============================================================
-- Trigger audit_log (se tabela audit_log existir)
-- ============================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'fn_audit_log') THEN
    DROP TRIGGER IF EXISTS trg_wf_steps_audit ON job_workflow_steps;
    CREATE TRIGGER trg_wf_steps_audit
      AFTER INSERT OR UPDATE OR DELETE ON job_workflow_steps
      FOR EACH ROW EXECUTE FUNCTION fn_audit_log();

    DROP TRIGGER IF EXISTS trg_wf_evidence_audit ON job_workflow_evidence;
    CREATE TRIGGER trg_wf_evidence_audit
      AFTER INSERT OR UPDATE OR DELETE ON job_workflow_evidence
      FOR EACH ROW EXECUTE FUNCTION fn_audit_log();
  END IF;
END $$;

-- ============================================================
-- Storage bucket para evidencias (se nao existir)
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'workflow-evidence',
  'workflow-evidence',
  false,
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- RLS no bucket: apenas usuarios autenticados do mesmo tenant
-- (a validacao de tenant sera feita na Edge Function que gera signed URLs)
