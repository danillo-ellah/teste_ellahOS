import { getSupabaseClient } from '../../_shared/supabase-client.ts';
import { created, createdWithWarnings } from '../../_shared/response.ts';
import { AppError } from '../../_shared/errors.ts';
import { validate, CreateTeamMemberSchema } from '../../_shared/validation.ts';
import { insertHistory } from '../../_shared/history.ts';
import type { AuthContext } from '../../_shared/auth.ts';

export async function addMember(
  req: Request,
  auth: AuthContext,
  jobId: string,
): Promise<Response> {
  const supabase = getSupabaseClient(auth.token);

  // 1. Verificar que o job existe
  const { data: job, error: jobError } = await supabase
    .from('jobs')
    .select('id, title')
    .eq('id', jobId)
    .is('deleted_at', null)
    .single();

  if (jobError || !job) {
    throw new AppError('NOT_FOUND', 'Job nao encontrado', 404);
  }

  // 2. Validar payload
  const body = await req.json();
  const validated = validate(CreateTeamMemberSchema, body);

  // 3. Mapear campos API -> banco
  const dbPayload = {
    tenant_id: auth.tenantId,
    job_id: jobId,
    person_id: validated.person_id,
    role: validated.role,
    rate: validated.fee ?? null,
    hiring_status: validated.hiring_status ?? 'orcado',
    is_responsible_producer: validated.is_lead_producer ?? false,
    notes: validated.notes ?? null,
  };

  // 4. Inserir membro
  const { data: member, error: insertError } = await supabase
    .from('job_team')
    .insert(dbPayload)
    .select('*, people(id, full_name)')
    .single();

  if (insertError) {
    if (insertError.code === '23505') {
      throw new AppError(
        'CONFLICT',
        'Esta pessoa ja tem esta funcao neste job',
        409,
      );
    }
    if (insertError.code === '23503') {
      throw new AppError(
        'VALIDATION_ERROR',
        'person_id invalido',
        400,
      );
    }
    throw new AppError('INTERNAL_ERROR', insertError.message, 500);
  }

  // 5. Verificar conflito de agenda (warning, nao bloqueia)
  const warnings: Array<{ code: string; message: string }> = [];

  const { data: shootingDates } = await supabase
    .from('job_shooting_dates')
    .select('shooting_date')
    .eq('job_id', jobId)
    .is('deleted_at', null);

  if (shootingDates && shootingDates.length > 0) {
    const dates = shootingDates.map((d) => d.shooting_date);

    // Buscar outros jobs onde esta pessoa esta alocada nas mesmas datas
    const { data: conflicts } = await supabase
      .from('job_team')
      .select('job_id, jobs!inner(title, job_shooting_dates!inner(shooting_date))')
      .eq('person_id', validated.person_id)
      .neq('job_id', jobId)
      .is('deleted_at', null);

    if (conflicts) {
      for (const conflict of conflicts) {
        const conflictDates = (conflict as any).jobs?.job_shooting_dates ?? [];
        const overlap = conflictDates.filter((d: any) => dates.includes(d.shooting_date));
        if (overlap.length > 0) {
          warnings.push({
            code: 'SCHEDULE_CONFLICT',
            message: `${member.people?.full_name} esta alocado em "${(conflict as any).jobs?.title}" em data(s) conflitante(s)`,
          });
        }
      }
    }
  }

  // 6. Registrar no historico
  await insertHistory(supabase, {
    tenantId: auth.tenantId,
    jobId,
    eventType: 'team_change',
    userId: auth.userId,
    dataAfter: {
      person_name: member.people?.full_name,
      role: validated.role,
      action: 'added',
    },
    description: `${member.people?.full_name ?? 'Membro'} adicionado como ${validated.role}`,
  });

  // 7. Retornar com mapeamento banco -> API
  const response = {
    id: member.id,
    person_id: member.person_id,
    person_name: member.people?.full_name ?? null,
    role: member.role,
    fee: member.rate,
    hiring_status: member.hiring_status,
    is_lead_producer: member.is_responsible_producer,
    notes: member.notes,
    created_at: member.created_at,
  };

  if (warnings.length > 0) {
    return createdWithWarnings(response, warnings);
  }
  return created(response);
}
