-- =============================================================================
-- Migration: T3.3 — Controle de Figurino/Arte por Cena
-- Data: 2026-03-03
--
-- Contexto:
--   Fichas de controle de figurino, arte e cenografia por personagem e cena.
--   Cada item tem tipo (figurino, arte, cenografia, objeto_cena), status de
--   aquisicao (planejado, comprado, alugado, etc.), custo e vinculo opcional
--   com item de custo no modulo financeiro.
--
-- Novas tabelas: wardrobe_items
-- =============================================================================

SET search_path TO public;

-- -------------------------------------------------------
-- 1. Tabela wardrobe_items
-- -------------------------------------------------------

CREATE TABLE IF NOT EXISTS wardrobe_items (
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID          NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  job_id              UUID          NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,

  -- Identificacao
  character_name      TEXT          NOT NULL,
  scene_numbers       TEXT,                      -- "1, 3, 5A" — formato livre
  item_description    TEXT          NOT NULL,
  item_type           TEXT          NOT NULL,
  status              TEXT          NOT NULL DEFAULT 'planejado',

  -- Custo e fornecedor
  cost                NUMERIC(12,2),
  cost_item_id        UUID          REFERENCES cost_items(id) ON DELETE SET NULL,
  supplier            TEXT,

  -- Referencia visual
  photo_url           TEXT,
  photo_storage_path  TEXT,
  reference_url       TEXT,

  -- Observacoes
  notes               TEXT,

  -- Auditoria
  created_by          UUID          REFERENCES profiles(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ   NOT NULL DEFAULT now(),
  deleted_at          TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT chk_wardrobe_item_type CHECK (
    item_type IN ('figurino', 'arte', 'cenografia', 'objeto_cena')
  ),
  CONSTRAINT chk_wardrobe_status CHECK (
    status IN ('planejado', 'comprado', 'alugado', 'emprestado', 'devolvido', 'descartado')
  ),
  CONSTRAINT chk_wardrobe_character_not_empty CHECK (
    length(trim(character_name)) > 0
  ),
  CONSTRAINT chk_wardrobe_description_not_empty CHECK (
    length(trim(item_description)) > 0
  ),
  CONSTRAINT chk_wardrobe_cost_positive CHECK (
    cost IS NULL OR cost >= 0
  )
);

-- -------------------------------------------------------
-- 2. Comentarios em colunas nao obvias
-- -------------------------------------------------------

COMMENT ON TABLE wardrobe_items IS 'Fichas de controle de figurino, arte, cenografia e objetos de cena por personagem/cena do job.';
COMMENT ON COLUMN wardrobe_items.character_name IS 'Nome do personagem ou categoria: Protagonista, Personagem B, Cenario Principal, etc.';
COMMENT ON COLUMN wardrobe_items.scene_numbers IS 'Numeros das cenas em formato livre: "1, 3, 5A" ou "todas". Referencia ao roteiro.';
COMMENT ON COLUMN wardrobe_items.item_type IS 'Categoria do item: figurino (roupas/acessorios), arte (props/set dressing), cenografia (estruturas de cena), objeto_cena (elemento narrativo especifico).';
COMMENT ON COLUMN wardrobe_items.status IS 'Status de aquisicao: planejado (ainda nao iniciado), comprado, alugado, emprestado, devolvido (ao locador/dono), descartado.';
COMMENT ON COLUMN wardrobe_items.cost IS 'Custo do item em BRL. Pode ser nulo se ainda nao orcado.';
COMMENT ON COLUMN wardrobe_items.cost_item_id IS 'Vinculo opcional com item de custo no modulo financeiro. SET NULL se cost item excluido.';
COMMENT ON COLUMN wardrobe_items.photo_url IS 'URL publica ou assinada da foto de referencia do item.';
COMMENT ON COLUMN wardrobe_items.photo_storage_path IS 'Path interno no Supabase Storage para a foto de referencia.';
COMMENT ON COLUMN wardrobe_items.reference_url IS 'URL externa de referencia (Pinterest, site de loja, etc.).';
COMMENT ON COLUMN wardrobe_items.created_by IS 'Usuario que criou a ficha. SET NULL se usuario for removido.';

-- -------------------------------------------------------
-- 3. Indices
-- -------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_wardrobe_items_tenant
  ON wardrobe_items(tenant_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_wardrobe_items_job
  ON wardrobe_items(job_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_wardrobe_items_job_character
  ON wardrobe_items(job_id, character_name) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_wardrobe_items_job_type
  ON wardrobe_items(job_id, item_type) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_wardrobe_items_job_status
  ON wardrobe_items(job_id, status) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_wardrobe_items_cost_item
  ON wardrobe_items(cost_item_id)
  WHERE cost_item_id IS NOT NULL AND deleted_at IS NULL;

-- -------------------------------------------------------
-- 4. Trigger updated_at
-- -------------------------------------------------------

DROP TRIGGER IF EXISTS trg_wardrobe_items_updated_at ON wardrobe_items;
CREATE TRIGGER trg_wardrobe_items_updated_at
  BEFORE UPDATE ON wardrobe_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- -------------------------------------------------------
-- 5. RLS: wardrobe_items (tenant isolation)
-- -------------------------------------------------------

ALTER TABLE wardrobe_items ENABLE ROW LEVEL SECURITY;

-- SELECT: qualquer usuario autenticado ve itens do seu tenant
DROP POLICY IF EXISTS wardrobe_items_select_tenant ON wardrobe_items;
CREATE POLICY wardrobe_items_select_tenant ON wardrobe_items
  FOR SELECT TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()));

-- INSERT: qualquer usuario autenticado insere no seu tenant
DROP POLICY IF EXISTS wardrobe_items_insert_tenant ON wardrobe_items;
CREATE POLICY wardrobe_items_insert_tenant ON wardrobe_items
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = (SELECT get_tenant_id()));

-- UPDATE: qualquer usuario autenticado atualiza no seu tenant
DROP POLICY IF EXISTS wardrobe_items_update_tenant ON wardrobe_items;
CREATE POLICY wardrobe_items_update_tenant ON wardrobe_items
  FOR UPDATE TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()))
  WITH CHECK (tenant_id = (SELECT get_tenant_id()));

-- DELETE fisico: SEM policy — delecao fisica bloqueada. Usar soft delete (deleted_at).

-- -------------------------------------------------------
-- 6. Verificacao de isolamento de tenant (teste mental)
-- -------------------------------------------------------
-- wardrobe_items:
--   SELECT: tenant_id = get_tenant_id() -> Tenant A NAO ve itens do Tenant B. OK.
--   INSERT: WITH CHECK -> So insere com seu proprio tenant_id. OK.
--   UPDATE: USING + WITH CHECK duplo -> So atualiza registros do seu tenant. OK.
--   DELETE fisico: SEM policy -> bloqueado para todos. Usar soft delete. OK.

-- =============================================================================
-- FIM da migration — T3.3 Controle de Figurino/Arte por Cena
-- Novas tabelas: wardrobe_items (total: +1)
-- Indices: 6 (tenant, job, job+character, job+type, job+status, cost_item)
-- RLS: 3 policies (SELECT, INSERT, UPDATE)
-- Triggers: 1 (updated_at)
-- Constraints: 5 (item_type ENUM, status ENUM, character not empty, description not empty, cost positive)
-- =============================================================================
