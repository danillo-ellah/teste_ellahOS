import { getSupabaseClient } from '../../_shared/supabase-client.ts';
import { created } from '../../_shared/response.ts';
import { AppError } from '../../_shared/errors.ts';
import { validate, CreateJobSchema } from '../../_shared/validation.ts';
import { mapApiToDb, mapDbToApi } from '../../_shared/column-map.ts';
import { insertHistory } from '../../_shared/history.ts';
import type { AuthContext } from '../../_shared/auth.ts';

export async function createJob(
  req: Request,
  auth: AuthContext,
): Promise<Response> {
  // 1. Parsear e validar body
  const body = await req.json();
  const validated = validate(CreateJobSchema, body);

  // 2. Mapear campos API -> banco
  const dbPayload = mapApiToDb({
    ...validated,
    tenant_id: auth.tenantId,
    created_by: auth.userId,
    status: 'briefing_recebido',
  });

  // 3. Inserir no banco (trigger gera code + job_aba + index_number)
  const supabase = getSupabaseClient(auth.token);
  const { data: job, error: dbError } = await supabase
    .from('jobs')
    .insert(dbPayload)
    .select()
    .single();

  if (dbError) {
    if (dbError.code === '23505') {
      throw new AppError('CONFLICT', 'Job com este codigo ja existe', 409);
    }
    if (dbError.code === '23503') {
      throw new AppError(
        'VALIDATION_ERROR',
        'Referencia invalida: verifique client_id, agency_id ou parent_job_id',
        400,
      );
    }
    throw new AppError('INTERNAL_ERROR', dbError.message, 500);
  }

  // 4. Registrar no historico
  await insertHistory(supabase, {
    tenantId: auth.tenantId,
    jobId: job.id,
    eventType: 'status_change',
    userId: auth.userId,
    dataAfter: { status: 'briefing_recebido' },
    description: `Job "${job.title}" criado com status briefing_recebido`,
  });

  // 5. Retornar mapeado banco -> API
  return created(mapDbToApi(job));
}
