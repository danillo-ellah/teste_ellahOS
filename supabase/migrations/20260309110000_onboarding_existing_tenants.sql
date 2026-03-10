-- =============================================================================
-- Migration: Cria coluna onboarding_completed + marca tenants existentes
-- Data: 2026-03-09 (corrigido 2026-03-10)
--
-- Contexto:
--   Cria a coluna onboarding_completed em tenants (necessaria para o wizard)
--   e marca todos os tenants existentes como concluidos, evitando que usuarios
--   ja cadastrados sejam redirecionados para o wizard na proxima sessao.
--
-- Operacoes:
--   1. ALTER TABLE: adiciona coluna onboarding_completed (IF NOT EXISTS)
--   2. UPDATE tenants: onboarding_completed = true para todos os registros
--   3. UPDATE tenants: merge em settings JSONB
--
-- Idempotencia:
--   - ADD COLUMN IF NOT EXISTS
--   - Condicao WHERE evita UPDATE desnecessario
--   - jsonb_set preserva chaves existentes no JSONB
-- =============================================================================

SET search_path TO public;

-- =============================================================================
-- 0. Garantir que a coluna existe ANTES de usa-la
-- =============================================================================
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT false;

-- =============================================================================
-- 1. Marcar onboarding_completed = true em todos os tenants existentes
--    Apenas atualiza registros que ainda sao NULL ou false
-- =============================================================================
UPDATE tenants
SET onboarding_completed = true
WHERE onboarding_completed IS DISTINCT FROM true;

-- =============================================================================
-- 2. Sincronizar a chave onboarding_completed dentro do JSONB settings
--    Usa jsonb_set para adicionar/sobrescrever a chave sem perder outras
--    Caso settings seja NULL, inicializa com objeto vazio antes do merge
-- =============================================================================
UPDATE tenants
SET settings = jsonb_set(
  COALESCE(settings, '{}'::jsonb),
  '{onboarding_completed}',
  'true'::jsonb,
  true  -- create_missing: adiciona a chave se nao existir
)
WHERE (settings->>'onboarding_completed')::boolean IS DISTINCT FROM true;
