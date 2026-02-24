-- ============================================================
-- Migration: Fase 5.1 — Fix performance advisor warnings
-- 1. Indices FK faltando (drive_folders.created_by, notification_preferences.user_id)
-- 2. RLS policies: (select auth.uid()) em vez de auth.uid()
-- ============================================================

set search_path = public;

-- 1. Indices FK faltando
CREATE INDEX IF NOT EXISTS idx_drive_folders_created_by
  ON drive_folders(created_by) WHERE created_by IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id
  ON notification_preferences(user_id);

-- 2. Fix RLS initplan: notifications
DROP POLICY IF EXISTS "notifications_select_own" ON notifications;
CREATE POLICY "notifications_select_own" ON notifications
  FOR SELECT USING (tenant_id = get_tenant_id() AND user_id = (select auth.uid()));

DROP POLICY IF EXISTS "notifications_update_own" ON notifications;
CREATE POLICY "notifications_update_own" ON notifications
  FOR UPDATE USING (tenant_id = get_tenant_id() AND user_id = (select auth.uid()))
  WITH CHECK (tenant_id = get_tenant_id() AND user_id = (select auth.uid()));

DROP POLICY IF EXISTS "notifications_delete_own" ON notifications;
CREATE POLICY "notifications_delete_own" ON notifications
  FOR DELETE USING (tenant_id = get_tenant_id() AND user_id = (select auth.uid()));

-- 3. Fix RLS initplan: notification_preferences
DROP POLICY IF EXISTS "notification_preferences_select_own" ON notification_preferences;
CREATE POLICY "notification_preferences_select_own" ON notification_preferences
  FOR SELECT USING (tenant_id = get_tenant_id() AND user_id = (select auth.uid()));

DROP POLICY IF EXISTS "notification_preferences_insert_own" ON notification_preferences;
CREATE POLICY "notification_preferences_insert_own" ON notification_preferences
  FOR INSERT WITH CHECK (tenant_id = get_tenant_id() AND user_id = (select auth.uid()));

DROP POLICY IF EXISTS "notification_preferences_update_own" ON notification_preferences;
CREATE POLICY "notification_preferences_update_own" ON notification_preferences
  FOR UPDATE USING (tenant_id = get_tenant_id() AND user_id = (select auth.uid()))
  WITH CHECK (tenant_id = get_tenant_id() AND user_id = (select auth.uid()));

DROP POLICY IF EXISTS "notification_preferences_delete_own" ON notification_preferences;
CREATE POLICY "notification_preferences_delete_own" ON notification_preferences
  FOR DELETE USING (tenant_id = get_tenant_id() AND user_id = (select auth.uid()));