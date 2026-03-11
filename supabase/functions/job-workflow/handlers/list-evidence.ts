import { getSupabaseClient } from '../../_shared/supabase-client.ts';
import { success } from '../../_shared/response.ts';
import { AppError } from '../../_shared/errors.ts';
import type { AuthContext } from '../../_shared/auth.ts';

export async function handleListEvidence(
  req: Request,
  auth: AuthContext,
  stepId: string,
): Promise<Response> {
  const supabase = getSupabaseClient(auth.token);

  // Verificar que o step existe (RLS garante tenant)
  const { data: step, error: stepErr } = await supabase
    .from('job_workflow_steps')
    .select('id')
    .eq('id', stepId)
    .is('deleted_at', null)
    .single();

  if (stepErr || !step) {
    throw new AppError('NOT_FOUND', 'Passo do workflow nao encontrado', 404);
  }

  const { data: evidence, error: fetchErr } = await supabase
    .from('job_workflow_evidence')
    .select(`
      *,
      uploader:uploaded_by(id, full_name, avatar_url)
    `)
    .eq('workflow_step_id', stepId)
    .order('created_at', { ascending: false });

  if (fetchErr) {
    throw new AppError('INTERNAL_ERROR', fetchErr.message, 500);
  }

  console.log(`[job-workflow/list-evidence] step=${stepId} count=${evidence?.length ?? 0}`);
  return success(evidence ?? [], 200, req);
}
