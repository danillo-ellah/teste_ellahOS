
-- Migration corretiva: F-03, F-05, F-21
-- F-03: Uniformizar (SELECT get_tenant_id()) em policies role=public
-- F-05: Indice drive_folders.created_by
-- F-21: Indice report_snapshots.expires_at

SET search_path = public, extensions;

-- =============================================================
-- F-03: FIX RLS policies para role=public (usar SELECT wrapper)
-- =============================================================

-- ---- ALLOCATIONS ----
DROP POLICY IF EXISTS allocations_insert_tenant ON allocations;
CREATE POLICY allocations_insert_tenant ON allocations FOR INSERT TO public
  WITH CHECK (tenant_id = (SELECT get_tenant_id()));

DROP POLICY IF EXISTS allocations_select_tenant ON allocations;
CREATE POLICY allocations_select_tenant ON allocations FOR SELECT TO public
  USING (tenant_id = (SELECT get_tenant_id()));

DROP POLICY IF EXISTS allocations_update_tenant ON allocations;
CREATE POLICY allocations_update_tenant ON allocations FOR UPDATE TO public
  USING (tenant_id = (SELECT get_tenant_id()))
  WITH CHECK (tenant_id = (SELECT get_tenant_id()));

-- ---- APPROVAL_LOGS ----
DROP POLICY IF EXISTS approval_logs_insert_tenant ON approval_logs;
CREATE POLICY approval_logs_insert_tenant ON approval_logs FOR INSERT TO public
  WITH CHECK (tenant_id = (SELECT get_tenant_id()));

DROP POLICY IF EXISTS approval_logs_select_tenant ON approval_logs;
CREATE POLICY approval_logs_select_tenant ON approval_logs FOR SELECT TO public
  USING (tenant_id = (SELECT get_tenant_id()));

-- ---- APPROVAL_REQUESTS ----
DROP POLICY IF EXISTS approval_requests_insert_tenant ON approval_requests;
CREATE POLICY approval_requests_insert_tenant ON approval_requests FOR INSERT TO public
  WITH CHECK (tenant_id = (SELECT get_tenant_id()));

DROP POLICY IF EXISTS approval_requests_select_tenant ON approval_requests;
CREATE POLICY approval_requests_select_tenant ON approval_requests FOR SELECT TO public
  USING (tenant_id = (SELECT get_tenant_id()));

DROP POLICY IF EXISTS approval_requests_update_tenant ON approval_requests;
CREATE POLICY approval_requests_update_tenant ON approval_requests FOR UPDATE TO public
  USING (tenant_id = (SELECT get_tenant_id()))
  WITH CHECK (tenant_id = (SELECT get_tenant_id()));

-- ---- DRIVE_FOLDERS ----
DROP POLICY IF EXISTS drive_folders_delete_tenant ON drive_folders;
CREATE POLICY drive_folders_delete_tenant ON drive_folders FOR DELETE TO public
  USING (tenant_id = (SELECT get_tenant_id()));

DROP POLICY IF EXISTS drive_folders_insert_tenant ON drive_folders;
CREATE POLICY drive_folders_insert_tenant ON drive_folders FOR INSERT TO public
  WITH CHECK (tenant_id = (SELECT get_tenant_id()));

DROP POLICY IF EXISTS drive_folders_select_tenant ON drive_folders;
CREATE POLICY drive_folders_select_tenant ON drive_folders FOR SELECT TO public
  USING (tenant_id = (SELECT get_tenant_id()));

DROP POLICY IF EXISTS drive_folders_update_tenant ON drive_folders;
CREATE POLICY drive_folders_update_tenant ON drive_folders FOR UPDATE TO public
  USING (tenant_id = (SELECT get_tenant_id()))
  WITH CHECK (tenant_id = (SELECT get_tenant_id()));

-- ---- INTEGRATION_EVENTS ----
DROP POLICY IF EXISTS integration_events_delete_tenant ON integration_events;
CREATE POLICY integration_events_delete_tenant ON integration_events FOR DELETE TO public
  USING (tenant_id = (SELECT get_tenant_id()));

DROP POLICY IF EXISTS integration_events_insert_tenant ON integration_events;
CREATE POLICY integration_events_insert_tenant ON integration_events FOR INSERT TO public
  WITH CHECK (tenant_id = (SELECT get_tenant_id()));

