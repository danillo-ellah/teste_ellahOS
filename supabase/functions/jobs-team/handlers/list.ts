import { getSupabaseClient } from '../../_shared/supabase-client.ts';
import { success } from '../../_shared/response.ts';
import { AppError } from '../../_shared/errors.ts';
import type { AuthContext } from '../../_shared/auth.ts';

export async function listTeam(
  _req: Request,
  auth: AuthContext,
  jobId: string,
): Promise<Response> {
  const supabase = getSupabaseClient(auth.token);

  const { data: team, error: dbError } = await supabase
    .from('job_team')
    .select('*, people(id, full_name)')
    .eq('job_id', jobId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true });

  if (dbError) {
    throw new AppError('INTERNAL_ERROR', dbError.message, 500);
  }

  // Mapear nomes do banco para API (rate->fee, is_responsible_producer->is_lead_producer)
  const mapped = (team ?? []).map((m) => ({
    id: m.id,
    person_id: m.person_id,
    person_name: m.people?.full_name ?? null,
    role: m.role,
    fee: m.rate,
    hiring_status: m.hiring_status,
    is_lead_producer: m.is_responsible_producer,
    notes: m.notes,
    allocation_start: m.allocation_start ?? null,
    allocation_end: m.allocation_end ?? null,
    created_at: m.created_at,
    updated_at: m.updated_at,
  }));

  return success(mapped);
}
