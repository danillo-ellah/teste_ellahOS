import { getSupabaseClient } from '../../_shared/supabase-client.ts';
import { success } from '../../_shared/response.ts';
import { AppError } from '../../_shared/errors.ts';
import type { AuthContext } from '../../_shared/auth.ts';

export async function handleDashboard(
  req: Request,
  auth: AuthContext,
): Promise<Response> {
  const supabase = getSupabaseClient(auth.token);
  const url = new URL(req.url);

  console.log(`[pos-producao/dashboard] user=${auth.userId} tenant=${auth.tenantId}`);

  // Query base: todos os deliverables em pos-producao (pos_stage nao nulo, nao entregues)
  let query = supabase
    .from('job_deliverables')
    .select(`
      id, job_id, description, format, resolution, duration_seconds,
      status, delivery_date, pos_stage, pos_assignee_id, pos_drive_url,
      display_order, created_at,
      job:jobs!job_id(id, title, code, client_id, client:clients!client_id(id, name)),
      assignee:profiles!pos_assignee_id(id, full_name, avatar_url)
    `)
    .not('pos_stage', 'is', null)
    .neq('status', 'entregue')
    .is('deleted_at', null);

  // Filtro: etapa especifica
  const stage = url.searchParams.get('stage');
  if (stage) {
    query = query.eq('pos_stage', stage);
  }

  // Filtro: responsavel
  const assigneeId = url.searchParams.get('assignee_id');
  if (assigneeId) {
    query = query.eq('pos_assignee_id', assigneeId);
  }

  // Filtro: job especifico
  const jobId = url.searchParams.get('job_id');
  if (jobId) {
    query = query.eq('job_id', jobId);
  }

  // Filtro: deadline relativo
  const deadline = url.searchParams.get('deadline');
  const today = new Date().toISOString().slice(0, 10);

  if (deadline === 'overdue') {
    // Prazo vencido: delivery_date anterior a hoje
    query = query.lt('delivery_date', today);
  } else if (deadline === 'today') {
    // Vence hoje
    query = query.eq('delivery_date', today);
  } else if (deadline === 'week') {
    // Vence nos proximos 7 dias (inclui hoje)
    const weekLater = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
    query = query.lte('delivery_date', weekLater).gte('delivery_date', today);
  }

  // Ordenar por delivery_date ascendente, nulos por ultimo
  query = query.order('delivery_date', { ascending: true, nullsFirst: false });

  const { data, error: dbErr } = await query;
  if (dbErr) throw new AppError('INTERNAL_ERROR', dbErr.message, 500);

  return success(data ?? [], 200, req);
}
