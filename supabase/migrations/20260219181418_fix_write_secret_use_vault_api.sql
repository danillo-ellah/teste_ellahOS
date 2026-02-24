
-- Fix write_secret para usar vault.create_secret/vault.update_secret
-- em vez de INSERT/UPDATE direto na vault.secrets (sem permissao)
CREATE OR REPLACE FUNCTION public.write_secret(secret_name TEXT, secret_value TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  existing_id UUID;
BEGIN
  -- Verifica se ja existe um secret com esse nome
  SELECT id INTO existing_id
  FROM vault.decrypted_secrets
  WHERE name = secret_name
  LIMIT 1;

  IF existing_id IS NOT NULL THEN
    -- Atualiza via vault.update_secret (funcao nativa do Vault)
    PERFORM vault.update_secret(existing_id, secret_value, secret_name);
  ELSE
    -- Cria via vault.create_secret (funcao nativa do Vault)
    PERFORM vault.create_secret(secret_value, secret_name);
  END IF;
END;
$$;

-- Manter grants existentes
GRANT EXECUTE ON FUNCTION public.write_secret(TEXT, TEXT) TO anon, authenticated, service_role;
