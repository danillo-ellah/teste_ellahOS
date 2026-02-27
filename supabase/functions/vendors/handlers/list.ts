import { getSupabaseClient } from '../../_shared/supabase-client.ts';
import { paginated } from '../../_shared/response.ts';
import { AppError } from '../../_shared/errors.ts';
import {
  parsePagination,
  getOffset,
  buildMeta,
} from '../../_shared/pagination.ts';
import type { AuthContext } from '../../_shared/auth.ts';

// Colunas permitidas para ordenacao
const ALLOWED_SORT_COLS = ['created_at', 'full_name', 'email', 'entity_type', 'updated_at'];

export async function listVendors(
  req: Request,
  auth: AuthContext,
): Promise<Response> {
  console.log('[vendors/list] listando vendors', {
    userId: auth.userId,
    tenantId: auth.tenantId,
  });

  const url = new URL(req.url);
  const params = parsePagination(url, ALLOWED_SORT_COLS);
  const supabase = getSupabaseClient(auth.token);

  // Query base com bank_accounts via join
  let query = supabase
    .from('vendors')
    .select(
      'id, full_name, normalized_name, entity_type, cpf, cnpj, razao_social, email, phone, is_active, people_id, created_at, updated_at, bank_accounts(id, bank_name, pix_key, pix_key_type, is_primary)',
      { count: 'exact' },
    )
    .eq('tenant_id', auth.tenantId)
    .is('deleted_at', null);

  // === Filtros ===

  // Busca textual em nome, email, cpf, cnpj
  const search = url.searchParams.get('search');
  if (search) {
    // Sanitizar busca para evitar injecao via ilike
    const safeSearch = search.replace(/[%_]/g, '').slice(0, 200);
    query = query.or(
      `full_name.ilike.%${safeSearch}%,email.ilike.%${safeSearch}%,cpf.eq.${safeSearch},cnpj.eq.${safeSearch}`,
    );
  }

  // Filtro por entity_type
  const entityType = url.searchParams.get('entity_type');
  if (entityType === 'pf' || entityType === 'pj') {
    query = query.eq('entity_type', entityType);
  }

  // Filtro por is_active
  const isActiveParam = url.searchParams.get('is_active');
  if (isActiveParam !== null) {
    query = query.eq('is_active', isActiveParam === 'true');
  }

  // === Ordenacao e paginacao ===
  const ascending = params.sortOrder === 'asc';
  query = query
    .order(params.sortBy, { ascending })
    .range(getOffset(params), getOffset(params) + params.perPage - 1);

  const { data: vendors, count, error: dbError } = await query;

  if (dbError) {
    console.error('[vendors/list] erro na query:', dbError);
    throw new AppError('INTERNAL_ERROR', dbError.message, 500);
  }

  console.log('[vendors/list] retornando', count ?? 0, 'vendors');

  return paginated(vendors ?? [], buildMeta(count ?? 0, params));
}
