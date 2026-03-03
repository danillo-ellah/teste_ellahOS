import { getSupabaseClient } from '../../_shared/supabase-client.ts';
import { success } from '../../_shared/response.ts';
import { AppError } from '../../_shared/errors.ts';
import type { AuthContext } from '../../_shared/auth.ts';

export async function getLocation(
  req: Request,
  auth: AuthContext,
  locationId: string,
): Promise<Response> {
  console.log('[locations/get] buscando locacao', {
    locationId,
    userId: auth.userId,
    tenantId: auth.tenantId,
  });

  const supabase = getSupabaseClient(auth.token);

  const { data: location, error: dbError } = await supabase
    .from('locations')
    .select(
      '*, location_photos(*), job_locations(id, job_id, filming_dates, notes, daily_rate_override, permit_status, jobs(id, title, code, job_aba, status))',
    )
    .eq('id', locationId)
    .eq('tenant_id', auth.tenantId)
    .is('deleted_at', null)
    .single();

  if (dbError || !location) {
    console.log('[locations/get] locacao nao encontrada:', locationId, dbError?.message);
    throw new AppError('NOT_FOUND', 'Locacao nao encontrada', 404);
  }

  console.log('[locations/get] locacao encontrada:', location.id);

  return success(location);
}
