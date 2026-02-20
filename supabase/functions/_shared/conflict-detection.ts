import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Warning retornado quando ha conflito de alocacao
export interface ConflictWarning {
  code: 'ALLOCATION_CONFLICT';
  message: string;
  details: {
    person_name: string;
    conflicting_job_code: string;
    conflicting_job_title: string;
    overlap_start: string;
    overlap_end: string;
  };
}

// Detecta conflitos de alocacao para uma pessoa em um periodo.
// Busca alocacoes sobrepostas em jobs ativos (nao cancelados/pausados).
// Retorna array de warnings (vazio se sem conflitos).
export async function detectConflicts(
  client: SupabaseClient,
  tenantId: string,
  peopleId: string,
  allocationStart: string,
  allocationEnd: string,
  excludeAllocationId?: string,
): Promise<ConflictWarning[]> {
  // Buscar alocacoes sobrepostas no periodo (range overlap: A.start <= B.end AND A.end >= B.start)
  let query = client
    .from('allocations')
    .select('id, job_id, allocation_start, allocation_end, jobs!inner(code, title, status), people!inner(full_name)')
    .eq('tenant_id', tenantId)
    .eq('people_id', peopleId)
    .is('deleted_at', null)
    .lte('allocation_start', allocationEnd)
    .gte('allocation_end', allocationStart)
    .not('jobs.status', 'in', '("cancelado","pausado")');

  if (excludeAllocationId) {
    query = query.neq('id', excludeAllocationId);
  }

  const { data: overlapping, error } = await query;

  if (error) {
    console.error('[conflict-detection] falha ao detectar conflitos:', error.message);
    return [];
  }

  if (!overlapping || overlapping.length === 0) {
    return [];
  }

  const personName = (overlapping[0] as any).people?.full_name ?? 'Pessoa';

  return overlapping.map((alloc: any) => {
    const job = alloc.jobs;
    // Calcula overlap real
    const overlapStart = alloc.allocation_start > allocationStart
      ? alloc.allocation_start
      : allocationStart;
    const overlapEnd = alloc.allocation_end < allocationEnd
      ? alloc.allocation_end
      : allocationEnd;

    return {
      code: 'ALLOCATION_CONFLICT' as const,
      message: `${personName} esta alocado(a) no job ${job?.code ?? ''} (${job?.title ?? ''}) de ${overlapStart} a ${overlapEnd}`,
      details: {
        person_name: personName,
        conflicting_job_code: job?.code ?? '',
        conflicting_job_title: job?.title ?? '',
        overlap_start: overlapStart,
        overlap_end: overlapEnd,
      },
    };
  });
}
