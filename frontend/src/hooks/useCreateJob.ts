import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiMutate } from '@/lib/api'
import { jobKeys } from '@/lib/query-keys'
import type { Job, CreateJobPayload } from '@/types/jobs'

export function useCreateJob() {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: (payload: CreateJobPayload) =>
      apiMutate<Job>('jobs', 'POST', payload as unknown as Record<string, unknown>),

    // Invalida todas as listas de jobs para forcar recarregamento
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
