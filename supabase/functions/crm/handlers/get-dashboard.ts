import type { AuthContext } from '../../_shared/auth.ts';
import { AppError } from '../../_shared/errors.ts';
import { success } from '../../_shared/response.ts';
import { getSupabaseClient } from '../../_shared/supabase-client.ts';

const ACTIVE_STAGES = ['lead', 'qualificado', 'proposta', 'negociacao', 'fechamento'] as const;

const FUNNEL_LABELS: Record<string, string> = {
  lead: 'Consulta',
  qualificado: 'Em Analise',
  proposta: 'Orc. Enviado',
  negociacao: 'Negociacao',
  fechamento: 'Aprovacao',
};

/**
 * GET /crm/dashboard
 * KPIs executivos do modulo comercial em uma unica chamada:
 *  - Resumo do pipeline ativo
 *  - Resumo do mes corrente vs anterior
 *  - Alertas de prazo / inatividade
 *  - Funil por stage
 *  - Top agencias por valor (ano)
 *  - Por PE (responsavel)
 *  - Stats de concorrencia (6 meses)
 *  - Ultimos fechamentos
 */
export async function handleGetDashboard(req: Request, auth: AuthContext): Promise<Response> {
  console.log('[crm/dashboard] calculando KPIs', {
    userId: auth.userId,
    tenantId: auth.tenantId,
  });

  const client = getSupabaseClient(auth.token);

  // -----------------------------------------------------------------------
  // 1. Buscar todas as oportunidades relevantes
  // -----------------------------------------------------------------------
  const { data: allOpps, error: oppsError } = await client
    .from('opportunities')
    .select(
      'id, title, stage, estimated_value, actual_close_date, response_deadline, updated_at, assigned_to, is_competitive_bid, loss_category, agency_id',
    )
    .eq('tenant_id', auth.tenantId)
    .is('deleted_at', null);

  if (oppsError) {
    console.error('[crm/dashboard] erro ao buscar oportunidades:', oppsError.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao calcular dashboard', 500, {
      detail: oppsError.message,
    });
  }

  const opps = allOpps ?? [];

  // -----------------------------------------------------------------------
  // 2. Pipeline summary
  // -----------------------------------------------------------------------
  const activeOpps = opps.filter((o) => (ACTIVE_STAGES as readonly string[]).includes(o.stage));
  const pausedOpps = opps.filter((o) => o.stage === 'pausado');

  const pipelineSummary = {
    total_value: activeOpps.reduce((sum, o) => sum + Number(o.estimated_value ?? 0), 0),
    total_count: activeOpps.length,
    total_paused: pausedOpps.length,
  };

  // -----------------------------------------------------------------------
  // 3. Month summary: fechamentos no mes atual vs anterior
  // -----------------------------------------------------------------------
  const now = new Date();
  const currMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
  const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString();

  const wonOpps = opps.filter((o) => o.stage === 'ganho' && o.actual_close_date);

  const currMonthWon = wonOpps.filter(
    (o) => o.actual_close_date! >= currMonthStart,
  );
  const prevMonthWon = wonOpps.filter(
    (o) => o.actual_close_date! >= prevMonthStart && o.actual_close_date! <= prevMonthEnd,
  );

  const currJobs = currMonthWon.length;
  const prevJobs = prevMonthWon.length;
  const currRevenue = currMonthWon.reduce((sum, o) => sum + Number(o.estimated_value ?? 0), 0);
  const prevRevenue = prevMonthWon.reduce((sum, o) => sum + Number(o.estimated_value ?? 0), 0);

  const vsLastMonthJobsPct =
    prevJobs === 0 ? (currJobs > 0 ? 100 : 0) : ((currJobs - prevJobs) / prevJobs) * 100;
  const vsLastMonthRevenuePct =
    prevRevenue === 0
      ? currRevenue > 0 ? 100 : 0
      : ((currRevenue - prevRevenue) / prevRevenue) * 100;

  const monthSummary = {
    jobs_closed: currJobs,
    revenue: currRevenue,
    vs_last_month_jobs_pct: Math.round(vsLastMonthJobsPct * 10) / 10,
    vs_last_month_revenue_pct: Math.round(vsLastMonthRevenuePct * 10) / 10,
  };

  // -----------------------------------------------------------------------
  // 4. Alerts count: response_deadline vencido OU sem atividade ha 5+ dias
  // -----------------------------------------------------------------------
  const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();

  const alertsCount = activeOpps.filter((o) => {
    const overdueDeadline =
      o.response_deadline != null && o.response_deadline < now.toISOString();
    const stale = !o.updated_at || o.updated_at < fiveDaysAgo;
    return overdueDeadline || stale;
  }).length;

  // -----------------------------------------------------------------------
  // 5. Funnel
  // -----------------------------------------------------------------------
  const stageCounts: Record<string, number> = {};
  for (const o of activeOpps) {
    stageCounts[o.stage] = (stageCounts[o.stage] ?? 0) + 1;
  }

  const funnel = ACTIVE_STAGES.map((stage) => ({
    stage,
    label: FUNNEL_LABELS[stage] ?? stage,
    count: stageCounts[stage] ?? 0,
  }));

  // -----------------------------------------------------------------------
  // 6 & 7. Top agencies (via jobs table) e by PE — queries paralelas
  // -----------------------------------------------------------------------
  const yearStart = new Date(now.getFullYear(), 0, 1).toISOString();

  // Calcular peMap aqui para ter os assignedIds antes do Promise.all
  const peMap: Record<string, { active_count: number; active_value: number }> = {};
  for (const o of activeOpps) {
    const pid = o.assigned_to ?? '__unassigned__';
    if (!peMap[pid]) peMap[pid] = { active_count: 0, active_value: 0 };
    peMap[pid].active_count += 1;
    peMap[pid].active_value += Number(o.estimated_value ?? 0);
  }

  const assignedIds = Object.keys(peMap).filter((id) => id !== '__unassigned__');

  // Rodada 1: jobs e profiles em paralelo (sao independentes entre si)
  const [jobsResult, profilesResult] = await Promise.all([
    client
      .from('jobs')
      .select('agency_id, closed_value')
      .eq('tenant_id', auth.tenantId)
      .not('agency_id', 'is', null)
      .gte('created_at', yearStart),
    assignedIds.length > 0
      ? client
          .from('profiles')
          .select('id, full_name')
          .in('id', assignedIds)
          .eq('tenant_id', auth.tenantId)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const { data: jobRows, error: jobsError } = jobsResult;
  const { data: profileRows, error: profileError } = profilesResult;

  if (jobsError) {
    console.error('[crm/dashboard] erro ao buscar jobs:', jobsError.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao buscar top agencias', 500, {
      detail: jobsError.message,
    });
  }

  const agencyMap: Record<string, { total_jobs: number; total_value: number }> = {};
  for (const j of (jobRows ?? [])) {
    if (!j.agency_id) continue;
    if (!agencyMap[j.agency_id]) agencyMap[j.agency_id] = { total_jobs: 0, total_value: 0 };
    agencyMap[j.agency_id].total_jobs += 1;
    agencyMap[j.agency_id].total_value += Number(j.closed_value ?? 0);
  }

  const topAgencyIds = Object.entries(agencyMap)
    .sort((a, b) => b[1].total_value - a[1].total_value)
    .slice(0, 5)
    .map(([id]) => id);

  let topAgencies: Array<{ agency_id: string; name: string; total_jobs: number; total_value: number }> = [];

  if (topAgencyIds.length > 0) {
    // Rodada 2: buscar nomes das agencias (depende de topAgencyIds da rodada 1)
    const { data: agencyRows, error: agencyError } = await client
      .from('agencies')
      .select('id, name')
      .in('id', topAgencyIds)
      .eq('tenant_id', auth.tenantId);

    if (!agencyError && agencyRows) {
      topAgencies = topAgencyIds
        .map((id) => {
          const agency = agencyRows.find((a) => a.id === id);
          if (!agency) return null;
          return {
            agency_id: id,
            name: agency.name,
            total_jobs: agencyMap[id].total_jobs,
            total_value: agencyMap[id].total_value,
          };
        })
        .filter(Boolean) as typeof topAgencies;
    }
  }

  // -----------------------------------------------------------------------
  // 7. By PE — montar com profileRows ja buscados em paralelo acima
  // -----------------------------------------------------------------------
  let byPe: Array<{ profile_id: string; name: string; active_count: number; active_value: number }> = [];

  if (!profileError && profileRows && profileRows.length > 0) {
    byPe = profileRows.map((p) => ({
      profile_id: p.id,
      name: p.full_name,
      active_count: peMap[p.id]?.active_count ?? 0,
      active_value: peMap[p.id]?.active_value ?? 0,
    }));
  }

  // Incluir nao atribuidos se existirem
  if (peMap['__unassigned__']) {
    byPe.push({
      profile_id: '__unassigned__',
      name: 'Nao atribuido',
      active_count: peMap['__unassigned__'].active_count,
      active_value: peMap['__unassigned__'].active_value,
    });
  }

  byPe.sort((a, b) => b.active_value - a.active_value);

  // -----------------------------------------------------------------------
  // 8. Competition stats: ultimos 6 meses, is_competitive_bid=true
  // -----------------------------------------------------------------------
  const sixMonthsAgoDate = new Date();
  sixMonthsAgoDate.setMonth(sixMonthsAgoDate.getMonth() - 6);
  const sixMonthsAgo = sixMonthsAgoDate.toISOString();

  const competitiveOpps = opps.filter(
    (o) =>
      o.is_competitive_bid === true &&
      o.actual_close_date != null &&
      o.actual_close_date >= sixMonthsAgo,
  );

  const totalBids = competitiveOpps.length;
  const totalWon = competitiveOpps.filter((o) => o.stage === 'ganho').length;
  const winRate = totalBids > 0 ? Math.round((totalWon / totalBids) * 1000) / 10 : 0;

  // Motivo mais frequente de perda (campo loss_category)
  const lossCounts: Record<string, number> = {};
  for (const o of competitiveOpps.filter((o) => o.stage === 'perdido')) {
    const reason = (o as Record<string, unknown>).loss_category as string | null ?? 'desconhecido';
    lossCounts[reason] = (lossCounts[reason] ?? 0) + 1;
  }
  const topLossReason =
    Object.entries(lossCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  const competitionStats = {
    total_bids: totalBids,
    total_won: totalWon,
    win_rate: winRate,
    top_loss_reason: topLossReason,
  };

  // -----------------------------------------------------------------------
  // 9. Recent closings: ultimos 5 ganho/perdido
  // Usa os dados ja carregados em allOpps (query 1) + profileRows (rodada 1 acima).
  // Nao faz query adicional.
  // -----------------------------------------------------------------------

  // Mapa de profiles ja buscados para lookup rapido
  const profileNameMap = new Map<string, string>();
  for (const p of (profileRows ?? [])) {
    profileNameMap.set(p.id, p.full_name);
  }

  const recentClosings = opps
    .filter((o) => (o.stage === 'ganho' || o.stage === 'perdido') && o.actual_close_date != null)
    .sort((a, b) => {
      if (!a.actual_close_date || !b.actual_close_date) return 0;
      return a.actual_close_date > b.actual_close_date ? -1 : 1;
    })
    .slice(0, 5)
    .map((o) => ({
      id: o.id,
      title: (o as Record<string, unknown>).title as string ?? '',
      value: o.estimated_value != null ? Number(o.estimated_value) : null,
      stage: o.stage,
      assigned_name: o.assigned_to ? (profileNameMap.get(o.assigned_to) ?? null) : null,
      closed_at: o.actual_close_date ?? null,
    }));

  // -----------------------------------------------------------------------
  // Retorno
  // -----------------------------------------------------------------------
  return success(
    {
      pipeline_summary: pipelineSummary,
      month_summary: monthSummary,
      alerts_count: alertsCount,
      funnel,
      top_agencies: topAgencies,
      by_pe: byPe,
      competition_stats: competitionStats,
      recent_closings: recentClosings,
    },
    200,
    req,
  );
}
