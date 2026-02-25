import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiMutate } from '@/lib/api'
import { docusealKeys } from '@/lib/query-keys'
import type {
  DocuSealSubmission,
  CreateDocuSealPayload,
} from '@/types/docuseal'

// --- Lista submissions de um job ---

export function useDocuSealSubmissions(jobId: string) {
  const query = useQuery({
    queryKey: docusealKeys.list(jobId),
    queryFn: () =>
      apiGet<DocuSealSubmission[]>('docuseal-integration', { job_id: jobId }, 'list'),
    staleTime: 30_000,
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

// --- Detalhes de uma submission ---

export function useDocuSealSubmission(id: string) {
  const query = useQuery({
    queryKey: docusealKeys.detail(id),
    queryFn: () =>
      apiGet<DocuSealSubmission>('docuseal-integration', undefined, `submissions/${id}`),
    staleTime: 30_000,
    enabled: !!id,
  })

  return {
    data: query.data?.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  }
}

// --- Criar submissions ---

export function useCreateDocuSeal() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: CreateDocuSealPayload) =>
      apiMutate<{ submissions: DocuSealSubmission[] }>(
        'docuseal-integration',
        'POST',
        payload as unknown as Record<string, unknown>,
        'create',
      ),
    onSuccess: (_data, payload) => {
      // Invalidar lista do job especifico
      queryClient.invalidateQueries({
        queryKey: docusealKeys.list(payload.job_id),
      })
    },
  })
}

// --- Reenviar email de assinatura ---

interface ResendDocuSealParams {
  submission_id: string
  job_id: string
}

export function useResendDocuSeal() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ submission_id }: ResendDocuSealParams) =>
      apiMutate<{ sent: boolean }>(
        'docuseal-integration',
        'POST',
        { submission_id },
        'resend',
      ),
    onSuccess: (_data, { job_id, submission_id }) => {
      // Invalidar lista e detalhe da submission
      queryClient.invalidateQueries({ queryKey: docusealKeys.list(job_id) })
      queryClient.invalidateQueries({ queryKey: docusealKeys.detail(submission_id) })
    },
  })
}

// --- Download PDF assinado ---
// Retorna a URL de download para abrir em nova aba

export function useDownloadDocuSeal() {
  return useMutation({
    mutationFn: async (submissionId: string) => {
      const result = await apiGet<{ download_url: string }>(
        'docuseal-integration',
        undefined,
        `download/${submissionId}`,
      )
      return result.data
    },
  })
}
