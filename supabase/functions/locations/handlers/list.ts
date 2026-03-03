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
const ALLOWED_SORT_COLS = ['created_at', 'updated_at', 'name', 'city', 'state'];

export async function listLocations(
  req: Request,
  auth: AuthContext,
): Promise<Response> {
  console.log('[locations/list] listando locacoes', {
    userId: auth.userId,
    tenantId: auth.tenantId,
  });

  const url = new URL(req.url);
  const params = parsePagination(url, ALLOWED_SORT_COLS);
  const supabase = getSupabaseClient(auth.token);

  let query = supabase
    .from('locations')
    .select(
      'id, name, description, address_street, address_number, address_complement, address_neighborhood, address_city, address_state, address_zip, address_country, contact_name, contact_phone, contact_email, daily_rate, notes, is_active, created_at, updated_at, location_photos(id, url, caption, is_cover)',
      { count: 'exact' },
    )
    .eq('tenant_id', auth.tenantId)
    .is('deleted_at', null);

  // Busca textual em nome e endereco
  const search = url.searchParams.get('search');
  if (search) {
    const safeSearch = search.replace(/[%_]/g, '').slice(0, 200);
    query = query.or(
      `name.ilike.%${safeSearch}%,address_city.ilike.%${safeSearch}%,address_state.ilike.%${safeSearch}%`,
    );
  }

  // Filtro por is_active
  const isActiveParam = url.searchParams.get('is_active');
  if (isActiveParam !== null) {
    query = query.eq('is_active', isActiveParam === 'true');
  }

  // Filtro por cidade
  const city = url.searchParams.get('city');
  if (city) {
    query = query.ilike('address_city', `%${city}%`);
  }

  // Ordenacao e paginacao
  const ascending = params.sortOrder === 'asc';
  query = query
    .order(params.sortBy, { ascending })
    .range(getOffset(params), getOffset(params) + params.perPage - 1);

  const { data: locations, count, error: dbError } = await query;

  if (dbError) {
    console.error('[locations/list] erro na query:', dbError);
    throw new AppError('INTERNAL_ERROR', dbError.message, 500);
  }

  console.log('[locations/list] retornando', count ?? 0, 'locacoes');

  return paginated(locations ?? [], buildMeta(count ?? 0, params));
}
