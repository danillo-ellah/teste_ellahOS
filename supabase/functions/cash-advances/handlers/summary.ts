import type { AuthContext } from '../../_shared/auth.ts';
import { AppError } from '../../_shared/errors.ts';
import { success } from '../../_shared/response.ts';
import { getSupabaseClient } from '../../_shared/supabase-client.ts';

// Roles autorizados para visualizar resumo
const ALLOWED_ROLES = ['financeiro', 'produtor_executivo', 'admin', 'ceo'];

// Limite percentual do orcamento sem aprovacao adicional
const THRESHOLD_PERCENT = 10;

// Estrutura do resumo de verbas a vista de um job
export interface CashAdvancesSummary {
  job_id: string;
  budget_value: number | null;
  threshold_value: number | null;
  total_advances: number;
  advances_open: number;
  advances_closed: number;
  advances_over_threshold: number;
  total_authorized: number;
  total_deposited: number;
  total_documented: number;
  total_balance: number;
  has_negative_balance: boolean;
  pct_of_budget: number | null;
}

export async function handleSummary(req: Request, auth: AuthContext): Promise<Response> {
  console.log('[cash-advances/summary] iniciando calculo do resumo', {
    userId: auth.userId,
    tenantId: auth.tenantId,
  });

  // Validacao de role
  if (!ALLOWED_ROLES.includes(auth.role)) {
    throw new AppError('FORBIDDEN', 'Permissao insuficiente para visualizar resumo', 403);
  }

  const url = new URL(req.url);

  // job_id e obrigatorio
  const jobId = url.searchParams.get('job_id');
  if (!jobId) {
    throw new AppError('VALIDATION_ERROR', 'Parametro job_id e obrigatorio', 400);
  }

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(jobId)) {
    throw new AppError('VALIDATION_ERROR', 'job_id invalido', 400);
  }

  const client = getSupabaseClient(auth.token);

  // Buscar closed_value do job para calcular threshold
  const { data: job, error: jobError } = await client
    .from('jobs')
    .select('id, closed_value')
    .eq('id', jobId)
    .eq('tenant_id', auth.tenantId)
    .is('deleted_at', null)
    .single();

  if (jobError || !job) {
    throw new AppError('NOT_FOUND', 'Job nao encontrado', 404);
  }

  // Calcular agregados diretamente (evita view para maior flexibilidade)
  const { data: rows, error: fetchError } = await client
    .from('cash_advances')
    .select('amount_authorized, amount_deposited, amount_documented, balance, status, threshold_exceeded')
    .eq('job_id', jobId)
    .eq('tenant_id', auth.tenantId)
    .is('deleted_at', null);

  if (fetchError) {
    console.error('[cash-advances/summary] erro ao buscar verbas:', fetchError.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao calcular resumo', 500);
  }

  const advances = rows ?? [];

  // Agregacao em memória (evita RPC e mantém query simples)
  let totalAuthorized = 0;
  let totalDeposited = 0;
  let totalDocumented = 0;
  let totalBalance = 0;
  let advancesOpen = 0;
  let advancesClosed = 0;
  let advancesOverThreshold = 0;

  for (const adv of advances) {
    totalAuthorized += Number(adv.amount_authorized ?? 0);
    totalDeposited += Number(adv.amount_deposited ?? 0);
    totalDocumented += Number(adv.amount_documented ?? 0);
    totalBalance += Number(adv.balance ?? 0);

    if (adv.status === 'aberta') advancesOpen++;
    if (adv.status === 'encerrada' || adv.status === 'aprovada') advancesClosed++;
    if (adv.threshold_exceeded) advancesOverThreshold++;
  }

  // Calcular threshold (10% do orcamento fechado)
  const budgetValue = job.closed_value ? Number(job.closed_value) : null;
  const thresholdValue = budgetValue ? (budgetValue * THRESHOLD_PERCENT) / 100 : null;

  // Percentual do orcamento comprometido em verbas
  const pctOfBudget =
    budgetValue && budgetValue > 0
      ? Math.round((totalAuthorized / budgetValue) * 10000) / 100
      : null;

  const summary: CashAdvancesSummary = {
    job_id: jobId,
    budget_value: budgetValue,
    threshold_value: thresholdValue,
    total_advances: advances.length,
    advances_open: advancesOpen,
    advances_closed: advancesClosed,
    advances_over_threshold: advancesOverThreshold,
    total_authorized: totalAuthorized,
    total_deposited: totalDeposited,
    total_documented: totalDocumented,
    total_balance: totalBalance,
    has_negative_balance: totalBalance < 0,
    pct_of_budget: pctOfBudget,
  };

  console.log('[cash-advances/summary] resumo calculado', {
    jobId,
    total_advances: summary.total_advances,
    total_deposited: summary.total_deposited,
    pct_of_budget: summary.pct_of_budget,
  });

  return success(summary);
}
