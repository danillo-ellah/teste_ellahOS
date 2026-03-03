import { getSupabaseClient } from '../../_shared/supabase-client.ts';
import { success } from '../../_shared/response.ts';
import { AppError } from '../../_shared/errors.ts';
import type { AuthContext } from '../../_shared/auth.ts';

// Roles permitidos para deletar locacoes
const ALLOWED_ROLES = ['admin', 'ceo'];

export async function deleteLocation(
  req: Request,
  auth: AuthContext,
  locationId: string,
): Promise<Response> {
  console.log('[locations/delete] soft-delete de locacao', {
    locationId,
    userId: auth.userId,
    tenantId: auth.tenantId,
    role: auth.role,
  });

  // Verificar permissao — apenas admin/ceo podem deletar locacoes
  if (!ALLOWED_ROLES.includes(auth.role)) {
    throw new AppError(
      'FORBIDDEN',
      'Apenas admin e ceo podem remover locacoes',
      403,
    );
  }

  const supabase = getSupabaseClient(auth.token);

  // Verificar se locacao existe e nao esta deletada
  const { data: existing, error: findErr } = await supabase
    .from('locations')
    .select('id')
    .eq('id', locationId)
    .eq('tenant_id', auth.tenantId)
    .is('deleted_at', null)
    .single();

  if (findErr || !existing) {
    throw new AppError('NOT_FOUND', 'Locacao nao encontrada', 404);
  }

  // Verificar se locacao tem jobs ativos vinculados
  const { count: activeJobsCount, error: countErr } = await supabase
    .from('job_locations')
    .select('id', { count: 'exact', head: true })
    .eq('location_id', locationId)
    .eq('tenant_id', auth.tenantId);

  if (countErr) {
    console.error('[locations/delete] erro ao verificar jobs vinculados:', countErr.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao verificar dependencias', 500);
  }

  if (activeJobsCount && activeJobsCount > 0) {
    throw new AppError(
      'CONFLICT',
      `Locacao possui ${activeJobsCount} job(s) vinculado(s). Desvincule antes de remover.`,
      409,
      { jobs_count: activeJobsCount },
    );
  }

  // Soft delete: setar deleted_at com timestamp atual
  const { error: deleteErr } = await supabase
    .from('locations')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', locationId)
    .eq('tenant_id', auth.tenantId);

  if (deleteErr) {
    console.error('[locations/delete] erro ao deletar locacao:', deleteErr);
    throw new AppError('INTERNAL_ERROR', deleteErr.message, 500);
  }

  console.log('[locations/delete] locacao removida (soft):', locationId);

  return success({ deleted: true });
}
