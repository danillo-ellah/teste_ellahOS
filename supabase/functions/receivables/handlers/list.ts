import type { AuthContext } from '../../_shared/auth.ts';
import { AppError } from '../../_shared/errors.ts';
import { getSupabaseClient } from '../../_shared/supabase-client.ts';
import { parsePagination, getOffset, buildMeta } from '../../_shared/pagination.ts';
import { getCorsHeaders } from '../../_shared/cors.ts';
import { canViewFinancials } from '../../_shared/financial-mask.ts';

// Colunas permitidas para ordenacao
const ALLOWED_SORT_COLS = [
  'installment_number',
  'due_date',
  'received_date',
  'amount',
  'created_at',
  'status',
];

export async function handleList(req: Request, auth: AuthContext): Promise<Response> {
  console.log('[receivables/list] listando recebimentos', {
    userId: auth.userId,
    tenantId: auth.tenantId,
    role: auth.role,
  });

  // Guard: apenas roles com acesso financeiro podem listar recebimentos
  if (!canViewFinancials(auth.role)) {
    throw new AppError('FORBIDDEN', 'Permissao insuficiente para acessar recebimentos', 403);
  }

  const url = new URL(req.url);
  const client = getSupabaseClient(auth.token);

  // Parametros de paginacao e ordenacao
  const pagination = parsePagination(url, ALLOWED_SORT_COLS);

  // Filtros da query
  const jobId = url.searchParams.get('job_id');
  const status = url.searchParams.get('status');
  const search = url.searchParams.get('search');
  const dueDateFrom = url.searchParams.get('due_date_from');
  const dueDateTo = url.searchParams.get('due_date_to');

  // job_id eh obrigatorio para listagem
  if (!jobId) {
    throw new AppError('VALIDATION_ERROR', 'Parametro job_id e obrigatorio', 400);
  }

  // Construir query principal
  let query = client
    .from('job_receivables')
    .select('*', { count: 'exact' })
    .eq('tenant_id', auth.tenantId)
    .eq('job_id', jobId)
    .is('deleted_at', null);

  // Filtros adicionais
  if (status) query = query.eq('status', status);
  if (search) query = query.ilike('description', `%${search}%`);
  if (dueDateFrom) query = query.gte('due_date', dueDateFrom);
  if (dueDateTo) query = query.lte('due_date', dueDateTo);

  // Ordenacao: installment_number ASC por padrao
  const isDefault = pagination.sortBy === 'created_at' && !url.searchParams.has('sort_by');
  const sortBy = isDefault ? 'installment_number' : pagination.sortBy;
  const ascending = isDefault ? true : pagination.sortOrder === 'asc';

  query = query.order(sortBy, { ascending });

  // Paginacao
  const offset = getOffset(pagination);
  query = query.range(offset, offset + pagination.perPage - 1);

  const { data: items, error: listError, count } = await query;

  if (listError) {
    console.error('[receivables/list] erro na query:', listError.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao listar recebimentos', 500, {
      detail: listError.message,
    });
  }

  const total = count ?? 0;
  const meta = buildMeta(total, pagination);

  return new Response(
    JSON.stringify({ data: items, meta }),
    {
      status: 200,
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
    },
  );
}
