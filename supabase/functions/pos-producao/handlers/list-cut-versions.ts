import { getSupabaseClient } from '../../_shared/supabase-client.ts';
import { success } from '../../_shared/response.ts';
import { AppError } from '../../_shared/errors.ts';
import type { AuthContext } from '../../_shared/auth.ts';

export async function handleListCutVersions(
  req: Request,
  auth: AuthContext,
  deliverableId: string,
): Promise<Response> {
  const supabase = getSupabaseClient(auth.token);

  // Validar que o deliverable existe (RLS garante isolamento por tenant)
  const { data: del, error: delErr } = await supabase
    .from('job_deliverables')
    .select('id')
    .eq('id', deliverableId)
    .is('deleted_at', null)
    .single();

  if (delErr || !del) {
    throw new AppError('NOT_FOUND', 'Entregavel nao encontrado', 404);
  }

  console.log(`[pos-producao/list-cut-versions] deliverable=${deliverableId} user=${auth.userId}`);

  const { data, error: listErr } = await supabase
    .from('pos_cut_versions')
    .select(`
      *,
      created_by_profile:profiles!created_by(id, full_name),
      approved_by_profile:profiles!approved_by(id, full_name)
    `)
    .eq('deliverable_id', deliverableId)
    .order('version_type', { ascending: true })
    .order('version_number', { ascending: true });

  if (listErr) throw new AppError('INTERNAL_ERROR', listErr.message, 500);

  return success(data ?? [], 200, req);
}
