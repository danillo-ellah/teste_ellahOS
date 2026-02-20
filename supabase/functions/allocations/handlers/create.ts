import { getSupabaseClient } from '../../_shared/supabase-client.ts';
import { created, createdWithWarnings } from '../../_shared/response.ts';
import { AppError } from '../../_shared/errors.ts';
import { validate, z } from '../../_shared/validation.ts';
import { detectConflicts } from '../../_shared/conflict-detection.ts';
import type { AuthContext } from '../../_shared/auth.ts';

const CreateAllocationSchema = z.object({
  job_id: z.string().uuid('job_id deve ser UUID valido'),
  people_id: z.string().uuid('people_id deve ser UUID valido'),
  job_team_id: z.string().uuid().optional().nullable(),
  allocation_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'allocation_start deve ser YYYY-MM-DD'),
  allocation_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'allocation_end deve ser YYYY-MM-DD'),
  notes: z.string().max(2000).optional().nullable(),
});

// POST /allocations — cria nova alocacao
export async function createAllocation(
  req: Request,
  auth: AuthContext,
): Promise<Response> {
  const body = await req.json();
  const validated = validate(CreateAllocationSchema, body);

  // Validar que end >= start
  if (validated.allocation_end < validated.allocation_start) {
    throw new AppError('VALIDATION_ERROR', 'allocation_end deve ser >= allocation_start', 400);
  }

  const supabase = getSupabaseClient(auth.token);

  // Verificar que job e pessoa existem
  const { data: job, error: jobError } = await supabase
    .from('jobs')
    .select('id')
    .eq('id', validated.job_id)
    .is('deleted_at', null)
    .single();

  if (jobError || !job) {
    throw new AppError('NOT_FOUND', 'Job nao encontrado', 404);
  }

  const { data: person, error: personError } = await supabase
    .from('people')
    .select('id')
    .eq('id', validated.people_id)
    .is('deleted_at', null)
    .single();

  if (personError || !person) {
    throw new AppError('NOT_FOUND', 'Pessoa nao encontrada', 404);
  }

  // Inserir alocacao
  const { data: allocation, error: insertError } = await supabase
    .from('allocations')
    .insert({
      tenant_id: auth.tenantId,
      job_id: validated.job_id,
      people_id: validated.people_id,
      job_team_id: validated.job_team_id ?? null,
      allocation_start: validated.allocation_start,
      allocation_end: validated.allocation_end,
      notes: validated.notes ?? null,
      created_by: auth.userId,
    })
    .select('*, people(id, full_name), jobs(id, code, title, status)')
    .single();

  if (insertError) {
    console.error('[allocations/create] erro insert:', insertError.message);
    throw new AppError('INTERNAL_ERROR', insertError.message, 500);
  }

  // Detectar conflitos (warning, nao bloqueia)
  const warnings = await detectConflicts(
    supabase,
    auth.tenantId,
    validated.people_id,
    validated.allocation_start,
    validated.allocation_end,
    allocation.id, // excluir a propria alocacao recem criada
  );

  if (warnings.length > 0) {
    return createdWithWarnings(allocation, warnings);
  }
  return created(allocation);
}
