-- ============================================================
-- Migration: Fase 5.1 — RPC Functions
-- Data: 2026-02-19
-- Descricao: Criar funcoes RPC necessarias para os shared modules:
--   1. lock_integration_events: fetch-and-lock atomico para fila
--   2. read_secret: ler secret do Supabase Vault
--   3. write_secret: escrever secret no Supabase Vault
-- ============================================================

set search_path = public, extensions;

-- ============================================================
-- 1. lock_integration_events
-- Busca ate p_batch_size eventos pendentes/retrying e faz lock atomico.
-- Usa FOR UPDATE SKIP LOCKED para seguranca em ambiente concorrente.
-- Eventos com locked_at > 5 min atras sao considerados stale (worker morto).
-- ============================================================

CREATE OR REPLACE FUNCTION lock_integration_events(p_batch_size INT DEFAULT 10)
RETURNS SETOF integration_events
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH eligible AS (
    SELECT ie.id
    FROM integration_events ie
    WHERE (
      -- Eventos pendentes nunca processados
      (ie.status = 'pending' AND ie.locked_at IS NULL)
      -- Eventos em retry cujo next_retry_at ja passou
      OR (ie.status = 'retrying' AND ie.next_retry_at IS NOT NULL AND ie.next_retry_at <= now())
      -- Eventos com lock stale (worker morreu — locked_at > 5 min)
      OR (ie.locked_at IS NOT NULL AND ie.locked_at < now() - interval '5 minutes' AND ie.status NOT IN ('completed', 'failed'))
    )
    ORDER BY ie.created_at ASC
    LIMIT p_batch_size
    FOR UPDATE SKIP LOCKED
  )
  UPDATE integration_events ie
  SET
    locked_at = now(),
    started_at = COALESCE(ie.started_at, now()),
    status = 'processing',
    attempts = ie.attempts + 1
  FROM eligible
  WHERE ie.id = eligible.id
  RETURNING ie.*;
END;
$$;

COMMENT ON FUNCTION lock_integration_events IS 'Busca e bloqueia atomicamente eventos de integracao pendentes/retrying para processamento. Usa FOR UPDATE SKIP LOCKED.';

-- ============================================================
-- 2. read_secret
-- Le um secret do Supabase Vault pelo nome.
-- Usa decrypted_secrets (view que decripta automaticamente).
-- SECURITY DEFINER para acessar schema vault sem expor ao usuario.
-- ============================================================

CREATE OR REPLACE FUNCTION read_secret(secret_name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = vault, public
AS $$
DECLARE
  secret_value TEXT;
BEGIN
  SELECT decrypted_secret INTO secret_value
  FROM vault.decrypted_secrets
  WHERE name = secret_name
  LIMIT 1;

  RETURN secret_value;
END;
$$;

COMMENT ON FUNCTION read_secret IS 'Le um secret do Supabase Vault pelo nome. Retorna o valor decriptado ou NULL se nao encontrado.';

-- ============================================================
-- 3. write_secret
-- Escreve ou atualiza um secret no Supabase Vault.
-- Usa INSERT ... ON CONFLICT para upsert.
-- SECURITY DEFINER para acessar schema vault.
-- ============================================================

CREATE OR REPLACE FUNCTION write_secret(secret_name TEXT, secret_value TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = vault, public
AS $$
BEGIN
  -- Tenta atualizar se existir
  UPDATE vault.secrets
  SET secret = secret_value, updated_at = now()
  WHERE name = secret_name;

  -- Se nao atualizou nenhuma linha, insere
  IF NOT FOUND THEN
    INSERT INTO vault.secrets (name, secret)
    VALUES (secret_name, secret_value);
  END IF;
END;
$$;

COMMENT ON FUNCTION write_secret IS 'Escreve ou atualiza um secret no Supabase Vault. Faz upsert pelo nome.';

-- ============================================================
-- GRANTS
-- Apenas service_role pode usar estas funcoes (Edge Functions com service key)
-- ============================================================
REVOKE ALL ON FUNCTION lock_integration_events FROM PUBLIC;
GRANT EXECUTE ON FUNCTION lock_integration_events TO service_role;

REVOKE ALL ON FUNCTION read_secret FROM PUBLIC;
GRANT EXECUTE ON FUNCTION read_secret TO service_role;

REVOKE ALL ON FUNCTION write_secret FROM PUBLIC;
GRANT EXECUTE ON FUNCTION write_secret TO service_role;