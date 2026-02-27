import { getSupabaseClient } from '../../_shared/supabase-client.ts';
import { success } from '../../_shared/response.ts';
import { AppError } from '../../_shared/errors.ts';
import type { AuthContext } from '../../_shared/auth.ts';

// Roles permitidos para deletar vendors
const ALLOWED_ROLES = ['financeiro', 'admin', 'ceo'];

export async function deleteVendor(
  req: Request,
  auth: AuthContext,
  vendorId: string,
): Promise<Response> {
  console.log('[vendors/delete] soft-delete de vendor', {
    vendorId,
    userId: auth.userId,
    tenantId: auth.tenantId,
    role: auth.role,
  });

  // Verificar permissao
  if (!ALLOWED_ROLES.includes(auth.role)) {
    throw new AppError(
      'FORBIDDEN',
      'Apenas financeiro, admin e ceo podem remover vendors',
      403,
    );
  }

  const supabase = getSupabaseClient(auth.token);

  // Verificar se vendor existe e nao esta deletado
  const { data: existing, error: findErr } = await supabase
    .from('vendors')
    .select('id')
    .eq('id', vendorId)
    .eq('tenant_id', auth.tenantId)
    .is('deleted_at', null)
    .single();

  if (findErr || !existing) {
    throw new AppError('NOT_FOUND', 'Vendor nao encontrado', 404);
  }

  // Soft delete: setar deleted_at com timestamp atual
  const { error: deleteErr } = await supabase
    .from('vendors')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', vendorId)
    .eq('tenant_id', auth.tenantId);

  if (deleteErr) {
    console.error('[vendors/delete] erro ao deletar vendor:', deleteErr);
    throw new AppError('INTERNAL_ERROR', deleteErr.message, 500);
  }

  console.log('[vendors/delete] vendor removido (soft):', vendorId);

  return success({ deleted: true });
}
