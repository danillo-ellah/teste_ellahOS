-- =============================================================================
-- Migration: Marca tenants existentes como onboarding concluido
-- Data: 2026-03-09
--
-- Contexto:
--   O campo onboarding_completed ja existe na tabela tenants. Esta migration
--   apenas garante que todos os tenants criados ANTES da implementacao do
--   wizard de onboarding sejam marcados como concluidos, evitando que usuarios
--   ja cadastrados sejam redirecionados para o wizard na proxima sessao.
--
-- Operacoes:
--   1. UPDATE tenants: onboarding_completed = true para todos os registros
--      que ainda nao estejam marcados (idempotente via WHERE clause)
--   2. UPDATE tenants: merge em settings JSONB adicionando chave
--      "onboarding_completed: true" (preserva chaves existentes)
--
-- Idempotencia:
--   - Condicao WHERE na operacao 1 evita UPDATE desnecessario
--   - jsonb_set preserva chaves existentes no JSONB
-- =============================================================================

SET search_path TO public;

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
