import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiGet, apiMutate } from '@/lib/api'
import { docusealKeys } from '@/lib/query-keys'
import type {
  DocuSealSubmission,
  CreateDocuSealPayload,
  DocuSealTemplatesResponse,
  BatchGeneratePayload,
  BatchGenerateResult,
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
      queryClient.invalidateQueries({
        queryKey: docusealKeys.list(payload.job_id),
      })
      toast.success('Contrato criado com sucesso!')
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Erro ao criar contrato')
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
      queryClient.invalidateQueries({ queryKey: docusealKeys.list(job_id) })
      queryClient.invalidateQueries({ queryKey: docusealKeys.detail(submission_id) })
      toast.success('Email de assinatura reenviado!')
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Erro ao reenviar email')
    },
  })
}

// --- Listar templates DocuSeal classificados por tipo ---

export function useDocuSealTemplates() {
  const query = useQuery({
    queryKey: docusealKeys.templates(),
    queryFn: () =>
      apiGet<DocuSealTemplatesResponse>('docuseal-integration', undefined, 'templates'),
    staleTime: 5 * 60_000, // templates mudam raramente — cache por 5 minutos
  })

  return {
    data: query.data?.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  }
}

// --- Gerar contratos em lote para membros da equipe ---

export function useBatchGenerateContracts() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: BatchGeneratePayload) =>
      apiMutate<BatchGenerateResult>(
        'docuseal-integration',
        'POST',
        payload as unknown as Record<string, unknown>,
        'batch-generate',
      ),
    onSuccess: (response, payload) => {
      // Invalidar lista de submissions do job para refletir novos contratos
      queryClient.invalidateQueries({
        queryKey: docusealKeys.list(payload.job_id),
      })

      const result = response.data
      if (result.generated_count > 0) {
        toast.success(
          `${result.generated_count} contrato(s) gerado(s) com sucesso`,
        )
      }

      // Mostrar aviso se algum membro foi ignorado
      if (result.skipped_count > 0) {
        const skippedNames = result.skipped.map((s) => s.person_name).join(', ')
        toast.warning(
          `${result.skipped_count} membro(s) ignorado(s): ${skippedNames}`,
        )
      }
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Erro ao gerar contratos')
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
