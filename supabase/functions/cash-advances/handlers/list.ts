import type { AuthContext } from '../../_shared/auth.ts';
import { AppError } from '../../_shared/errors.ts';
import { paginated } from '../../_shared/response.ts';
import { getSupabaseClient } from '../../_shared/supabase-client.ts';
import { parsePagination, getOffset, buildMeta } from '../../_shared/pagination.ts';

// Colunas permitidas para ordenacao
const ALLOWED_SORT_COLS = ['created_at', 'updated_at', 'amount_authorized', 'status', 'recipient_name'];

export async function handleList(req: Request, auth: AuthContext): Promise<Response> {
  console.log('[cash-advances/list] iniciando listagem de adiantamentos', {
    userId: auth.userId,
    tenantId: auth.tenantId,
  });

  const url = new URL(req.url);

  // job_id e obrigatorio para listagem
  const jobId = url.searchParams.get('job_id');
  if (!jobId) {
    throw new AppError('VALIDATION_ERROR', 'Parametro job_id e obrigatorio', 400);
  }

  // Validar formato UUID do job_id
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(jobId)) {
    throw new AppError('VALIDATION_ERROR', 'job_id invalido', 400);
  }

  const statusFilter = url.searchParams.get('status');

  const pagination = parsePagination(url, ALLOWED_SORT_COLS);
  const offset = getOffset(pagination);

  const client = getSupabaseClient(auth.token);

  // Montar query base
  let query = client
    .from('cash_advances')
    .select(
      `*, expense_receipts(id, amount, status, receipt_type, expense_date)`,
      { count: 'exact' },
    )
    .eq('job_id', jobId)
    .eq('tenant_id', auth.tenantId)
    .is('deleted_at', null)
    .order(pagination.sortBy, { ascending: pagination.sortOrder === 'asc' })
    .range(offset, offset + pagination.perPage - 1);

  // Filtro opcional por status
  if (statusFilter) {
    query = query.eq('status', statusFilter);
  }

  const { data, error: fetchError, count } = await query;

  if (fetchError) {
    console.error('[cash-advances/list] erro ao buscar:', fetchError.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao listar adiantamentos', 500);
  }

  const meta = buildMeta(count ?? 0, pagination);

  console.log('[cash-advances/list] listagem concluida', {
    jobId,
    total: count,
    page: pagination.page,
  });

  return paginated(data ?? [], meta);
}
