-- ============================================================
-- Migration: Fix P0-4 — RLS policies sem (SELECT) wrapper
-- Data: 2026-02-24
-- Descricao: Corrigir todas as RLS policies das Fases 5 e 6 que
--   usam get_tenant_id() sem o wrapper (SELECT ...), causando
--   re-avaliacao da funcao por cada row em vez de uma unica vez
--   por query. Ref: database-inventory F-03.
--
-- Tabelas afetadas (Fase 5):
--   notifications, notification_preferences, drive_folders,
--   whatsapp_messages, integration_events
--
-- Tabelas afetadas (Fase 6):
--   allocations, approval_requests, approval_logs
--
-- Padrao correto: tenant_id = (SELECT get_tenant_id())
-- Padrao incorreto: tenant_id = get_tenant_id()
--
-- As Fases 7 e 8 ja usam o padrao correto.
-- As Fases 1 e 4 sao tratadas separadamente ao final (nomes
--   de policy descobertos via pg_policies dinamicamente).
--
-- Idempotente: sim (DROP POLICY IF EXISTS antes de CREATE)
-- ============================================================

SET search_path = public;

-- ============================================================
-- FASE 5: notifications (4 policies)
-- Isolamento: tenant_id + user_id
-- ============================================================

DROP POLICY IF EXISTS "notifications_select_own" ON notifications;
CREATE POLICY "notifications_select_own" ON notifications
  FOR SELECT TO authenticated
  USING (
    tenant_id = (SELECT get_tenant_id())
    AND user_id = (SELECT auth.uid())
  );

DROP POLICY IF EXISTS "notifications_insert_tenant" ON notifications;
CREATE POLICY "notifications_insert_tenant" ON notifications
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = (SELECT get_tenant_id())
  );

DROP POLICY IF EXISTS "notifications_update_own" ON notifications;
CREATE POLICY "notifications_update_own" ON notifications
  FOR UPDATE TO authenticated
  USING (
    tenant_id = (SELECT get_tenant_id())
    AND user_id = (SELECT auth.uid())
  )
  WITH CHECK (
    tenant_id = (SELECT get_tenant_id())
    AND user_id = (SELECT auth.uid())
  );

DROP POLICY IF EXISTS "notifications_delete_own" ON notifications;
CREATE POLICY "notifications_delete_own" ON notifications
  FOR DELETE TO authenticated
  USING (
    tenant_id = (SELECT get_tenant_id())
    AND user_id = (SELECT auth.uid())
  );

-- ============================================================
-- FASE 5: notification_preferences (4 policies)
-- Isolamento: tenant_id + user_id
-- ============================================================

DROP POLICY IF EXISTS "notification_preferences_select_own" ON notification_preferences;
CREATE POLICY "notification_preferences_select_own" ON notification_preferences
  FOR SELECT TO authenticated
  USING (
    tenant_id = (SELECT get_tenant_id())
    AND user_id = (SELECT auth.uid())
  );

DROP POLICY IF EXISTS "notification_preferences_insert_own" ON notification_preferences;
CREATE POLICY "notification_preferences_insert_own" ON notification_preferences
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = (SELECT get_tenant_id())
    AND user_id = (SELECT auth.uid())
  );

DROP POLICY IF EXISTS "notification_preferences_update_own" ON notification_preferences;
CREATE POLICY "notification_preferences_update_own" ON notification_preferences
  FOR UPDATE TO authenticated
  USING (
    tenant_id = (SELECT get_tenant_id())
    AND user_id = (SELECT auth.uid())
  )
  WITH CHECK (
    tenant_id = (SELECT get_tenant_id())
    AND user_id = (SELECT auth.uid())
  );

DROP POLICY IF EXISTS "notification_preferences_delete_own" ON notification_preferences;
CREATE POLICY "notification_preferences_delete_own" ON notification_preferences
  FOR DELETE TO authenticated
  USING (
    tenant_id = (SELECT get_tenant_id())
    AND user_id = (SELECT auth.uid())
  );

-- ============================================================
-- FASE 5: drive_folders (4 policies)
-- Isolamento: apenas tenant_id
-- ============================================================

DROP POLICY IF EXISTS "drive_folders_select_tenant" ON drive_folders;
CREATE POLICY "drive_folders_select_tenant" ON drive_folders
  FOR SELECT TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()));

DROP POLICY IF EXISTS "drive_folders_insert_tenant" ON drive_folders;
CREATE POLICY "drive_folders_insert_tenant" ON drive_folders
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = (SELECT get_tenant_id()));

DROP POLICY IF EXISTS "drive_folders_update_tenant" ON drive_folders;
CREATE POLICY "drive_folders_update_tenant" ON drive_folders
  FOR UPDATE TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()))
  WITH CHECK (tenant_id = (SELECT get_tenant_id()));

DROP POLICY IF EXISTS "drive_folders_delete_tenant" ON drive_folders;
CREATE POLICY "drive_folders_delete_tenant" ON drive_folders
  FOR DELETE TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()));

-- ============================================================
-- FASE 5: whatsapp_messages (4 policies)
-- Isolamento: apenas tenant_id
-- ============================================================

