import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/lib/api'
import { costItemKeys } from '@/lib/query-keys'
import type { CostItemHistoryEntry, CostItemHistoryAction } from '@/types/cost-item-history'
import type { PaginationMeta } from '@/types/jobs'

interface UseCostItemHistoryOptions {
  page?: number
  perPage?: number
  action?: CostItemHistoryAction
}

export function useCostItemHistory(jobId: string, options: UseCostItemHistoryOptions = {}) {
  const { page = 1, perPage = 20, action } = options

  const params: Record<string, string> = {
    page: String(page),
    per_page: String(perPage),
  }
  if (action) {
    params.action = action
  }

  const filterKey = { page, perPage, action }

  const query = useQuery({
    queryKey: costItemKeys.history(jobId, filterKey as unknown as Record<string, string>),
    queryFn: () =>
      apiGet<CostItemHistoryEntry[]>('cost-items', params, `history/${jobId}`),
    staleTime: 30_000,
    enabled: !!jobId,
  })

  return {
    data: query.data?.data,
    meta: query.data?.meta as PaginationMeta | undefined,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  }
}
