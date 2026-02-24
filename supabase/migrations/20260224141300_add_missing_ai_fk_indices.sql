-- ============================================================
-- Indices faltantes em FKs das tabelas AI (Fase 8)
-- Encontrados pelo Supabase Performance Advisor
-- ============================================================

SET search_path = public;

CREATE INDEX IF NOT EXISTS idx_ai_budget_estimates_job_id
  ON ai_budget_estimates (job_id);

CREATE INDEX IF NOT EXISTS idx_ai_budget_estimates_requested_by
  ON ai_budget_estimates (requested_by);

CREATE INDEX IF NOT EXISTS idx_ai_conversation_messages_tenant_id
  ON ai_conversation_messages (tenant_id);

CREATE INDEX IF NOT EXISTS idx_ai_conversations_user_id
  ON ai_conversations (user_id);

CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_user_id
  ON ai_usage_logs (user_id);
