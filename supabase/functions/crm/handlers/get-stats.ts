import type { AuthContext } from '../../_shared/auth.ts';
import { AppError } from '../../_shared/errors.ts';
import { success } from '../../_shared/response.ts';
import { getSupabaseClient } from '../../_shared/supabase-client.ts';

/**
 * GET /crm/stats
 * Metricas do pipeline comercial:
 * - Valor total do pipeline (oportunidades ativas)
 * - Valor ponderado (por probabilidade)
 * - Taxa de conversao (ganho / (ganho + perdido))
 * - Ticket medio
 * - Distribuicao por stage
 * - Oportunidades por source
 */
export async function handleGetStats(req: Request, auth: AuthContext): Promise<Response> {
  console.log('[crm/get-stats] calculando metricas', {
    userId: auth.userId,
    tenantId: auth.tenantId,
  });

  const url = new URL(req.url);
  // Filtro de periodo (ex: ultimos 90 dias para conversao)
  const periodDays = Math.min(365, Math.max(7, parseInt(url.searchParams.get('period_days') ?? '90')));

  const client = getSupabaseClient(auth.token);

  // Buscar todas as oportunidades (sem deleted_at)
  const { data: opportunities, error: fetchError } = await client
    .from('opportunities')
    .select('id, stage, estimated_value, probability, source, created_at, actual_close_date')
    .eq('tenant_id', auth.tenantId)
    .is('deleted_at', null);

  if (fetchError) {
    console.error('[crm/get-stats] erro ao buscar oportunidades:', fetchError.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao calcular metricas', 500, {
      detail: fetchError.message,
    });
  }

  const rows = opportunities ?? [];

  // Pipeline ativo (exclui ganho/perdido e pausado — pausado nao entra no valor do funil)
  const activeStages = ['lead', 'qualificado', 'proposta', 'negociacao', 'fechamento'];
  const active = rows.filter((o) => activeStages.includes(o.stage));
  const paused = rows.filter((o) => o.stage === 'pausado');

  const pipelineValue = active.reduce((sum, o) => sum + Number(o.estimated_value ?? 0), 0);
  const weightedValue = active.reduce(
    (sum, o) => sum + Number(o.estimated_value ?? 0) * (Number(o.probability ?? 50) / 100),
    0,
  );

  // Taxa de conversao no periodo
  const periodMs = periodDays * 24 * 60 * 60 * 1000;
  const cutoffDate = new Date(Date.now() - periodMs).toISOString();

  const closedInPeriod = rows.filter(
    (o) =>
      (o.stage === 'ganho' || o.stage === 'perdido') &&
      o.actual_close_date &&
      o.actual_close_date >= cutoffDate,
  );
  const wonInPeriod = closedInPeriod.filter((o) => o.stage === 'ganho');
  const conversionRate =
    closedInPeriod.length > 0 ? (wonInPeriod.length / closedInPeriod.length) * 100 : 0;

  // Ticket medio (oportunidades ganhas com valor)
  const wonWithValue = rows.filter(
    (o) => o.stage === 'ganho' && o.estimated_value != null && Number(o.estimated_value) > 0,
  );
  const avgTicket =
    wonWithValue.length > 0
      ? wonWithValue.reduce((sum, o) => sum + Number(o.estimated_value ?? 0), 0) / wonWithValue.length
      : 0;

  // Distribuicao por stage
  const byStage: Record<string, { count: number; total_value: number }> = {};
  for (const o of rows) {
    if (!byStage[o.stage]) byStage[o.stage] = { count: 0, total_value: 0 };
    byStage[o.stage].count += 1;
    byStage[o.stage].total_value += Number(o.estimated_value ?? 0);
  }

  // Distribuicao por source
  const bySource: Record<string, number> = {};
  for (const o of rows) {
    const src = o.source ?? 'desconhecido';
    bySource[src] = (bySource[src] ?? 0) + 1;
  }

  return success(
    {
      pipeline_value: pipelineValue,
      weighted_pipeline_value: weightedValue,
      conversion_rate: Math.round(conversionRate * 10) / 10, // 1 decimal
      avg_ticket: avgTicket,
      total_active: active.length,
      total_won: wonWithValue.length,
      total_lost: rows.filter((o) => o.stage === 'perdido').length,
      total_paused: paused.length,
      by_stage: byStage,
      by_source: bySource,
      period_days: periodDays,
      won_in_period: wonInPeriod.length,
      closed_in_period: closedInPeriod.length,
    },
    200,
    req,
  );
}
