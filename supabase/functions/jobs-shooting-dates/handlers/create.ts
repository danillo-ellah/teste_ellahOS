import { getSupabaseClient } from '../../_shared/supabase-client.ts';
import { created } from '../../_shared/response.ts';
import { AppError } from '../../_shared/errors.ts';
import { validate, CreateShootingDateSchema } from '../../_shared/validation.ts';
import { insertHistory } from '../../_shared/history.ts';
import type { AuthContext } from '../../_shared/auth.ts';

export async function createShootingDate(
  req: Request,
  auth: AuthContext,
  jobId: string,
): Promise<Response> {
  const supabase = getSupabaseClient(auth.token);

  // Verificar que o job existe
  const { data: job, error: jobError } = await supabase
    .from('jobs')
    .select('id')
    .eq('id', jobId)
    .is('deleted_at', null)
    .single();

  if (jobError || !job) throw new AppError('NOT_FOUND', 'Job nao encontrado', 404);

  const body = await req.json();
  const validated = validate(CreateShootingDateSchema, body);

  const { data: shootingDate, error: insertError } = await supabase
    .from('job_shooting_dates')
    .insert({
      tenant_id: auth.tenantId,
      job_id: jobId,
      ...validated,
    })
    .select()
    .single();

  if (insertError) throw new AppError('INTERNAL_ERROR', insertError.message, 500);

  await insertHistory(supabase, {
    tenantId: auth.tenantId,
    jobId,
    eventType: 'field_update',
    userId: auth.userId,
    dataAfter: { shooting_date: validated.shooting_date, description: validated.description },
    description: `Diaria de filmagem ${validated.shooting_date} adicionada`,
  });

  return created(shootingDate);
}
