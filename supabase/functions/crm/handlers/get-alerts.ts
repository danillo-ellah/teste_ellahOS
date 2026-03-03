import type { AuthContext } from '../../_shared/auth.ts';
import { AppError } from '../../_shared/errors.ts';
import { success } from '../../_shared/response.ts';
import { getSupabaseClient } from '../../_shared/supabase-client.ts';

type AlertType = 'deadline_urgent' | 'deadline_overdue' | 'inactive' | 'unassigned';

// Stages que estao fora do funil ativo — excluidos dos alertas
const EXCLUDED_STAGES = ['ganho', 'perdido', 'pausado'];

// Dias de tolerancia para considerar deadline urgente
const DEADLINE_URGENT_DAYS = 3;

// Dias sem atividade para considerar oportunidade inativa
const INACTIVITY_DAYS = 5;

interface AlertItem {
  opportunity_id: string;
  title: string;
  agency_name: string | null;
  client_name: string | null;
  assigned_name: string | null;
  stage: string;
  alert_types: AlertType[];
  response_deadline: string | null;
  last_activity_at: string | null;
  estimated_value: number | null;
}

// Retorna a data atual como string ISO YYYY-MM-DD
function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

// Retorna uma data ISO YYYY-MM-DD subtraindo `days` dias de hoje
function daysAgoStr(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString();
}

// Ordena alertas por severidade:
// deadline_overdue > deadline_urgent > inactive > unassigned
function severityScore(types: AlertType[]): number {
  if (types.includes('deadline_overdue')) return 4;
  if (types.includes('deadline_urgent')) return 3;
  if (types.includes('inactive')) return 2;
  return 1; // unassigned
}

/**
 * GET /crm/alerts
 * Retorna oportunidades ativas que precisam de atencao, classificadas por tipo de alerta:
 * - deadline_overdue: prazo de resposta ja passou
 * - deadline_urgent: prazo de resposta nos proximos 3 dias
 * - inactive: sem atividade nos ultimos 5 dias
 * - unassigned: sem responsavel atribuido
 *
 * Stages excluidos: ganho, perdido, pausado
 */
export async function handleGetAlerts(req: Request, auth: AuthContext): Promise<Response> {
  console.log('[crm/get-alerts] calculando alertas', {
    userId: auth.userId,
    tenantId: auth.tenantId,
  });

  const client = getSupabaseClient(auth.token);

  // 1. Buscar todas as oportunidades ativas (excluindo stages finais)
  const { data: opportunities, error: oppError } = await client
    .from('opportunities')
    .select(`
      id,
      title,
      stage,
      estimated_value,
      assigned_to,
      response_deadline,
      client_id,
      agency_id,
      clients(id, name),
      agencies(id, name),
      assigned_profile:profiles!opportunities_assigned_to_fkey(id, full_name)
    `)
    .eq('tenant_id', auth.tenantId)
    .is('deleted_at', null)
    .not('stage', 'in', `(${EXCLUDED_STAGES.map((s) => `"${s}"`).join(',')})`);

  if (oppError) {
    console.error('[crm/get-alerts] erro ao buscar oportunidades:', oppError.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao buscar oportunidades', 500, {
      detail: oppError.message,
    });
  }

  const rows = opportunities ?? [];

  if (rows.length === 0) {
    return success({ total_alerts: 0, alerts: [] }, 200, req);
  }

  // 2. Buscar ultima atividade por oportunidade (query unica, evita N+1)
  const { data: activityRows, error: activityError } = await client
    .from('opportunity_activities')
    .select('opportunity_id, created_at')
    .eq('tenant_id', auth.tenantId)
    .in('opportunity_id', rows.map((o) => o.id));

  if (activityError) {
    console.error('[crm/get-alerts] erro ao buscar atividades:', activityError.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao buscar atividades', 500, {
      detail: activityError.message,
    });
  }

  // Agrupar last_activity_at por opportunity_id em memoria
  const lastActivityMap = new Map<string, string>();
  for (const row of (activityRows ?? [])) {
    const current = lastActivityMap.get(row.opportunity_id);
    if (!current || row.created_at > current) {
      lastActivityMap.set(row.opportunity_id, row.created_at);
    }
  }

  // 3. Avaliar alertas por oportunidade
  const today = todayStr();
  const urgentCutoff = (() => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + DEADLINE_URGENT_DAYS);
    return d.toISOString().slice(0, 10);
  })();
  const inactivityCutoff = daysAgoStr(INACTIVITY_DAYS);

  const alerts: AlertItem[] = [];

  for (const opp of rows) {
    const alertTypes: AlertType[] = [];

    // Verificar deadline
    if (opp.response_deadline) {
      const deadlineDateStr = opp.response_deadline.slice(0, 10);
      if (deadlineDateStr < today) {
        alertTypes.push('deadline_overdue');
      } else if (deadlineDateStr <= urgentCutoff) {
        alertTypes.push('deadline_urgent');
      }
    }

    // Verificar inatividade
    const lastActivity = lastActivityMap.get(opp.id) ?? null;
    if (!lastActivity || lastActivity < inactivityCutoff) {
      alertTypes.push('inactive');
    }

    // Verificar sem responsavel
    if (!opp.assigned_to) {
      alertTypes.push('unassigned');
    }

    // So inclui se tiver pelo menos um alerta
    if (alertTypes.length === 0) continue;

    // Extrair nomes das relacoes (Supabase retorna objetos ou arrays)
    const clientObj = Array.isArray(opp.clients) ? opp.clients[0] : opp.clients;
    const agencyObj = Array.isArray(opp.agencies) ? opp.agencies[0] : opp.agencies;
    const profileObj = Array.isArray(opp.assigned_profile)
      ? opp.assigned_profile[0]
      : opp.assigned_profile;

    alerts.push({
      opportunity_id: opp.id,
      title: opp.title,
      agency_name: agencyObj?.name ?? null,
      client_name: clientObj?.name ?? null,
      assigned_name: profileObj?.full_name ?? null,
      stage: opp.stage,
      alert_types: alertTypes,
      response_deadline: opp.response_deadline ?? null,
      last_activity_at: lastActivity,
      estimated_value: opp.estimated_value != null ? Number(opp.estimated_value) : null,
    });
  }

  // 4. Ordenar por severidade decrescente
  alerts.sort((a, b) => severityScore(b.alert_types) - severityScore(a.alert_types));

  console.log('[crm/get-alerts] alertas calculados', {
    total: alerts.length,
    overdue: alerts.filter((a) => a.alert_types.includes('deadline_overdue')).length,
    urgent: alerts.filter((a) => a.alert_types.includes('deadline_urgent')).length,
    inactive: alerts.filter((a) => a.alert_types.includes('inactive')).length,
    unassigned: alerts.filter((a) => a.alert_types.includes('unassigned')).length,
  });

  return success(
    {
      total_alerts: alerts.length,
      alerts,
    },
    200,
    req,
  );
}
