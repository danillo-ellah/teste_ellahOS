-- ============================================================
-- Migration: Fase 5.2 — pg_cron Jobs
-- Data: 2026-02-19
-- Descricao: Criar 2 pg_cron jobs:
--   1. process-integration-queue: a cada minuto, invoca Edge Function
--      integration-processor via pg_net HTTP POST (batch de 20 eventos)
--   2. daily-deadline-alerts: diario as 11h UTC (08h BRT), SQL puro
--      que verifica prazos de pagamento, diarias e entregaveis,
--      criando notificacoes e eventos de integracao (WhatsApp)
-- Idempotente: sim (cron.unschedule antes de cron.schedule)
-- Limite Free plan: 2 cron jobs — estamos no limite exato
-- ============================================================

-- Fixar search_path para seguranca
SET search_path = public, extensions, cron, net;

-- ============================================================
-- 1. REMOVER JOBS EXISTENTES (idempotencia)
-- cron.unschedule retorna void e nao da erro se o job nao existe,
-- mas por seguranca usamos bloco DO com tratamento de excecao.
-- ============================================================

DO $$
BEGIN
  -- Remover job 1 se existir
  PERFORM cron.unschedule('process-integration-queue');
EXCEPTION
  WHEN OTHERS THEN NULL; -- Job nao existe, ignorar
END $$;

DO $$
BEGIN
  -- Remover job 2 se existir
  PERFORM cron.unschedule('daily-deadline-alerts');
EXCEPTION
  WHEN OTHERS THEN NULL; -- Job nao existe, ignorar
END $$;

-- ============================================================
-- 2. JOB 1: Processador de fila de integracoes (a cada minuto)
-- ============================================================
-- Invoca a Edge Function integration-processor via pg_net HTTP POST.
-- A Edge Function usa verify_jwt: false (padrao do projeto) e valida
-- internamente via header X-Cron-Secret ou aceita chamadas do pg_cron.
-- Nao envia Authorization header — seguranca delegada a Edge Function.
--
-- Parametros no body:
--   source: "pg_cron" — identifica a origem da chamada
--   batch_size: 20 — numero maximo de eventos por execucao
-- ============================================================

SELECT cron.schedule(
  'process-integration-queue',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://etvapcxesaxhsvzgaane.supabase.co/functions/v1/integration-processor',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{"source": "pg_cron", "batch_size": 20}'::jsonb
  );
  $$
);

-- ============================================================
-- 3. JOB 2: Alertas diarios de prazos (08h BRT = 11h UTC)
-- ============================================================
-- SQL puro que roda direto no banco, sem Edge Function.
-- Verifica 3 tipos de alerta:
--   A) Pagamento se aproximando (financial_records.due_date em 7, 3 ou 1 dia)
--   B) Diaria de filmagem proxima (job_shooting_dates.shooting_date em 3 dias)
--   C) Entregavel atrasado (job_deliverables.delivery_date ja passou, status != 'entregue')
--
-- Regras:
--   - Somente registros com deleted_at IS NULL
--   - Somente jobs com deleted_at IS NULL
--   - Deduplicacao: NOT EXISTS notificacao do mesmo tipo+job no mesmo dia
--   - Entregavel atrasado: reenvio a cada 2 dias (dia par/impar alternado)
--   - Destinatarios: membros da job_team com profile_id vinculado via people
--   - Cria notificacao in-app + integration_event (whatsapp_send) por destinatario
-- ============================================================

