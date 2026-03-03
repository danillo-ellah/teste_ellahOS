import type { AuthContext } from '../../_shared/auth.ts';
import { AppError } from '../../_shared/errors.ts';
import { getSupabaseClient } from '../../_shared/supabase-client.ts';
import { parsePagination, getOffset, buildMeta } from '../../_shared/pagination.ts';
import { getCorsHeaders } from '../../_shared/cors.ts';

const ALLOWED_SORT_COLS = ['import_date', 'period_start', 'period_end', 'bank_name', 'created_at'];

export async function handleListStatements(req: Request, auth: AuthContext): Promise<Response> {
  console.log('[bank-reconciliation/list-statements] listando extratos', {
    userId: auth.userId,
    tenantId: auth.tenantId,
  });

  const url = new URL(req.url);
  const client = getSupabaseClient(auth.token);

  const pagination = parsePagination(url, ALLOWED_SORT_COLS);

  // Filtros opcionais
  const bankName = url.searchParams.get('bank_name');
  const periodFrom = url.searchParams.get('period_from');
  const periodTo = url.searchParams.get('period_to');

  let query = client
    .from('bank_statements')
    .select(
      `id, bank_name, account_identifier, import_date, period_start, period_end,
       file_name, total_entries, reconciled_entries, imported_by,
       created_at, updated_at,
       profiles:imported_by(id, full_name)`,
      { count: 'exact' },
    )
    .eq('tenant_id', auth.tenantId)
    .is('deleted_at', null);

  if (bankName) {
    query = query.ilike('bank_name', `%${bankName}%`);
  }
  if (periodFrom) {
    query = query.gte('period_start', periodFrom);
  }
  if (periodTo) {
    query = query.lte('period_end', periodTo);
  }

  const offset = getOffset(pagination);
  query = query
    .order(pagination.sortBy, { ascending: pagination.sortOrder === 'asc' })
    .range(offset, offset + pagination.perPage - 1);

  const { data: statements, error: listError, count } = await query;

  if (listError) {
    console.error('[bank-reconciliation/list-statements] erro na query:', listError.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao listar extratos', 500, {
      detail: listError.message,
    });
  }

  const total = count ?? 0;
  const meta = buildMeta(total, pagination);

  // Calcular percentual de conciliacao para cada extrato
  const enriched = (statements ?? []).map((s) => ({
    ...s,
    reconciliation_pct: s.total_entries > 0
      ? Math.round((s.reconciled_entries / s.total_entries) * 100)
      : 0,
  }));

  return new Response(
    JSON.stringify({ data: enriched, meta }),
    {
      status: 200,
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
    },
  );
}
