import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiMutate } from '@/lib/api'
import { jobKeys } from '@/lib/query-keys'

interface ArchiveJobPayload {
  jobId: string
}

export function useArchiveJob() {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: ({ jobId }: ArchiveJobPayload) =>
      apiMutate('jobs', 'PATCH', { is_archived: true }, jobId),

    // Invalida listas e detalhe para remover o job arquivado da visualizacao
    onSuccess: (_data, { jobId }) => {
      queryClient.invalidateQueries({ queryKey: jobKeys.lists() })
      queryClient.invalidateQueries({ queryKey: jobKeys.detail(jobId) })
    },
  })

  return {
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
  }
}
