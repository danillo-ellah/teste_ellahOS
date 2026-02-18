import type { PaginationMeta } from './response.ts';

// Parametros de paginacao parseados da URL
export interface PaginationParams {
  page: number;
  perPage: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

const DEFAULT_PAGE = 1;
const DEFAULT_PER_PAGE = 50;
const MAX_PER_PAGE = 200;
const DEFAULT_SORT_BY = 'created_at';
const DEFAULT_SORT_ORDER = 'desc';

// Extrai parametros de paginacao da URL
export function parsePagination(url: URL): PaginationParams {
  const page = Math.max(
    1,
    parseInt(url.searchParams.get('page') ?? String(DEFAULT_PAGE)),
  );
  const perPage = Math.min(
    MAX_PER_PAGE,
    Math.max(
      1,
      parseInt(url.searchParams.get('per_page') ?? String(DEFAULT_PER_PAGE)),
    ),
  );
  const sortBy = url.searchParams.get('sort_by') ?? DEFAULT_SORT_BY;
  const sortOrder =
    url.searchParams.get('sort_order') === 'asc' ? 'asc' : DEFAULT_SORT_ORDER;

  return { page, perPage, sortBy, sortOrder };
}

// Calcula offset para a query
export function getOffset(params: PaginationParams): number {
  return (params.page - 1) * params.perPage;
}

// Monta meta de paginacao para a response
export function buildMeta(
  total: number,
  params: PaginationParams,
): PaginationMeta {
  return {
    total,
    page: params.page,
    per_page: params.perPage,
    total_pages: Math.ceil(total / params.perPage),
  };
}
