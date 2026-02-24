-- ============================================================
-- Migration 010: Fix profiles policies overlap
-- Separar admin ALL em INSERT/DELETE especificos
-- Garantir que users podem atualizar seus proprios profiles
-- Fase 1 - Fix pos-auditoria
-- ============================================================

-- ============================================================
-- 1. Remover policies duplicadas ou sobrepostas de profiles
-- (se existirem)
-- ============================================================

-- Abordagem segura: DROP IF EXISTS antes de recriar
DROP POLICY IF EXISTS profiles_admin_all ON profiles;
DROP POLICY IF EXISTS profiles_select_tenant ON profiles;
DROP POLICY IF EXISTS profiles_insert_own ON profiles;
DROP POLICY IF EXISTS profiles_update_own ON profiles;
DROP POLICY IF EXISTS profiles_delete_admin ON profiles;

-- ============================================================
-- 2. Recriar policies de profiles sem sobreposicao
-- ============================================================

-- SELECT: qualquer usuario autenticado ve profiles do seu tenant
CREATE POLICY profiles_select_tenant ON profiles
  FOR SELECT TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()));

-- INSERT: usuario pode criar profile no seu tenant
CREATE POLICY profiles_insert_own ON profiles
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = (SELECT get_tenant_id()));

-- UPDATE: usuario pode atualizar profiles do seu tenant
CREATE POLICY profiles_update_own ON profiles
  FOR UPDATE TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()))
  WITH CHECK (tenant_id = (SELECT get_tenant_id()));

-- DELETE: apenas admin pode deletar profiles (soft delete via UPDATE)
CREATE POLICY profiles_delete_admin ON profiles
  FOR DELETE TO authenticated
  USING (
    tenant_id = (SELECT get_tenant_id())
    AND (SELECT get_user_role()) IN ('admin', 'ceo')
  );
