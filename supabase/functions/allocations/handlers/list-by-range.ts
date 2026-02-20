import { getSupabaseClient } from '../../_shared/supabase-client.ts';
import { success } from '../../_shared/response.ts';
import { AppError } from '../../_shared/errors.ts';
import type { AuthContext } from '../../_shared/auth.ts';

// GET /allocations?from=Y&to=Z — lista TODAS as alocacoes do tenant no periodo (calendario)
export async function listByRange(
  req: Request,
  auth: AuthContext,
): Promise<Response> {
  const url = new URL(req.url);
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');

  if (!from || !to) {
    throw new AppError('VALIDATION_ERROR', 'Parametros from e to sao obrigatorios', 400);
  }

  const supabase = getSupabaseClient(auth.token);

  const { data, error } = await supabase
    .from('allocations')
    .select('*, people(id, full_name), jobs(id, code, title, status)')
    .is('deleted_at', null)
    .lte('allocation_start', to)
    .gte('allocation_end', from)
    .order('allocation_start', { ascending: true });

  if (error) {
    console.error('[allocations/list-by-range] erro:', error.message);
    throw new AppError('INTERNAL_ERROR', error.message, 500);
  }

  return success(data ?? []);
}
