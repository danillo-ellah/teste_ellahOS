-- ============================================================
-- Migration: Fase 5.1 — Infrastructure Foundation
-- Data: 2026-02-19
-- Descricao: Habilitar extensoes (pg_net, pg_cron), criar 5 tabelas
--   novas (notifications, notification_preferences, drive_folders,
--   whatsapp_messages, integration_events), alterar tabelas existentes
--   (jobs, job_files, people), atualizar trigger calculate_job_financials,
--   RLS policies, indices e Realtime publication.
-- Idempotente: sim (IF NOT EXISTS, DROP IF EXISTS, CREATE OR REPLACE)
-- ============================================================

-- Fixar search_path para seguranca
set search_path = public, extensions;

-- ============================================================
-- 1. EXTENSOES
-- ============================================================

-- pg_net: chamadas HTTP assincronas (usado pelo pg_cron para invocar Edge Functions)
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- pg_cron: agendamento de tarefas periodicas (processador de fila + alertas)
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- ============================================================
-- 2. ENUMS / TIPOS
-- Nota: a spec define ENUMs para notification_type, notification_priority,
-- notification_channel, integration_event_type. Porem, por decisao
-- arquitetural (ADR: folder_key TEXT, nao ENUM — flexibilidade sem
-- migrations), usamos TEXT com CHECK constraints em vez de ENUMs.
-- Isso permite adicionar valores novos sem ALTER TYPE.
-- ============================================================

-- Nenhum ENUM criado — CHECK constraints nas tabelas abaixo.

-- ============================================================
-- 3. TABELAS NOVAS
-- ============================================================

-- ----------------------------------------------------------
-- 3.1 notifications
-- Notificacoes in-app para usuarios. Filtradas por user_id
-- no RLS (usuario so ve as proprias).
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id       UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type          TEXT        NOT NULL,
  priority      TEXT        NOT NULL DEFAULT 'normal',
  title         TEXT        NOT NULL,
  body          TEXT,
  metadata      JSONB       DEFAULT '{}',
  action_url    TEXT,
  job_id        UUID        REFERENCES jobs(id) ON DELETE SET NULL,
  read_at       TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Validacao de type (valores da spec, extensivel)
  CONSTRAINT chk_notifications_type CHECK (
    type IN (
      'job_approved',
      'status_changed',
      'team_added',
      'deadline_approaching',
      'margin_alert',
      'deliverable_overdue',
      'shooting_date_approaching',
      'integration_failed'
    )
  ),

  -- Validacao de priority
  CONSTRAINT chk_notifications_priority CHECK (
    priority IN ('low', 'normal', 'high', 'urgent')
  )
);

COMMENT ON TABLE notifications IS 'Notificacoes in-app para usuarios. Entregues via Supabase Realtime.';
COMMENT ON COLUMN notifications.type IS 'Tipo da notificacao: job_approved, status_changed, team_added, deadline_approaching, margin_alert, deliverable_overdue, shooting_date_approaching, integration_failed';
COMMENT ON COLUMN notifications.priority IS 'Prioridade: low, normal, high, urgent';
COMMENT ON COLUMN notifications.metadata IS 'Dados extras especificos do tipo (ex: job_code, valor, nome do membro)';
COMMENT ON COLUMN notifications.action_url IS 'URL de destino ao clicar na notificacao (relativa, ex: /jobs/{id})';
COMMENT ON COLUMN notifications.read_at IS 'Timestamp de quando o usuario marcou como lida. NULL = nao lida.';

-- ----------------------------------------------------------
-- 3.2 notification_preferences
-- Preferencias de notificacao por usuario. UNIQUE(tenant_id, user_id).
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS notification_preferences (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id       UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  preferences   JSONB       NOT NULL DEFAULT '{"in_app":true,"whatsapp":false}',
  muted_types   TEXT[]      NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Um registro por usuario por tenant
  CONSTRAINT uq_notification_preferences_tenant_user UNIQUE (tenant_id, user_id)
);

