
-- =============================================================================
-- Fase 8.1: Infraestrutura AI — 4 tabelas novas + RLS + indices + pg_cron
-- Data: 2026-02-22
-- Tabelas: ai_conversations, ai_conversation_messages, ai_budget_estimates, ai_usage_logs
-- Total apos migration: 34 tabelas
-- =============================================================================

-- -------------------------------------------------------
-- 1. ai_conversations — Conversas do Copilot de producao
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS ai_conversations (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id           UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title             TEXT,
  job_id            UUID        REFERENCES jobs(id) ON DELETE SET NULL,
  model_used        TEXT        NOT NULL DEFAULT 'haiku',
  total_input_tokens   INT     NOT NULL DEFAULT 0,
  total_output_tokens  INT     NOT NULL DEFAULT 0,
  message_count     INT         NOT NULL DEFAULT 0,
  last_message_at   TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at        TIMESTAMPTZ,

  CONSTRAINT chk_ai_conv_model CHECK (model_used IN ('haiku', 'sonnet'))
);

COMMENT ON TABLE ai_conversations IS 'Conversas do Copilot de producao. Uma por sessao de chat do usuario.';
COMMENT ON COLUMN ai_conversations.model_used IS 'Modelo Claude predominante usado: haiku (chat) ou sonnet (analise).';
COMMENT ON COLUMN ai_conversations.total_input_tokens IS 'Total acumulado de input tokens consumidos na conversa.';

-- Indices
CREATE INDEX IF NOT EXISTS idx_ai_conversations_tenant_user
  ON ai_conversations(tenant_id, user_id, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_ai_conversations_job
  ON ai_conversations(job_id) WHERE job_id IS NOT NULL AND deleted_at IS NULL;

-- RLS (usuario ve apenas suas proprias conversas)
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_conversations_select" ON ai_conversations
  FOR SELECT TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()) AND user_id = (SELECT auth.uid()));

CREATE POLICY "ai_conversations_insert" ON ai_conversations
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = (SELECT get_tenant_id()) AND user_id = (SELECT auth.uid()));

CREATE POLICY "ai_conversations_update" ON ai_conversations
  FOR UPDATE TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()) AND user_id = (SELECT auth.uid()));

-- Trigger updated_at
CREATE TRIGGER trg_ai_conversations_updated_at
  BEFORE UPDATE ON ai_conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- -------------------------------------------------------
-- 2. ai_conversation_messages — Mensagens do Copilot
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS ai_conversation_messages (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  conversation_id   UUID        NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
  role              TEXT        NOT NULL,
  content           TEXT        NOT NULL,
  sources           JSONB       DEFAULT '[]',
  model_used        TEXT,
  input_tokens      INT         DEFAULT 0,
  output_tokens     INT         DEFAULT 0,
  duration_ms       INT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT chk_ai_msg_role CHECK (role IN ('user', 'assistant'))
);

COMMENT ON TABLE ai_conversation_messages IS 'Mensagens individuais dentro de uma conversa do Copilot.';
COMMENT ON COLUMN ai_conversation_messages.sources IS 'Array de fontes citadas na resposta: [{type:"job",id:"uuid",title:"..."}]';
COMMENT ON COLUMN ai_conversation_messages.duration_ms IS 'Latencia da chamada a Claude API em milissegundos.';

-- Indices
CREATE INDEX IF NOT EXISTS idx_ai_conv_messages_conversation
  ON ai_conversation_messages(conversation_id, created_at ASC);

-- RLS (via join com ai_conversations para herdar filtro tenant+user)
ALTER TABLE ai_conversation_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_conv_messages_select" ON ai_conversation_messages
  FOR SELECT TO authenticated
  USING (
    tenant_id = (SELECT get_tenant_id())
    AND conversation_id IN (
      SELECT id FROM ai_conversations
      WHERE user_id = (SELECT auth.uid()) AND deleted_at IS NULL
    )
  );

CREATE POLICY "ai_conv_messages_insert" ON ai_conversation_messages
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = (SELECT get_tenant_id()));

-- -------------------------------------------------------
-- 3. ai_budget_estimates — Cache de estimativas de orcamento
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS ai_budget_estimates (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  job_id            UUID        NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  requested_by      UUID        NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  -- Input
  input_hash        TEXT        NOT NULL,
  override_context  JSONB       DEFAULT '{}',
  -- Output
  suggested_total   NUMERIC(12,2),
  breakdown         JSONB       NOT NULL DEFAULT '{}',
  confidence        TEXT        NOT NULL DEFAULT 'medium',
  reasoning         TEXT,
  similar_jobs      JSONB       DEFAULT '[]',
  warnings          JSONB       DEFAULT '[]',
  -- Tokens
  model_used        TEXT        NOT NULL DEFAULT 'sonnet',
  input_tokens      INT         NOT NULL DEFAULT 0,
  output_tokens     INT         NOT NULL DEFAULT 0,
  duration_ms       INT,
  -- Metadata
  was_applied       BOOLEAN     NOT NULL DEFAULT false,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT chk_ai_budget_confidence CHECK (confidence IN ('high', 'medium', 'low'))
);

