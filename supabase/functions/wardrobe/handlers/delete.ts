import type { AuthContext } from '../../_shared/auth.ts';
import { AppError } from '../../_shared/errors.ts';
import { success } from '../../_shared/response.ts';
import { getSupabaseClient } from '../../_shared/supabase-client.ts';

export async function handleDelete(req: Request, auth: AuthContext, id: string): Promise<Response> {
  console.log('[wardrobe/delete] soft-deletando ficha', {
    userId: auth.userId,
    tenantId: auth.tenantId,
    wardrobeItemId: id,
  });

  const client = getSupabaseClient(auth.token);

  // Verificar que o item existe e pertence ao tenant
  const { data: existing } = await client
    .from('wardrobe_items')
    .select('id')
    .eq('id', id)
    .eq('tenant_id', auth.tenantId)
    .is('deleted_at', null)
    .maybeSingle();

  if (!existing) {
    throw new AppError('NOT_FOUND', 'Ficha de figurino/arte nao encontrada', 404);
  }

  const { error: deleteError } = await client
    .from('wardrobe_items')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('tenant_id', auth.tenantId);

  if (deleteError) {
    console.error('[wardrobe/delete] erro ao deletar:', deleteError.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao remover ficha de figurino/arte', 500, {
      detail: deleteError.message,
    });
  }

  console.log('[wardrobe/delete] ficha removida com sucesso', { id });
  return success({ id, deleted: true }, 200, req);
}
