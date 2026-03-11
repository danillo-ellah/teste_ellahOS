import { getSupabaseClient } from '../../_shared/supabase-client.ts';
import { success } from '../../_shared/response.ts';
import { AppError } from '../../_shared/errors.ts';
import type { AuthContext } from '../../_shared/auth.ts';

export async function handleListSteps(
  req: Request,
  auth: AuthContext,
  jobId: string,
): Promise<Response> {
  const supabase = getSupabaseClient(auth.token);

  // Verificar que job existe (RLS garante tenant isolation)
  const { data: job, error: jobErr } = await supabase
    .from('jobs')
    .select('id')
    .eq('id', jobId)
    .is('deleted_at', null)
    .single();

  if (jobErr || !job) {
    throw new AppError('NOT_FOUND', 'Job nao encontrado', 404);
  }

  // Buscar steps com joins de profiles
  const { data: steps, error: fetchErr } = await supabase
    .from('job_workflow_steps')
    .select(`
      *,
      assigned_profile:assigned_to(id, full_name, avatar_url),
      approved_profile:approved_by(id, full_name)
    `)
    .eq('job_id', jobId)
    .is('deleted_at', null)
    .order('sort_order', { ascending: true });

  if (fetchErr) {
    throw new AppError('INTERNAL_ERROR', fetchErr.message, 500);
  }

  // Contar evidencias por step (para saber se conferencia pode completar)
  const stepIds = (steps ?? []).map((s) => s.id);
  let evidenceCounts: Record<string, number> = {};

  if (stepIds.length > 0) {
    const { data: counts } = await supabase
      .from('job_workflow_evidence')
      .select('workflow_step_id')
      .in('workflow_step_id', stepIds);

    if (counts) {
      evidenceCounts = counts.reduce((acc: Record<string, number>, row) => {
        acc[row.workflow_step_id] = (acc[row.workflow_step_id] || 0) + 1;
        return acc;
      }, {});
    }
  }

  // Adicionar evidence_count a cada step
  const enriched = (steps ?? []).map((s) => ({
    ...s,
    evidence_count: evidenceCounts[s.id] || 0,
  }));

  console.log(`[job-workflow/list-steps] job=${jobId} steps=${enriched.length}`);
  return success(enriched, 200, req);
}
