import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiMutate } from '@/lib/api'
import { jobKeys } from '@/lib/query-keys'
import type { JobStatus, PosSubStatus } from '@/types/jobs'

interface UpdateJobStatusPayload {
  jobId: string
  status: JobStatus
  sub_status?: PosSubStatus | null
  cancellation_reason?: string
}

export function useUpdateJobStatus() {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: ({ jobId, status, sub_status, cancellation_reason }: UpdateJobStatusPayload) => {
      // Monta o body apenas com os campos fornecidos
      const body: Record<string, unknown> = { status }

      if (sub_status !== undefined) {
        body.sub_status = sub_status
      }

      if (cancellation_reason !== undefined) {
        body.cancellation_reason = cancellation_reason
      }

      // A Edge Function jobs-status recebe o jobId como path parameter
      return apiMutate('jobs-status', 'PATCH', body, jobId)
    },

    // Invalida a lista e o detalhe do job especifico
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
