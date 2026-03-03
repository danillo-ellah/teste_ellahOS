import type { AuthContext } from '../../_shared/auth.ts';
import { AppError } from '../../_shared/errors.ts';
import { success } from '../../_shared/response.ts';
import { getSupabaseClient } from '../../_shared/supabase-client.ts';

interface DirectorRankingEntry {
  person_id: string;
  name: string;
  total_bids: number;
  wins: number;
  losses: number;
  win_rate: number;
  total_value_won: number;
}

/**
 * GET /crm/director-ranking?months=12
 * Ranking de diretores por win rate em concorrencias (is_competitive_bid=true).
 * Considera apenas oportunidades fechadas (ganho/perdido) com job_id vinculado.
 * Periodo padrao: ultimos 12 meses.
 */
export async function handleGetDirectorRanking(
  req: Request,
  auth: AuthContext,
): Promise<Response> {
  const url = new URL(req.url);
  const months = Math.min(
    60,
    Math.max(1, parseInt(url.searchParams.get('months') ?? '12')),
  );

  console.log('[crm/get-director-ranking] calculando ranking', {
    userId: auth.userId,
    tenantId: auth.tenantId,
    months,
  });

  const client = getSupabaseClient(auth.token);

  // Calcular data de corte do periodo
  const cutoffDate = new Date();
  cutoffDate.setMonth(cutoffDate.getMonth() - months);
  const cutoffIso = cutoffDate.toISOString();

  // 1. Buscar oportunidades competitivas fechadas com job_id no periodo
  const { data: opportunities, error: oppError } = await client
    .from('opportunities')
    .select('id, stage, estimated_value, job_id, actual_close_date')
    .eq('tenant_id', auth.tenantId)
    .eq('is_competitive_bid', true)
    .in('stage', ['ganho', 'perdido'])
    .not('job_id', 'is', null)
    .gte('actual_close_date', cutoffIso)
    .is('deleted_at', null);

  if (oppError) {
    console.error('[crm/get-director-ranking] erro ao buscar oportunidades:', oppError.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao buscar oportunidades', 500, {
      detail: oppError.message,
    });
  }

  const opps = opportunities ?? [];

  if (opps.length === 0) {
    return success(
      { directors: [], period_months: months },
      200,
      req,
    );
  }

  const jobIds = [...new Set(opps.map((o) => o.job_id as string))];

  // 2. Buscar job_team com role='diretor' para os job_ids, fazendo join com people
  const { data: teamRows, error: teamError } = await client
    .from('job_team')
    .select('job_id, people!inner(id, full_name)')
    .in('job_id', jobIds)
    .eq('role', 'diretor')
    .is('deleted_at', null);

  if (teamError) {
    console.error('[crm/get-director-ranking] erro ao buscar equipe:', teamError.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao buscar equipe dos jobs', 500, {
      detail: teamError.message,
    });
  }

  // Montar mapa job_id -> lista de diretores (pode haver mais de um)
  type PersonInfo = { id: string; full_name: string };
  const jobDirectorsMap = new Map<string, PersonInfo[]>();

  for (const row of (teamRows ?? [])) {
    const personRaw = row.people;
    const person = Array.isArray(personRaw) ? personRaw[0] : personRaw;
    if (!person) continue;

    const existing = jobDirectorsMap.get(row.job_id) ?? [];
    existing.push({ id: person.id, full_name: person.full_name ?? '' });
    jobDirectorsMap.set(row.job_id, existing);
  }

  // 3. Agregar por diretor em memoria
  const directorStats = new Map<
    string,
    {
      name: string;
      total_bids: number;
      wins: number;
      losses: number;
      total_value_won: number;
    }
  >();

  for (const opp of opps) {
    const directors = jobDirectorsMap.get(opp.job_id as string) ?? [];

    for (const director of directors) {
      const current = directorStats.get(director.id) ?? {
        name: director.full_name,
        total_bids: 0,
        wins: 0,
        losses: 0,
        total_value_won: 0,
      };

      current.total_bids += 1;

      if (opp.stage === 'ganho') {
        current.wins += 1;
        current.total_value_won += Number(opp.estimated_value ?? 0);
      } else {
        current.losses += 1;
      }

      directorStats.set(director.id, current);
    }
  }

  // 4. Montar lista e ordenar por win_rate DESC, total_bids DESC
  const directors: DirectorRankingEntry[] = [];

  for (const [person_id, stats] of directorStats.entries()) {
    const win_rate =
      stats.total_bids > 0
        ? Math.round((stats.wins / stats.total_bids) * 1000) / 10 // 1 decimal
        : 0;

    directors.push({
      person_id,
      name: stats.name,
      total_bids: stats.total_bids,
      wins: stats.wins,
      losses: stats.losses,
      win_rate,
      total_value_won: stats.total_value_won,
    });
  }

  directors.sort((a, b) => {
    if (b.win_rate !== a.win_rate) return b.win_rate - a.win_rate;
    return b.total_bids - a.total_bids;
  });

  console.log('[crm/get-director-ranking] ranking gerado', {
    total_directors: directors.length,
    total_bids_analyzed: opps.length,
    period_months: months,
  });

  return success({ directors, period_months: months }, 200, req);
}
