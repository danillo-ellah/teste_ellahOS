-- Adicionar coluna parent_id para hierarquia de entregaveis (ex: 90" pai com 2x 30" filhos)
ALTER TABLE public.job_deliverables
  ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.job_deliverables(id) ON DELETE SET NULL;

-- Indice para consulta de filhos
CREATE INDEX IF NOT EXISTS idx_job_deliverables_parent_id ON public.job_deliverables(parent_id);

-- Constraint: um deliverable nao pode ser seu proprio pai
ALTER TABLE public.job_deliverables
  ADD CONSTRAINT chk_deliverable_not_self_parent CHECK (parent_id IS NULL OR parent_id != id);