COMMENT ON TABLE notification_preferences IS 'Preferencias de notificacao por usuario (canais habilitados, tipos silenciados).';
COMMENT ON COLUMN notification_preferences.preferences IS 'JSON com canais habilitados: {"in_app": bool, "whatsapp": bool, "email": bool}';
COMMENT ON COLUMN notification_preferences.muted_types IS 'Array de notification_type que o usuario silenciou';

-- ----------------------------------------------------------
-- 3.3 drive_folders
-- Mapeamento de pastas do Google Drive para jobs.
-- UNIQUE(tenant_id, job_id, folder_key) garante idempotencia.
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS drive_folders (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  job_id            UUID        NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  folder_key        TEXT        NOT NULL,
  google_drive_id   TEXT,
  url               TEXT,
  parent_folder_id  UUID        REFERENCES drive_folders(id) ON DELETE SET NULL,
  created_by        UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Uma pasta por key por job por tenant
  CONSTRAINT uq_drive_folders_tenant_job_key UNIQUE (tenant_id, job_id, folder_key)
);

COMMENT ON TABLE drive_folders IS 'Mapeamento de pastas Google Drive criadas por job. Uma entrada por pasta.';
COMMENT ON COLUMN drive_folders.folder_key IS 'Chave semantica da pasta (ex: root, documentos, financeiro, fin_carta_orcamento). Nao e ENUM para flexibilidade.';
COMMENT ON COLUMN drive_folders.google_drive_id IS 'ID da pasta no Google Drive (fileId retornado pela API)';
COMMENT ON COLUMN drive_folders.url IS 'URL direta para abrir a pasta no Drive';
COMMENT ON COLUMN drive_folders.parent_folder_id IS 'Auto-referencia para hierarquia de pastas (pasta pai)';

-- ----------------------------------------------------------
-- 3.4 whatsapp_messages
-- Log de mensagens WhatsApp enviadas pelo sistema.
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  job_id                UUID        REFERENCES jobs(id) ON DELETE SET NULL,
  phone                 TEXT        NOT NULL,
  recipient_name        TEXT,
  message               TEXT        NOT NULL,
  status                TEXT        NOT NULL DEFAULT 'pending',
  provider              TEXT,
  external_message_id   TEXT,
  sent_at               TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Validacao de status
  CONSTRAINT chk_whatsapp_messages_status CHECK (
    status IN ('pending', 'sent', 'delivered', 'read', 'failed')
  ),

  -- Validacao de provider (quando informado)
  CONSTRAINT chk_whatsapp_messages_provider CHECK (
    provider IS NULL OR provider IN ('evolution', 'zapi')
  ),

  -- Telefone deve ter pelo menos 10 digitos
  CONSTRAINT chk_whatsapp_messages_phone CHECK (
    length(regexp_replace(phone, '[^0-9]', '', 'g')) >= 10
  )
);

COMMENT ON TABLE whatsapp_messages IS 'Log de mensagens WhatsApp enviadas via Evolution API ou Z-API. Somente leitura no frontend.';
COMMENT ON COLUMN whatsapp_messages.status IS 'Status da mensagem: pending, sent, delivered, read, failed';
COMMENT ON COLUMN whatsapp_messages.provider IS 'Provider usado: evolution ou zapi (feature flag)';
COMMENT ON COLUMN whatsapp_messages.external_message_id IS 'ID da mensagem retornado pelo provider (para tracking de status via webhook)';

