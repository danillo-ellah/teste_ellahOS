import { getSupabaseClient } from '../../_shared/supabase-client.ts';
import { success } from '../../_shared/response.ts';
import { AppError } from '../../_shared/errors.ts';
import { validate, z } from '../../_shared/validation.ts';
import { detectConflicts } from '../../_shared/conflict-detection.ts';
import { corsHeaders } from '../../_shared/cors.ts';
import type { AuthContext } from '../../_shared/auth.ts';

const UpdateAllocationSchema = z.object({
  allocation_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  allocation_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  notes: z.string().max(2000).nullable(),
  job_team_id: z.string().uuid().nullable(),
}).partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: 'Pelo menos um campo deve ser enviado' },
);

// UUID v4 regex para validacao de formato
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// PUT /allocations/:id — atualiza alocacao
export async function updateAllocation(
  req: Request,
  auth: AuthContext,
  allocationId: string,
): Promise<Response> {
  if (!UUID_REGEX.test(allocationId)) {
    throw new AppError('NOT_FOUND', 'Alocacao nao encontrada', 404);
  }

  const body = await req.json();
  const validated = validate(UpdateAllocationSchema, body);

  const supabase = getSupabaseClient(auth.token);

  // Buscar alocacao existente
  const { data: existing, error: fetchError } = await supabase
    .from('allocations')
    .select('*')
    .eq('id', allocationId)
    .is('deleted_at', null)
    .single();

  if (fetchError || !existing) {
    throw new AppError('NOT_FOUND', 'Alocacao nao encontrada', 404);
  }

  // Montar update
  const updates: Record<string, unknown> = {};
  if (validated.allocation_start !== undefined) updates.allocation_start = validated.allocation_start;
  if (validated.allocation_end !== undefined) updates.allocation_end = validated.allocation_end;
  if (validated.notes !== undefined) updates.notes = validated.notes;
  if (validated.job_team_id !== undefined) updates.job_team_id = validated.job_team_id;

  // Validar datas se ambas estao definidas
  const finalStart = (updates.allocation_start as string) ?? existing.allocation_start;
  const finalEnd = (updates.allocation_end as string) ?? existing.allocation_end;
  if (finalEnd < finalStart) {
    throw new AppError('VALIDATION_ERROR', 'allocation_end deve ser >= allocation_start', 400);
  }

  // Atualizar
  const { data: updated, error: updateError } = await supabase
    .from('allocations')
    .update(updates)
    .eq('id', allocationId)
    .select('*, people(id, full_name), jobs(id, code, title, status)')
    .single();

  if (updateError) {
    console.error('[allocations/update] erro:', updateError.message);
    throw new AppError('INTERNAL_ERROR', updateError.message, 500);
  }

  // Detectar conflitos
  const warnings = await detectConflicts(
    supabase,
    auth.tenantId,
    existing.people_id,
    finalStart,
    finalEnd,
    allocationId,
  );

  if (warnings.length > 0) {
    return new Response(JSON.stringify({ data: updated, warnings }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  return success(updated);
}
