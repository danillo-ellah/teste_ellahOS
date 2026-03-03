import { z } from 'https://esm.sh/zod@3.22.4';
import type { AuthContext } from '../../_shared/auth.ts';
import { AppError } from '../../_shared/errors.ts';
import { getSupabaseClient } from '../../_shared/supabase-client.ts';
import { parsePagination, getOffset, buildMeta } from '../../_shared/pagination.ts';
import { getCorsHeaders } from '../../_shared/cors.ts';

const ALLOWED_SORT_COLS = ['transaction_date', 'amount', 'description', 'created_at'];

// Schema de query params
const QuerySchema = z.object({
  statement_id: z.string().uuid('statement_id deve ser UUID valido'),
});

export async function handleListTransactions(req: Request, auth: AuthContext): Promise<Response> {
  const url = new URL(req.url);

  const queryParse = QuerySchema.safeParse({
    statement_id: url.searchParams.get('statement_id'),
  });

  if (!queryParse.success) {
    throw new AppError('VALIDATION_ERROR', 'statement_id obrigatorio e deve ser UUID valido', 400, {
      issues: queryParse.error.issues,
    });
  }

  const { statement_id } = queryParse.data;

  console.log('[bank-reconciliation/list-transactions] listando transacoes', {
    userId: auth.userId,
    tenantId: auth.tenantId,
    statementId: statement_id,
  });

  const client = getSupabaseClient(auth.token);

  // Verificar que o extrato pertence ao tenant
  const { data: statement } = await client
    .from('bank_statements')
    .select('id, bank_name, account_identifier, period_start, period_end, total_entries, reconciled_entries')
    .eq('id', statement_id)
    .eq('tenant_id', auth.tenantId)
    .is('deleted_at', null)
    .maybeSingle();

  if (!statement) {
    throw new AppError('NOT_FOUND', 'Extrato nao encontrado', 404);
  }

  const pagination = parsePagination(url, ALLOWED_SORT_COLS);

  // Filtros opcionais
  const reconciled = url.searchParams.get('reconciled');
  const transactionType = url.searchParams.get('transaction_type');
  const dateFrom = url.searchParams.get('date_from');
  const dateTo = url.searchParams.get('date_to');
  const search = url.searchParams.get('search');

  let query = client
    .from('bank_transactions')
    .select(
      `id, transaction_date, description, amount, balance, reference_id,
       transaction_type, reconciled, reconciled_at,
       cost_item_id, payment_proof_id, match_confidence, match_method, notes,
       cost_items:cost_item_id(id, service_description, unit_value, job_id,
         jobs:job_id(id, title, code, job_aba)),
       payment_proofs:payment_proof_id(id, file_name, amount, payment_date)`,
      { count: 'exact' },
    )
    .eq('statement_id', statement_id)
    .eq('tenant_id', auth.tenantId)
    .is('deleted_at', null);

  if (reconciled !== null) {
    query = query.eq('reconciled', reconciled === 'true');
  }
  if (transactionType) {
    query = query.eq('transaction_type', transactionType);
  }
  if (dateFrom) {
    query = query.gte('transaction_date', dateFrom);
  }
  if (dateTo) {
    query = query.lte('transaction_date', dateTo);
  }
  if (search) {
    query = query.ilike('description', `%${search}%`);
  }

  const offset = getOffset(pagination);
  query = query
    .order(pagination.sortBy, { ascending: pagination.sortOrder === 'asc' })
    .order('id', { ascending: true }) // desempate determinístico
    .range(offset, offset + pagination.perPage - 1);

  const { data: transactions, error: listError, count } = await query;

  if (listError) {
    console.error('[bank-reconciliation/list-transactions] erro na query:', listError.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao listar transacoes', 500, {
      detail: listError.message,
    });
  }

  const total = count ?? 0;
  const meta = buildMeta(total, pagination);

  return new Response(
    JSON.stringify({
      data: transactions,
      meta: {
        ...meta,
        statement,
      },
    }),
    {
      status: 200,
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
    },
  );
}