SELECT cron.schedule(
  'daily-deadline-alerts',
  '0 11 * * *',
  $$

  -- -------------------------------------------------------
  -- A) ALERTA: Pagamento se aproximando (7, 3, 1 dia)
  -- Destinatarios: produtor_executivo (PE) e financeiro do tenant
  -- -------------------------------------------------------
  WITH payment_alerts AS (
    SELECT
      fr.id AS record_id,
      fr.tenant_id,
      fr.job_id,
      fr.description AS record_description,
      fr.amount,
      fr.due_date,
      (fr.due_date - CURRENT_DATE) AS days_until_due,
      j.code AS job_code,
      CASE
        WHEN (fr.due_date - CURRENT_DATE) = 1 THEN 'urgent'
        WHEN (fr.due_date - CURRENT_DATE) = 3 THEN 'high'
        ELSE 'normal'
      END AS alert_priority
    FROM financial_records fr
    INNER JOIN jobs j ON j.id = fr.job_id AND j.deleted_at IS NULL
    WHERE fr.deleted_at IS NULL
      AND fr.status = 'pendente'
      AND fr.due_date IS NOT NULL
      AND (fr.due_date - CURRENT_DATE) IN (7, 3, 1)
      -- Deduplicacao: nao gerar se ja existe notificacao hoje para este record
      AND NOT EXISTS (
        SELECT 1 FROM notifications n
        WHERE n.type = 'deadline_approaching'
          AND n.job_id = fr.job_id
          AND n.metadata @> jsonb_build_object('financial_record_id', fr.id::text)
          AND n.created_at::date = CURRENT_DATE
      )
  ),
  -- Destinatarios de alerta financeiro: PE + financeiro do tenant via profiles
  payment_recipients AS (
    SELECT DISTINCT
      pa.record_id,
      pa.tenant_id,
      pa.job_id,
      pa.record_description,
      pa.amount,
      pa.due_date,
      pa.days_until_due,
      pa.job_code,
      pa.alert_priority,
      p.id AS user_id,
      pe.phone AS user_phone,
      p.full_name AS user_name
    FROM payment_alerts pa
    INNER JOIN profiles p ON p.tenant_id = pa.tenant_id
      AND p.deleted_at IS NULL
      AND p.is_active = true
      AND p.role IN ('produtor_executivo', 'financeiro', 'admin', 'ceo')
    LEFT JOIN people pe ON pe.profile_id = p.id
      AND pe.deleted_at IS NULL
  ),
  -- Inserir notificacoes para pagamentos
  payment_notifications AS (
    INSERT INTO notifications (tenant_id, user_id, type, priority, title, body, metadata, action_url, job_id)
    SELECT
      pr.tenant_id,
      pr.user_id,
      'deadline_approaching',
      pr.alert_priority,
      CASE
        WHEN pr.days_until_due = 1 THEN 'Pagamento amanha: ' || COALESCE(pr.job_code, 'sem job')
        WHEN pr.days_until_due = 3 THEN 'Pagamento em 3 dias: ' || COALESCE(pr.job_code, 'sem job')
        ELSE 'Pagamento em 7 dias: ' || COALESCE(pr.job_code, 'sem job')
      END,
      'R$ ' || TRIM(TO_CHAR(pr.amount, '999G999G999D99')) || ' - ' || pr.record_description
        || ' (vence ' || TO_CHAR(pr.due_date, 'DD/MM') || ')',
      jsonb_build_object(
        'alert_subtype', 'payment_approaching',
        'financial_record_id', pr.record_id::text,
        'days_until_due', pr.days_until_due,
        'amount', pr.amount,
        'due_date', pr.due_date
      ),
      CASE
        WHEN pr.job_id IS NOT NULL THEN '/jobs/' || pr.job_id
        ELSE NULL
      END,
      pr.job_id
    FROM payment_recipients pr
    RETURNING id, tenant_id, user_id, metadata, job_id
  ),
  -- Criar eventos de integracao WhatsApp para pagamentos
  payment_whatsapp AS (
    INSERT INTO integration_events (tenant_id, event_type, payload, idempotency_key)
    SELECT
      pr.tenant_id,
      'whatsapp_send',
      jsonb_build_object(
        'phone', pr.user_phone,
        'recipient_name', pr.user_name,
        'template', 'payment_approaching',
        'job_code', pr.job_code,
        'amount', pr.amount,
        'due_date', TO_CHAR(pr.due_date, 'DD/MM/YYYY'),
        'days_until_due', pr.days_until_due,
        'job_id', pr.job_id
      ),
      'pay-alert:' || pr.record_id || ':' || pr.user_id || ':' || CURRENT_DATE::text
    FROM payment_recipients pr
    WHERE pr.user_phone IS NOT NULL
    ON CONFLICT (idempotency_key) DO NOTHING
  ),

  -- -------------------------------------------------------
  -- B) ALERTA: Diaria de filmagem em 3 dias
  -- Destinatarios: toda a equipe do job (job_team → people → profile_id)
  -- -------------------------------------------------------
  shooting_alerts AS (
    SELECT
      sd.id AS shooting_id,
      sd.tenant_id,
      sd.job_id,
      sd.shooting_date,
      sd.description AS shooting_description,
      sd.location,
      j.code AS job_code
    FROM job_shooting_dates sd
    INNER JOIN jobs j ON j.id = sd.job_id AND j.deleted_at IS NULL
    WHERE sd.deleted_at IS NULL
      AND (sd.shooting_date - CURRENT_DATE) = 3
      -- Deduplicacao
      AND NOT EXISTS (
        SELECT 1 FROM notifications n
        WHERE n.type = 'shooting_date_approaching'
          AND n.job_id = sd.job_id
          AND n.metadata @> jsonb_build_object('shooting_date_id', sd.id::text)
          AND n.created_at::date = CURRENT_DATE
      )
  ),
  -- Destinatarios: membros da equipe com profile vinculado
  shooting_recipients AS (
    SELECT DISTINCT
      sa.shooting_id,
      sa.tenant_id,
      sa.job_id,
      sa.shooting_date,
      sa.shooting_description,
      sa.location,
      sa.job_code,
      p.profile_id AS user_id,
      p.phone AS user_phone,
      p.full_name AS user_name
    FROM shooting_alerts sa
    INNER JOIN job_team jt ON jt.job_id = sa.job_id
      AND jt.deleted_at IS NULL
      AND jt.tenant_id = sa.tenant_id
    INNER JOIN people p ON p.id = jt.person_id
      AND p.deleted_at IS NULL
      AND p.profile_id IS NOT NULL
  ),
  -- Inserir notificacoes de diaria
  shooting_notifications AS (
    INSERT INTO notifications (tenant_id, user_id, type, priority, title, body, metadata, action_url, job_id)
    SELECT
      sr.tenant_id,
      sr.user_id,
      'shooting_date_approaching',
      'high',
      'Diaria em 3 dias: ' || sr.job_code,
      COALESCE(sr.shooting_description, 'Diaria de filmagem')
        || ' em ' || TO_CHAR(sr.shooting_date, 'DD/MM')
        || COALESCE(' - ' || sr.location, ''),
      jsonb_build_object(
        'shooting_date_id', sr.shooting_id::text,
        'shooting_date', sr.shooting_date,
        'location', sr.location
      ),
      '/jobs/' || sr.job_id,
      sr.job_id
    FROM shooting_recipients sr
    RETURNING id, tenant_id, user_id, metadata, job_id
  ),
  -- WhatsApp para diarias
  shooting_whatsapp AS (
    INSERT INTO integration_events (tenant_id, event_type, payload, idempotency_key)
    SELECT
      sr.tenant_id,
      'whatsapp_send',
      jsonb_build_object(
        'phone', sr.user_phone,
        'recipient_name', sr.user_name,
        'template', 'shooting_date_approaching',
        'job_code', sr.job_code,
        'shooting_date', TO_CHAR(sr.shooting_date, 'DD/MM/YYYY'),
        'location', sr.location,
        'job_id', sr.job_id
      ),
      'shoot-alert:' || sr.shooting_id || ':' || sr.user_id || ':' || CURRENT_DATE::text
    FROM shooting_recipients sr
    WHERE sr.user_phone IS NOT NULL
    ON CONFLICT (idempotency_key) DO NOTHING
  ),

  -- -------------------------------------------------------
  -- C) ALERTA: Entregavel atrasado
  -- delivery_date ja passou e status != 'entregue'
  -- Reenvio a cada 2 dias (verifica se ultimo alerta tem >= 2 dias)
  -- Destinatarios: PE + coordenador_producao do job
  -- -------------------------------------------------------
  overdue_alerts AS (
    SELECT
      d.id AS deliverable_id,
      d.tenant_id,
      d.job_id,
      d.description AS deliverable_description,
      d.delivery_date,
      d.status AS deliverable_status,
      (CURRENT_DATE - d.delivery_date) AS days_overdue,
      j.code AS job_code
    FROM job_deliverables d
    INNER JOIN jobs j ON j.id = d.job_id AND j.deleted_at IS NULL
    WHERE d.deleted_at IS NULL
      AND d.delivery_date IS NOT NULL
      AND d.delivery_date < CURRENT_DATE
      AND d.status != 'entregue'
      -- Deduplicacao: nao alertar se ja alertou nos ultimos 2 dias
      AND NOT EXISTS (
        SELECT 1 FROM notifications n
        WHERE n.type = 'deliverable_overdue'
          AND n.metadata @> jsonb_build_object('deliverable_id', d.id::text)
          AND n.created_at::date >= (CURRENT_DATE - INTERVAL '1 day')
      )
  ),
  -- Destinatarios: PE e coordenador da equipe do job
  overdue_recipients AS (
    SELECT DISTINCT
      oa.deliverable_id,
      oa.tenant_id,
      oa.job_id,
      oa.deliverable_description,
      oa.delivery_date,
      oa.deliverable_status,
      oa.days_overdue,
      oa.job_code,
      p.profile_id AS user_id,
      p.phone AS user_phone,
      p.full_name AS user_name
    FROM overdue_alerts oa
    INNER JOIN job_team jt ON jt.job_id = oa.job_id
      AND jt.deleted_at IS NULL
      AND jt.tenant_id = oa.tenant_id
      AND jt.role IN ('produtor_executivo', 'coordenador_producao')
    INNER JOIN people p ON p.id = jt.person_id
      AND p.deleted_at IS NULL
      AND p.profile_id IS NOT NULL
  ),
  -- Inserir notificacoes de entregavel atrasado
  overdue_notifications AS (
    INSERT INTO notifications (tenant_id, user_id, type, priority, title, body, metadata, action_url, job_id)
    SELECT
      odr.tenant_id,
      odr.user_id,
      'deliverable_overdue',
      CASE
        WHEN odr.days_overdue >= 7 THEN 'urgent'
        WHEN odr.days_overdue >= 3 THEN 'high'
        ELSE 'normal'
      END,
      'Entregavel atrasado: ' || odr.job_code,
      odr.deliverable_description
        || ' (atrasado ' || odr.days_overdue || ' dia'
        || CASE WHEN odr.days_overdue > 1 THEN 's' ELSE '' END || ')'
        || ' - prazo era ' || TO_CHAR(odr.delivery_date, 'DD/MM'),
      jsonb_build_object(
        'deliverable_id', odr.deliverable_id::text,
        'delivery_date', odr.delivery_date,
        'days_overdue', odr.days_overdue,
        'deliverable_status', odr.deliverable_status
      ),
      '/jobs/' || odr.job_id,
      odr.job_id
    FROM overdue_recipients odr
    RETURNING id, tenant_id, user_id, metadata, job_id
  ),
  -- WhatsApp para entregaveis atrasados
  overdue_whatsapp AS (
    INSERT INTO integration_events (tenant_id, event_type, payload, idempotency_key)
    SELECT
      odr.tenant_id,
      'whatsapp_send',
      jsonb_build_object(
        'phone', odr.user_phone,
        'recipient_name', odr.user_name,
        'template', 'deliverable_overdue',
        'job_code', odr.job_code,
        'deliverable', odr.deliverable_description,
        'days_overdue', odr.days_overdue,
        'delivery_date', TO_CHAR(odr.delivery_date, 'DD/MM/YYYY'),
        'job_id', odr.job_id
      ),
      'overdue-alert:' || odr.deliverable_id || ':' || odr.user_id || ':' || CURRENT_DATE::text
    FROM overdue_recipients odr
    WHERE odr.user_phone IS NOT NULL
    ON CONFLICT (idempotency_key) DO NOTHING
  )

  -- CTE final: SELECT obrigatorio para fechar o statement
  SELECT 1;

  $$
);

