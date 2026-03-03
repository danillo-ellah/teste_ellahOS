import { getSupabaseClient } from '../../_shared/supabase-client.ts';
import { created } from '../../_shared/response.ts';
import { AppError } from '../../_shared/errors.ts';
import { mapDbToApi } from '../../_shared/column-map.ts';
import { insertHistory } from '../../_shared/history.ts';
import type { AuthContext } from '../../_shared/auth.ts';

// Campos que NAO devem ser copiados (gerados, status, datas reais, integracao)
const FIELDS_TO_RESET = new Set([
  'id',
  'tenant_id',
  'index_number',
  'code',
  'job_aba',
  'status',
  'pos_sub_status',
  'health_score',
  'created_at',
  'updated_at',
  'created_by',
  'updated_by',
  'deleted_at',
  // Gerados
  'tax_value',
  'gross_profit',
  'margin_percentage',
  // Datas reais
  'actual_start_date',
  'actual_delivery_date',
  'approved_at',
  'approved_by',
  'cancelled_at',
  'cancelled_by',
  'cancellation_reason',
  'archived_at',
  'archived_by',
  'is_archived',
  // Integracao
  'drive_folder_url',
  'drive_folder_id',
  'ppm_url',
  // ANCINE (unico por job)
  'ancine_number',
  // Financeiro realizado (manter orcamento, resetar realizado)
  'cost_actual',
  'budget_approved',
]);

export async function cloneJob(
  req: Request,
  auth: AuthContext,
  jobId: string,
): Promise<Response> {
  const supabase = getSupabaseClient(auth.token);

  // 1. Buscar job original
  const { data: original, error: fetchError } = await supabase
    .from('jobs')
    .select('*')
    .eq('id', jobId)
    .eq('tenant_id', auth.tenantId)
    .single();

  if (fetchError || !original) {
    throw new AppError('NOT_FOUND', 'Job nao encontrado', 404);
  }

  // 2. Montar payload do clone — copiar campos relevantes
  const clonePayload: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(original)) {
    if (!FIELDS_TO_RESET.has(key) && value !== null) {
      clonePayload[key] = value;
    }
  }

  // Sobrescrever campos especificos
  clonePayload.title = `Copia de ${original.title}`;
  clonePayload.tenant_id = auth.tenantId;
  clonePayload.created_by = auth.userId;
  clonePayload.status = 'briefing_recebido';
  clonePayload.is_archived = false;
  // Limpar datas planejadas (novo job, novas datas)
  clonePayload.expected_start_date = null;
  clonePayload.expected_delivery_date = null;
  clonePayload.kickoff_ppm_date = null;
  clonePayload.briefing_date = null;

  // 3. Inserir novo job (trigger gera code, job_aba, index_number)
  const { data: newJob, error: insertError } = await supabase
    .from('jobs')
    .insert(clonePayload)
    .select()
    .single();

  if (insertError) {
    throw new AppError('INTERNAL_ERROR', `Erro ao clonar job: ${insertError.message}`, 500);
  }

  // 4. Clonar equipe (job_team) com status resetado
  const { data: teamMembers } = await supabase
    .from('job_team')
    .select('*')
    .eq('job_id', jobId)
    .eq('tenant_id', auth.tenantId);

  if (teamMembers && teamMembers.length > 0) {
    const teamClones = teamMembers.map((m: Record<string, unknown>) => ({
      tenant_id: auth.tenantId,
      job_id: newJob.id,
      person_id: m.person_id,
      role: m.role,
      rate: m.rate,
      daily_rate: m.daily_rate,
      estimated_days: m.estimated_days,
      is_responsible_producer: m.is_responsible_producer,
      notes: m.notes,
      hiring_status: 'orcado', // resetar status
    }));
    await supabase.from('job_team').insert(teamClones);
  }

  // 5. Clonar entregaveis com status resetado
  const { data: deliverables } = await supabase
    .from('job_deliverables')
    .select('*')
    .eq('job_id', jobId)
    .eq('tenant_id', auth.tenantId);

  if (deliverables && deliverables.length > 0) {
    const delivClones = deliverables.map((d: Record<string, unknown>) => ({
      tenant_id: auth.tenantId,
      job_id: newJob.id,
      title: d.title,
      format: d.format,
      duration_seconds: d.duration_seconds,
      specs: d.specs,
      status: 'pendente', // resetar status
      sort_order: d.sort_order,
    }));
    await supabase.from('job_deliverables').insert(delivClones);
  }

  // 6. Registrar no historico
  await insertHistory(supabase, {
    tenantId: auth.tenantId,
    jobId: newJob.id,
    eventType: 'status_change',
    userId: auth.userId,
    dataAfter: { status: 'briefing_recebido', cloned_from: jobId },
    description: `Job clonado a partir de "${original.title}" (${original.code})`,
  });

  return created(mapDbToApi(newJob));
}
