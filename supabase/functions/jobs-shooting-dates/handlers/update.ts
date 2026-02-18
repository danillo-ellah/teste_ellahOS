import { getSupabaseClient } from '../../_shared/supabase-client.ts';
import { success } from '../../_shared/response.ts';
import { AppError } from '../../_shared/errors.ts';
import { validate, UpdateShootingDateSchema } from '../../_shared/validation.ts';
import { insertHistory } from '../../_shared/history.ts';
import type { AuthContext } from '../../_shared/auth.ts';

export async function updateShootingDate(
  req: Request,
  auth: AuthContext,
  jobId: string,
  dateId: string,
): Promise<Response> {
  const supabase = getSupabaseClient(auth.token);

  const { data: current, error: fetchError } = await supabase
    .from('job_shooting_dates')
    .select('*')
    .eq('id', dateId)
    .eq('job_id', jobId)
    .is('deleted_at', null)
    .single();

  if (fetchError || !current) {
    throw new AppError('NOT_FOUND', 'Diaria de filmagem nao encontrada', 404);
  }

  const body = await req.json();
  const validated = validate(UpdateShootingDateSchema, body);

  const { data: updated, error: updateError } = await supabase
    .from('job_shooting_dates')
    .update(validated)
    .eq('id', dateId)
    .select()
    .single();

  if (updateError) throw new AppError('INTERNAL_ERROR', updateError.message, 500);

  await insertHistory(supabase, {
    tenantId: auth.tenantId,
    jobId,
    eventType: 'field_update',
    userId: auth.userId,
    dataBefore: { shooting_date: current.shooting_date },
    dataAfter: validated,
    description: `Diaria de filmagem ${current.shooting_date} atualizada`,
  });

  return success(updated);
}
