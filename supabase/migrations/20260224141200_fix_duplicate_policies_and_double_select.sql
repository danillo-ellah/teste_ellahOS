-- ============================================================
-- Cleanup: Remove duplicate policies criadas pela migration
-- fix_rls_select_wrapper que nao dropou as originais.
-- Tambem corrige double-SELECT wrapper em TODAS as policies.
-- ============================================================

SET search_path = public;

-- ============================================================
-- PARTE 1: Dropar policies ANTIGAS duplicadas
-- Manter as novas (_tenant/_own) e dropar as originais
-- ============================================================

-- allocations: manter _tenant, dropar originais
DROP POLICY IF EXISTS "allocations_select" ON allocations;
DROP POLICY IF EXISTS "allocations_insert" ON allocations;
DROP POLICY IF EXISTS "allocations_update" ON allocations;
DROP POLICY IF EXISTS "allocations_delete" ON allocations;

-- approval_requests: manter _tenant, dropar originais
DROP POLICY IF EXISTS "approval_requests_select" ON approval_requests;
DROP POLICY IF EXISTS "approval_requests_insert" ON approval_requests;
DROP POLICY IF EXISTS "approval_requests_update" ON approval_requests;

-- approval_logs: manter _tenant, dropar originais
DROP POLICY IF EXISTS "approval_logs_select" ON approval_logs;
DROP POLICY IF EXISTS "approval_logs_insert" ON approval_logs;

-- drive_folders: manter _tenant, dropar originais
DROP POLICY IF EXISTS "drive_folders_select" ON drive_folders;
DROP POLICY IF EXISTS "drive_folders_insert" ON drive_folders;
DROP POLICY IF EXISTS "drive_folders_update" ON drive_folders;
DROP POLICY IF EXISTS "drive_folders_delete" ON drive_folders;

-- whatsapp_messages: manter _tenant, dropar originais
DROP POLICY IF EXISTS "whatsapp_messages_select" ON whatsapp_messages;
DROP POLICY IF EXISTS "whatsapp_messages_insert" ON whatsapp_messages;

-- integration_events: manter _tenant, dropar originais
DROP POLICY IF EXISTS "integration_events_select" ON integration_events;
DROP POLICY IF EXISTS "integration_events_insert" ON integration_events;

-- notifications: manter _own/_tenant, dropar originais
DROP POLICY IF EXISTS "notifications_select" ON notifications;
DROP POLICY IF EXISTS "notifications_insert" ON notifications;
DROP POLICY IF EXISTS "notifications_update" ON notifications;
DROP POLICY IF EXISTS "notifications_delete" ON notifications;

-- notification_preferences: manter _own, dropar originais
DROP POLICY IF EXISTS "notification_preferences_select" ON notification_preferences;
DROP POLICY IF EXISTS "notification_preferences_insert" ON notification_preferences;
DROP POLICY IF EXISTS "notification_preferences_update" ON notification_preferences;

-- ============================================================
-- PARTE 2: Corrigir double-SELECT wrapper dinamicamente
-- ============================================================

DO $$
DECLARE
  rec RECORD;
  v_sql TEXT;
  v_using TEXT;
  v_with_check TEXT;
  v_roles TEXT;
  v_fixed INT := 0;
BEGIN
  FOR rec IN
    SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (
        (qual IS NOT NULL AND qual LIKE '%SELECT ( SELECT%')
        OR (with_check IS NOT NULL AND with_check LIKE '%SELECT ( SELECT%')
      )
  LOOP
    BEGIN
      v_using := rec.qual;
      IF v_using IS NOT NULL THEN
        v_using := replace(v_using, '( SELECT ( SELECT get_tenant_id() AS get_tenant_id) AS get_tenant_id)', '( SELECT get_tenant_id() AS get_tenant_id)');
        v_using := replace(v_using, '( SELECT ( SELECT public.get_tenant_id() AS get_tenant_id) AS get_tenant_id)', '( SELECT public.get_tenant_id() AS get_tenant_id)');
      END IF;

      v_with_check := rec.with_check;
      IF v_with_check IS NOT NULL THEN
        v_with_check := replace(v_with_check, '( SELECT ( SELECT get_tenant_id() AS get_tenant_id) AS get_tenant_id)', '( SELECT get_tenant_id() AS get_tenant_id)');
        v_with_check := replace(v_with_check, '( SELECT ( SELECT public.get_tenant_id() AS get_tenant_id) AS get_tenant_id)', '( SELECT public.get_tenant_id() AS get_tenant_id)');
      END IF;

      IF v_using IS NOT DISTINCT FROM rec.qual AND v_with_check IS NOT DISTINCT FROM rec.with_check THEN
        CONTINUE;
      END IF;

      IF rec.roles = '{public}' OR rec.roles IS NULL THEN
        v_roles := '';
      ELSE
        v_roles := ' TO ' || array_to_string(rec.roles, ', ');
      END IF;

      EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', rec.policyname, rec.schemaname, rec.tablename);

      v_sql := format('CREATE POLICY %I ON %I.%I', rec.policyname, rec.schemaname, rec.tablename);

      IF rec.permissive != 'PERMISSIVE' THEN
        v_sql := v_sql || ' AS RESTRICTIVE';
      END IF;

      v_sql := v_sql || ' FOR ' || rec.cmd || v_roles;

      IF v_using IS NOT NULL AND rec.cmd != 'INSERT' THEN
        v_sql := v_sql || ' USING (' || v_using || ')';
      END IF;

      IF v_with_check IS NOT NULL AND rec.cmd IN ('INSERT', 'UPDATE', 'ALL') THEN
        v_sql := v_sql || ' WITH CHECK (' || v_with_check || ')';
      END IF;

      EXECUTE v_sql;
      v_fixed := v_fixed + 1;

    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed: %.% %: %', rec.schemaname, rec.tablename, rec.policyname, SQLERRM;
    END;
  END LOOP;

  RAISE NOTICE 'Fixed % double-SELECT policies', v_fixed;
END $$;
