import type { AuthContext } from '../../_shared/auth.ts';
import { AppError } from '../../_shared/errors.ts';
import { success } from '../../_shared/response.ts';
import { getSupabaseClient } from '../../_shared/supabase-client.ts';

// Roles autorizados para ver jobs de referencia
const ALLOWED_ROLES = ['produtor_executivo', 'admin', 'ceo', 'diretor_producao', 'coordenador_producao'];

// Status de job que indicam jobs ainda em fase de briefing/cancelamento (sem dados de custo uteis)
const EXCLUDED_STATUSES = ['briefing_recebido', 'cancelado'];

export async function handleReferenceJobs(
  req: Request,
  auth: AuthContext,
  jobId: string,
): Promise<Response> {
  const url = new URL(req.url);
  const q = url.searchParams.get('q') ?? '';

  console.log('[cost-items/reference-jobs] buscando jobs de referencia', {
    jobId,
    q: q || undefined,
    userId: auth.userId,
    tenantId: auth.tenantId,
  });

  // Validacao de role
  if (!ALLOWED_ROLES.includes(auth.role)) {
    throw new AppError(
      'FORBIDDEN',
      'Permissao insuficiente para ver jobs de referencia',
      403,
    );
  }

  const client = getSupabaseClient(auth.token);

  // Buscar project_type do job atual
  const { data: currentJob, error: jobError } = await client
    .from('jobs')
    .select('id, project_type, title, closed_value')
    .eq('id', jobId)
    .eq('tenant_id', auth.tenantId)
    .is('deleted_at', null)
    .single();

  if (jobError || !currentJob) {
    throw new AppError('NOT_FOUND', 'Job nao encontrado', 404);
  }

  // Buscar jobs similares (mesmo project_type, excluindo o atual e os excluidos)
  let similarQuery = client
    .from('jobs')
    .select('id, code, title, status, project_type, closed_value, created_at')
    .eq('tenant_id', auth.tenantId)
    .eq('project_type', currentJob.project_type)
    .neq('id', jobId)
    .not('status', 'in', `(${EXCLUDED_STATUSES.map((s) => `"${s}"`).join(',')})`)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(20);

  // Filtro de busca por nome ou codigo (minimo 2 caracteres)
  if (q && q.length >= 2) {
    // Sanitizar para evitar injecao de operadores PostgREST
    const sanitizedQ = q.replace(/[%_(),."'\\]/g, '').slice(0, 100);
    if (sanitizedQ.length >= 2) {
      similarQuery = similarQuery.or(`title.ilike.%${sanitizedQ}%,code.ilike.%${sanitizedQ}%`);
    }
  }

  const { data: similarJobs, error: similarError } = await similarQuery;

  if (similarError) {
    console.error('[cost-items/reference-jobs] erro ao buscar jobs similares:', similarError.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao buscar jobs de referencia', 500, {
      detail: similarError.message,
    });
  }

  if (!similarJobs || similarJobs.length === 0) {
    return success({
      project_type: currentJob.project_type,
      reference_jobs: [],
    });
  }

  // Buscar agregacao de cost_items para cada job similar
  const similarJobIds = similarJobs.map((j) => j.id);

  const { data: costAgg, error: aggError } = await client
    .from('cost_items')
    .select('job_id, total_with_overtime, actual_paid_value, payment_status')
    .in('job_id', similarJobIds)
    .eq('tenant_id', auth.tenantId)
    .is('deleted_at', null);

  if (aggError) {
    console.error('[cost-items/reference-jobs] erro ao buscar agregacao:', aggError.message);
    // Nao quebrar — retornar jobs sem dados de custo
  }

  // Calcular agregados por job
  const aggByJob = new Map<
    string,
    { count: number; total_estimated: number; total_paid: number }
  >();

  for (const item of costAgg ?? []) {
    const jid = item.job_id as string;
    if (!aggByJob.has(jid)) {
      aggByJob.set(jid, { count: 0, total_estimated: 0, total_paid: 0 });
    }
    const agg = aggByJob.get(jid)!;
    agg.count += 1;
    agg.total_estimated += Number(item.total_with_overtime ?? 0);
    if (item.payment_status === 'pago') {
      agg.total_paid += Number(item.actual_paid_value ?? 0);
    }
  }

  // Montar resultado enriquecido e filtrar apenas jobs com itens de custo
  const referenceJobs = similarJobs
    .map((job) => {
      const agg = aggByJob.get(job.id) ?? { count: 0, total_estimated: 0, total_paid: 0 };
      return {
        id: job.id,
        code: job.code,
        title: job.title,
        status: job.status,
        project_type: job.project_type,
        closed_value: job.closed_value,
        created_at: job.created_at,
        cost_items_count: agg.count,
        total_estimated: agg.total_estimated,
        total_paid: agg.total_paid,
      };
    })
    .filter((job) => job.cost_items_count > 0);

  return success({
    project_type: currentJob.project_type,
    reference_jobs: referenceJobs,
  });
}
