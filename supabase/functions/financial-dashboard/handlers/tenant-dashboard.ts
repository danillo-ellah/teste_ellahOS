import type { AuthContext } from '../../_shared/auth.ts';
import { AppError } from '../../_shared/errors.ts';
import { success } from '../../_shared/response.ts';
import { getSupabaseClient } from '../../_shared/supabase-client.ts';

// Roles autorizados para ver dashboard consolidado do tenant
const ALLOWED_ROLES = ['financeiro', 'admin', 'ceo'];

export async function handleTenantDashboard(
  _req: Request,
  auth: AuthContext,
): Promise<Response> {
  console.log('[financial-dashboard/tenant-dashboard] iniciando dashboard consolidado', {
    userId: auth.userId,
    tenantId: auth.tenantId,
  });

  // Validacao de role
  if (!ALLOWED_ROLES.includes(auth.role)) {
    throw new AppError('FORBIDDEN', 'Permissao insuficiente', 403);
  }

  const client = getSupabaseClient(auth.token);

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  const thirtyDaysFrom = new Date(today);
  thirtyDaysFrom.setDate(thirtyDaysFrom.getDate() + 30);
  const thirtyDaysFromStr = thirtyDaysFrom.toISOString().split('T')[0];

  // Buscar todos os cost_items ativos do tenant para calcular totais
  const { data: allItems, error: allItemsError } = await client
    .from('cost_items')
    .select(
      'id, job_id, payment_status, payment_due_date, total_with_overtime, actual_paid_value, item_status',
    )
    .eq('tenant_id', auth.tenantId)
    .neq('item_status', 'cancelado')
    .is('deleted_at', null);

  if (allItemsError) {
    console.error(
      '[financial-dashboard/tenant-dashboard] erro ao buscar itens:',
      allItemsError.message,
    );
    throw new AppError('INTERNAL_ERROR', 'Erro ao buscar dados financeiros', 500);
  }

  const items = allItems ?? [];

  // Calcular totais consolidados
  const totalBudgeted = items.reduce((acc, i) => acc + (i.total_with_overtime ?? 0), 0);

  const totalPaid = items
    .filter((i) => i.payment_status === 'pago')
    .reduce(
      (acc, i) =>
        acc +
        (i.actual_paid_value != null ? i.actual_paid_value : (i.total_with_overtime ?? 0)),
      0,
    );

  const totalOverdue = items
    .filter(
      (i) =>
        i.payment_status === 'pendente' &&
        i.payment_due_date != null &&
        i.payment_due_date < todayStr,
    )
    .reduce((acc, i) => acc + (i.total_with_overtime ?? 0), 0);

  // Contar jobs distintos com cost_items
  const jobsWithItems = new Set(
    items.filter((i) => i.job_id != null).map((i) => i.job_id),
  );

  // Contar itens pendentes de pagamento nos proximos 30 dias
  const itemsPendingNext30Days = items.filter(
    (i) =>
      i.payment_status === 'pendente' &&
      i.payment_due_date != null &&
      i.payment_due_date >= todayStr &&
      i.payment_due_date <= thirtyDaysFromStr,
  ).length;

  // Buscar proximos pagamentos nos proximos 30 dias agrupados por semana
  const { data: calendarData, error: calendarError } = await client
    .from('vw_calendario_pagamentos')
    .select('payment_due_date, total_value, items_count, job_id')
    .eq('tenant_id', auth.tenantId)
    .gte('payment_due_date', todayStr)
    .lte('payment_due_date', thirtyDaysFromStr)
    .order('payment_due_date', { ascending: true });

  if (calendarError) {
    console.error(
      '[financial-dashboard/tenant-dashboard] erro ao buscar calendario:',
      calendarError.message,
    );
    // Nao bloqueia — retorna sem calendario
  }

  // Agrupar pagamentos por semana
  const weeklyPayments = groupByWeek(calendarData ?? []);

  console.log('[financial-dashboard/tenant-dashboard] dashboard calculado', {
    tenantId: auth.tenantId,
    totalBudgeted,
    totalPaid,
    totalOverdue,
    jobsCount: jobsWithItems.size,
  });

  return success({
    totals: {
      total_budgeted: totalBudgeted,
      total_paid: totalPaid,
      total_overdue: totalOverdue,
      total_pending: totalBudgeted - totalPaid,
      jobs_count: jobsWithItems.size,
      items_pending_payment: itemsPendingNext30Days,
    },
    upcoming_payments_30d: {
      total: (calendarData ?? []).reduce(
        (acc, row) => acc + ((row as Record<string, unknown>).total_value as number ?? 0),
        0,
      ),
      by_week: weeklyPayments,
    },
  });
}

// Agrupa linhas do calendario por semana ISO
function groupByWeek(
  rows: Array<Record<string, unknown>>,
): Array<{ week_label: string; week_start: string; week_end: string; total: number; items_count: number }> {
  const weekMap = new Map<
    string,
    { week_label: string; week_start: string; week_end: string; total: number; items_count: number }
  >();

  for (const row of rows) {
    const dateStr = row.payment_due_date as string;
    if (!dateStr) continue;

    const date = new Date(dateStr + 'T00:00:00Z');
    const dayOfWeek = date.getUTCDay(); // 0=domingo
    // Inicio da semana = segunda-feira
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const weekStart = new Date(date);
    weekStart.setUTCDate(date.getUTCDate() + mondayOffset);
    const weekEnd = new Date(weekStart);
    weekEnd.setUTCDate(weekStart.getUTCDate() + 6);

    const weekKey = weekStart.toISOString().split('T')[0];
    const weekStartStr = weekKey;
    const weekEndStr = weekEnd.toISOString().split('T')[0];

    // Label amigavel: "DD/MM a DD/MM"
    const weekLabel = `${formatDateBR(weekStartStr)} a ${formatDateBR(weekEndStr)}`;

    const existing = weekMap.get(weekKey);
    const rowTotal = (row.total_value as number) ?? 0;
    const rowCount = (row.items_count as number) ?? 1;

    if (existing) {
      existing.total += rowTotal;
      existing.items_count += rowCount;
    } else {
      weekMap.set(weekKey, {
        week_label: weekLabel,
        week_start: weekStartStr,
        week_end: weekEndStr,
        total: rowTotal,
        items_count: rowCount,
      });
    }
  }

  return Array.from(weekMap.values()).sort((a, b) =>
    a.week_start.localeCompare(b.week_start),
  );
}

// Formata data YYYY-MM-DD para DD/MM
function formatDateBR(dateStr: string): string {
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}`;
}
