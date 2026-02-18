import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Client com RLS do usuario (usa o token JWT para isolamento por tenant)
export function getSupabaseClient(token: string): SupabaseClient {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    {
      global: {
        headers: { Authorization: `Bearer ${token}` },
      },
    },
  );
}

// Client com service_role (bypass RLS) - usar apenas quando necessario
export function getServiceClient(): SupabaseClient {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
}
