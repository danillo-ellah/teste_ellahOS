import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/lib/api'
import { jobKeys } from '@/lib/query-keys'
import type { JobDetail } from '@/types/jobs'

interface UseJobOptions {
  include?: string[] // ex: ['team', 'deliverables', 'shooting_dates', 'history']
  enabled?: boolean
}

export function useJob(jobId: string, options: UseJobOptions = {}) {
  const { include, enabled = true } = options

  const params: Record<string, string> = {}
  if (include && include.length > 0) {
    params.include = include.join(',')
  }

  const queryKey = include?.length
    ? [...jobKeys.detail(jobId), { include }]
    : jobKeys.detail(jobId)

  const query = useQuery({
    queryKey,
    queryFn: () => apiGet<JobDetail>('jobs', params, jobId),
    staleTime: 60_000,
    enabled: enabled && !!jobId,
  })

  return {
    data: query.data?.data,
    warnings: query.data?.warnings,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  }
}
