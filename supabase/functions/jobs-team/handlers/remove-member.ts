import { getSupabaseClient } from '../../_shared/supabase-client.ts';
import { success } from '../../_shared/response.ts';
import { AppError } from '../../_shared/errors.ts';
import { insertHistory } from '../../_shared/history.ts';
import type { AuthContext } from '../../_shared/auth.ts';

export async function removeMember(
  _req: Request,
  auth: AuthContext,
  jobId: string,
  memberId: string,
): Promise<Response> {
  const supabase = getSupabaseClient(auth.token);

  // 1. Verificar que o membro existe
  const { data: member, error: fetchError } = await supabase
    .from('job_team')
    .select('id, role, people(full_name)')
    .eq('id', memberId)
    .eq('job_id', jobId)
    .is('deleted_at', null)
    .single();

  if (fetchError || !member) {
    throw new AppError('NOT_FOUND', 'Membro nao encontrado neste job', 404);
  }

  // 2. Soft delete job_team
  const now = new Date().toISOString();
  const { data: deleted, error: deleteError } = await supabase
    .from('job_team')
    .update({ deleted_at: now })
    .eq('id', memberId)
    .select('id, deleted_at')
    .single();

  if (deleteError) {
    throw new AppError('INTERNAL_ERROR', deleteError.message, 500);
  }

  // 2b. Cascade soft-delete allocations vinculadas
  await supabase
    .from('allocations')
    .update({ deleted_at: now })
    .eq('job_team_id', memberId)
    .is('deleted_at', null);

  // 3. Registrar no historico
  await insertHistory(supabase, {
    tenantId: auth.tenantId,
    jobId,
    eventType: 'team_change',
    userId: auth.userId,
    dataBefore: {
      person_name: (member as any).people?.full_name,
      role: member.role,
      action: 'active',
    },
    dataAfter: { action: 'removed' },
    description: `${(member as any).people?.full_name ?? 'Membro'} (${member.role}) removido da equipe`,
  });

  return success({ id: deleted.id, deleted_at: deleted.deleted_at });
}