-- ----------------------------------------------------------
-- 3.5 integration_events
-- Fila de eventos de integracao processada pelo pg_cron.
-- Lock atomico via locked_at + FOR UPDATE SKIP LOCKED.
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS integration_events (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  event_type        TEXT        NOT NULL,
  payload           JSONB       NOT NULL DEFAULT '{}',
  status            TEXT        NOT NULL DEFAULT 'pending',
  attempts          INT         NOT NULL DEFAULT 0,
  locked_at         TIMESTAMPTZ,
  started_at        TIMESTAMPTZ,
  processed_at      TIMESTAMPTZ,
  error_message     TEXT,
  next_retry_at     TIMESTAMPTZ,
  result            JSONB,
  idempotency_key   TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Idempotencia: chave unica para evitar duplicatas
  CONSTRAINT uq_integration_events_idempotency_key UNIQUE (idempotency_key),

  -- Validacao de event_type
  CONSTRAINT chk_integration_events_type CHECK (
    event_type IN (
      'drive_create_structure',
      'whatsapp_send',
      'n8n_webhook',
      'nf_request_sent',
      'nf_received',
      'nf_validated',
      'docuseal_submission_created',
      'docuseal_submission_signed',
      'docuseal_submission_failed'
    )
  ),

  -- Validacao de status
  CONSTRAINT chk_integration_events_status CHECK (
    status IN ('pending', 'processing', 'completed', 'failed', 'retrying')
  ),

  -- Attempts nao pode ser negativo
  CONSTRAINT chk_integration_events_attempts CHECK (attempts >= 0)
);

COMMENT ON TABLE integration_events IS 'Fila de eventos de integracao. Processada a cada minuto pelo pg_cron via integration-processor Edge Function.';
COMMENT ON COLUMN integration_events.event_type IS 'Tipo do evento: drive_create_structure, whatsapp_send, n8n_webhook, etc.';
COMMENT ON COLUMN integration_events.status IS 'Status: pending, processing, completed, failed, retrying';
COMMENT ON COLUMN integration_events.attempts IS 'Numero de tentativas de processamento (max 5)';
COMMENT ON COLUMN integration_events.locked_at IS 'Timestamp de lock atomico. Se locked_at < now() - 5min, considera-se stale e pode ser re-processado.';
COMMENT ON COLUMN integration_events.next_retry_at IS 'Proximo horario de retry (exponential backoff: 1min, 5min, 30min, 2h)';
COMMENT ON COLUMN integration_events.idempotency_key IS 'Chave unica para idempotencia (ex: drive:{jobId}, wf-approved:{jobId})';
COMMENT ON COLUMN integration_events.result IS 'Resultado do processamento (JSON livre, ex: URLs criadas, message_ids)';

-- ============================================================
-- 4. ALTERACOES EM TABELAS EXISTENTES
-- ============================================================

-- ----------------------------------------------------------
-- 4.1 jobs: ADD audio_company, risk_buffer
-- Nota: drive_folder_url ja existe na tabela (verificado via database.ts)
-- ----------------------------------------------------------
DO $$
BEGIN
  -- audio_company: produtora de audio terceirizada
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'jobs' AND column_name = 'audio_company'
  ) THEN
    ALTER TABLE jobs ADD COLUMN audio_company TEXT;
  END IF;

  -- risk_buffer: reserva de risco (valor monetario)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'jobs' AND column_name = 'risk_buffer'
  ) THEN
    ALTER TABLE jobs ADD COLUMN risk_buffer NUMERIC(12,2);
  END IF;
END $$;

COMMENT ON COLUMN jobs.audio_company IS 'Nome da produtora de audio terceirizada (quando has_contracted_audio = true)';
COMMENT ON COLUMN jobs.risk_buffer IS 'Reserva de risco em reais. Deduzida do lucro bruto na formula financeira.';

-- ----------------------------------------------------------
-- 4.2 job_files: ADD external_id, external_source
-- ----------------------------------------------------------
DO $$
BEGIN
  -- external_id: ID do arquivo no servico externo (ex: Google Drive fileId)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'job_files' AND column_name = 'external_id'
  ) THEN
    ALTER TABLE job_files ADD COLUMN external_id TEXT;
  END IF;

  -- external_source: origem do arquivo (ex: google_drive, supabase_storage)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'job_files' AND column_name = 'external_source'
  ) THEN
    ALTER TABLE job_files ADD COLUMN external_source TEXT;
  END IF;