COMMENT ON TABLE ai_budget_estimates IS 'Estimativas de orcamento geradas pela IA. Cache via input_hash.';
COMMENT ON COLUMN ai_budget_estimates.input_hash IS 'SHA-256 dos inputs (job data + override). Permite cache e dedup.';
COMMENT ON COLUMN ai_budget_estimates.was_applied IS 'Se o usuario aplicou esta estimativa ao job (closed_value).';

-- Indices
CREATE INDEX IF NOT EXISTS idx_ai_budget_estimates_job
  ON ai_budget_estimates(tenant_id, job_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_budget_estimates_cache
  ON ai_budget_estimates(tenant_id, input_hash, created_at DESC);

-- RLS (qualquer membro do tenant pode ver estimativas)
ALTER TABLE ai_budget_estimates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_budget_estimates_select" ON ai_budget_estimates
  FOR SELECT TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()));

CREATE POLICY "ai_budget_estimates_insert" ON ai_budget_estimates
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = (SELECT get_tenant_id()));

CREATE POLICY "ai_budget_estimates_update" ON ai_budget_estimates
  FOR UPDATE TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()));

-- -------------------------------------------------------
-- 4. ai_usage_logs — Telemetria de chamadas Claude API
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS ai_usage_logs (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id           UUID        NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  feature           TEXT        NOT NULL,
  model_used        TEXT        NOT NULL,
  input_tokens      INT         NOT NULL DEFAULT 0,
  output_tokens     INT         NOT NULL DEFAULT 0,
  total_tokens      INT         GENERATED ALWAYS AS (input_tokens + output_tokens) STORED,
  estimated_cost_usd NUMERIC(8,6) DEFAULT 0,
  duration_ms       INT,
  status            TEXT        NOT NULL DEFAULT 'success',
  error_message     TEXT,
  metadata          JSONB       DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT chk_ai_usage_feature CHECK (
    feature IN ('budget_estimate', 'copilot', 'dailies_analysis', 'freelancer_match')
  ),
  CONSTRAINT chk_ai_usage_status CHECK (
    status IN ('success', 'error', 'rate_limited', 'timeout')
  )
);

COMMENT ON TABLE ai_usage_logs IS 'Log de todas as chamadas a Claude API. Telemetria de custo e performance.';
COMMENT ON COLUMN ai_usage_logs.estimated_cost_usd IS 'Custo estimado em USD baseado no pricing da Anthropic.';
COMMENT ON COLUMN ai_usage_logs.total_tokens IS 'Soma automatica de input + output tokens (generated column).';

-- Indices
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_tenant_date
  ON ai_usage_logs(tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_tenant_feature
  ON ai_usage_logs(tenant_id, feature, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_rate_limit
  ON ai_usage_logs(tenant_id, user_id, created_at DESC)
  WHERE status != 'rate_limited';

-- RLS (apenas admin/ceo podem ver logs de uso)
ALTER TABLE ai_usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_usage_logs_select" ON ai_usage_logs
  FOR SELECT TO authenticated
  USING (
    tenant_id = (SELECT get_tenant_id())
    AND (SELECT get_user_role()) IN ('admin', 'ceo')
  );

CREATE POLICY "ai_usage_logs_insert" ON ai_usage_logs
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = (SELECT get_tenant_id()));

-- -------------------------------------------------------
-- 5. pg_cron: Limpeza automatica
-- -------------------------------------------------------

-- Limpar conversas deletadas ha mais de 30 dias (domingos as 3h)
SELECT cron.schedule(
  'cleanup-deleted-ai-conversations',
  '0 3 * * 0',
  $$DELETE FROM ai_conversation_messages
    WHERE conversation_id IN (
      SELECT id FROM ai_conversations
      WHERE deleted_at IS NOT NULL
        AND deleted_at < now() - interval '30 days'
    );
    DELETE FROM ai_conversations
    WHERE deleted_at IS NOT NULL
      AND deleted_at < now() - interval '30 days';$$
);

-- Limpar usage logs com mais de 6 meses (dia 1 de cada mes as 4h)
SELECT cron.schedule(
  'cleanup-old-ai-usage-logs',
  '0 4 1 * *',
  $$DELETE FROM ai_usage_logs
    WHERE created_at < now() - interval '6 months';$$
);
