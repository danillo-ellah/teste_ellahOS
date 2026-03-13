import type { AuthContext } from '../../_shared/auth.ts';
import { AppError } from '../../_shared/errors.ts';
import { success } from '../../_shared/response.ts';
import { getSupabaseClient } from '../../_shared/supabase-client.ts';

/**
 * DELETE /crm/opportunities/:id
 * Soft-delete: marca deleted_at na oportunidade.
 * Nao permite excluir se ja tem job vinculado (job_id != null).
 */
export async function handleDeleteOpportunity(
  req: Request,
  auth: AuthContext,
  id: string,
): Promise<Response> {
  console.log('[crm/delete-opportunity] excluindo oportunidade', {
    id,
    userId: auth.userId,
    tenantId: auth.tenantId,
  });

  const client = getSupabaseClient(auth.token);

  // Buscar oportunidade para validar
  const { data: current, error: fetchError } = await client
    .from('opportunities')
    .select('id, title, job_id, stage')
    .eq('id', id)
    .eq('tenant_id', auth.tenantId)
    .is('deleted_at', null)
    .single();

  if (fetchError || !current) {
    throw new AppError('NOT_FOUND', 'Oportunidade nao encontrada', 404);
  }

  // Nao permitir excluir se ja tem job vinculado
  if (current.job_id) {
    throw new AppError(
      'BUSINESS_RULE_VIOLATION',
      'Nao e possivel excluir uma oportunidade que ja foi convertida em Job. Desvincule o job primeiro.',
      422,
    );
  }

  const now = new Date().toISOString();

  // Soft-delete da oportunidade
  const { error: deleteError } = await client
    .from('opportunities')
    .update({ deleted_at: now })
    .eq('id', id)
    .eq('tenant_id', auth.tenantId)
    .is('deleted_at', null);

  if (deleteError) {
    console.error('[crm/delete-opportunity] erro ao excluir:', deleteError.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao excluir oportunidade', 500, {
      detail: deleteError.message,
    });
  }

  // Soft-delete cascata em proposals, activities e budget_versions
  await client
    .from('opportunity_proposals')
    .update({ deleted_at: now })
    .eq('opportunity_id', id)
    .is('deleted_at', null);

  await client
    .from('opportunity_activities')
    .update({ deleted_at: now })
    .eq('opportunity_id', id)
    .is('deleted_at', null);

  await client
    .from('opportunity_budget_versions')
    .update({ deleted_at: now })
    .eq('opportunity_id', id)
    .is('deleted_at', null);

  console.log('[crm/delete-opportunity] oportunidade excluida', { id, title: current.title });
  return success({ id, deleted: true }, 200, req);
}