END $$;

COMMENT ON COLUMN job_files.external_id IS 'ID do arquivo no servico externo (ex: Google Drive fileId)';
COMMENT ON COLUMN job_files.external_source IS 'Origem do arquivo: google_drive, supabase_storage, etc.';

-- ----------------------------------------------------------
-- 4.3 people: ADD CHECK constraint bank_info_valid_structure
-- bank_info deve ser NULL ou conter pelo menos pix_key ou bank_name
-- ----------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_schema = 'public' AND table_name = 'people'
      AND constraint_name = 'chk_people_bank_info_valid_structure'
  ) THEN
    -- Verificar se constraint ja existe por nome (metodo mais confiavel)
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'chk_people_bank_info_valid_structure'
        AND conrelid = 'people'::regclass
    ) THEN
      ALTER TABLE people
        ADD CONSTRAINT chk_people_bank_info_valid_structure
        CHECK (
          bank_info IS NULL
          OR bank_info = '{}'::jsonb
          OR bank_info ? 'pix_key'
          OR bank_info ? 'bank_name'
        );
    END IF;
  END IF;
END $$;

COMMENT ON CONSTRAINT chk_people_bank_info_valid_structure ON people
  IS 'bank_info deve ser NULL ou conter pelo menos pix_key ou bank_name como chave JSONB';

-- ============================================================
-- 5. ATUALIZAR TRIGGER calculate_job_financials()
-- Formula anterior: gross_profit = closed_value - production_cost - tax_value
-- Formula nova:     gross_profit = closed_value - production_cost - tax_value - other_costs - risk_buffer
-- ============================================================

CREATE OR REPLACE FUNCTION calculate_job_financials()
RETURNS TRIGGER
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  -- Calcular imposto
  IF NEW.closed_value IS NOT NULL AND NEW.closed_value > 0 THEN
    NEW.tax_value := ROUND(NEW.closed_value * (NEW.tax_percentage / 100), 2);
  ELSE
    NEW.tax_value := NULL;
  END IF;

  -- Calcular lucro bruto (formula atualizada na Fase 5.1)
  -- gross_profit = closed_value - production_cost - tax_value - other_costs - risk_buffer
  IF NEW.closed_value IS NOT NULL AND NEW.closed_value > 0 THEN
    NEW.gross_profit := ROUND(
      NEW.closed_value
      - COALESCE(NEW.production_cost, 0)
      - COALESCE(NEW.tax_value, 0)
      - COALESCE(NEW.other_costs, 0)
      - COALESCE(NEW.risk_buffer, 0),
      2
    );
  ELSE
    NEW.gross_profit := NULL;
  END IF;

  -- Calcular margem percentual
  IF NEW.closed_value IS NOT NULL AND NEW.closed_value > 0
     AND NEW.gross_profit IS NOT NULL THEN
    NEW.margin_percentage := ROUND(
      (NEW.gross_profit / NEW.closed_value) * 100, 2
    );
  ELSE
    NEW.margin_percentage := NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- O trigger set_job_financials ja existe e aponta para esta function.
-- CREATE OR REPLACE acima atualiza a function in-place, sem precisar
-- recriar o trigger.

-- ============================================================
-- 6. TRIGGERS updated_at PARA TABELAS NOVAS
-- A function update_updated_at_column() ja existe no banco.
-- Criamos triggers apenas para tabelas que possuem updated_at.
-- ============================================================

-- notification_preferences tem updated_at (funcao real: update_updated_at)
DROP TRIGGER IF EXISTS trg_notification_preferences_updated_at ON notification_preferences;
CREATE TRIGGER trg_notification_preferences_updated_at
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Nota: notifications, drive_folders, whatsapp_messages e integration_events
-- NAO possuem coluna updated_at (sao registros de log/evento, somente created_at).
-- Portanto nao precisam do trigger.

