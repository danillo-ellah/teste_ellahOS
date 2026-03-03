import type { AuthContext } from '../../_shared/auth.ts';
import { AppError } from '../../_shared/errors.ts';
import { success } from '../../_shared/response.ts';
import { getSupabaseClient } from '../../_shared/supabase-client.ts';

const ADMIN_ROLES = ['admin', 'ceo', 'produtor_executivo'];

export async function handleDelete(req: Request, auth: AuthContext, id: string): Promise<Response> {
  console.log('[overtime/delete] soft-deletando lancamento', {
    userId: auth.userId,
    tenantId: auth.tenantId,
    entryId: id,
  });

  const client = getSupabaseClient(auth.token);

  // Verificar que o lancamento existe e pertence ao tenant
  const { data: existing } = await client
    .from('time_entries')
    .select('id, approved_by')
    .eq('id', id)
    .eq('tenant_id', auth.tenantId)
    .is('deleted_at', null)
    .maybeSingle();

  if (!existing) {
    throw new AppError('NOT_FOUND', 'Lancamento de ponto nao encontrado', 404);
  }

  // Lancamentos aprovados so podem ser removidos por admins
  if (existing.approved_by && !ADMIN_ROLES.includes(auth.role)) {
    throw new AppError(
      'FORBIDDEN',
      'Lancamentos aprovados so podem ser removidos por administradores',
      403,
    );
  }

  const { error: deleteError } = await client
    .from('time_entries')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('tenant_id', auth.tenantId);

  if (deleteError) {
    console.error('[overtime/delete] erro ao deletar:', deleteError.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao remover lancamento de ponto', 500, {
      detail: deleteError.message,
    });
  }

  console.log('[overtime/delete] lancamento removido com sucesso', { id });
  return success({ id, deleted: true }, 200, req);
}
