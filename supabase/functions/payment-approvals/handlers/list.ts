import type { AuthContext } from '../../_shared/auth.ts';
import { AppError } from '../../_shared/errors.ts';
import { paginated } from '../../_shared/response.ts';
import { getSupabaseClient } from '../../_shared/supabase-client.ts';

/**
 * GET /payment-approvals?status=pending&job_id=X&page=1&per_page=20
 *
 * Lista aprovacoes do tenant com filtros opcionais.
 * Inclui joins: cost_item (descricao), job (codigo), requester (nome), decider (nome).
 */
export async function handleList(req: Request, auth: AuthContext): Promise<Response> {
  console.log('[payment-approvals/list] listando aprovacoes', {
    userId: auth.userId,
    tenantId: auth.tenantId,
    role: auth.role,
  });

  const url = new URL(req.url);
  const status = url.searchParams.get('status') ?? undefined;
  const jobId = url.searchParams.get('job_id') ?? undefined;
  const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10));
  const perPage = Math.min(100, Math.max(1, parseInt(url.searchParams.get('per_page') ?? '20', 10)));

  // Validar status se fornecido
  const validStatuses = ['pending', 'approved', 'rejected'];
  if (status && !validStatuses.includes(status)) {
    throw new AppError('VALIDATION_ERROR', `Status invalido. Use: ${validStatuses.join(', ')}`, 400);
  }

  const client = getSupabaseClient(auth.token);

  // Construir query com joins para enriquecer a listagem
  let query = client
    .from('payment_approvals')
    .select(
      `
      id,
      status,
      amount,
      requested_at,
      decided_at,
      decision_notes,
      cost_item_id,
      rule_id,
      requested_by,
      decided_by,
      created_at,
      updated_at,
      cost_items (
        id,
        service_description,
        item_number,
        sub_item_number,
        total_with_overtime,
        payment_approval_status,
        job_id,
        jobs (
          id,
          code,
          job_aba,
          title
        )
      ),
      payment_approval_rules (
        id,
        required_role,
        description,
        min_amount,
        max_amount
      ),
      requester:profiles!payment_approvals_requested_by_fkey (
        id,
        full_name,
        email
      ),
      decider:profiles!payment_approvals_decided_by_fkey (
        id,
        full_name,
        email
      )
      `,
      { count: 'exact' },
    )
    .eq('tenant_id', auth.tenantId)
    .is('deleted_at', null);

  // Filtro por status
  if (status) {
    query = query.eq('status', status);
  }

  // Filtro por job_id (via cost_items join — filtro client-side nao e possivel em Supabase)
  // Para filtrar por job, buscamos os cost_item_ids do job primeiro
  let costItemIdsForJob: string[] | null = null;
  if (jobId) {
    const { data: items, error: itemsError } = await client
      .from('cost_items')
      .select('id')
      .eq('job_id', jobId)
      .eq('tenant_id', auth.tenantId)
      .is('deleted_at', null);

    if (itemsError) {
      console.error('[payment-approvals/list] erro ao buscar cost items do job:', itemsError.message);
      throw new AppError('INTERNAL_ERROR', 'Erro ao filtrar por job', 500, {
        detail: itemsError.message,
      });
    }

    costItemIdsForJob = (items ?? []).map((i) => i.id);

    // Se nenhum cost item neste job, retornar lista vazia
    if (costItemIdsForJob.length === 0) {
      return paginated([], { total: 0, page, per_page: perPage, total_pages: 0 }, req);
    }

    query = query.in('cost_item_id', costItemIdsForJob);
  }

  // Ordenar por mais recentes primeiro
  query = query.order('created_at', { ascending: false });

  // Paginacao
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;
  query = query.range(from, to);

  const { data: approvals, error: listError, count } = await query;

  if (listError) {
    console.error('[payment-approvals/list] erro ao listar aprovacoes:', listError.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao listar aprovacoes', 500, {
      detail: listError.message,
    });
  }

  const total = count ?? 0;
  const totalPages = Math.ceil(total / perPage);

  console.log('[payment-approvals/list] listagem concluida', {
    total,
    page,
    perPage,
    returned: (approvals ?? []).length,
  });

  return paginated(approvals ?? [], { total, page, per_page: perPage, total_pages: totalPages }, req);
}
