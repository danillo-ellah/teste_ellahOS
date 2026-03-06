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

  if (!jobId) {
    throw new AppError('VALIDATION_ERROR', 'Parametro job_id e obrigatorio', 400);
  }

  console.log('[shooting-day-order/list] listando ordens do dia', {
    jobId,
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

  const { data: orders, error: dbErr } = await supabase
    .from('shooting_day_orders')
    .select(
      'id, job_id, shooting_date_id, title, day_number, general_location, weather_summary, weather_data, first_call, production_call, filming_start, breakfast_time, lunch_time, camera_wrap, deproduction, crew_calls, filming_blocks, cast_schedule, important_info, pdf_template, status, pdf_url, shared_at, created_by, created_at, updated_at',
    )
    .eq('job_id', jobId)
    .eq('tenant_id', auth.tenantId)
    .order('created_at', { ascending: false });

  if (dbErr) {
    console.error('[shooting-day-order/list] erro na query:', dbErr.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao listar ordens do dia', 500);
  }

  console.log('[shooting-day-order/list] retornando', orders?.length ?? 0, 'ordens do dia');

  return success(orders ?? [], 200, req);
}
