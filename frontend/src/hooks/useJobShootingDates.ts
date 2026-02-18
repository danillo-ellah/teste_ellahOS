import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiMutate } from '@/lib/api'
import { jobKeys } from '@/lib/query-keys'
import type { JobShootingDate } from '@/types/jobs'

// --- List ---

export function useJobShootingDates(jobId: string) {
  const query = useQuery({
    queryKey: jobKeys.shootingDates(jobId),
    queryFn: () => apiGet<JobShootingDate[]>('jobs-shooting-dates', {}, jobId),
    staleTime: 60_000,
    enabled: !!jobId,
  })

  return {
    data: query.data?.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  }
}

// --- Add ---

interface AddShootingDateParams {
  jobId: string
  shooting_date: string
  description?: string | null
  location?: string | null
  start_time?: string | null
  end_time?: string | null
}

export function useAddShootingDate() {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: ({ jobId, ...payload }: AddShootingDateParams) =>
      apiMutate<JobShootingDate>('jobs-shooting-dates', 'POST', payload as unknown as Record<string, unknown>, jobId),
    onSuccess: (_data, { jobId }) => {
      queryClient.invalidateQueries({ queryKey: jobKeys.shootingDates(jobId) })
      queryClient.invalidateQueries({ queryKey: jobKeys.detail(jobId) })
    },
  })

  return {
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
  }
}

// --- Update ---

interface UpdateShootingDateParams {
  jobId: string
  dateId: string
  shooting_date?: string
  description?: string | null
  location?: string | null
  start_time?: string | null
  end_time?: string | null
}

export function useUpdateShootingDate() {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: ({ jobId, dateId, ...payload }: UpdateShootingDateParams) =>
      apiMutate<JobShootingDate>('jobs-shooting-dates', 'PATCH', payload as unknown as Record<string, unknown>, `${jobId}/${dateId}`),
    onSuccess: (_data, { jobId }) => {
      queryClient.invalidateQueries({ queryKey: jobKeys.shootingDates(jobId) })
      queryClient.invalidateQueries({ queryKey: jobKeys.detail(jobId) })
    },
  })

  return {
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
  }
}

// --- Remove ---

interface RemoveShootingDateParams {
  jobId: string
  dateId: string
}

export function useRemoveShootingDate() {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: ({ jobId, dateId }: RemoveShootingDateParams) =>
      apiMutate<{ id: string; deleted: boolean }>('jobs-shooting-dates', 'DELETE', undefined, `${jobId}/${dateId}`),
    onSuccess: (_data, { jobId }) => {
      queryClient.invalidateQueries({ queryKey: jobKeys.shootingDates(jobId) })
      queryClient.invalidateQueries({ queryKey: jobKeys.detail(jobId) })
    },
  })

  return {
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
  }
}
