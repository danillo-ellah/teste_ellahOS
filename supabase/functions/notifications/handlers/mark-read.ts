import { getSupabaseClient } from '../../_shared/supabase-client.ts';
import { success } from '../../_shared/response.ts';
import { AppError } from '../../_shared/errors.ts';
import type { AuthContext } from '../../_shared/auth.ts';

// Marca uma notificacao especifica como lida pelo usuario autenticado
export async function markRead(
  _req: Request,
  auth: AuthContext,
  notificationId: string,
): Promise<Response> {
  const supabase = getSupabaseClient(auth.token);

  // Atualiza read_at da notificacao.
  // O filtro por user_id garante que o usuario so pode marcar suas proprias
  // notificacoes (dupla protecao alem do RLS da tabela).
  const { data: notification, error: dbError } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', notificationId)
    .eq('user_id', auth.userId)
    .select()
    .single();

  if (dbError) {
    // PostgreSQL retorna PGRST116 quando nenhuma linha e afetada no .single()
    if (dbError.code === 'PGRST116') {
      throw new AppError(
        'NOT_FOUND',
        'Notificacao nao encontrada ou sem permissao de acesso',
        404,
      );
    }
    throw new AppError('INTERNAL_ERROR', dbError.message, 500);
  }

  if (!notification) {
    throw new AppError(
      'NOT_FOUND',
      'Notificacao nao encontrada ou sem permissao de acesso',
      404,
    );
  }

  return success(notification);
}
