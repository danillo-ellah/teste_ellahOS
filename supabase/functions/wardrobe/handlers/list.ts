import type { AuthContext } from '../../_shared/auth.ts';
import { AppError } from '../../_shared/errors.ts';
import { success } from '../../_shared/response.ts';
import { getSupabaseClient } from '../../_shared/supabase-client.ts';

export async function handleList(req: Request, auth: AuthContext): Promise<Response> {
  const url = new URL(req.url);
  const jobId = url.searchParams.get('job_id');

  if (!jobId) {
    throw new AppError('VALIDATION_ERROR', 'job_id e obrigatorio', 400);
  }

  console.log('[wardrobe/list] listando fichas', {
    userId: auth.userId,
    tenantId: auth.tenantId,
    jobId,
  });

  const client = getSupabaseClient(auth.token);

  // Verificar que o job pertence ao tenant
  const { data: job } = await client
    .from('jobs')
    .select('id')
    .eq('id', jobId)
    .eq('tenant_id', auth.tenantId)
    .maybeSingle();

  if (!job) {
    throw new AppError('NOT_FOUND', 'Job nao encontrado', 404);
  }

  const { data: items, error: fetchError } = await client
    .from('wardrobe_items')
    .select('*')
    .eq('job_id', jobId)
    .eq('tenant_id', auth.tenantId)
    .is('deleted_at', null)
    .order('character_name', { ascending: true })
    .order('item_type', { ascending: true })
    .order('created_at', { ascending: true });

  if (fetchError) {
    console.error('[wardrobe/list] erro ao buscar:', fetchError.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao buscar fichas de figurino/arte', 500, {
      detail: fetchError.message,
    });
  }

  console.log('[wardrobe/list] retornando', items?.length ?? 0, 'itens');
  return success(items ?? [], 200, req);
}
