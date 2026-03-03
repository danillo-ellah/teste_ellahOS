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

  // 1. Buscar oportunidades ativas SEM JOINs para deteccao de alertas
  // JOINs de nome (clients, agencies, profiles) so serao feitos para as alertadas
  const { data: baseOpps, error: oppError } = await client
    .from('opportunities')
    .select('id, title, stage, estimated_value, assigned_to, response_deadline, updated_at, client_id, agency_id')
    .eq('tenant_id', auth.tenantId)
    .is('deleted_at', null)
    .not('stage', 'in', `(${EXCLUDED_STAGES.map((s) => `"${s}"`).join(',')})`);

  if (oppError) {
    console.error('[crm/get-alerts] erro ao buscar oportunidades:', oppError.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao buscar oportunidades', 500, {
      detail: oppError.message,
    });
  }

  const baseRows = baseOpps ?? [];

  if (baseRows.length === 0) {
    return success({ total_alerts: 0, alerts: [] }, 200, req);
  }

  // 2. Buscar ultima atividade por oportunidade — com order para aproveitar indice
  // Usar Map para pegar so a primeira (mais recente) por opportunity_id
  const { data: activityRows, error: activityError } = await client
    .from('opportunity_activities')
    .select('opportunity_id, created_at')
    .eq('tenant_id', auth.tenantId)
    .in('opportunity_id', baseRows.map((o) => o.id))
    .order('opportunity_id', { ascending: true })
    .order('created_at', { ascending: false });

  if (activityError) {
    console.error('[crm/get-alerts] erro ao buscar atividades:', activityError.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao buscar atividades', 500, {
      detail: activityError.message,
    });
  }

  // Como resultado ja vem ordenado por (opportunity_id, created_at DESC),
  // basta pegar a primeira ocorrencia de cada opportunity_id
  const lastActivityMap = new Map<string, string>();
  for (const row of (activityRows ?? [])) {
    if (!lastActivityMap.has(row.opportunity_id)) {
      lastActivityMap.set(row.opportunity_id, row.created_at);
    }
  }

  // 3. Detectar alertas em memoria (sem JOINs) e coletar IDs dos alertados
  const today = todayStr();
  const urgentCutoff = (() => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + DEADLINE_URGENT_DAYS);
    return d.toISOString().slice(0, 10);
  })();
  const inactivityCutoff = daysAgoStr(INACTIVITY_DAYS);

  interface AlertCandidate {
    id: string;
    title: string;
    stage: string;
    estimated_value: number | null;
    assigned_to: string | null;
    response_deadline: string | null;
    client_id: string | null;
    agency_id: string | null;
    alert_types: AlertType[];
    last_activity_at: string | null;
  }

  const alertCandidates: AlertCandidate[] = [];
  const alertedClientIds = new Set<string>();
  const alertedAgencyIds = new Set<string>();
  const alertedAssignedIds = new Set<string>();

  for (const opp of baseRows) {
    const alertTypes: AlertType[] = [];

    if (opp.response_deadline) {
      const deadlineDateStr = opp.response_deadline.slice(0, 10);
      if (deadlineDateStr < today) {
        alertTypes.push('deadline_overdue');
      } else if (deadlineDateStr <= urgentCutoff) {
        alertTypes.push('deadline_urgent');
      }
    }

    const lastActivity = lastActivityMap.get(opp.id) ?? null;
    if (!lastActivity || lastActivity < inactivityCutoff) {
      alertTypes.push('inactive');
    }

    if (!opp.assigned_to) {
      alertTypes.push('unassigned');
    }

    if (alertTypes.length === 0) continue;

    alertCandidates.push({
      id: opp.id,
      title: opp.title,
      stage: opp.stage,
      estimated_value: opp.estimated_value != null ? Number(opp.estimated_value) : null,
      assigned_to: opp.assigned_to ?? null,
      response_deadline: opp.response_deadline ?? null,
      client_id: opp.client_id ?? null,
      agency_id: opp.agency_id ?? null,
      alert_types: alertTypes,
      last_activity_at: lastActivity,
    });

    if (opp.client_id) alertedClientIds.add(opp.client_id);
    if (opp.agency_id) alertedAgencyIds.add(opp.agency_id);
    if (opp.assigned_to) alertedAssignedIds.add(opp.assigned_to);
  }

  if (alertCandidates.length === 0) {
    return success({ total_alerts: 0, alerts: [] }, 200, req);
  }

  // 4. Buscar nomes APENAS dos alertados (clients, agencies, profiles) — 3 queries paralelas
  const [clientsResult, agenciesResult, profilesResult] = await Promise.all([
    alertedClientIds.size > 0
      ? client.from('clients').select('id, name').in('id', [...alertedClientIds]).eq('tenant_id', auth.tenantId)
      : Promise.resolve({ data: [], error: null }),
    alertedAgencyIds.size > 0
      ? client.from('agencies').select('id, name').in('id', [...alertedAgencyIds]).eq('tenant_id', auth.tenantId)
      : Promise.resolve({ data: [], error: null }),
    alertedAssignedIds.size > 0
      ? client.from('profiles').select('id, full_name').in('id', [...alertedAssignedIds]).eq('tenant_id', auth.tenantId)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const clientNameMap = new Map<string, string>();
  for (const c of (clientsResult.data ?? [])) clientNameMap.set(c.id, c.name);

  const agencyNameMap = new Map<string, string>();
  for (const a of (agenciesResult.data ?? [])) agencyNameMap.set(a.id, a.name);

  const profileNameMap = new Map<string, string>();
  for (const p of (profilesResult.data ?? [])) profileNameMap.set(p.id, p.full_name);

  // Montar AlertItems finais
  const rows = alertCandidates; // alias para compatibilidade com bloco abaixo

  // 5. Montar AlertItems com nomes resolvidos via Maps
  const alerts: AlertItem[] = rows.map((opp) => ({
    opportunity_id: opp.id,
    title: opp.title,
    agency_name: opp.agency_id ? (agencyNameMap.get(opp.agency_id) ?? null) : null,
    client_name: opp.client_id ? (clientNameMap.get(opp.client_id) ?? null) : null,
    assigned_name: opp.assigned_to ? (profileNameMap.get(opp.assigned_to) ?? null) : null,
    stage: opp.stage,
    alert_types: opp.alert_types,
    response_deadline: opp.response_deadline,
    last_activity_at: opp.last_activity_at,
    estimated_value: opp.estimated_value,
  }));

  // 6. Ordenar por severidade decrescente
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
