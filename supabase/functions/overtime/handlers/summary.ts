import type { AuthContext } from '../../_shared/auth.ts';
import { AppError } from '../../_shared/errors.ts';
import { success } from '../../_shared/response.ts';
import { getSupabaseClient } from '../../_shared/supabase-client.ts';

// Resumo agregado de horas extras por membro do job
export interface OvertimeSummaryEntry {
  team_member_id: string;
  person_name: string | null;
  role: string;
  total_days: number;
  total_hours: number;
  total_overtime_hours: number;
  total_overtime_cost: number;
  pending_approval: number;
  approved: number;
}

export async function handleSummary(req: Request, auth: AuthContext): Promise<Response> {
  const url = new URL(req.url);
  const jobId = url.searchParams.get('job_id');

  if (!jobId) {
    throw new AppError('VALIDATION_ERROR', 'job_id e obrigatorio', 400);
  }

  console.log('[overtime/summary] calculando resumo', {
    userId: auth.userId,
    tenantId: auth.tenantId,
    jobId,
  });

  const client = getSupabaseClient(auth.token);

  // Verificar que o job pertence ao tenant
  const { data: job } = await client
    .from('jobs')
    .select('id')
    .eq('id', jobId)
    .eq('tenant_id', auth.tenantId)
    .maybeSingle();

  if (!job) {
    throw new AppError('NOT_FOUND', 'Job nao encontrado', 404);
  }

  // Buscar todos os lancamentos do job com dados do membro
  const { data: entries, error: fetchError } = await client
    .from('time_entries')
    .select(`
      team_member_id,
      total_hours,
      overtime_hours,
      overtime_rate,
      approved_by,
      job_team!team_member_id (
        role,
        people!person_id (
          name
        )
      )
    `)
    .eq('job_id', jobId)
    .eq('tenant_id', auth.tenantId)
    .is('deleted_at', null)
    .not('check_out', 'is', null);

  if (fetchError) {
    console.error('[overtime/summary] erro ao buscar:', fetchError.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao calcular resumo de horas extras', 500, {
      detail: fetchError.message,
    });
  }

  // Agregar por team_member_id no lado da aplicacao
  const summaryMap = new Map<string, OvertimeSummaryEntry>();

  for (const entry of entries ?? []) {
    const key = entry.team_member_id;
    const teamInfo = entry.job_team as unknown as { role: string; people: { name: string } | null } | null;
    const personName = teamInfo?.people?.name ?? null;
    const role = teamInfo?.role ?? '';
    const totalHours = Number(entry.total_hours ?? 0);
    const overtimeHours = Number(entry.overtime_hours ?? 0);
    const overtimeCost = overtimeHours * Number(entry.overtime_rate ?? 0);

    if (!summaryMap.has(key)) {
      summaryMap.set(key, {
        team_member_id: key,
        person_name: personName,
        role,
        total_days: 0,
        total_hours: 0,
        total_overtime_hours: 0,
        total_overtime_cost: 0,
        pending_approval: 0,
        approved: 0,
      });
    }

    const current = summaryMap.get(key)!;
    current.total_days += 1;
    current.total_hours = Math.round((current.total_hours + totalHours) * 100) / 100;
    current.total_overtime_hours = Math.round((current.total_overtime_hours + overtimeHours) * 100) / 100;
    current.total_overtime_cost = Math.round((current.total_overtime_cost + overtimeCost) * 100) / 100;

    if (entry.approved_by) {
      current.approved += 1;
    } else if (overtimeHours > 0) {
      current.pending_approval += 1;
    }
  }

  const summary = Array.from(summaryMap.values()).sort((a, b) =>
    (a.person_name ?? '').localeCompare(b.person_name ?? '', 'pt-BR')
  );

  // Totais globais do job
  const totals = {
    total_days: summary.reduce((acc, s) => acc + s.total_days, 0),
    total_hours: Math.round(summary.reduce((acc, s) => acc + s.total_hours, 0) * 100) / 100,
    total_overtime_hours: Math.round(summary.reduce((acc, s) => acc + s.total_overtime_hours, 0) * 100) / 100,
    total_overtime_cost: Math.round(summary.reduce((acc, s) => acc + s.total_overtime_cost, 0) * 100) / 100,
  };

  console.log('[overtime/summary] resumo calculado', {
    members: summary.length,
    total_overtime_hours: totals.total_overtime_hours,
  });

  return success({ members: summary, totals }, 200, req);
}
