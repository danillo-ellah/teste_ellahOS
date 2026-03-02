import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type { AuthContext } from '../../_shared/auth.ts';
import { success, error } from '../../_shared/response.ts';

// Roles que podem deletar claquetes
const DELETE_ROLES = ['admin', 'ceo', 'produtor_executivo'];

// Soft delete de claquete (DELETE /claquete-generator/:id)
export async function deleteHandler(req: Request, auth: AuthContext, claqueteId: string): Promise<Response> {
  if (!DELETE_ROLES.includes(auth.role)) {
    return error('FORBIDDEN', 'Apenas admin, ceo ou produtor executivo podem deletar claquetes', 403, undefined, req);
  }

  const client = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: `Bearer ${auth.token}` } } },
  );

  const { data, error: dbError } = await client
    .from('claquetes')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', claqueteId)
    .is('deleted_at', null)
    .select('id')
    .single();

  if (dbError) {
    console.error('[claquete-generator] delete error:', dbError.message);
    return error('INTERNAL_ERROR', `Falha ao deletar claquete: ${dbError.message}`, 500, undefined, req);
  }

  if (!data) {
    return error('NOT_FOUND', 'Claquete nao encontrada ou ja deletada', 404, undefined, req);
  }

  console.log(`[claquete-generator] claquete deletada (soft): id=${claqueteId}`);
  return success({ id: claqueteId, deleted: true }, 200, req);
}
