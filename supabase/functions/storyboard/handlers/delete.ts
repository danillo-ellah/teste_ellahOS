import { getSupabaseClient } from '../../_shared/supabase-client.ts';
import { success } from '../../_shared/response.ts';
import { AppError } from '../../_shared/errors.ts';
import type { AuthContext } from '../../_shared/auth.ts';

export async function handleDelete(
  req: Request,
  auth: AuthContext,
  sceneId: string,
): Promise<Response> {
  console.log('[storyboard/delete] deletando cena', {
    sceneId,
    userId: auth.userId,
    tenantId: auth.tenantId,
    role: auth.role,
  });

  const supabase = getSupabaseClient(auth.token);

  // Verificar se a cena existe e pertence ao tenant
  const { data: existing, error: findErr } = await supabase
    .from('storyboard_scenes')
    .select('id')
    .eq('id', sceneId)
    .eq('tenant_id', auth.tenantId)
    .single();

  if (findErr || !existing) {
    throw new AppError('NOT_FOUND', 'Cena nao encontrada', 404);
  }

  // Hard delete — cenas nao tem soft delete
  const { error: deleteErr } = await supabase
    .from('storyboard_scenes')
    .delete()
    .eq('id', sceneId)
    .eq('tenant_id', auth.tenantId);

  if (deleteErr) {
    console.error('[storyboard/delete] erro ao deletar cena:', deleteErr);
    throw new AppError('INTERNAL_ERROR', deleteErr.message, 500);
  }

  console.log('[storyboard/delete] cena deletada:', sceneId);

  return success({ deleted: true }, 200, req);
}
