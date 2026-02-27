import type { AuthContext } from '../../_shared/auth.ts';
import { AppError } from '../../_shared/errors.ts';
import { success } from '../../_shared/response.ts';
import { getSupabaseClient } from '../../_shared/supabase-client.ts';
import { insertHistory } from '../../_shared/history.ts';

// Roles autorizados para deletar itens de custo
const ALLOWED_ROLES = ['financeiro', 'produtor_executivo', 'admin', 'ceo'];

export async function handleDelete(_req: Request, auth: AuthContext, id: string): Promise<Response> {
  console.log('[cost-items/delete] deletando item de custo', {
    id,
    userId: auth.userId,
    tenantId: auth.tenantId,
  });

  // Validacao de role
  if (!ALLOWED_ROLES.includes(auth.role)) {
    throw new AppError(
      'FORBIDDEN',
      'Permissao insuficiente para deletar itens de custo',
      403,
    );
  }

  const client = getSupabaseClient(auth.token);

  // Buscar item atual antes de deletar (para historico)
  const { data: current, error: fetchError } = await client
    .from('cost_items')
    .select('id, job_id, service_description, item_number, sub_item_number')
    .eq('id', id)
    .eq('tenant_id', auth.tenantId)
    .is('deleted_at', null)
    .single();

  if (fetchError || !current) {
    throw new AppError('NOT_FOUND', 'Item de custo nao encontrado', 404);
  }

  // Soft delete: atualizar deleted_at
  const { error: deleteError } = await client
    .from('cost_items')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('tenant_id', auth.tenantId);

  if (deleteError) {
    console.error('[cost-items/delete] erro ao deletar:', deleteError.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao deletar item de custo', 500, {
      detail: deleteError.message,
    });
  }

  // Inserir historico se o item pertencia a um job
  if (current.job_id) {
    await insertHistory(client, {
      tenantId: auth.tenantId,
      jobId: current.job_id,
      eventType: 'financial_update',
      userId: auth.userId,
      dataBefore: {
        id: current.id,
        item_number: current.item_number,
        sub_item_number: current.sub_item_number,
        service_description: current.service_description,
      },
      dataAfter: null,
      description: `Item de custo removido: ${current.service_description}`,
    });
  }

  console.log('[cost-items/delete] item deletado com sucesso', { id });
  return success({ id, deleted: true });
}
