'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiMutate } from '@/lib/api'
import { jobKeys } from '@/lib/query-keys'
import type { Job } from '@/types/jobs'

export function useCloneJob() {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: ({ jobId }: { jobId: string }) =>
      apiMutate<Job>(
        'jobs',
        'POST',
        {},
        `${jobId}/clone`,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: jobKeys.lists() })
    },
  })

  return {
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
  }
}
