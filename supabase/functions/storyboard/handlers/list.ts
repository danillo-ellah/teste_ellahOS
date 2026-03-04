import { getSupabaseClient } from '../../_shared/supabase-client.ts';
import { success } from '../../_shared/response.ts';
import { AppError } from '../../_shared/errors.ts';
import type { AuthContext } from '../../_shared/auth.ts';

export async function handleList(
  req: Request,
  auth: AuthContext,
): Promise<Response> {
  const url = new URL(req.url);
  const jobId = url.searchParams.get('job_id');
  const shootingDateId = url.searchParams.get('shooting_date_id');

  if (!jobId) {
    throw new AppError('VALIDATION_ERROR', 'Parametro job_id e obrigatorio', 400);
  }

  console.log('[storyboard/list] listando cenas', {
    jobId,
    shootingDateId,
    userId: auth.userId,
    tenantId: auth.tenantId,
  });

  const supabase = getSupabaseClient(auth.token);

  // Verificar se o job pertence ao tenant do usuario
  const { data: job, error: jobErr } = await supabase
    .from('jobs')
    .select('id')
    .eq('id', jobId)
    .eq('tenant_id', auth.tenantId)
    .single();

  if (jobErr || !job) {
    throw new AppError('NOT_FOUND', 'Job nao encontrado', 404);
  }

  let query = supabase
    .from('storyboard_scenes')
    .select(
      'id, job_id, scene_number, title, description, shot_type, location, cast_notes, camera_notes, mood_references, status, sort_order, shooting_date_id, created_by, created_at, updated_at',
    )
    .eq('job_id', jobId)
    .eq('tenant_id', auth.tenantId)
    .order('sort_order', { ascending: true });

  // Filtro opcional por data de filmagem
  if (shootingDateId) {
    query = query.eq('shooting_date_id', shootingDateId);
  }

  const { data: scenes, error: dbErr } = await query;

  if (dbErr) {
    console.error('[storyboard/list] erro na query:', dbErr);
    throw new AppError('INTERNAL_ERROR', dbErr.message, 500);
  }

  console.log('[storyboard/list] retornando', scenes?.length ?? 0, 'cenas');

  return success(scenes ?? [], 200, req);
}
