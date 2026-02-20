import { getSupabaseClient } from '../_shared/supabase-client.ts';
import { success } from '../_shared/response.ts';
import { AppError } from '../_shared/errors.ts';
import type { AuthContext } from '../_shared/auth.ts';

// GET /dashboard/pipeline
// Chama a RPC get_pipeline_summary(p_tenant_id) e retorna contagem de jobs por status.
// Campos por item: status, count, total_value
// Ordenado pela progressao natural do pipeline (briefing → finalizado).
export async function getPipeline(
  _req: Request,
  auth: AuthContext,
): Promise<Response> {
  console.log('[dashboard/pipeline] tenant:', auth.tenantId);

  const supabase = getSupabaseClient(auth.token);

  const { data, error } = await supabase.rpc('get_pipeline_summary', {
    p_tenant_id: auth.tenantId,
  });

  if (error) {
    console.error('[dashboard/pipeline] erro RPC:', error.message);
    throw new AppError('INTERNAL_ERROR', error.message, 500);
  }

  return success(data ?? []);
}