-- ============================================================
-- 7. RLS POLICIES
-- Padrao existente: get_tenant_id() retorna tenant_id do JWT.
-- Policies aplicam isolamento por tenant + user_id onde necessario.
-- ============================================================

-- ----------------------------------------------------------
-- 7.1 notifications
-- Isolamento: tenant_id + user_id (usuario so ve as proprias)
-- ----------------------------------------------------------
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_select_own" ON notifications;
CREATE POLICY "notifications_select_own" ON notifications
  FOR SELECT
  USING (
    tenant_id = get_tenant_id()
    AND user_id = (select auth.uid())
  );

DROP POLICY IF EXISTS "notifications_insert_tenant" ON notifications;
CREATE POLICY "notifications_insert_tenant" ON notifications
  FOR INSERT
  WITH CHECK (
    tenant_id = get_tenant_id()
  );

DROP POLICY IF EXISTS "notifications_update_own" ON notifications;
CREATE POLICY "notifications_update_own" ON notifications
  FOR UPDATE
  USING (
    tenant_id = get_tenant_id()
    AND user_id = (select auth.uid())
  )
  WITH CHECK (
    tenant_id = get_tenant_id()
    AND user_id = (select auth.uid())
  );

DROP POLICY IF EXISTS "notifications_delete_own" ON notifications;
CREATE POLICY "notifications_delete_own" ON notifications
  FOR DELETE
  USING (
    tenant_id = get_tenant_id()
    AND user_id = (select auth.uid())
  );

-- ----------------------------------------------------------
-- 7.2 notification_preferences
-- Isolamento: tenant_id + user_id (usuario so ve/edita as proprias)
-- ----------------------------------------------------------
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notification_preferences_select_own" ON notification_preferences;
CREATE POLICY "notification_preferences_select_own" ON notification_preferences
  FOR SELECT
  USING (
    tenant_id = get_tenant_id()
    AND user_id = (select auth.uid())
  );

DROP POLICY IF EXISTS "notification_preferences_insert_own" ON notification_preferences;
CREATE POLICY "notification_preferences_insert_own" ON notification_preferences
  FOR INSERT
  WITH CHECK (
    tenant_id = get_tenant_id()
    AND user_id = (select auth.uid())
  );

DROP POLICY IF EXISTS "notification_preferences_update_own" ON notification_preferences;
CREATE POLICY "notification_preferences_update_own" ON notification_preferences
  FOR UPDATE
  USING (
    tenant_id = get_tenant_id()
    AND user_id = (select auth.uid())
  )
  WITH CHECK (
    tenant_id = get_tenant_id()
    AND user_id = (select auth.uid())
  );

DROP POLICY IF EXISTS "notification_preferences_delete_own" ON notification_preferences;
CREATE POLICY "notification_preferences_delete_own" ON notification_preferences
  FOR DELETE
  USING (
    tenant_id = get_tenant_id()
    AND user_id = (select auth.uid())
  );

-- ----------------------------------------------------------
-- 7.3 drive_folders
-- Isolamento: apenas tenant_id (qualquer usuario do tenant ve/edita)
-- ----------------------------------------------------------
ALTER TABLE drive_folders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "drive_folders_select_tenant" ON drive_folders;
CREATE POLICY "drive_folders_select_tenant" ON drive_folders
  FOR SELECT
  USING (tenant_id = get_tenant_id());

DROP POLICY IF EXISTS "drive_folders_insert_tenant" ON drive_folders;
CREATE POLICY "drive_folders_insert_tenant" ON drive_folders
  FOR INSERT
  WITH CHECK (tenant_id = get_tenant_id());

DROP POLICY IF EXISTS "drive_folders_update_tenant" ON drive_folders;
CREATE POLICY "drive_folders_update_tenant" ON drive_folders
  FOR UPDATE
  USING (tenant_id = get_tenant_id())
  WITH CHECK (tenant_id = get_tenant_id());

