import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Representa um secret do Supabase Vault
export interface VaultSecret {
  name: string;
  value: string;
  source: 'vault' | 'env';
}

// Le um secret do Supabase Vault com fallback para variavel de ambiente.
// Tenta primeiro o Vault via RPC; se falhar ou retornar null, usa Deno.env.
export async function getSecret(
  client: SupabaseClient,
  secretName: string,
): Promise<string | null> {
  // Tenta ler do Vault
  const { data, error } = await client.rpc('read_secret', {
    secret_name: secretName,
  });

  if (!error && data !== null && data !== undefined && data !== '') {
    console.log(`[vault] secret "${secretName}" lido do Supabase Vault`);
    return data as string;
  }

  if (error) {
    console.warn(
      `[vault] falha ao ler "${secretName}" do Vault: ${error.message} — tentando Deno.env`,
    );
  }

  // Fallback para variavel de ambiente
  const envValue = Deno.env.get(secretName.toUpperCase());
  if (envValue !== undefined && envValue !== '') {
    console.log(`[vault] secret "${secretName}" lido de Deno.env (fallback)`);
    return envValue;
  }

  console.warn(`[vault] secret "${secretName}" nao encontrado em nenhuma fonte`);
  return null;
}

// Escreve um secret no Supabase Vault via RPC.
// Lanca erro se a operacao falhar.
export async function setSecret(
  client: SupabaseClient,
  secretName: string,
  value: string,
): Promise<void> {
  const { error } = await client.rpc('write_secret', {
    secret_name: secretName,
    secret_value: value,
  });

  if (error) {
    console.error(`[vault] falha ao escrever "${secretName}" no Vault: ${error.message}`);
    throw new Error(`Falha ao salvar secret no Vault: ${error.message}`);
  }

  console.log(`[vault] secret "${secretName}" salvo no Supabase Vault`);
}
