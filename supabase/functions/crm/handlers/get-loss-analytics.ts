import { z } from 'https://esm.sh/zod@3.22.4';
import type { AuthContext } from '../../_shared/auth.ts';
import { AppError } from '../../_shared/errors.ts';
import { success } from '../../_shared/response.ts';
import { getSupabaseClient } from '../../_shared/supabase-client.ts';

const LossAnalyticsSchema = z.object({
  // Janela de tempo em dias (padrao 90d)
  period_days: z.coerce.number().int().min(7).max(730).optional().default(90),
  // Filtros opcionais
  loss_category: z.string().optional(),
  assigned_to: z.string().uuid().optional(),
  client_id: z.string().uuid().optional(),
});

// Roles que podem visualizar analytics de perdas
const ALLOWED_ROLES = ['admin', 'ceo', 'produtor_executivo'];

/**
 * GET /crm/loss-analytics
 * Retorna KPIs e breakdowns de oportunidades perdidas no periodo informado.
 *
 * Output:
 *   kpis: total_lost, total_lost_value, loss_rate, top_competitor
 *   by_category: agrupamento por loss_category
 *   recurring_clients: clientes com 2+ perdas
 *   top_competitors: competitors mais frequentes (top 5)
 *   opportunities: lista detalhada de oportunidades perdidas
 *   filters_applied: eco dos filtros usados
 *
 * RBAC: admin, ceo, produtor_executivo.
 */
