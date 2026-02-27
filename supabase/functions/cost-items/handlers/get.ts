import type { AuthContext } from '../../_shared/auth.ts';
import { AppError } from '../../_shared/errors.ts';
import { success } from '../../_shared/response.ts';
import { getSupabaseClient } from '../../_shared/supabase-client.ts';

export async function handleGet(_req: Request, auth: AuthContext, id: string): Promise<Response> {
  console.log('[cost-items/get] buscando item de custo', {
    id,
    userId: auth.userId,
    tenantId: auth.tenantId,
  });

  const client = getSupabaseClient(auth.token);

  const { data: item, error: fetchError } = await client
    .from('cost_items')
    .select('*, vendors(id, full_name, email, phone, bank_accounts(*))')
    .eq('id', id)
    .eq('tenant_id', auth.tenantId)
    .is('deleted_at', null)
    .single();

  if (fetchError || !item) {
    console.error('[cost-items/get] item nao encontrado', { id, error: fetchError?.message });
    throw new AppError('NOT_FOUND', 'Item de custo nao encontrado', 404);
  }

  return success(item);
}