DROP POLICY IF EXISTS "whatsapp_messages_select_tenant" ON whatsapp_messages;
CREATE POLICY "whatsapp_messages_select_tenant" ON whatsapp_messages
  FOR SELECT TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()));

DROP POLICY IF EXISTS "whatsapp_messages_insert_tenant" ON whatsapp_messages;
CREATE POLICY "whatsapp_messages_insert_tenant" ON whatsapp_messages
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = (SELECT get_tenant_id()));

DROP POLICY IF EXISTS "whatsapp_messages_update_tenant" ON whatsapp_messages;
CREATE POLICY "whatsapp_messages_update_tenant" ON whatsapp_messages
  FOR UPDATE TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()))
  WITH CHECK (tenant_id = (SELECT get_tenant_id()));

DROP POLICY IF EXISTS "whatsapp_messages_delete_tenant" ON whatsapp_messages;
CREATE POLICY "whatsapp_messages_delete_tenant" ON whatsapp_messages
  FOR DELETE TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()));

-- ============================================================
-- FASE 5: integration_events (4 policies)
-- Isolamento: apenas tenant_id
-- ============================================================

DROP POLICY IF EXISTS "integration_events_select_tenant" ON integration_events;
CREATE POLICY "integration_events_select_tenant" ON integration_events
  FOR SELECT TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()));

DROP POLICY IF EXISTS "integration_events_insert_tenant" ON integration_events;
CREATE POLICY "integration_events_insert_tenant" ON integration_events
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = (SELECT get_tenant_id()));

DROP POLICY IF EXISTS "integration_events_update_tenant" ON integration_events;
CREATE POLICY "integration_events_update_tenant" ON integration_events
  FOR UPDATE TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()))
  WITH CHECK (tenant_id = (SELECT get_tenant_id()));

DROP POLICY IF EXISTS "integration_events_delete_tenant" ON integration_events;
CREATE POLICY "integration_events_delete_tenant" ON integration_events
  FOR DELETE TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()));

-- ============================================================
-- FASE 6: allocations (3 policies, sem DELETE)
-- Isolamento: apenas tenant_id
-- ============================================================

DROP POLICY IF EXISTS "allocations_select_tenant" ON allocations;
CREATE POLICY "allocations_select_tenant" ON allocations
  FOR SELECT TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()));

DROP POLICY IF EXISTS "allocations_insert_tenant" ON allocations;
CREATE POLICY "allocations_insert_tenant" ON allocations
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = (SELECT get_tenant_id()));

DROP POLICY IF EXISTS "allocations_update_tenant" ON allocations;
CREATE POLICY "allocations_update_tenant" ON allocations
  FOR UPDATE TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()))
  WITH CHECK (tenant_id = (SELECT get_tenant_id()));

-- ============================================================
-- FASE 6: approval_requests (3 policies, sem DELETE)
-- Isolamento: apenas tenant_id
-- ============================================================

DROP POLICY IF EXISTS "approval_requests_select_tenant" ON approval_requests;
CREATE POLICY "approval_requests_select_tenant" ON approval_requests
  FOR SELECT TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()));

DROP POLICY IF EXISTS "approval_requests_insert_tenant" ON approval_requests;
CREATE POLICY "approval_requests_insert_tenant" ON approval_requests
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = (SELECT get_tenant_id()));

DROP POLICY IF EXISTS "approval_requests_update_tenant" ON approval_requests;
CREATE POLICY "approval_requests_update_tenant" ON approval_requests
  FOR UPDATE TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()))
  WITH CHECK (tenant_id = (SELECT get_tenant_id()));

-- ============================================================
-- FASE 6: approval_logs (2 policies, sem UPDATE/DELETE)
-- Isolamento: apenas tenant_id (tabela imutavel)
-- ============================================================

DROP POLICY IF EXISTS "approval_logs_select_tenant" ON approval_logs;
CREATE POLICY "approval_logs_select_tenant" ON approval_logs
  FOR SELECT TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()));

DROP POLICY IF EXISTS "approval_logs_insert_tenant" ON approval_logs;
CREATE POLICY "approval_logs_insert_tenant" ON approval_logs
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = (SELECT get_tenant_id()));

-- ============================================================
-- FASES 1 e 4: Correcao dinamica de TODAS as policies restantes
-- que usam get_tenant_id() sem wrapper (SELECT ...).
--
-- Abordagem: bloco DO anonimo que consulta pg_policies,
-- encontra policies afetadas, faz DROP + CREATE com o
-- padrao corrigido. Cada policy e tratada individualmente
-- com handler de excecao para nao travar a migration.
--
-- Nota: pg_policies.qual/with_check retornam a expressao
-- normalizada pelo parser. O replace cobre tanto
-- get_tenant_id() quanto public.get_tenant_id().
-- ============================================================

DO $$
DECLARE
  rec RECORD;
  v_sql TEXT;
  v_using TEXT;
  v_with_check TEXT;
  v_cmd TEXT;
  v_roles TEXT;
  v_fixed INT := 0;
  v_skipped INT := 0;