export async function handleGetLossAnalytics(
  req: Request,
  auth: AuthContext,
): Promise<Response> {
  // RBAC
  if (!ALLOWED_ROLES.includes(auth.role)) {
    throw new AppError(
      'FORBIDDEN',
      'Apenas admin, CEO ou produtor executivo podem acessar analytics de perdas',
      403,
    );
  }

  // Parse e validacao dos query params
  const url = new URL(req.url);
  const rawParams = Object.fromEntries(url.searchParams.entries());
  const parseResult = LossAnalyticsSchema.safeParse(rawParams);

  if (!parseResult.success) {
    throw new AppError('VALIDATION_ERROR', 'Parametros invalidos', 400, {
      issues: parseResult.error.issues,
    });
  }

  const filters = parseResult.data;
  const client = getSupabaseClient(auth.token);

  // Calcular data de corte baseada no period_days
  const dateFrom = new Date();
  dateFrom.setDate(dateFrom.getDate() - filters.period_days);
  const dateFromStr = dateFrom.toISOString().slice(0, 10);

  // ----------------------------------------------------------------
  // Query principal: oportunidades perdidas no periodo
  // ----------------------------------------------------------------
  let lostQuery = client
    .from('opportunities')
    .select(`
      id,
      title,
      estimated_value,
      actual_close_date,
      loss_category,
      loss_reason,
      winner_competitor,
      winner_value,
      client_id,
      assigned_to,
      client:clients!opportunities_client_id_fkey(id, name),
      assigned:profiles!opportunities_assigned_to_fkey(id, full_name)
    `)
    .eq('tenant_id', auth.tenantId)
    .eq('stage', 'perdido')
    .is('deleted_at', null)
    .gte('actual_close_date', dateFromStr)
    .order('actual_close_date', { ascending: false });

  // Aplicar filtros opcionais
  if (filters.loss_category) {
    lostQuery = lostQuery.eq('loss_category', filters.loss_category);
  }
  if (filters.assigned_to) {
    lostQuery = lostQuery.eq('assigned_to', filters.assigned_to);
  }
  if (filters.client_id) {
    lostQuery = lostQuery.eq('client_id', filters.client_id);
  }

  const { data: lostOpportunities, error: lostError } = await lostQuery;

  if (lostError) {
    console.error('[crm/loss-analytics] erro ao buscar oportunidades perdidas:', lostError.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao buscar dados de perdas', 500, {
      detail: lostError.message,
    });
  }

  const lost = lostOpportunities ?? [];

  // ----------------------------------------------------------------
  // KPIs: total_closed para calcular loss_rate
  // ----------------------------------------------------------------
  const { count: totalClosed, error: closedError } = await client
    .from('opportunities')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', auth.tenantId)
    .in('stage', ['ganho', 'perdido'])
    .is('deleted_at', null)
    .gte('actual_close_date', dateFromStr);

  if (closedError) {
    console.error('[crm/loss-analytics] erro ao contar fechados:', closedError.message);
    // Nao falha — usa 0 como fallback
  }

  const totalLost = lost.length;
  const totalLostValue = lost.reduce((acc, o) => acc + (o.estimated_value ?? 0), 0);
  const closedCount = totalClosed ?? 0;
  const lossRate = closedCount > 0 ? (totalLost / closedCount) * 100 : 0;

  // ----------------------------------------------------------------
  // Breakdown por categoria de perda
  // ----------------------------------------------------------------
  const categoryMap: Record<string, { count: number; total_value: number }> = {};
  for (const opp of lost) {
    const cat = opp.loss_category ?? 'nao_informado';
    if (!categoryMap[cat]) {
      categoryMap[cat] = { count: 0, total_value: 0 };
    }
    categoryMap[cat].count += 1;
    categoryMap[cat].total_value += opp.estimated_value ?? 0;
  }

  const byCategory = Object.entries(categoryMap)
    .map(([category, stats]) => ({ category, ...stats }))
    .sort((a, b) => b.count - a.count);

  // ----------------------------------------------------------------
  // Clientes recorrentes (2+ perdas no periodo)
  // ----------------------------------------------------------------
  const clientMap: Record<string, { client_id: string; client_name: string; loss_count: number; total_value: number }> = {};
  for (const opp of lost) {
    if (!opp.client_id) continue;
    const clientName = (opp.client as { name?: string } | null)?.name ?? 'Cliente nao identificado';
    if (!clientMap[opp.client_id]) {
      clientMap[opp.client_id] = {
        client_id: opp.client_id,
        client_name: clientName,
        loss_count: 0,
        total_value: 0,
      };
    }
    clientMap[opp.client_id].loss_count += 1;
    clientMap[opp.client_id].total_value += opp.estimated_value ?? 0;
  }

  const recurringClients = Object.values(clientMap)
    .filter((c) => c.loss_count >= 2)
    .sort((a, b) => b.loss_count - a.loss_count);

  // ----------------------------------------------------------------
  // Top competitors (top 5 por frequencia)
  // ----------------------------------------------------------------
  const competitorMap: Record<string, { competitor: string; count: number; total_value: number }> = {};
  for (const opp of lost) {
    if (!opp.winner_competitor) continue;
    if (!competitorMap[opp.winner_competitor]) {
      competitorMap[opp.winner_competitor] = {
        competitor: opp.winner_competitor,
        count: 0,
        total_value: 0,
      };
    }
    competitorMap[opp.winner_competitor].count += 1;
    competitorMap[opp.winner_competitor].total_value += opp.winner_value ?? opp.estimated_value ?? 0;
  }

  const topCompetitors = Object.values(competitorMap)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const topCompetitor = topCompetitors.length > 0 ? topCompetitors[0].competitor : null;

  // ----------------------------------------------------------------
  // Lista detalhada de oportunidades para a tabela
  // ----------------------------------------------------------------
  const opportunities = lost.map((opp) => ({
    id: opp.id,
    title: opp.title,
    client_name: (opp.client as { name?: string } | null)?.name ?? null,
    actual_close_date: opp.actual_close_date,
    estimated_value: opp.estimated_value ?? null,
    loss_category: opp.loss_category ?? null,
    loss_reason: opp.loss_reason ?? null,
    winner_competitor: opp.winner_competitor ?? null,
    winner_value: opp.winner_value ?? null,
    assigned_name: (opp.assigned as { full_name?: string } | null)?.full_name ?? null,
  }));

  return success(
    {
      kpis: {
        total_lost: totalLost,
        total_lost_value: totalLostValue,
        loss_rate: Math.round(lossRate * 100) / 100,
        top_competitor: topCompetitor,
      },
      by_category: byCategory,
      recurring_clients: recurringClients,
      top_competitors: topCompetitors,
      opportunities,
      filters_applied: {
        period_days: filters.period_days,
        loss_category: filters.loss_category ?? null,
        assigned_to: filters.assigned_to ?? null,
        client_id: filters.client_id ?? null,
      },
    },
    200,
    req,
  );
}
