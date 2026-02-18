import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiMutate } from '@/lib/api'
import { jobKeys } from '@/lib/query-keys'
import type { Job, UpdateJobPayload } from '@/types/jobs'

interface UpdateJobParams {
  jobId: string
  payload: UpdateJobPayload
}

export function useUpdateJob() {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: ({ jobId, payload }: UpdateJobParams) =>
      apiMutate<Job>(
        'jobs',
        'PATCH',
        payload as unknown as Record<string, unknown>,
        jobId,
      ),

    onSuccess: (_data, { jobId }) => {
      queryClient.invalidateQueries({ queryKey: jobKeys.detail(jobId) })
      queryClient.invalidateQueries({ queryKey: jobKeys.lists() })
    },
  })

  return {
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
  }
}
