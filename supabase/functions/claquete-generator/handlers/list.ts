import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type { AuthContext } from '../../_shared/auth.ts';
import { success, error } from '../../_shared/response.ts';

// Lista claquetes de um job (GET /claquete-generator/list?job_id=xxx)
export async function listHandler(req: Request, auth: AuthContext): Promise<Response> {
  const url = new URL(req.url);
  const jobId = url.searchParams.get('job_id');

  if (!jobId) {
    return error('VALIDATION_ERROR', 'job_id e obrigatorio', 400, undefined, req);
  }

  const client = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: `Bearer ${auth.token}` } } },
  );

  const { data, error: dbError } = await client
    .from('claquetes')
    .select('*')
    .eq('job_id', jobId)
    .is('deleted_at', null)
    .order('version', { ascending: false });

  if (dbError) {
    console.error('[claquete-generator] list error:', dbError.message);
    return error('INTERNAL_ERROR', `Falha ao listar claquetes: ${dbError.message}`, 500, undefined, req);
  }

  return success(data ?? [], 200, req);
}
