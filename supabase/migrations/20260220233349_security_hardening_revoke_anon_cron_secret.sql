
-- ============================================================
-- Migration: Security Hardening — Parte 1
-- Data: 2026-02-20
-- Descricao:
--   1. REVOKE ALL from anon em todas as tabelas public
--   2. Fix created_by nullable em jobs, drive_folders, report_snapshots
--   3. Armazenar CRON_SECRET no Vault
--   4. Atualizar pg_cron para incluir X-Cron-Secret header
-- Idempotente: sim
-- ============================================================

SET search_path = public, extensions, cron, net;

-- ============================================================
-- 1. REVOKE ALL from anon em todas as tabelas public
-- A role anon NAO precisa de acesso direto a tabelas.
-- Todos os endpoints publicos usam service_role via Edge Functions.
-- A role authenticated mantem seus grants intactos.
-- ============================================================

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;

-- ============================================================
-- 2. Fix created_by nullable
-- Estas tabelas tem created_by UUID nullable mas deveriam ser NOT NULL
-- para garantir audit trail completo. Zero registros NULL existem.
-- ============================================================

ALTER TABLE jobs ALTER COLUMN created_by SET NOT NULL;
ALTER TABLE drive_folders ALTER COLUMN created_by SET NOT NULL;
ALTER TABLE report_snapshots ALTER COLUMN created_by SET NOT NULL;

-- ============================================================
-- 3. Armazenar CRON_SECRET no Vault
-- O secret e usado pelo pg_cron para autenticar chamadas ao
-- integration-processor Edge Function.
-- ============================================================

SELECT write_secret('CRON_SECRET', 'ellahos-cron-' || gen_random_uuid()::text);

-- ============================================================
-- 4. Atualizar pg_cron para incluir X-Cron-Secret header
-- Le o secret do Vault no momento da chamada HTTP.
-- ============================================================

DO $$
BEGIN
  PERFORM cron.unschedule('process-integration-queue');
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'process-integration-queue',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://etvapcxesaxhsvzgaane.supabase.co/functions/v1/integration-processor',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-Cron-Secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'CRON_SECRET' LIMIT 1)
    ),
    body := '{"source": "pg_cron", "batch_size": 20}'::jsonb
  );
  $$
);
