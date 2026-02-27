import type { AuthContext } from '../../_shared/auth.ts';
import { AppError } from '../../_shared/errors.ts';
import { success } from '../../_shared/response.ts';
import { getSupabaseClient } from '../../_shared/supabase-client.ts';

export async function handleBudgetSummary(
  _req: Request,
  auth: AuthContext,
  jobId: string,
): Promise<Response> {
  console.log('[cost-items/budget-summary] buscando resumo orcamentario do job', {
    jobId,
    userId: auth.userId,
    tenantId: auth.tenantId,
  });

  const client = getSupabaseClient(auth.token);

  // Buscar job para closed_value e budget_mode
  const { data: job, error: jobError } = await client
    .from('jobs')
    .select('id, closed_value, budget_mode, project_type')
    .eq('id', jobId)
    .eq('tenant_id', auth.tenantId)
    .is('deleted_at', null)
    .single();

  if (jobError || !job) {
    throw new AppError('NOT_FOUND', 'Job nao encontrado', 404);
  }

  // Buscar resumo da view vw_resumo_custos_job (se disponivel) ou calcular manualmente
  // Tentar usar a view primeiro
  const { data: viewData } = await client
    .from('vw_resumo_custos_job')
    .select('*')
    .eq('job_id', jobId)
    .maybeSingle();

  // Buscar todos os itens do job para calcular por categoria
  const { data: items, error: itemsError } = await client
    .from('cost_items')
    .select(
      'item_number, service_description, total_with_overtime, actual_paid_value, payment_status, is_category_header',
    )
    .eq('job_id', jobId)
    .eq('tenant_id', auth.tenantId)
    .is('deleted_at', null)
    .order('item_number', { ascending: true })
    .order('sub_item_number', { ascending: true });

  if (itemsError) {
    console.error('[cost-items/budget-summary] erro ao buscar itens:', itemsError.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao buscar itens de custo', 500, {
      detail: itemsError.message,
    });
  }

  // Calcular totais gerais
  const allItems = items ?? [];
  const totalEstimated = allItems.reduce(
    (sum, item) => sum + Number(item.total_with_overtime ?? 0),
    0,
  );
  const totalPaid = allItems
    .filter((item) => item.payment_status === 'pago')
    .reduce((sum, item) => sum + Number(item.actual_paid_value ?? 0), 0);

  // Agrupar por categoria (item_number)
  const categoryMap = new Map<
    number,
    {
      item_number: number;
      item_name: string;
      total_budgeted: number;
      total_paid: number;
      items_total: number;
      items_paid: number;
    }
  >();

  for (const item of allItems) {
    const catKey = item.item_number as number;
    if (!categoryMap.has(catKey)) {
      // Encontrar o nome da categoria (header do item)
      const headerItem = allItems.find(
        (i) => i.item_number === catKey && i.is_category_header,
      );
      categoryMap.set(catKey, {
        item_number: catKey,
        item_name: headerItem?.service_description ?? `Item ${catKey}`,
        total_budgeted: 0,
        total_paid: 0,
        items_total: 0,
        items_paid: 0,
      });
    }

    const cat = categoryMap.get(catKey)!;
    cat.total_budgeted += Number(item.total_with_overtime ?? 0);
    cat.items_total += 1;

    if (item.payment_status === 'pago') {
      cat.total_paid += Number(item.actual_paid_value ?? 0);
      cat.items_paid += 1;
    }
  }

  const byCategory = [...categoryMap.values()].map((cat) => ({
    ...cat,
    pct_paid: cat.total_budgeted > 0
      ? Math.round((cat.total_paid / cat.total_budgeted) * 100 * 100) / 100
      : 0,
  }));

  // Calcular margens
  const budgetValue = Number(job.closed_value ?? 0);
  const balance = totalEstimated - totalPaid;
  const marginGross = budgetValue - totalEstimated;
  const marginPct = budgetValue > 0
    ? Math.round((marginGross / budgetValue) * 100 * 100) / 100
    : 0;

  const summary = {
    budget_mode: job.budget_mode ?? 'bottom_up',
    budget_value: budgetValue,
    total_estimated: totalEstimated,
    total_paid: totalPaid,
    balance,
    margin_gross: marginGross,
    margin_pct: marginPct,
    by_category: byCategory,
    // Dados da view se disponivel (podem ter campos adicionais calculados pelo banco)
    _view_data: viewData ?? null,
  };

  return success(summary);
}
