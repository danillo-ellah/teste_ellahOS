'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiMutate, apiGet, safeErrorMessage } from '@/lib/api'
import { toast } from 'sonner'
import { jobKeys, approvalPdfKeys } from '@/lib/query-keys'

// --- Tipos de retorno ---

export interface GenerateApprovalResult {
  job_id: string
  html_length: number
  drive_file_id: string | null
  drive_url: string | null
  job_file_id: string | null
  version: number
  previous_file_id: string | null
  generated_at: string
}

// Status de aprovacao de uma versao do documento
export type ApprovalDocStatus = 'pendente' | 'aprovado' | 'rejeitado'

export interface ApprovalDocVersion {
  id: string
  file_name: string
  file_url: string | null
  file_type: string | null
  category: string
  version: number
  external_id: string | null
  external_source: string | null
  superseded_by: string | null
  is_active: boolean
  uploaded_by: string | null
  created_at: string
  // Status de aprovacao extraido do campo metadata
  approval_status: string | null
  approval_action: 'approve' | 'reject' | null
  approved_at: string | null
  approved_by: string | null
  approval_comment: string | null
}

export interface ApprovalFilesResult {
  job_id: string
  category: string
  total: number
  files: ApprovalDocVersion[]
}

export interface ApproveDocResult {
  job_id: string
  job_file_id: string
  action: 'approve' | 'reject'
  status: string
  version: number
  file_url: string | null
  approved_by: string
  approved_at: string
  comment: string | null
  job_code: string
  job_title: string
}

// Re-exportar para compatibilidade com imports existentes
export { approvalPdfKeys }

// --- Hooks ---

/**
 * Gera o documento de aprovacao interna e salva no Drive.
 * Invalida automaticamente o historico de versoes apos sucesso.
 */
export function useGenerateApprovalPdf() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (jobId: string) => {
      const res = await apiMutate<GenerateApprovalResult>(
        'pdf-generator',
        'POST',
        { job_id: jobId },
        'aprovacao-interna',
      )
      return res.data
    },
    onSuccess: (data, jobId) => {
      // Invalidar cache de versoes para forcar re-fetch
      queryClient.invalidateQueries({ queryKey: approvalPdfKeys.files(jobId) })
      // Invalidar historico do job (registro de geracao aparece no historico)
      queryClient.invalidateQueries({ queryKey: jobKeys.history(jobId) })
    },
    onError: (error) => {
      toast.error(safeErrorMessage(error))
    },
  })
}

/**
 * Busca o historico de versoes do documento de aprovacao interna de um job.
 * Retorna todas as versoes incluindo as superseded (historico completo).
 */
export function useApprovalDocVersions(jobId: string) {
  return useQuery({
    queryKey: approvalPdfKeys.files(jobId),
    queryFn: async () => {
      const res = await apiGet<ApprovalFilesResult>(
        'pdf-generator',
        { category: 'aprovacao_interna' },
        `files/${jobId}`,
      )
      return res.data
    },
    staleTime: 30_000,
    enabled: !!jobId,
  })
}

/**
 * Registra uma decisao de aprovacao (approve/reject) sobre o documento interno.
 * Invalida o historico de versoes e o historico do job apos sucesso.
 */
export function useApproveInternalDoc() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: {
      jobId: string
      action: 'approve' | 'reject'
      comment?: string
      jobFileId?: string
    }) => {
      const res = await apiMutate<ApproveDocResult>(
        'pdf-generator',
        'POST',
        {
          job_id: params.jobId,
          action: params.action,
          comment: params.comment,
          job_file_id: params.jobFileId,
        },
        'approve',
      )
      return res.data
    },
    onSuccess: (data) => {
      // Invalidar cache de versoes e historico do job
      queryClient.invalidateQueries({ queryKey: approvalPdfKeys.files(data!.job_id) })
      queryClient.invalidateQueries({ queryKey: jobKeys.history(data!.job_id) })
    },
    onError: (error) => {
      toast.error(safeErrorMessage(error))
    },
  })
}
