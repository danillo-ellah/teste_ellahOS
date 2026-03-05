import { getSupabaseClient } from '../../_shared/supabase-client.ts';
import { success } from '../../_shared/response.ts';
import { AppError } from '../../_shared/errors.ts';
import type { AuthContext } from '../../_shared/auth.ts';

export async function handleList(
  req: Request,
  auth: AuthContext,
  jobId: string,
): Promise<Response> {
  console.log('[job-timeline/list] listando fases do cronograma', {
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
    .is('deleted_at', null)
    .single();

  if (jobErr || !job) {
    throw new AppError('NOT_FOUND', 'Job nao encontrado', 404);
  }

  const { data: phases, error: dbErr } = await supabase
    .from('job_phases')
    .select(
      'id, job_id, tenant_id, phase_key, phase_label, phase_emoji, phase_color, start_date, end_date, complement, skip_weekends, status, sort_order, created_at, updated_at',
    )
    .eq('job_id', jobId)
    .eq('tenant_id', auth.tenantId)
    .is('deleted_at', null)
    .order('sort_order', { ascending: true });

  if (dbErr) {
    console.error('[job-timeline/list] erro na query:', dbErr);
    throw new AppError('INTERNAL_ERROR', dbErr.message, 500);
  }

  console.log('[job-timeline/list] retornando', phases?.length ?? 0, 'fases');

  return success(phases ?? [], 200, req);
}
