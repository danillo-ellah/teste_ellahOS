import { getSupabaseClient } from '../../_shared/supabase-client.ts';
import { success } from '../../_shared/response.ts';
import { AppError } from '../../_shared/errors.ts';
import type { AuthContext } from '../../_shared/auth.ts';

// Conflito agrupado por pessoa
interface PersonConflict {
  person_id: string;
  person_name: string;
  allocations: Array<{
    allocation_id: string;
    job_id: string;
    job_code: string;
    job_title: string;
    allocation_start: string;
    allocation_end: string;
  }>;
  overlap_start: string;
  overlap_end: string;
}

// GET /allocations/conflicts?from=Y&to=Z — lista conflitos no periodo
export async function getConflicts(
  req: Request,
  auth: AuthContext,
): Promise<Response> {
  const url = new URL(req.url);
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');

  if (!from || !to) {
    throw new AppError('VALIDATION_ERROR', 'Parametros from e to sao obrigatorios', 400);
  }

  const supabase = getSupabaseClient(auth.token);

  // Buscar todas as alocacoes no periodo
  const { data: allocations, error } = await supabase
    .from('allocations')
    .select('id, people_id, job_id, allocation_start, allocation_end, people(id, full_name), jobs!inner(id, code, title, status)')
    .is('deleted_at', null)
    .lte('allocation_start', to)
    .gte('allocation_end', from)
    .not('jobs.status', 'in', '("cancelado","pausado")')
    .order('people_id')
    .order('allocation_start', { ascending: true });

  if (error) {
    console.error('[allocations/get-conflicts] erro:', error.message);
    throw new AppError('INTERNAL_ERROR', error.message, 500);
  }

  if (!allocations || allocations.length === 0) {
    return success([]);
  }

  // Agrupar por pessoa
  const byPerson = new Map<string, any[]>();
  for (const alloc of allocations) {
    const pid = alloc.people_id;
    if (!byPerson.has(pid)) byPerson.set(pid, []);
    byPerson.get(pid)!.push(alloc);
  }

  // Detectar sobreposicoes por pessoa
  const conflicts: PersonConflict[] = [];

  for (const [personId, personAllocs] of byPerson) {
    if (personAllocs.length < 2) continue;

    // Verificar pares de alocacoes para sobreposicao
    for (let i = 0; i < personAllocs.length; i++) {
      for (let j = i + 1; j < personAllocs.length; j++) {
        const a = personAllocs[i];
        const b = personAllocs[j];

        // Range overlap: a.start <= b.end AND a.end >= b.start
        if (a.allocation_start <= b.allocation_end && a.allocation_end >= b.allocation_start) {
          const overlapStart = a.allocation_start > b.allocation_start ? a.allocation_start : b.allocation_start;
          const overlapEnd = a.allocation_end < b.allocation_end ? a.allocation_end : b.allocation_end;

          conflicts.push({
            person_id: personId,
            person_name: (a as any).people?.full_name ?? '',
            allocations: [a, b].map((alloc: any) => ({
              allocation_id: alloc.id,
              job_id: alloc.job_id,
              job_code: alloc.jobs?.code ?? '',
              job_title: alloc.jobs?.title ?? '',
              allocation_start: alloc.allocation_start,
              allocation_end: alloc.allocation_end,
            })),
            overlap_start: overlapStart,
            overlap_end: overlapEnd,
          });
        }
      }
    }
  }

  return success(conflicts);
}
