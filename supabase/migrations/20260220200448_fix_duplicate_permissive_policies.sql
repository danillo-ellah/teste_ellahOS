
-- Migration: Remover policies duplicadas de role=public em tabelas Fases 5/6
-- Motivo: authenticated herda de public, causando "multiple permissive policies"
-- As policies de authenticated ja cobrem os usuarios; service_role bypassa RLS
SET search_path = public, extensions;

-- ---- ALLOCATIONS ----
DROP POLICY IF EXISTS allocations_insert_tenant ON allocations;
DROP POLICY IF EXISTS allocations_select_tenant ON allocations;
DROP POLICY IF EXISTS allocations_update_tenant ON allocations;

-- ---- APPROVAL_LOGS ----
DROP POLICY IF EXISTS approval_logs_insert_tenant ON approval_logs;
DROP POLICY IF EXISTS approval_logs_select_tenant ON approval_logs;

-- ---- APPROVAL_REQUESTS ----
DROP POLICY IF EXISTS approval_requests_insert_tenant ON approval_requests;
DROP POLICY IF EXISTS approval_requests_select_tenant ON approval_requests;
DROP POLICY IF EXISTS approval_requests_update_tenant ON approval_requests;

-- ---- DRIVE_FOLDERS ----
DROP POLICY IF EXISTS drive_folders_delete_tenant ON drive_folders;
DROP POLICY IF EXISTS drive_folders_insert_tenant ON drive_folders;
DROP POLICY IF EXISTS drive_folders_select_tenant ON drive_folders;
DROP POLICY IF EXISTS drive_folders_update_tenant ON drive_folders;

-- ---- INTEGRATION_EVENTS ----
DROP POLICY IF EXISTS integration_events_delete_tenant ON integration_events;
DROP POLICY IF EXISTS integration_events_insert_tenant ON integration_events;
DROP POLICY IF EXISTS integration_events_select_tenant ON integration_events;
DROP POLICY IF EXISTS integration_events_update_tenant ON integration_events;

-- ---- NOTIFICATION_PREFERENCES ----
DROP POLICY IF EXISTS notification_preferences_delete_own ON notification_preferences;
DROP POLICY IF EXISTS notification_preferences_insert_own ON notification_preferences;
DROP POLICY IF EXISTS notification_preferences_select_own ON notification_preferences;
DROP POLICY IF EXISTS notification_preferences_update_own ON notification_preferences;

-- ---- NOTIFICATIONS ----
DROP POLICY IF EXISTS notifications_delete_own ON notifications;
DROP POLICY IF EXISTS notifications_insert_tenant ON notifications;
DROP POLICY IF EXISTS notifications_select_own ON notifications;
DROP POLICY IF EXISTS notifications_update_own ON notifications;

-- ---- WHATSAPP_MESSAGES ----
DROP POLICY IF EXISTS whatsapp_messages_delete_tenant ON whatsapp_messages;
DROP POLICY IF EXISTS whatsapp_messages_insert_tenant ON whatsapp_messages;
DROP POLICY IF EXISTS whatsapp_messages_select_tenant ON whatsapp_messages;
DROP POLICY IF EXISTS whatsapp_messages_update_tenant ON whatsapp_messages;