-- ============================================================
-- 4. INDICES AUXILIARES PARA PERFORMANCE DOS ALERTAS
-- O cron job faz JOINs pesados. Indices parciais ajudam.
-- ============================================================

-- financial_records: busca por due_date em registros pendentes ativos
CREATE INDEX IF NOT EXISTS idx_financial_records_due_date_pending
  ON financial_records(due_date)
  WHERE status = 'pendente'
    AND deleted_at IS NULL
    AND due_date IS NOT NULL;

-- job_shooting_dates: busca por shooting_date em registros ativos
CREATE INDEX IF NOT EXISTS idx_job_shooting_dates_upcoming
  ON job_shooting_dates(shooting_date)
  WHERE deleted_at IS NULL;

-- job_deliverables: busca por delivery_date em entregaveis nao entregues
CREATE INDEX IF NOT EXISTS idx_job_deliverables_overdue
  ON job_deliverables(delivery_date)
  WHERE status != 'entregue'
    AND deleted_at IS NULL
    AND delivery_date IS NOT NULL;

-- notifications: busca de deduplicacao (type + job_id + data)
-- Complementa o indice idx_notifications_job_id da Fase 5.1
CREATE INDEX IF NOT EXISTS idx_notifications_dedup
  ON notifications(type, job_id, created_at)
  WHERE job_id IS NOT NULL;

-- ============================================================
-- 5. VERIFICACAO (comentario informativo)
-- ============================================================
-- Apos aplicar esta migration, verificar:
--
-- SELECT jobid, jobname, schedule, command
-- FROM cron.job
-- ORDER BY jobid;
--
-- Esperado: 2 registros
--   1. process-integration-queue  |  * * * * *    |  SELECT net.http_post(...)
--   2. daily-deadline-alerts      |  0 11 * * *   |  WITH payment_alerts AS (...)
--
-- Para testar o job 2 manualmente (SEM esperar as 11h UTC):
--   SELECT cron.schedule('test-alerts', '* * * * *', (SELECT command FROM cron.job WHERE jobname = 'daily-deadline-alerts'));
--   -- Aguardar 1 minuto, verificar notifications e integration_events
--   SELECT cron.unschedule('test-alerts');
