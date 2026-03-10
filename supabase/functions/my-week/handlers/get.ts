import { getSupabaseClient } from '../../_shared/supabase-client.ts';
import { success } from '../../_shared/response.ts';
import { AppError } from '../../_shared/errors.ts';
import type { AuthContext } from '../../_shared/auth.ts';

// Status de jobs considerados ativos (mesma lista usada no frontend)
const ACTIVE_STATUSES = [
  'briefing_recebido',
  'orcamento_elaboracao',
  'orcamento_enviado',
  'aguardando_aprovacao',
  'aprovado_selecao_diretor',
  'cronograma_planejamento',
  'pre_producao',
  'producao_filmagem',
  'pos_producao',
  'aguardando_aprovacao_final',
  'entregue',
];

/**
 * Calcula segunda-feira da semana atual (ISO: semana comeca na segunda).
 * Se week_start e fornecido, valida formato YYYY-MM-DD.
 */
function resolveWeekRange(weekStartParam: string | null): { weekStart: string; weekEnd: string } {
  let monday: Date;

  if (weekStartParam) {
    // Validar formato
    if (!/^\d{4}-\d{2}-\d{2}$/.test(weekStartParam)) {
      throw new AppError('VALIDATION_ERROR', 'week_start deve estar no formato YYYY-MM-DD', 400);
    }
    monday = new Date(weekStartParam + 'T00:00:00Z');
    if (isNaN(monday.getTime())) {
      throw new AppError('VALIDATION_ERROR', 'week_start invalido', 400);
    }
  } else {
    // Calcular segunda-feira da semana atual
    const today = new Date();
    const dayOfWeek = today.getUTCDay(); // 0=dom, 1=seg, ..., 6=sab
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    monday = new Date(today);
    monday.setUTCDate(today.getUTCDate() + diff);
  }

  // Domingo = segunda + 6 dias
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);

  const fmt = (d: Date) =>
    `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;

  return { weekStart: fmt(monday), weekEnd: fmt(sunday) };
}

/**
 * GET /my-week
 *
 * Retorna dados consolidados da semana para o usuario logado:
 * - jobs ativos onde o usuario esta no job_team
 * - deliverables com delivery_date na semana
 * - shooting_dates na semana
 * - aprovacoes pendentes desses jobs
 */
export async function getMyWeek(
  req: Request,
  auth: AuthContext,
): Promise<Response> {
  console.log('[my-week] user:', auth.userId, 'tenant:', auth.tenantId);

  const url = new URL(req.url);
  const weekStartParam = url.searchParams.get('week_start');
  const { weekStart, weekEnd } = resolveWeekRange(weekStartParam);

  console.log('[my-week] range:', weekStart, '->', weekEnd);

  const supabase = getSupabaseClient(auth.token);

  // 1. Buscar person_id vinculado ao usuario logado
  const { data: person, error: personErr } = await supabase
    .from('people')
    .select('id, full_name')
    .eq('profile_id', auth.userId)
    .maybeSingle();

  if (personErr) {
    console.error('[my-week] erro ao buscar person:', personErr.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao buscar dados do usuario', 500);
  }

  // Se usuario nao tem person vinculado, retorna tudo vazio
  if (!person) {
    console.log('[my-week] usuario sem person vinculado');
    return success({
      person_id: null,
      person_name: null,
      week_start: weekStart,
      week_end: weekEnd,
      jobs: [],
      deliverables: [],
      shooting_dates: [],
      pending_approvals: [],
    }, 200, req);
  }

  // 2. Buscar job_ids onde este person esta no team (jobs ativos)
  const { data: teamRows, error: teamErr } = await supabase
    .from('job_team')
    .select('job_id, role, is_responsible_producer')
    .eq('person_id', person.id);

  if (teamErr) {
    console.error('[my-week] erro ao buscar job_team:', teamErr.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao buscar equipe do usuario', 500);
  }

  if (!teamRows || teamRows.length === 0) {
    console.log('[my-week] usuario sem jobs no team');
    return success({
      person_id: person.id,
      person_name: person.full_name,
      week_start: weekStart,
      week_end: weekEnd,
      jobs: [],
      deliverables: [],
      shooting_dates: [],
      pending_approvals: [],
    }, 200, req);
  }

  // Mapa job_id -> team info para enriquecer a resposta
  const teamMap = new Map<string, { role: string; is_responsible_producer: boolean }>();
  for (const row of teamRows) {
    teamMap.set(row.job_id, {
      role: row.role,
      is_responsible_producer: row.is_responsible_producer ?? false,
    });
  }

  const jobIds = teamRows.map((r) => r.job_id);

  // 3. Buscar jobs ativos desses IDs (com client e agency names)
  // RLS ja filtra por tenant
  const { data: jobs, error: jobsErr } = await supabase
    .from('jobs')
    .select(`
      id, code, title, status, health_score,
      expected_delivery_date, pos_sub_status,
      clients ( name ),
      agencies ( name )
    `)
    .in('id', jobIds)
    .in('status', ACTIVE_STATUSES)
    .eq('is_archived', false)
    .order('updated_at', { ascending: false });

  if (jobsErr) {
    console.error('[my-week] erro ao buscar jobs:', jobsErr.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao buscar jobs', 500);
  }

  // IDs dos jobs ativos (pode ser subset de jobIds — exclui finalizados/cancelados)
  const activeJobIds = (jobs ?? []).map((j) => j.id);

  if (activeJobIds.length === 0) {
    return success({
      person_id: person.id,
      person_name: person.full_name,
      week_start: weekStart,
      week_end: weekEnd,
      jobs: [],
      deliverables: [],
      shooting_dates: [],
      pending_approvals: [],
    }, 200, req);
  }

  // 4. Queries paralelas: deliverables + shooting_dates + approvals da semana
  const [delivResult, shootResult, approvalResult] = await Promise.all([
    // Deliverables com delivery_date dentro da semana
    supabase
      .from('job_deliverables')
      .select('id, job_id, description, status, delivery_date, format, resolution')
      .in('job_id', activeJobIds)
      .gte('delivery_date', weekStart)
      .lte('delivery_date', weekEnd)
      .order('delivery_date', { ascending: true }),

    // Shooting dates dentro da semana
    supabase
      .from('job_shooting_dates')
      .select('id, job_id, shooting_date, description, location, start_time, end_time')
      .in('job_id', activeJobIds)
      .gte('shooting_date', weekStart)
      .lte('shooting_date', weekEnd)
      .order('shooting_date', { ascending: true }),

    // Aprovacoes pendentes (sem filtro de data — todas pendentes dos meus jobs)
    supabase
      .from('approval_requests')
      .select('id, job_id, approval_type, status, created_at')
      .in('job_id', activeJobIds)
      .eq('status', 'pendente')
      .order('created_at', { ascending: false }),
  ]);

  if (delivResult.error) {
    console.error('[my-week] erro deliverables:', delivResult.error.message);
  }
  if (shootResult.error) {
    console.error('[my-week] erro shooting_dates:', shootResult.error.message);
  }
  if (approvalResult.error) {
    console.error('[my-week] erro approvals:', approvalResult.error.message);
  }

  // Construir lookup job_id -> code/title para enriquecer deliverables e shooting
  const jobLookup = new Map<string, { code: string; title: string }>();
  for (const j of (jobs ?? [])) {
    jobLookup.set(j.id, { code: j.code, title: j.title });
  }

  // Montar resposta enriquecida
  const responseJobs = (jobs ?? []).map((j) => {
    const team = teamMap.get(j.id);
    return {
      id: j.id,
      code: j.code,
      title: j.title,
      status: j.status,
      pos_sub_status: j.pos_sub_status,
      health_score: j.health_score,
      client_name: (j.clients as unknown as { name: string })?.name ?? null,
      agency_name: (j.agencies as unknown as { name: string })?.name ?? null,
      expected_delivery_date: j.expected_delivery_date,
      team_role: team?.role ?? null,
      is_responsible_producer: team?.is_responsible_producer ?? false,
    };
  });

  const responseDeliverables = (delivResult.data ?? []).map((d) => {
    const job = jobLookup.get(d.job_id);
    return {
      id: d.id,
      job_id: d.job_id,
      job_code: job?.code ?? null,
      job_title: job?.title ?? null,
      description: d.description,
      status: d.status,
      delivery_date: d.delivery_date,
      format: d.format,
      resolution: d.resolution,
    };
  });

  const responseShootingDates = (shootResult.data ?? []).map((s) => {
    const job = jobLookup.get(s.job_id);
    return {
      id: s.id,
      job_id: s.job_id,
      job_code: job?.code ?? null,
      job_title: job?.title ?? null,
      shooting_date: s.shooting_date,
      description: s.description,
      location: s.location,
      start_time: s.start_time,
      end_time: s.end_time,
    };
  });

  const responseApprovals = (approvalResult.data ?? []).map((a) => {
    const job = jobLookup.get(a.job_id);
    return {
      id: a.id,
      job_id: a.job_id,
      job_code: job?.code ?? null,
      job_title: job?.title ?? null,
      approval_type: a.approval_type,
      status: a.status,
      created_at: a.created_at,
    };
  });

  return success({
    person_id: person.id,
    person_name: person.full_name,
    week_start: weekStart,
    week_end: weekEnd,
    jobs: responseJobs,
    deliverables: responseDeliverables,
    shooting_dates: responseShootingDates,
    pending_approvals: responseApprovals,
  }, 200, req);
}
