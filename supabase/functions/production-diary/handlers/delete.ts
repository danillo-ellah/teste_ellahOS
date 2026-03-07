import type { AuthContext } from '../../_shared/auth.ts';
import { AppError } from '../../_shared/errors.ts';
import { success } from '../../_shared/response.ts';
import { getSupabaseClient } from '../../_shared/supabase-client.ts';

// Roles autorizados para deletar entradas do diario
// Restricao: apenas ceo e produtor_executivo podem deletar (spec RN-06)
const ALLOWED_ROLES = ['admin', 'ceo', 'produtor_executivo'];

export async function handleDelete(_req: Request, auth: AuthContext, id: string): Promise<Response> {
  console.log('[production-diary/delete] deletando entrada', {
    id,
    userId: auth.userId,
    tenantId: auth.tenantId,
  });

  // Validacao de role
  if (!ALLOWED_ROLES.includes(auth.role)) {
    throw new AppError(
      'FORBIDDEN',
      'Permissao insuficiente para deletar entradas do diario de producao',
      403,
    );
  }

  const client = getSupabaseClient(auth.token);

  // Verificar que a entrada existe e pertence ao tenant
  const { data: current, error: fetchError } = await client
    .from('production_diary_entries')
    .select('id, day_number, shooting_date')
    .eq('id', id)
    .eq('tenant_id', auth.tenantId)
    .is('deleted_at', null)
    .single();

  if (fetchError || !current) {
    throw new AppError('NOT_FOUND', 'Entrada do diario nao encontrada', 404);
  }

  // Soft delete
  const { error: deleteError } = await client
    .from('production_diary_entries')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('tenant_id', auth.tenantId);

  if (deleteError) {
    console.error('[production-diary/delete] erro ao deletar:', deleteError.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao deletar entrada do diario', 500, {
      detail: deleteError.message,
    });
  }

  console.log('[production-diary/delete] entrada deletada com sucesso', { id });
  return success({ id, deleted: true }, 200, _req);
}
