import { getSupabaseClient } from '../../_shared/supabase-client.ts';
import { success } from '../../_shared/response.ts';
import { AppError } from '../../_shared/errors.ts';
import { validate, UpdateTeamMemberSchema } from '../../_shared/validation.ts';
import { insertHistory } from '../../_shared/history.ts';
import type { AuthContext } from '../../_shared/auth.ts';

export async function updateMember(
  req: Request,
  auth: AuthContext,
  jobId: string,
  memberId: string,
): Promise<Response> {
  const supabase = getSupabaseClient(auth.token);

  // 1. Verificar que o membro existe e pertence ao job
  const { data: current, error: fetchError } = await supabase
    .from('job_team')
    .select('*, people(full_name)')
    .eq('id', memberId)
    .eq('job_id', jobId)
    .is('deleted_at', null)
    .single();

  if (fetchError || !current) {
    throw new AppError('NOT_FOUND', 'Membro nao encontrado neste job', 404);
  }

  // 2. Validar payload
  const body = await req.json();
  const validated = validate(UpdateTeamMemberSchema, body);

  // 3. Mapear campos API -> banco
  const dbPayload: Record<string, unknown> = {};
  if (validated.fee !== undefined) dbPayload.rate = validated.fee;
  if (validated.is_lead_producer !== undefined)
    dbPayload.is_responsible_producer = validated.is_lead_producer;
  if (validated.role !== undefined) dbPayload.role = validated.role;
  if (validated.hiring_status !== undefined)
    dbPayload.hiring_status = validated.hiring_status;
  if (validated.notes !== undefined) dbPayload.notes = validated.notes;

  // 4. Executar update
  const { data: updated, error: updateError } = await supabase
    .from('job_team')
    .update(dbPayload)
    .eq('id', memberId)
    .select('*, people(full_name)')
    .single();

  if (updateError) {
    throw new AppError('INTERNAL_ERROR', updateError.message, 500);
  }

  // 5. Registrar no historico
  await insertHistory(supabase, {
    tenantId: auth.tenantId,
    jobId,
    eventType: 'team_change',
    userId: auth.userId,
    dataBefore: { role: current.role, rate: current.rate, hiring_status: current.hiring_status },
    dataAfter: dbPayload,
    description: `Dados de ${current.people?.full_name ?? 'membro'} atualizados`,
  });

  return success({
    id: updated.id,
    person_id: updated.person_id,
    person_name: updated.people?.full_name ?? null,
    role: updated.role,
    fee: updated.rate,
    hiring_status: updated.hiring_status,
    is_lead_producer: updated.is_responsible_producer,
    notes: updated.notes,
    updated_at: updated.updated_at,
  });
}
