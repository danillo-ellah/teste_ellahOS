import { getSupabaseClient } from '../../_shared/supabase-client.ts';
import { success } from '../../_shared/response.ts';
import { AppError } from '../../_shared/errors.ts';
import type { AuthContext } from '../../_shared/auth.ts';

// DELETE /allocations/:id — soft delete
export async function softDelete(
  _req: Request,
  auth: AuthContext,
  allocationId: string,
): Promise<Response> {
  const supabase = getSupabaseClient(auth.token);

  // Verificar que existe
  const { data: existing, error: fetchError } = await supabase
    .from('allocations')
    .select('id')
    .eq('id', allocationId)
    .is('deleted_at', null)
    .single();

  if (fetchError || !existing) {
    throw new AppError('NOT_FOUND', 'Alocacao nao encontrada', 404);
  }

  // Soft delete
  const { error: deleteError } = await supabase
    .from('allocations')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', allocationId);

  if (deleteError) {
    console.error('[allocations/soft-delete] erro:', deleteError.message);
    throw new AppError('INTERNAL_ERROR', deleteError.message, 500);
  }

  return success({ id: allocationId, deleted: true });
}
