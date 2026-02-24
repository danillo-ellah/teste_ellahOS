-- ============================================================
-- Migration 009: Fix performance
-- RLS policies com (SELECT auth.uid()) para evitar re-eval por row
-- Indices faltantes para performance
-- Fase 1 - Fix pos-auditoria
-- ============================================================

-- ============================================================
-- 1. Indice composto para listagem ativa (FA-005)
-- Critico para performance da tabela master (<1s para 500 jobs)
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_jobs_active_listing
  ON jobs(tenant_id, is_archived, status, expected_delivery_date)
  WHERE deleted_at IS NULL;

-- ============================================================
-- 2. Indice para busca textual (FA-004)
-- Full-text search em portugues
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_jobs_search
  ON jobs USING GIN(
    to_tsvector('portuguese', coalesce(title, '') || ' ' || coalesce(job_aba, '') || ' ' || coalesce(brand, ''))
  );

-- ============================================================
-- 3. Indice para tenant + status ativo (dashboard queries)
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_jobs_tenant_status_active
  ON jobs(tenant_id, status)
  WHERE deleted_at IS NULL AND is_archived = false;

-- ============================================================
-- 4. Indice para historico recente por tenant (dashboard)
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_job_history_tenant_recent
  ON job_history(tenant_id, created_at DESC);

-- ============================================================
-- 5. Nota sobre RLS policies
-- As policies existentes ja usam (SELECT get_tenant_id())
-- que e a forma otimizada. A funcao get_tenant_id() com
-- SECURITY DEFINER e STABLE evita re-execucao por row.
-- ============================================================
