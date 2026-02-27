import { getSupabaseClient } from '../../_shared/supabase-client.ts';
import { success } from '../../_shared/response.ts';
import { AppError } from '../../_shared/errors.ts';
import type { AuthContext } from '../../_shared/auth.ts';

export async function getVendor(
  req: Request,
  auth: AuthContext,
  vendorId: string,
): Promise<Response> {
  console.log('[vendors/get] buscando vendor', {
    vendorId,
    userId: auth.userId,
    tenantId: auth.tenantId,
  });

  const supabase = getSupabaseClient(auth.token);

  const { data: vendor, error: dbError } = await supabase
    .from('vendors')
    .select('*, bank_accounts(*)')
    .eq('id', vendorId)
    .eq('tenant_id', auth.tenantId)
    .is('deleted_at', null)
    .single();

  if (dbError || !vendor) {
    console.log('[vendors/get] vendor nao encontrado:', vendorId, dbError?.message);
    throw new AppError('NOT_FOUND', 'Vendor nao encontrado', 404);
  }

  console.log('[vendors/get] vendor encontrado:', vendor.id);

  return success(vendor);
}
