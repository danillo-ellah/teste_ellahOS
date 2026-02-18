import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/lib/api'
import { jobKeys } from '@/lib/query-keys'
import type { Job, JobFilters, PaginationMeta } from '@/types/jobs'

// Converte JobFilters para Record<string, string> compativel com URLSearchParams
function filtersToParams(filters: JobFilters): Record<string, string> {
  const params: Record<string, string> = {}

  if (filters.search) {
    params.search = filters.search
  }

  // Arrays de status viram lista separada por virgula
  if (filters.status && filters.status.length > 0) {
    params.status = filters.status.join(',')
  }

  if (filters.client_id) {
    params.client_id = filters.client_id
  }

  if (filters.agency_id) {
    params.agency_id = filters.agency_id
  }

  if (filters.job_type) {
    params.job_type = filters.job_type
  }

  if (filters.date_from) {
    params.date_from = filters.date_from
  }

  if (filters.date_to) {
    params.date_to = filters.date_to
  }

  // is_archived: false por padrao (nao exibir arquivados na listagem principal)
  params.is_archived = String(filters.is_archived ?? false)

  if (filters.sort_by) {
    params.sort_by = filters.sort_by
  }

  if (filters.sort_order) {
    params.sort_order = filters.sort_order
  }

  if (filters.page !== undefined) {
    params.page = String(filters.page)
  }

  if (filters.per_page !== undefined) {
    params.per_page = String(filters.per_page)
  }

  return params
}

export interface UseJobsResult {
  data: Job[] | undefined
  meta: PaginationMeta | undefined
  isLoading: boolean
  isError: boolean
  error: Error | null
  refetch: () => void
}

export function useJobs(filters: JobFilters = {}): UseJobsResult {
  const params = filtersToParams(filters)

  const query = useQuery({
    queryKey: jobKeys.list(filters),
    queryFn: () => apiGet<Job[]>('jobs', params),
    staleTime: 30_000,
  })

  return {
    data: query.data?.data,
    meta: query.data?.meta,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  }
}
