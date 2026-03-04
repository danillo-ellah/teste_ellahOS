import { getSupabaseClient } from '../../_shared/supabase-client.ts';
import { success } from '../../_shared/response.ts';
import { AppError } from '../../_shared/errors.ts';
import type { AuthContext } from '../../_shared/auth.ts';

export async function handleDelete(
  req: Request,
  auth: AuthContext,
  odId: string,
): Promise<Response> {
  console.log('[shooting-day-order/delete] deletando ordem do dia', {
    odId,
    userId: auth.userId,
    tenantId: auth.tenantId,
    role: auth.role,
  });

  const supabase = getSupabaseClient(auth.token);

  // Verificar se o registro existe e pertence ao tenant
  const { data: existing, error: findErr } = await supabase
    .from('shooting_day_orders')
    .select('id')
    .eq('id', odId)
    .eq('tenant_id', auth.tenantId)
    .single();

  if (findErr || !existing) {
    throw new AppError('NOT_FOUND', 'Ordem do dia nao encontrada', 404);
  }

  // Hard delete — RLS policy garante isolamento por tenant
  const { error: deleteErr } = await supabase
    .from('shooting_day_orders')
    .delete()
    .eq('id', odId)
    .eq('tenant_id', auth.tenantId);

  if (deleteErr) {
    console.error('[shooting-day-order/delete] erro ao deletar ordem do dia:', deleteErr);
    throw new AppError('INTERNAL_ERROR', deleteErr.message, 500);
  }

  console.log('[shooting-day-order/delete] ordem do dia deletada:', odId);

  return success({ deleted: true }, 200, req);
}
