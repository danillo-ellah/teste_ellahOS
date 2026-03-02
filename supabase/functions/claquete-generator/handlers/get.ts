import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type { AuthContext } from '../../_shared/auth.ts';
import { success, error } from '../../_shared/response.ts';

// Retorna uma claquete pelo ID (GET /claquete-generator/:id)
export async function getHandler(req: Request, auth: AuthContext, claqueteId: string): Promise<Response> {
  const client = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: `Bearer ${auth.token}` } } },
  );

  const { data, error: dbError } = await client
    .from('claquetes')
    .select('*')
    .eq('id', claqueteId)
    .is('deleted_at', null)
    .maybeSingle();

  if (dbError) {
    console.error('[claquete-generator] get error:', dbError.message);
    return error('INTERNAL_ERROR', `Falha ao buscar claquete: ${dbError.message}`, 500, undefined, req);
  }

  if (!data) {
    return error('NOT_FOUND', 'Claquete nao encontrada', 404, undefined, req);
  }

  return success(data, 200, req);
}