BEGIN
  -- Encontrar todas as policies que usam get_tenant_id() sem wrapper
  FOR rec IN
    SELECT
      schemaname,
      tablename,
      policyname,
      permissive,
      roles,
      cmd,
      qual,
      with_check
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (
        (qual IS NOT NULL
         AND qual LIKE '%get_tenant_id()%'
         AND qual NOT LIKE '%(select get_tenant_id())%'
         AND qual NOT LIKE '%(SELECT get_tenant_id())%'
         AND qual NOT LIKE '%(select public.get_tenant_id())%'
         AND qual NOT LIKE '%(SELECT public.get_tenant_id())%')
        OR
        (with_check IS NOT NULL
         AND with_check LIKE '%get_tenant_id()%'
         AND with_check NOT LIKE '%(select get_tenant_id())%'
         AND with_check NOT LIKE '%(SELECT get_tenant_id())%'
         AND with_check NOT LIKE '%(select public.get_tenant_id())%'
         AND with_check NOT LIKE '%(SELECT public.get_tenant_id())%')
      )
  LOOP
    BEGIN
      RAISE NOTICE 'Fixing policy: %.% -> %', rec.schemaname, rec.tablename, rec.policyname;

      -- Corrigir USING: substituir get_tenant_id() por (SELECT get_tenant_id())
      -- Cobrir tanto get_tenant_id() quanto public.get_tenant_id()
      v_using := rec.qual;
      IF v_using IS NOT NULL THEN
        v_using := replace(v_using, 'public.get_tenant_id()', '(SELECT public.get_tenant_id())');
        v_using := replace(v_using, 'get_tenant_id()', '(SELECT get_tenant_id())');
        -- Evitar duplo wrapper: (SELECT (SELECT get_tenant_id()))
        v_using := replace(v_using, '(SELECT (SELECT', '(SELECT');
      END IF;

      -- Corrigir WITH CHECK
      v_with_check := rec.with_check;
      IF v_with_check IS NOT NULL THEN
        v_with_check := replace(v_with_check, 'public.get_tenant_id()', '(SELECT public.get_tenant_id())');
        v_with_check := replace(v_with_check, 'get_tenant_id()', '(SELECT get_tenant_id())');
        v_with_check := replace(v_with_check, '(SELECT (SELECT', '(SELECT');
      END IF;

      -- Determinar o comando (SELECT, INSERT, UPDATE, DELETE, ALL)
      v_cmd := rec.cmd;

      -- Determinar roles
      IF rec.roles = '{public}' OR rec.roles IS NULL THEN
        v_roles := '';
      ELSE
        v_roles := ' TO ' || array_to_string(rec.roles, ', ');
      END IF;

      -- DROP existente
      v_sql := format('DROP POLICY IF EXISTS %I ON %I.%I',
        rec.policyname, rec.schemaname, rec.tablename);
      EXECUTE v_sql;

      -- BUILD CREATE POLICY statement
      v_sql := format('CREATE POLICY %I ON %I.%I',
        rec.policyname, rec.schemaname, rec.tablename);

      -- Permissive/Restrictive (PERMISSIVE e padrao, nao precisa)
      IF rec.permissive != 'PERMISSIVE' THEN
        v_sql := v_sql || ' AS RESTRICTIVE';
      END IF;

      -- FOR command
      v_sql := v_sql || ' FOR ' || v_cmd;

      -- TO roles
      v_sql := v_sql || v_roles;

      -- USING clause (nao aplicavel a INSERT)
      IF v_using IS NOT NULL AND v_cmd != 'INSERT' THEN
        v_sql := v_sql || ' USING (' || v_using || ')';
      END IF;

      -- WITH CHECK clause (aplicavel a INSERT, UPDATE, ALL)
      IF v_with_check IS NOT NULL AND v_cmd IN ('INSERT', 'UPDATE', 'ALL') THEN
        v_sql := v_sql || ' WITH CHECK (' || v_with_check || ')';
      END IF;

      RAISE NOTICE 'Executing: %', v_sql;
      EXECUTE v_sql;
      v_fixed := v_fixed + 1;

    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to fix policy %.%.%: %',
        rec.schemaname, rec.tablename, rec.policyname, SQLERRM;
      v_skipped := v_skipped + 1;
    END;
  END LOOP;

  RAISE NOTICE 'Dynamic fix complete: % fixed, % skipped', v_fixed, v_skipped;
END $$;

-- ============================================================
-- VERIFICACAO FINAL
-- ============================================================
-- Apos aplicar, executar esta query para confirmar que ZERO
-- policies usam get_tenant_id() sem wrapper:
--
-- SELECT schemaname, tablename, policyname, qual, with_check
-- FROM pg_policies
-- WHERE (qual LIKE '%get_tenant_id()%'
--        AND qual NOT LIKE '%(select get_tenant_id())%'
--        AND qual NOT LIKE '%(SELECT get_tenant_id())%')
--    OR (with_check LIKE '%get_tenant_id()%'
--        AND with_check NOT LIKE '%(select get_tenant_id())%'
--        AND with_check NOT LIKE '%(SELECT get_tenant_id())%');
--
-- Resultado esperado: 0 rows
-- ============================================================
