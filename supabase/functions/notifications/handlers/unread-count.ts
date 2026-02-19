import { getSupabaseClient } from '../../_shared/supabase-client.ts';
import { success } from '../../_shared/response.ts';
import { AppError } from '../../_shared/errors.ts';
import type { AuthContext } from '../../_shared/auth.ts';

// Retorna a contagem de notificacoes nao lidas do usuario autenticado
export async function getUnreadCount(
  _req: Request,
  auth: AuthContext,
): Promise<Response> {
  const supabase = getSupabaseClient(auth.token);

  // COUNT usando head: true para eficiencia (sem retornar linhas)
  const { count, error: dbError } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', auth.userId)
    .is('read_at', null);

  if (dbError) {
    throw new AppError('INTERNAL_ERROR', dbError.message, 500);
  }

  return success({ unread_count: count ?? 0 });
}