DROP POLICY IF EXISTS "drive_folders_delete_tenant" ON drive_folders;
CREATE POLICY "drive_folders_delete_tenant" ON drive_folders
  FOR DELETE
  USING (tenant_id = get_tenant_id());

-- ----------------------------------------------------------
-- 7.4 whatsapp_messages
-- Isolamento: apenas tenant_id
-- ----------------------------------------------------------
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "whatsapp_messages_select_tenant" ON whatsapp_messages;
CREATE POLICY "whatsapp_messages_select_tenant" ON whatsapp_messages
  FOR SELECT
  USING (tenant_id = get_tenant_id());

DROP POLICY IF EXISTS "whatsapp_messages_insert_tenant" ON whatsapp_messages;
CREATE POLICY "whatsapp_messages_insert_tenant" ON whatsapp_messages
  FOR INSERT
  WITH CHECK (tenant_id = get_tenant_id());

DROP POLICY IF EXISTS "whatsapp_messages_update_tenant" ON whatsapp_messages;
CREATE POLICY "whatsapp_messages_update_tenant" ON whatsapp_messages
  FOR UPDATE
  USING (tenant_id = get_tenant_id())
  WITH CHECK (tenant_id = get_tenant_id());

DROP POLICY IF EXISTS "whatsapp_messages_delete_tenant" ON whatsapp_messages;
CREATE POLICY "whatsapp_messages_delete_tenant" ON whatsapp_messages
  FOR DELETE
  USING (tenant_id = get_tenant_id());

-- ----------------------------------------------------------
-- 7.5 integration_events
-- Isolamento: apenas tenant_id
-- ----------------------------------------------------------
ALTER TABLE integration_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "integration_events_select_tenant" ON integration_events;
CREATE POLICY "integration_events_select_tenant" ON integration_events
  FOR SELECT
  USING (tenant_id = get_tenant_id());

DROP POLICY IF EXISTS "integration_events_insert_tenant" ON integration_events;
CREATE POLICY "integration_events_insert_tenant" ON integration_events
  FOR INSERT
  WITH CHECK (tenant_id = get_tenant_id());

DROP POLICY IF EXISTS "integration_events_update_tenant" ON integration_events;
CREATE POLICY "integration_events_update_tenant" ON integration_events
  FOR UPDATE
  USING (tenant_id = get_tenant_id())
  WITH CHECK (tenant_id = get_tenant_id());

DROP POLICY IF EXISTS "integration_events_delete_tenant" ON integration_events;
CREATE POLICY "integration_events_delete_tenant" ON integration_events
  FOR DELETE
  USING (tenant_id = get_tenant_id());

-- ============================================================
-- 8. INDICES
-- ============================================================

-- integration_events: busca por status + ordem cronologica (fila FIFO)
CREATE INDEX IF NOT EXISTS idx_integration_events_status_created_at
  ON integration_events(status, created_at);

-- integration_events: idempotency_key ja e UNIQUE constraint, mas indice
-- explicito garante busca rapida (UNIQUE cria indice automaticamente,
-- este e redundante mas documentamos por clareza)
-- OBS: UNIQUE constraint uq_integration_events_idempotency_key ja cria
-- o indice. NAO criamos indice adicional.

-- notifications: busca por usuario + status de leitura
CREATE INDEX IF NOT EXISTS idx_notifications_user_read
  ON notifications(user_id, read_at);

-- notifications: busca por job_id (apenas quando preenchido)
CREATE INDEX IF NOT EXISTS idx_notifications_job_id
  ON notifications(job_id)
  WHERE job_id IS NOT NULL;

-- notifications: FK tenant_id
CREATE INDEX IF NOT EXISTS idx_notifications_tenant_id
  ON notifications(tenant_id);

-- notification_preferences: FK tenant_id (UNIQUE constraint ja cobre tenant_id+user_id)
CREATE INDEX IF NOT EXISTS idx_notification_preferences_tenant_id
  ON notification_preferences(tenant_id);

