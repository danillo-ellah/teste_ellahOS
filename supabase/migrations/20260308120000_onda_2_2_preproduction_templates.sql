-- =============================================
-- Onda 2.2: Pre-Producao — Templates de Checklist
-- 1 tabela nova + RPC de seed
-- Idempotente: IF NOT EXISTS em tudo
-- =============================================

-- =============================================
-- 1. preproduction_checklist_templates
-- Templates de checklist de pre-producao por tipo de projeto
-- Cada tenant pode ter um template padrao (project_type NULL)
-- e um template por tipo de projeto
-- =============================================
CREATE TABLE IF NOT EXISTS public.preproduction_checklist_templates (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  project_type text
    CHECK (project_type IS NULL OR project_type IN (
      'filme_publicitario','branded_content','videoclipe','documentario',
      'conteudo_digital','evento_livestream','institucional',
      'motion_graphics','fotografia','outro'
    )),
  name text NOT NULL,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.preproduction_checklist_templates
  IS 'Templates de checklist de pre-producao. Cada tenant tem um template padrao (project_type NULL) e opcionalmente um por tipo de projeto.';
COMMENT ON COLUMN public.preproduction_checklist_templates.project_type
  IS 'Tipo de projeto ao qual o template se aplica. NULL = template padrao geral (fallback).';
COMMENT ON COLUMN public.preproduction_checklist_templates.items
  IS 'Array JSONB de itens do checklist. Cada item: {"id":"XX","label":"...","position":N}';
COMMENT ON COLUMN public.preproduction_checklist_templates.is_active
  IS 'Soft delete: false desativa o template sem apagar. Indices UNIQUE filtram por is_active=true.';
COMMENT ON COLUMN public.preproduction_checklist_templates.created_by
  IS 'Usuario que criou o template (perfil autenticado)';

-- =============================================
-- 2. Indices
-- =============================================

-- UNIQUE parcial: no maximo 1 template ativo por (tenant, project_type) quando project_type NOT NULL
CREATE UNIQUE INDEX IF NOT EXISTS idx_ppm_tpl_tenant_project_type_active
  ON public.preproduction_checklist_templates (tenant_id, project_type)
  WHERE is_active = true AND project_type IS NOT NULL;

-- UNIQUE parcial: no maximo 1 template padrao ativo por tenant (project_type IS NULL)
CREATE UNIQUE INDEX IF NOT EXISTS idx_ppm_tpl_tenant_default_active
  ON public.preproduction_checklist_templates (tenant_id)
  WHERE is_active = true AND project_type IS NULL;

-- Lookup: busca template ativo por tenant + tipo de projeto
CREATE INDEX IF NOT EXISTS idx_ppm_tpl_tenant_lookup
  ON public.preproduction_checklist_templates (tenant_id, project_type)
  WHERE is_active = true;

-- FK indices (regra: indice em TODA foreign key)
CREATE INDEX IF NOT EXISTS idx_ppm_tpl_tenant_id
  ON public.preproduction_checklist_templates (tenant_id);

CREATE INDEX IF NOT EXISTS idx_ppm_tpl_created_by
  ON public.preproduction_checklist_templates (created_by);

-- =============================================
-- 3. Trigger updated_at
-- Reutiliza funcao existente: public.update_updated_at()
-- =============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_ppm_checklist_templates'
  ) THEN
    CREATE TRIGGER set_updated_at_ppm_checklist_templates
      BEFORE UPDATE ON public.preproduction_checklist_templates
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
  END IF;
END
$$;

-- =============================================
-- 4. RLS — Row Level Security
-- Padrao do projeto: SELECT/INSERT/UPDATE com tenant_id do JWT
-- DELETE bloqueado via RLS (soft delete via is_active = false)
-- =============================================
ALTER TABLE public.preproduction_checklist_templates ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'ppm_tpl_select' AND tablename = 'preproduction_checklist_templates') THEN
    CREATE POLICY "ppm_tpl_select" ON public.preproduction_checklist_templates
      FOR SELECT USING (tenant_id = public.get_tenant_id());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'ppm_tpl_insert' AND tablename = 'preproduction_checklist_templates') THEN
    CREATE POLICY "ppm_tpl_insert" ON public.preproduction_checklist_templates
      FOR INSERT WITH CHECK (tenant_id = public.get_tenant_id());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'ppm_tpl_update' AND tablename = 'preproduction_checklist_templates') THEN
    CREATE POLICY "ppm_tpl_update" ON public.preproduction_checklist_templates
      FOR UPDATE USING (tenant_id = public.get_tenant_id());
  END IF;
END $$;

