import { getSupabaseClient } from '../../_shared/supabase-client.ts';
import { success } from '../../_shared/response.ts';
import { AppError } from '../../_shared/errors.ts';
import { mapDbToApi } from '../../_shared/column-map.ts';
import type { AuthContext } from '../../_shared/auth.ts';

export async function getJobById(
  req: Request,
  auth: AuthContext,
  jobId: string,
): Promise<Response> {
  const url = new URL(req.url);
  const supabase = getSupabaseClient(auth.token);

  // Buscar job com JOINs para client e agency
  const { data: job, error: dbError } = await supabase
    .from('jobs')
    .select('*, clients(id, name), agencies(id, name)')
    .eq('id', jobId)
    .is('deleted_at', null)
    .single();

  if (dbError || !job) {
    throw new AppError('NOT_FOUND', 'Job nao encontrado', 404);
  }

  // Resultado base mapeado
  const result: Record<string, unknown> = mapDbToApi(job);

  // Includes opcionais via ?include=team,deliverables,shooting_dates,history
  const includes = (url.searchParams.get('include') ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  if (includes.includes('team')) {
    const { data: team } = await supabase
      .from('job_team')
      .select('*, people(id, full_name)')
      .eq('job_id', jobId)
      .is('deleted_at', null)
      .order('created_at', { ascending: true });

    result.team = (team ?? []).map((m) => ({
      id: m.id,
      person_id: m.person_id,
      person_name: m.people?.full_name ?? null,
      role: m.role,
      fee: m.rate,
      hiring_status: m.hiring_status,
      is_lead_producer: m.is_responsible_producer,
      notes: m.notes,
      created_at: m.created_at,
    }));
  }

  if (includes.includes('deliverables')) {
    const { data: deliverables } = await supabase
      .from('job_deliverables')
      .select('*')
      .eq('job_id', jobId)
      .is('deleted_at', null)
      .order('display_order', { ascending: true });

    result.deliverables = deliverables ?? [];
  }

  if (includes.includes('shooting_dates')) {
    const { data: dates } = await supabase
      .from('job_shooting_dates')
      .select('*')
      .eq('job_id', jobId)
      .is('deleted_at', null)
      .order('shooting_date', { ascending: true });

    result.shooting_dates = dates ?? [];
  }

  if (includes.includes('history')) {
    const { data: history } = await supabase
      .from('job_history')
      .select('*')
      .eq('job_id', jobId)
      .order('created_at', { ascending: false })
      .limit(20);

    result.history = (history ?? []).map((h) => ({
      ...h,
      previous_data: h.data_before,
      new_data: h.data_after,
      data_before: undefined,
      data_after: undefined,
    }));
  }

  // Sub-jobs (se o job e pai)
  if (job.is_parent_job) {
    const { data: subJobs } = await supabase
      .from('jobs')
      .select('id, code, title, status, health_score')
      .eq('parent_job_id', jobId)
      .is('deleted_at', null)
      .order('index_number', { ascending: true });

    result.sub_jobs = (subJobs ?? []).map((sj) => ({
      ...sj,
      job_code: sj.code,
      code: undefined,
    }));
  }

  return success(result);
}