-- drive_folders: UNIQUE constraint uq_drive_folders_tenant_job_key ja cria indice
-- para (tenant_id, job_id, folder_key). Indices adicionais para FKs:
CREATE INDEX IF NOT EXISTS idx_drive_folders_job_id
  ON drive_folders(job_id);

CREATE INDEX IF NOT EXISTS idx_drive_folders_tenant_id
  ON drive_folders(tenant_id);

CREATE INDEX IF NOT EXISTS idx_drive_folders_parent_folder_id
  ON drive_folders(parent_folder_id)
  WHERE parent_folder_id IS NOT NULL;

-- whatsapp_messages: busca por job_id
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_job_id
  ON whatsapp_messages(job_id)
  WHERE job_id IS NOT NULL;

-- whatsapp_messages: FK tenant_id
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_tenant_id
  ON whatsapp_messages(tenant_id);

-- integration_events: FK tenant_id
CREATE INDEX IF NOT EXISTS idx_integration_events_tenant_id
  ON integration_events(tenant_id);

-- integration_events: busca por next_retry_at (para o processor encontrar eventos para retry)
CREATE INDEX IF NOT EXISTS idx_integration_events_next_retry_at
  ON integration_events(next_retry_at)
  WHERE status = 'retrying' AND next_retry_at IS NOT NULL;

-- integration_events: busca por locked_at (para detectar locks stale)
CREATE INDEX IF NOT EXISTS idx_integration_events_locked_at
  ON integration_events(locked_at)
  WHERE locked_at IS NOT NULL;

-- ============================================================
-- 9. REALTIME
-- Adicionar notifications ao supabase_realtime publication
-- para que o frontend receba notificacoes em tempo real.
-- ============================================================

-- Verificar se a tabela ja esta na publication antes de adicionar.
-- ALTER PUBLICATION ... ADD TABLE e idempotente no Supabase mas pode
-- dar erro se a tabela ja estiver incluida, entao usamos DO block.
DO $$
BEGIN
  -- Verificar se a publicacao supabase_realtime existe
  IF EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  ) THEN
    -- Verificar se a tabela notifications ja esta na publication
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'notifications'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
    END IF;
  END IF;
END $$;

-- ============================================================
-- 10. GRANT para service_role (necessario para pg_cron e Edge Functions
--     que usam service_role key para bypassar RLS)
-- ============================================================

-- O service_role ja tem acesso via RLS bypass, mas garantimos grants
-- explicitos para as novas tabelas por seguranca.
GRANT ALL ON notifications TO service_role;
GRANT ALL ON notification_preferences TO service_role;
GRANT ALL ON drive_folders TO service_role;
GRANT ALL ON whatsapp_messages TO service_role;
GRANT ALL ON integration_events TO service_role;

-- Grants para authenticated (usuarios logados, sujeitos a RLS)
GRANT SELECT, INSERT, UPDATE, DELETE ON notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON notification_preferences TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON drive_folders TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON whatsapp_messages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON integration_events TO authenticated;

-- ============================================================
-- VERIFICACAO FINAL (comentario informativo)
-- ============================================================
-- Apos aplicar esta migration, verificar:
-- 1. SELECT * FROM pg_extension WHERE extname IN ('pg_net', 'pg_cron');
-- 2. SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('notifications', 'notification_preferences', 'drive_folders', 'whatsapp_messages', 'integration_events');
-- 3. SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'notifications';
-- 4. Testar trigger: UPDATE jobs SET closed_value = 100000, tax_percentage = 10, production_cost = 30000, other_costs = 5000, risk_buffer = 2000 WHERE id = '<test_id>';
--    Esperado: tax_value = 10000, gross_profit = 100000 - 30000 - 10000 - 5000 - 2000 = 53000, margin = 53%
-- 5. Verificar RLS: SET request.jwt.claims = '{"tenant_id": "uuid-tenant-a"}'; SELECT * FROM notifications; (deve retornar vazio para outro tenant)