-- =============================================
-- 5. RPC seed_default_ppm_templates
-- Insere 7 templates sugeridos para um tenant.
-- Idempotente: so insere se o tenant nao tem nenhum template ativo.
-- Retorna integer (quantidade criada).
-- =============================================
CREATE OR REPLACE FUNCTION public.seed_default_ppm_templates(p_tenant_id uuid, p_created_by uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer := 0;
  v_existing integer;
BEGIN
  -- Verifica se ja existem templates ativos para este tenant
  SELECT count(*) INTO v_existing
    FROM public.preproduction_checklist_templates
    WHERE tenant_id = p_tenant_id
      AND is_active = true;

  IF v_existing > 0 THEN
    RETURN 0;
  END IF;

  -- 1. Padrao Geral (project_type = NULL) — 6 itens
  INSERT INTO public.preproduction_checklist_templates (tenant_id, project_type, name, items, created_by)
  VALUES (
    p_tenant_id,
    NULL,
    'Checklist Padrao Geral',
    '[
      {"id":"GEN01","label":"Roteiro","position":1},
      {"id":"GEN02","label":"Locacoes","position":2},
      {"id":"GEN03","label":"Equipe","position":3},
      {"id":"GEN04","label":"Elenco","position":4},
      {"id":"GEN05","label":"Cronograma","position":5},
      {"id":"GEN06","label":"Orcamento","position":6}
    ]'::jsonb,
    p_created_by
  );
  v_count := v_count + 1;

  -- 2. Filme Publicitario — 10 itens
  INSERT INTO public.preproduction_checklist_templates (tenant_id, project_type, name, items, created_by)
  VALUES (
    p_tenant_id,
    'filme_publicitario',
    'Checklist Filme Publicitario',
    '[
      {"id":"FP01","label":"Roteiro","position":1},
      {"id":"FP02","label":"Storyboard","position":2},
      {"id":"FP03","label":"Locacoes","position":3},
      {"id":"FP04","label":"Equipe","position":4},
      {"id":"FP05","label":"Elenco","position":5},
      {"id":"FP06","label":"Cronograma","position":6},
      {"id":"FP07","label":"Orcamento","position":7},
      {"id":"FP08","label":"Contratos","position":8},
      {"id":"FP09","label":"Ordem do Dia","position":9},
      {"id":"FP10","label":"Figurino e Arte","position":10}
    ]'::jsonb,
    p_created_by
  );
  v_count := v_count + 1;

  -- 3. Branded Content — 7 itens
  INSERT INTO public.preproduction_checklist_templates (tenant_id, project_type, name, items, created_by)
  VALUES (
    p_tenant_id,
    'branded_content',
    'Checklist Branded Content',
    '[
      {"id":"BC01","label":"Briefing","position":1},
      {"id":"BC02","label":"Roteiro / Pauta","position":2},
      {"id":"BC03","label":"Locacoes / Estudio","position":3},
      {"id":"BC04","label":"Equipe","position":4},
      {"id":"BC05","label":"Talento","position":5},
      {"id":"BC06","label":"Cronograma","position":6},
      {"id":"BC07","label":"Orcamento","position":7}
    ]'::jsonb,
    p_created_by
  );
  v_count := v_count + 1;

  -- 4. Fotografia — 5 itens
  INSERT INTO public.preproduction_checklist_templates (tenant_id, project_type, name, items, created_by)
  VALUES (
    p_tenant_id,
    'fotografia',
    'Checklist Fotografia',
    '[
      {"id":"FO01","label":"Briefing Visual","position":1},
      {"id":"FO02","label":"Locacao / Estudio","position":2},
      {"id":"FO03","label":"Fotografo + Assistentes","position":3},
      {"id":"FO04","label":"Modelo / Elenco","position":4},
      {"id":"FO05","label":"Orcamento","position":5}
    ]'::jsonb,
    p_created_by
  );
  v_count := v_count + 1;

  -- 5. Conteudo Digital — 5 itens
  INSERT INTO public.preproduction_checklist_templates (tenant_id, project_type, name, items, created_by)
  VALUES (
    p_tenant_id,
    'conteudo_digital',
    'Checklist Conteudo Digital',
    '[
      {"id":"CD01","label":"Pauta","position":1},
      {"id":"CD02","label":"Formato / Plataformas","position":2},
      {"id":"CD03","label":"Equipe Minima","position":3},
      {"id":"CD04","label":"Cronograma de Entregas","position":4},
      {"id":"CD05","label":"Orcamento","position":5}
    ]'::jsonb,
    p_created_by
  );
  v_count := v_count + 1;

  -- 6. Videoclipe — 7 itens
  INSERT INTO public.preproduction_checklist_templates (tenant_id, project_type, name, items, created_by)
  VALUES (
    p_tenant_id,
    'videoclipe',
    'Checklist Videoclipe',
    '[
      {"id":"VC01","label":"Conceito / Tratamento","position":1},
      {"id":"VC02","label":"Locacoes","position":2},
      {"id":"VC03","label":"Equipe","position":3},
      {"id":"VC04","label":"Figurino e Arte","position":4},
      {"id":"VC05","label":"Cronograma","position":5},
      {"id":"VC06","label":"Orcamento","position":6},
      {"id":"VC07","label":"Playback / Musica","position":7}
    ]'::jsonb,
    p_created_by
  );
  v_count := v_count + 1;

  -- 7. Documentario — 7 itens
  INSERT INTO public.preproduction_checklist_templates (tenant_id, project_type, name, items, created_by)
  VALUES (
    p_tenant_id,
    'documentario',
    'Checklist Documentario',
    '[
      {"id":"DC01","label":"Roteiro / Escaleta","position":1},
      {"id":"DC02","label":"Entrevistados","position":2},
      {"id":"DC03","label":"Locacoes","position":3},
      {"id":"DC04","label":"Equipe","position":4},
      {"id":"DC05","label":"Autorizacoes de Imagem","position":5},
      {"id":"DC06","label":"Cronograma","position":6},
      {"id":"DC07","label":"Orcamento","position":7}
    ]'::jsonb,
    p_created_by
  );
  v_count := v_count + 1;

  RETURN v_count;
END;
$$;

COMMENT ON FUNCTION public.seed_default_ppm_templates(uuid, uuid)
  IS 'Insere 7 templates de checklist de pre-producao sugeridos para um tenant. Idempotente: so insere se nenhum template ativo existe para o tenant. Retorna quantidade criada (0 ou 7).';
