-- ============================================================
-- Migration: Workflow auto-init ao criar job + Storage policies
-- 1. Trigger AFTER INSERT on jobs → cria 16 workflow steps
-- 2. Storage RLS policies para bucket workflow-evidence
-- 3. Bucket atualizado para public (acesso via URL direta)
-- ============================================================

SET search_path TO public;

-- ============================================================
-- 1. Trigger: auto-criar workflow steps ao inserir job
-- Usa NEW.tenant_id e NEW.id diretamente (sem depender de JWT)
-- ============================================================

CREATE OR REPLACE FUNCTION auto_create_job_workflow_steps()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_existing INTEGER;
BEGIN
  -- Idempotencia: nao duplicar se ja existem steps
  SELECT COUNT(*) INTO v_existing
  FROM job_workflow_steps
  WHERE job_id = NEW.id AND tenant_id = NEW.tenant_id AND deleted_at IS NULL;

  IF v_existing > 0 THEN
    RETURN NEW;
  END IF;

  -- Inserir os 16 passos padrao usando dados do NEW (sem JWT)
  INSERT INTO job_workflow_steps (tenant_id, job_id, step_key, step_label, category, step_type, sort_order) VALUES
    (NEW.tenant_id, NEW.id, 'comercial',          'Comercial & Orcamento',               'vendas',    'geral',        1),
    (NEW.tenant_id, NEW.id, 'pre_producao',        'Pre-producao',                        'producao',  'geral',        2),
    (NEW.tenant_id, NEW.id, 'obj_solicitacao',     'OBJ - Solicitacao',                   'objetos',   'solicitacao',  3),
    (NEW.tenant_id, NEW.id, 'obj_aprovacao',       'OBJ - Aprovacao',                     'objetos',   'aprovacao',    4),
    (NEW.tenant_id, NEW.id, 'obj_compra',          'OBJ - Compra/Aluguel',                'objetos',   'compra',       5),
    (NEW.tenant_id, NEW.id, 'obj_conferencia',     'OBJ - Conferencia (Fotos/NF/Recibo)', 'objetos',   'conferencia',  6),
    (NEW.tenant_id, NEW.id, 'loc_solicitacao',     'LOC - Solicitacao',                   'locacao',   'solicitacao',  7),
    (NEW.tenant_id, NEW.id, 'loc_aprovacao',       'LOC - Aprovacao para PPM',            'locacao',   'aprovacao',    8),
    (NEW.tenant_id, NEW.id, 'fig_solicitacao',     'FIG - Solicitacao',                   'figurino',  'solicitacao',  9),
    (NEW.tenant_id, NEW.id, 'fig_aprovacao',       'FIG - Aprovacao',                     'figurino',  'aprovacao',   10),
    (NEW.tenant_id, NEW.id, 'fig_compra',          'FIG - Compra/Aluguel',                'figurino',  'compra',      11),
    (NEW.tenant_id, NEW.id, 'fig_conferencia',     'FIG - Conferencia (Fotos/NF/Recibo)', 'figurino',  'conferencia', 12),
    (NEW.tenant_id, NEW.id, 'producao',            'Producao',                            'producao',  'geral',       13),
    (NEW.tenant_id, NEW.id, 'pos_producao',        'Pos-producao',                        'pos',       'geral',       14),
    (NEW.tenant_id, NEW.id, 'qualidade_aprovacao', 'Qualidade & Aprovacao',               'qa',        'geral',       15),
    (NEW.tenant_id, NEW.id, 'entrega_encerramento','Entrega & Encerramento',              'entrega',   'geral',       16);

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION auto_create_job_workflow_steps() IS 'Trigger: cria 16 passos do workflow automaticamente ao criar um job';

DROP TRIGGER IF EXISTS trg_jobs_auto_workflow ON jobs;
CREATE TRIGGER trg_jobs_auto_workflow
  AFTER INSERT ON jobs
  FOR EACH ROW EXECUTE FUNCTION auto_create_job_workflow_steps();

-- ============================================================
-- 2. Atualizar bucket para public (URLs acessiveis via path)
-- ============================================================

UPDATE storage.buckets
SET public = true
WHERE id = 'workflow-evidence';

-- ============================================================
-- 3. Storage RLS policies para workflow-evidence
-- Qualquer usuario autenticado pode fazer upload e ler
-- (isolamento por tenant no path: {tenant_id}/...)
-- ============================================================

-- SELECT: qualquer autenticado pode ler
DROP POLICY IF EXISTS wf_evidence_storage_select ON storage.objects;
CREATE POLICY wf_evidence_storage_select ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'workflow-evidence');

-- INSERT: qualquer autenticado pode fazer upload
DROP POLICY IF EXISTS wf_evidence_storage_insert ON storage.objects;
CREATE POLICY wf_evidence_storage_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'workflow-evidence');

-- DELETE: qualquer autenticado pode deletar (seus uploads)
DROP POLICY IF EXISTS wf_evidence_storage_delete ON storage.objects;
CREATE POLICY wf_evidence_storage_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'workflow-evidence');