DROP POLICY IF EXISTS integration_events_select_tenant ON integration_events;
CREATE POLICY integration_events_select_tenant ON integration_events FOR SELECT TO public
  USING (tenant_id = (SELECT get_tenant_id()));

DROP POLICY IF EXISTS integration_events_update_tenant ON integration_events;
CREATE POLICY integration_events_update_tenant ON integration_events FOR UPDATE TO public
  USING (tenant_id = (SELECT get_tenant_id()))
  WITH CHECK (tenant_id = (SELECT get_tenant_id()));

-- ---- NOTIFICATION_PREFERENCES ----
DROP POLICY IF EXISTS notification_preferences_delete_own ON notification_preferences;
CREATE POLICY notification_preferences_delete_own ON notification_preferences FOR DELETE TO public
  USING (tenant_id = (SELECT get_tenant_id()) AND user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS notification_preferences_insert_own ON notification_preferences;
CREATE POLICY notification_preferences_insert_own ON notification_preferences FOR INSERT TO public
  WITH CHECK (tenant_id = (SELECT get_tenant_id()) AND user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS notification_preferences_select_own ON notification_preferences;
CREATE POLICY notification_preferences_select_own ON notification_preferences FOR SELECT TO public
  USING (tenant_id = (SELECT get_tenant_id()) AND user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS notification_preferences_update_own ON notification_preferences;
CREATE POLICY notification_preferences_update_own ON notification_preferences FOR UPDATE TO public
  USING (tenant_id = (SELECT get_tenant_id()) AND user_id = (SELECT auth.uid()))
  WITH CHECK (tenant_id = (SELECT get_tenant_id()) AND user_id = (SELECT auth.uid()));

-- ---- NOTIFICATIONS ----
DROP POLICY IF EXISTS notifications_delete_own ON notifications;
CREATE POLICY notifications_delete_own ON notifications FOR DELETE TO public
  USING (tenant_id = (SELECT get_tenant_id()) AND user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS notifications_insert_tenant ON notifications;
CREATE POLICY notifications_insert_tenant ON notifications FOR INSERT TO public
  WITH CHECK (tenant_id = (SELECT get_tenant_id()));

DROP POLICY IF EXISTS notifications_select_own ON notifications;
CREATE POLICY notifications_select_own ON notifications FOR SELECT TO public
  USING (tenant_id = (SELECT get_tenant_id()) AND user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS notifications_update_own ON notifications;
CREATE POLICY notifications_update_own ON notifications FOR UPDATE TO public
  USING (tenant_id = (SELECT get_tenant_id()) AND user_id = (SELECT auth.uid()))
  WITH CHECK (tenant_id = (SELECT get_tenant_id()) AND user_id = (SELECT auth.uid()));

-- ---- WHATSAPP_MESSAGES ----
DROP POLICY IF EXISTS whatsapp_messages_delete_tenant ON whatsapp_messages;
CREATE POLICY whatsapp_messages_delete_tenant ON whatsapp_messages FOR DELETE TO public
  USING (tenant_id = (SELECT get_tenant_id()));

DROP POLICY IF EXISTS whatsapp_messages_insert_tenant ON whatsapp_messages;
CREATE POLICY whatsapp_messages_insert_tenant ON whatsapp_messages FOR INSERT TO public
  WITH CHECK (tenant_id = (SELECT get_tenant_id()));

DROP POLICY IF EXISTS whatsapp_messages_select_tenant ON whatsapp_messages;
CREATE POLICY whatsapp_messages_select_tenant ON whatsapp_messages FOR SELECT TO public
  USING (tenant_id = (SELECT get_tenant_id()));

DROP POLICY IF EXISTS whatsapp_messages_update_tenant ON whatsapp_messages;
CREATE POLICY whatsapp_messages_update_tenant ON whatsapp_messages FOR UPDATE TO public
  USING (tenant_id = (SELECT get_tenant_id()))
  WITH CHECK (tenant_id = (SELECT get_tenant_id()));

-- =============================================================
-- F-05: Indice FK drive_folders.created_by
-- =============================================================
CREATE INDEX IF NOT EXISTS idx_drive_folders_created_by
  ON drive_folders(created_by)
  WHERE created_by IS NOT NULL;

-- =============================================================
-- F-21: Indice report_snapshots.expires_at (para pg_cron cleanup)
-- =============================================================
CREATE INDEX IF NOT EXISTS idx_report_snapshots_expires_at
  ON report_snapshots(expires_at);
