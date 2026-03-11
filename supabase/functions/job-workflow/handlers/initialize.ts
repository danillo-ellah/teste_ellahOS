import { getSupabaseClient } from '../../_shared/supabase-client.ts';
import { success } from '../../_shared/response.ts';
import { AppError } from '../../_shared/errors.ts';
import type { AuthContext } from '../../_shared/auth.ts';

const ALLOWED_ROLES = ['admin', 'ceo', 'produtor_executivo', 'coordenador'];

export async function handleInitialize(
  req: Request,
  auth: AuthContext,
  jobId: string,
): Promise<Response> {
  if (!ALLOWED_ROLES.includes(auth.role)) {
    throw new AppError('FORBIDDEN', 'Sem permissao para inicializar workflow', 403);
  }

  const supabase = getSupabaseClient(auth.token);

  // Chamar a RPC que cria os 16 passos (idempotente)
  const { error: rpcErr } = await supabase.rpc('create_job_workflow_steps', {
    p_job_id: jobId,
  });

  if (rpcErr) {
    if (rpcErr.message?.includes('Job nao encontrado')) {
      throw new AppError('NOT_FOUND', 'Job nao encontrado ou nao pertence ao tenant', 404);
    }
    throw new AppError('INTERNAL_ERROR', rpcErr.message, 500);
  }

  // Retornar os steps criados
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

  console.log(`[job-workflow/initialize] job=${jobId} steps=${steps?.length ?? 0}`);
  return success(steps ?? [], 201, req);
}
