import { getSupabaseClient } from '../../_shared/supabase-client.ts';
import { success } from '../../_shared/response.ts';
import { AppError } from '../../_shared/errors.ts';
import type { AuthContext } from '../../_shared/auth.ts';

const ALLOWED_ROLES = ['admin', 'ceo'];

export async function handleDelete(
  req: Request,
  auth: AuthContext,
  jobId: string,
  phaseId: string,
): Promise<Response> {
  console.log('[job-timeline/delete] deletando fase (soft delete)', {
    jobId,
    phaseId,
    userId: auth.userId,
    tenantId: auth.tenantId,
    role: auth.role,
  });

  if (!ALLOWED_ROLES.includes(auth.role)) {
    throw new AppError('FORBIDDEN', 'Permissao insuficiente para deletar fases', 403);
  }

  const supabase = getSupabaseClient(auth.token);

  // Verificar se a fase existe, pertence ao job e ao tenant
  const { data: existing, error: findErr } = await supabase
    .from('job_phases')
    .select('id')
    .eq('id', phaseId)
    .eq('job_id', jobId)
    .eq('tenant_id', auth.tenantId)
    .is('deleted_at', null)
    .single();

  if (findErr || !existing) {
    throw new AppError('NOT_FOUND', 'Fase nao encontrada', 404);
  }

  // Soft delete — preserva historico
  const { error: deleteErr } = await supabase
    .from('job_phases')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', phaseId)
    .eq('job_id', jobId)
    .eq('tenant_id', auth.tenantId);

  if (deleteErr) {
    console.error('[job-timeline/delete] erro ao deletar fase:', deleteErr.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao remover fase', 500);
  }

  console.log('[job-timeline/delete] fase deletada (soft):', phaseId);

  return success({ deleted: true }, 200, req);
}
