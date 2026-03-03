import type { AuthContext } from '../../_shared/auth.ts';
import { AppError } from '../../_shared/errors.ts';
import { success } from '../../_shared/response.ts';
import { getSupabaseClient } from '../../_shared/supabase-client.ts';

/**
 * GET /crm/agency-history/:agencyId
 * Retorna historico de relacionamento com uma agencia para a view de detalhe do CRM.
 * Inclui: dados da agencia, metricas agregadas e ultimos 5 jobs.
 */
export async function handleGetAgencyHistory(
  req: Request,
  auth: AuthContext,
  agencyId: string,
): Promise<Response> {
  console.log('[crm/agency-history] buscando historico da agencia', {
    agencyId,
    userId: auth.userId,
    tenantId: auth.tenantId,
  });

  const client = getSupabaseClient(auth.token);

  // Rodada 1: agency, all jobs e opportunities em paralelo (sao independentes)
  const [agencyResult, jobsResult, oppResult] = await Promise.all([
    client
      .from('agencies')
      .select('id, name, cnpj, email, phone, website')
      .eq('id', agencyId)
      .eq('tenant_id', auth.tenantId)
      .maybeSingle(),
    client
      .from('jobs')
      .select('id, title, code, job_aba, estimated_value, status, created_at')
      .eq('agency_id', agencyId)
      .eq('tenant_id', auth.tenantId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false }),
    client
      .from('opportunities')
      .select('stage')
      .eq('agency_id', agencyId)
      .eq('tenant_id', auth.tenantId)
      .is('deleted_at', null)
      .in('stage', ['ganho', 'perdido']),
  ]);

  const { data: agency, error: agencyError } = agencyResult;
  const { data: allJobs, error: jobsError } = jobsResult;
  const { data: oppStats, error: oppError } = oppResult;

  if (agencyError) {
    console.error('[crm/agency-history] erro ao buscar agencia:', agencyError.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao buscar agencia', 500, {
      detail: agencyError.message,
    });
  }

  if (!agency) {
    throw new AppError('NOT_FOUND', 'Agencia nao encontrada', 404);
  }

  if (jobsError) {
    console.error('[crm/agency-history] erro ao buscar jobs:', jobsError.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao buscar jobs da agencia', 500, {
      detail: jobsError.message,
    });
  }

  if (oppError) {
    console.error('[crm/agency-history] erro ao buscar oportunidades:', oppError.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao calcular taxa de conversao', 500, {
      detail: oppError.message,
    });
  }

  const jobs = allJobs ?? [];
  const totalJobs = jobs.length;

  // Ticket medio (apenas jobs com valor estimado)
  const jobsWithValue = jobs.filter(
    (j) => j.estimated_value != null && Number(j.estimated_value) > 0,
  );
  const avgTicket =
    jobsWithValue.length > 0
      ? jobsWithValue.reduce((sum, j) => sum + Number(j.estimated_value ?? 0), 0) /
        jobsWithValue.length
      : 0;

  // Data do ultimo job (ja vem ordenado por created_at DESC da query)
  const lastJobDate = jobs.length > 0 ? jobs[0].created_at : null;

  const closedOpps = oppStats ?? [];
  const wonCount = closedOpps.filter((o) => o.stage === 'ganho').length;
  const winRate =
    closedOpps.length > 0 ? Math.round((wonCount / closedOpps.length) * 1000) / 10 : null;

  // Ultimos 5 jobs derivados em memoria — evita query adicional
  const recentJobs = jobs.slice(0, 5);

  console.log('[crm/agency-history] historico retornado', {
    agencyId,
    totalJobs,
    closedOpps: closedOpps.length,
  });

  return success(
    {
      agency,
      stats: {
        total_jobs: totalJobs,
        avg_ticket: avgTicket,
        last_job_date: lastJobDate,
        win_rate: winRate, // percentual (0-100) ou null se sem oportunidades fechadas
        total_won: wonCount,
        total_closed_opps: closedOpps.length,
      },
      recent_jobs: recentJobs ?? [],
    },
    200,
    req,
  );
}
