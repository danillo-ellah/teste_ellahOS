import type { AuthContext } from '../../_shared/auth.ts';
import { AppError } from '../../_shared/errors.ts';
import { getSupabaseClient } from '../../_shared/supabase-client.ts';
import { getCorsHeaders } from '../../_shared/cors.ts';

const ALLOWED_ROLES = [
  'atendimento',
  'ceo',
  'produtor_executivo',
  'coordenador_producao',
  'admin',
  'diretor_producao',
];

// Limite de job_ids por chamada para evitar queries excessivas
const MAX_JOB_IDS = 100;

export async function handleDashboardCounts(req: Request, auth: AuthContext): Promise<Response> {
  console.log('[attendance/dashboard-counts] calculando contagens', {
    userId: auth.userId,
    tenantId: auth.tenantId,
    role: auth.role,
  });

  if (!ALLOWED_ROLES.includes(auth.role)) {
    throw new AppError('FORBIDDEN', 'Permissao insuficiente para acessar contagens', 403);
  }

  const url = new URL(req.url);
  const rawJobIds = url.searchParams.get('job_ids');

  if (!rawJobIds) {
    throw new AppError('VALIDATION_ERROR', 'Parametro job_ids e obrigatorio', 400);
  }

  const jobIds = rawJobIds
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);

  if (jobIds.length === 0) {
    throw new AppError('VALIDATION_ERROR', 'job_ids nao pode ser vazio', 400);
  }

  if (jobIds.length > MAX_JOB_IDS) {
    throw new AppError(
      'VALIDATION_ERROR',
      `Maximo de ${MAX_JOB_IDS} job_ids por chamada`,
      400,
    );
  }

  const client = getSupabaseClient(auth.token);
  const today = new Date().toISOString().slice(0, 10);

  // 4 queries paralelas — cada uma usa os indices parciais criados na migration
  const [extrasResult, logisticsResult, milestonesResult, approvalsResult] = await Promise.all([
    // extras pendentes de decisao do CEO
    client
      .from('scope_items')
      .select('job_id', { count: 'exact', head: false })
      .eq('tenant_id', auth.tenantId)
      .in('job_id', jobIds)
      .eq('is_extra', true)
      .eq('extra_status', 'pendente_ceo')
      .is('deleted_at', null),

    // logistica pendente com data dentro de 7 dias
    client
      .from('client_logistics')
      .select('job_id', { count: 'exact', head: false })
      .eq('tenant_id', auth.tenantId)
      .in('job_id', jobIds)
      .eq('status', 'pendente')
      .lte('scheduled_date', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10))
      .is('deleted_at', null),

    // marcos atrasados (pendente com due_date < hoje)
    client
      .from('client_milestones')
      .select('job_id', { count: 'exact', head: false })
      .eq('tenant_id', auth.tenantId)
      .in('job_id', jobIds)
      .eq('status', 'pendente')
      .lt('due_date', today)
      .is('deleted_at', null),

    // aprovacoes internas existentes e aprovadas
    client
      .from('job_internal_approvals')
      .select('job_id, status')
      .eq('tenant_id', auth.tenantId)
      .in('job_id', jobIds),
  ]);

  // Verificar erros
  if (extrasResult.error) {
    console.error('[attendance/dashboard-counts] erro extras:', extrasResult.error.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao calcular contagens', 500);
  }
  if (logisticsResult.error) {
    console.error('[attendance/dashboard-counts] erro logistica:', logisticsResult.error.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao calcular contagens', 500);
  }
  if (milestonesResult.error) {
    console.error('[attendance/dashboard-counts] erro marcos:', milestonesResult.error.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao calcular contagens', 500);
  }
  if (approvalsResult.error) {
    console.error('[attendance/dashboard-counts] erro aprovacoes:', approvalsResult.error.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao calcular contagens', 500);
  }

  // Agregar por job_id
  const pendingExtrasMap = new Map<string, number>();
  for (const row of (extrasResult.data ?? [])) {
    pendingExtrasMap.set(row.job_id, (pendingExtrasMap.get(row.job_id) ?? 0) + 1);
  }

  const pendingLogisticsMap = new Map<string, number>();
  for (const row of (logisticsResult.data ?? [])) {
    pendingLogisticsMap.set(row.job_id, (pendingLogisticsMap.get(row.job_id) ?? 0) + 1);
  }

  const overdueMilestonesMap = new Map<string, number>();
  for (const row of (milestonesResult.data ?? [])) {
    overdueMilestonesMap.set(row.job_id, (overdueMilestonesMap.get(row.job_id) ?? 0) + 1);
  }

  // Mapa de aprovacoes: job_id -> status | 'missing'
  const approvalMap = new Map<string, string>();
  for (const row of (approvalsResult.data ?? [])) {
    approvalMap.set(row.job_id, row.status);
  }

  // Montar resposta final
  const result: Record<string, {
    pending_extras: number;
    pending_logistics: number;
    overdue_milestones: number;
    missing_internal_approval: boolean;
  }> = {};

  for (const jobId of jobIds) {
    const approvalStatus = approvalMap.get(jobId);
    result[jobId] = {
      pending_extras: pendingExtrasMap.get(jobId) ?? 0,
      pending_logistics: pendingLogisticsMap.get(jobId) ?? 0,
      overdue_milestones: overdueMilestonesMap.get(jobId) ?? 0,
      // missing = nao existe ou ainda em rascunho
      missing_internal_approval: !approvalStatus || approvalStatus === 'rascunho',
    };
  }

  return new Response(
    JSON.stringify({ data: result }),
    {
      status: 200,
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
    },
  );
}
