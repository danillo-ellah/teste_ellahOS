import { getSupabaseClient } from '../../_shared/supabase-client.ts';
import { success } from '../../_shared/response.ts';
import { AppError } from '../../_shared/errors.ts';
import { insertHistory } from '../../_shared/history.ts';
import type { AuthContext } from '../../_shared/auth.ts';

export async function deleteJob(
  _req: Request,
  auth: AuthContext,
  jobId: string,
): Promise<Response> {
  const supabase = getSupabaseClient(auth.token);

  // 1. Verificar que o job existe
  const { data: job, error: fetchError } = await supabase
    .from('jobs')
    .select('id, title, is_parent_job')
    .eq('id', jobId)
    .is('deleted_at', null)
    .single();

  if (fetchError || !job) {
    throw new AppError('NOT_FOUND', 'Job nao encontrado', 404);
  }

  // 2. Verificar se tem sub-jobs ativos
  if (job.is_parent_job) {
    const { count } = await supabase
      .from('jobs')
      .select('id', { count: 'exact', head: true })
      .eq('parent_job_id', jobId)
      .is('deleted_at', null);

    if (count && count > 0) {
      throw new AppError(
        'CONFLICT',
        `Nao e possivel excluir: existem ${count} sub-jobs ativos`,
        409,
      );
    }
  }

  // 3. Soft delete
  const { data: deletedJob, error: deleteError } = await supabase
    .from('jobs')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', jobId)
    .select('id, deleted_at')
    .single();

  if (deleteError) {
    throw new AppError('INTERNAL_ERROR', deleteError.message, 500);
  }

  // 4. Registrar no historico
  await insertHistory(supabase, {
    tenantId: auth.tenantId,
    jobId,
    eventType: 'status_change',
    userId: auth.userId,
    dataBefore: { deleted_at: null },
    dataAfter: { deleted_at: deletedJob.deleted_at },
    description: `Job "${job.title}" excluido (soft delete)`,
  });

  return success({ id: deletedJob.id, deleted_at: deletedJob.deleted_at });
}
