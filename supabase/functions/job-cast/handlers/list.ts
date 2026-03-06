import { getSupabaseClient } from '../../_shared/supabase-client.ts';
import { success } from '../../_shared/response.ts';
import { AppError } from '../../_shared/errors.ts';
import type { AuthContext } from '../../_shared/auth.ts';

export async function handleList(
  req: Request,
  auth: AuthContext,
): Promise<Response> {
  const url = new URL(req.url);
  const jobId = url.searchParams.get('job_id');

  if (!jobId) {
    throw new AppError('VALIDATION_ERROR', 'Parametro job_id e obrigatorio', 400);
  }

  console.log('[job-cast/list] listando elenco', {
    jobId,
    userId: auth.userId,
    tenantId: auth.tenantId,
  });

  const supabase = getSupabaseClient(auth.token);

  // Verificar se o job pertence ao tenant do usuario
  const { data: job, error: jobErr } = await supabase
    .from('jobs')
    .select('id')
    .eq('id', jobId)
    .eq('tenant_id', auth.tenantId)
    .single();

  if (jobErr || !job) {
    throw new AppError('NOT_FOUND', 'Job nao encontrado', 404);
  }

  const { data: members, error: dbErr } = await supabase
    .from('job_cast')
    .select('*')
    .eq('job_id', jobId)
    .eq('tenant_id', auth.tenantId)
    .order('sort_order', { ascending: true });

  if (dbErr) {
    console.error('[job-cast/list] erro na query:', dbErr.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao listar elenco', 500);
  }

  console.log('[job-cast/list] retornando', members?.length ?? 0, 'membros');

  return success(members ?? [], 200, req);
}
