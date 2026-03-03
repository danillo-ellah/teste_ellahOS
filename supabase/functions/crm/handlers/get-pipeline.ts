import type { AuthContext } from '../../_shared/auth.ts';
import { AppError } from '../../_shared/errors.ts';
import { success } from '../../_shared/response.ts';
import { getSupabaseClient } from '../../_shared/supabase-client.ts';

// Stages do pipeline em ordem de progressao
// pausado e incluido ao final para visibilidade, mas separado dos stages ativos
const PIPELINE_STAGES = [
  'lead',
  'qualificado',
  'proposta',
  'negociacao',
  'fechamento',
  'ganho',
  'perdido',
  'pausado',
] as const;

type Stage = typeof PIPELINE_STAGES[number];

/**
 * GET /crm/pipeline
 * Retorna todas as oportunidades ativas agrupadas por stage.
 * Stages ganho/perdido sao incluidos para referencia mas podem ser filtrados no front.
 */
export async function handleGetPipeline(req: Request, auth: AuthContext): Promise<Response> {
  console.log('[crm/pipeline] buscando pipeline', {
    userId: auth.userId,
    tenantId: auth.tenantId,
  });

  const url = new URL(req.url);
  const includeClosedParam = url.searchParams.get('include_closed');
  const includeClosed = includeClosedParam === 'true';

  const client = getSupabaseClient(auth.token);

  let query = client
    .from('opportunities')
    .select(`
      id,
      title,
      stage,
      estimated_value,
      probability,
      expected_close_date,
      actual_close_date,
      source,
      project_type,
      created_at,
      updated_at,
      client_id,
      agency_id,
      assigned_to,
      job_id,
      clients(id, name),
      agencies(id, name),
      assigned_profile:profiles!opportunities_assigned_to_fkey(id, full_name, avatar_url)
    `)
    .eq('tenant_id', auth.tenantId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(200);

  // Por padrao omite ganho/perdido para nao sobrecarregar o kanban
  // pausado e mantido mesmo sem include_closed — e um estado temporario visivel no kanban
  if (!includeClosed) {
    query = query.not('stage', 'in', '("ganho","perdido")');
  }

  const { data: opportunities, error: fetchError } = await query;

  if (fetchError) {
    console.error('[crm/pipeline] erro ao buscar oportunidades:', fetchError.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao buscar pipeline', 500, {
      detail: fetchError.message,
    });
  }

  // Agrupar por stage mantendo a ordem definida
  const grouped: Record<Stage, typeof opportunities> = {
    lead: [],
    qualificado: [],
    proposta: [],
    negociacao: [],
    fechamento: [],
    ganho: [],
    perdido: [],
    pausado: [],
  };

  for (const opp of (opportunities ?? [])) {
    const stage = opp.stage as Stage;
    if (grouped[stage]) {
      grouped[stage].push(opp);
    }
  }

  // Calcular totais por stage
  const stageSummary = PIPELINE_STAGES.map((stage) => {
    const items = grouped[stage] ?? [];
    const totalValue = items.reduce((sum, o) => sum + Number(o.estimated_value ?? 0), 0);
    const weightedValue = items.reduce(
      (sum, o) => sum + Number(o.estimated_value ?? 0) * (Number(o.probability ?? 50) / 100),
      0,
    );
    return {
      stage,
      count: items.length,
      total_value: totalValue,
      weighted_value: weightedValue,
    };
  });

  return success(
    {
      stages: grouped,
      summary: stageSummary,
      total_opportunities: (opportunities ?? []).length,
    },
    200,
    req,
  );
}
