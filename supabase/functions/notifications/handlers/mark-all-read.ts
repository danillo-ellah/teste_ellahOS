import { getSupabaseClient } from '../../_shared/supabase-client.ts';
import { success } from '../../_shared/response.ts';
import { AppError } from '../../_shared/errors.ts';
import type { AuthContext } from '../../_shared/auth.ts';

// Marca todas as notificacoes nao lidas do usuario autenticado como lidas
export async function markAllRead(
  _req: Request,
  auth: AuthContext,
): Promise<Response> {
  const supabase = getSupabaseClient(auth.token);

  // Atualiza apenas notificacoes ainda nao lidas (read_at IS NULL)
  // para evitar sobrescrever timestamps de leituras anteriores
  const { data, error: dbError } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', auth.userId)
    .is('read_at', null)
    .select('id');

  if (dbError) {
    throw new AppError('INTERNAL_ERROR', dbError.message, 500);
  }

  return success({ updated_count: data?.length ?? 0 });
}
