-- ============================================================
-- Migration 011: Consolidar profiles policies
-- Remove policies duplicadas que possam ter sido criadas
-- por execucoes parciais das migrations anteriores
-- Fase 1 - Consolidacao final
-- ============================================================

-- ============================================================
-- 1. Remover TODAS as policies existentes de profiles
-- ============================================================

DROP POLICY IF EXISTS profiles_select_tenant ON profiles;
DROP POLICY IF EXISTS profiles_insert_own ON profiles;
DROP POLICY IF EXISTS profiles_update_own ON profiles;
DROP POLICY IF EXISTS profiles_delete_admin ON profiles;
DROP POLICY IF EXISTS profiles_admin_all ON profiles;
DROP POLICY IF EXISTS tenant_isolation ON profiles;
DROP POLICY IF EXISTS "tenant_isolation" ON profiles;
DROP POLICY IF EXISTS profiles_select_own ON profiles;
DROP POLICY IF EXISTS profiles_update_self ON profiles;

-- ============================================================
-- 2. Recriar policies definitivas (sem sobreposicao)
-- ============================================================

-- SELECT: qualquer autenticado ve profiles do seu tenant
CREATE POLICY profiles_select_tenant ON profiles
  FOR SELECT TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()));

-- INSERT: pode criar profile no seu tenant (usado pelo auth hook)
CREATE POLICY profiles_insert_own ON profiles
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = (SELECT get_tenant_id()));

-- UPDATE: pode atualizar profiles do seu tenant
-- (admin pode atualizar qualquer um, user comum so o proprio)
CREATE POLICY profiles_update_own ON profiles
  FOR UPDATE TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()))
  WITH CHECK (tenant_id = (SELECT get_tenant_id()));

-- DELETE: apenas admin/ceo pode deletar profiles
CREATE POLICY profiles_delete_admin ON profiles
  FOR DELETE TO authenticated
  USING (
    tenant_id = (SELECT get_tenant_id())
    AND (SELECT get_user_role()) IN ('admin', 'ceo')
  );

-- ============================================================
-- 3. Remover policies duplicadas de outras tabelas
-- que possam existir por execucoes parciais
-- ============================================================

-- tenants: garantir estado limpo
DROP POLICY IF EXISTS tenant_isolation ON tenants;
DROP POLICY IF EXISTS "tenant_isolation" ON tenants;

-- Recriar se nao existem
DO $$ BEGIN
  CREATE POLICY tenants_select_own ON tenants
    FOR SELECT TO authenticated
    USING (id = (SELECT get_tenant_id()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY tenants_update_own ON tenants
    FOR UPDATE TO authenticated
    USING (id = (SELECT get_tenant_id()))
    WITH CHECK (id = (SELECT get_tenant_id()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
