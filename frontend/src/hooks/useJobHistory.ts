import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/lib/api'
import { jobKeys } from '@/lib/query-keys'
import type { JobHistoryEntry, PaginationMeta } from '@/types/jobs'

interface UseJobHistoryOptions {
  page?: number
  perPage?: number
  eventType?: string
}

export function useJobHistory(jobId: string, options: UseJobHistoryOptions = {}) {
  const { page = 1, perPage = 20, eventType } = options

  const params: Record<string, string> = {
    page: String(page),
    per_page: String(perPage),
  }
  if (eventType) {
    params.event_type = eventType
  }

  const filterKey = { page, perPage, eventType }

  const query = useQuery({
    queryKey: jobKeys.history(jobId, filterKey as unknown as Record<string, string>),
    queryFn: () => apiGet<JobHistoryEntry[]>('jobs-history', params, jobId),
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
