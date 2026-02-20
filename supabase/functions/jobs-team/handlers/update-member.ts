import { getSupabaseClient } from '../../_shared/supabase-client.ts';
import { success } from '../../_shared/response.ts';
import { AppError } from '../../_shared/errors.ts';
import { validate, UpdateTeamMemberSchema } from '../../_shared/validation.ts';
import { insertHistory } from '../../_shared/history.ts';
import { detectConflicts } from '../../_shared/conflict-detection.ts';
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

  // 3. Validar datas de alocacao
  const finalStart = validated.allocation_start !== undefined ? validated.allocation_start : current.allocation_start;
  const finalEnd = validated.allocation_end !== undefined ? validated.allocation_end : current.allocation_end;
  if (finalStart && finalEnd && finalEnd < finalStart) {
    throw new AppError('VALIDATION_ERROR', 'allocation_end deve ser >= allocation_start', 400);
  }

  // 4. Mapear campos API -> banco
  const dbPayload: Record<string, unknown> = {};
  if (validated.fee !== undefined) dbPayload.rate = validated.fee;
  if (validated.is_lead_producer !== undefined)
    dbPayload.is_responsible_producer = validated.is_lead_producer;
  if (validated.role !== undefined) dbPayload.role = validated.role;
  if (validated.hiring_status !== undefined)
    dbPayload.hiring_status = validated.hiring_status;
  if (validated.notes !== undefined) dbPayload.notes = validated.notes;
  if (validated.allocation_start !== undefined) dbPayload.allocation_start = validated.allocation_start;
  if (validated.allocation_end !== undefined) dbPayload.allocation_end = validated.allocation_end;

  // 5. Executar update
  const { data: updated, error: updateError } = await supabase
    .from('job_team')
    .update(dbPayload)
    .eq('id', memberId)
    .select('*, people(full_name)')
    .single();

  if (updateError) {
    throw new AppError('INTERNAL_ERROR', updateError.message, 500);
  }

  // 6. Sync com allocations (se datas de alocacao foram atualizadas)
  let warnings: Array<{ code: string; message: string }> = [];
  const hasAllocationDates = finalStart && finalEnd;

  if (hasAllocationDates && (validated.allocation_start !== undefined || validated.allocation_end !== undefined)) {
    // Buscar alocacao existente vinculada a este job_team
    const { data: existingAlloc } = await supabase
      .from('allocations')
      .select('id')
      .eq('job_team_id', memberId)
      .is('deleted_at', null)
      .single();

    if (existingAlloc) {
      // Atualizar alocacao existente
      await supabase
        .from('allocations')
        .update({
          allocation_start: finalStart,
          allocation_end: finalEnd,
        })
        .eq('id', existingAlloc.id);

      warnings = await detectConflicts(
        supabase,
        auth.tenantId,
        current.person_id,
        finalStart,
        finalEnd,
        existingAlloc.id,
      );
    } else {
      // Criar nova alocacao
      const { data: newAlloc } = await supabase
        .from('allocations')
        .insert({
          tenant_id: auth.tenantId,
          job_id: jobId,
          people_id: current.person_id,
          job_team_id: memberId,
          allocation_start: finalStart,
          allocation_end: finalEnd,
          created_by: auth.userId,
        })
        .select('id')
        .single();

      if (newAlloc) {
        warnings = await detectConflicts(
          supabase,
          auth.tenantId,
          current.person_id,
          finalStart,
          finalEnd,
          newAlloc.id,
        );
      }
    }
  }

  // 7. Registrar no historico
  await insertHistory(supabase, {
    tenantId: auth.tenantId,
    jobId,
    eventType: 'team_change',
    userId: auth.userId,
    dataBefore: { role: current.role, rate: current.rate, hiring_status: current.hiring_status },
    dataAfter: dbPayload,
    description: `Dados de ${current.people?.full_name ?? 'membro'} atualizados`,
  });

  // 8. Retornar
  const response = {
    id: updated.id,
    person_id: updated.person_id,
    person_name: updated.people?.full_name ?? null,
    role: updated.role,
    fee: updated.rate,
    hiring_status: updated.hiring_status,
    is_lead_producer: updated.is_responsible_producer,
    notes: updated.notes,
    allocation_start: updated.allocation_start ?? null,
    allocation_end: updated.allocation_end ?? null,
    updated_at: updated.updated_at,
  };

  const responseBody: Record<string, unknown> = { data: response };
  if (warnings.length > 0) {
    responseBody.warnings = warnings;
  }

  return new Response(JSON.stringify(responseBody), {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
}
