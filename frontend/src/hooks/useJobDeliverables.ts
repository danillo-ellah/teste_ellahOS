import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiMutate } from '@/lib/api'
import { jobKeys } from '@/lib/query-keys'
import type { JobDeliverable, DeliverableStatus } from '@/types/jobs'

// --- List ---

export function useJobDeliverables(jobId: string) {
  const query = useQuery({
    queryKey: jobKeys.deliverables(jobId),
    queryFn: () => apiGet<JobDeliverable[]>('jobs-deliverables', {}, jobId),
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

interface AddDeliverableParams {
  jobId: string
  description: string
  format?: string | null
  resolution?: string | null
  duration_seconds?: number | null
  status?: DeliverableStatus
  delivery_date?: string | null
  parent_id?: string | null
  link?: string | null
}

export function useAddDeliverable() {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: ({ jobId, ...payload }: AddDeliverableParams) =>
      apiMutate<JobDeliverable>('jobs-deliverables', 'POST', payload as unknown as Record<string, unknown>, jobId),
    onSuccess: (_data, { jobId }) => {
      queryClient.invalidateQueries({ queryKey: jobKeys.deliverables(jobId) })
      queryClient.invalidateQueries({ queryKey: jobKeys.detail(jobId) })
    },
  })

  return {
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
  }
}

// --- Update ---

interface UpdateDeliverableParams {
  jobId: string
  deliverableId: string
  description?: string
  format?: string | null
  resolution?: string | null
  duration_seconds?: number | null
  status?: DeliverableStatus
  delivery_date?: string | null
  parent_id?: string | null
  link?: string | null
}

export function useUpdateDeliverable() {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: ({ jobId, deliverableId, ...payload }: UpdateDeliverableParams) =>
      apiMutate<JobDeliverable>('jobs-deliverables', 'PATCH', payload as unknown as Record<string, unknown>, `${jobId}/${deliverableId}`),
    onSuccess: (_data, { jobId }) => {
      queryClient.invalidateQueries({ queryKey: jobKeys.deliverables(jobId) })
      queryClient.invalidateQueries({ queryKey: jobKeys.detail(jobId) })
    },
  })

  return {
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
  }
}

// --- Remove ---

interface RemoveDeliverableParams {
  jobId: string
  deliverableId: string
}

export function useRemoveDeliverable() {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: ({ jobId, deliverableId }: RemoveDeliverableParams) =>
      apiMutate<{ id: string; deleted: boolean }>('jobs-deliverables', 'DELETE', undefined, `${jobId}/${deliverableId}`),
    onSuccess: (_data, { jobId }) => {
      queryClient.invalidateQueries({ queryKey: jobKeys.deliverables(jobId) })
      queryClient.invalidateQueries({ queryKey: jobKeys.detail(jobId) })
    },
  })

  return {
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
  }
}
