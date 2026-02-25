import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiMutate } from '@/lib/api'
import { nfKeys } from '@/lib/query-keys'
import type {
  NfDocument,
  NfFilters,
  NfStats,
  ValidateNfPayload,
  ValidateNfResult,
  RejectNfPayload,
  RejectNfResult,
  ReassignNfPayload,
  ReassignNfResult,
  FinancialRecordMatch,
} from '@/types/nf'
import type { PaginationMeta } from '@/types/jobs'

// Converte NfFilters para Record<string, string>
function filtersToParams(filters: NfFilters): Record<string, string> {
  const params: Record<string, string> = {}

  if (filters.status && filters.status !== 'all') {
    params.status = filters.status
  }
  if (filters.job_id) {
    params.job_id = filters.job_id
  }
  if (filters.search?.trim()) {
    params.search = filters.search.trim()
  }
  if (filters.period) {
    params.period = filters.period
  }
  if (filters.date_from) {
    params.date_from = filters.date_from
  }
  if (filters.date_to) {
    params.date_to = filters.date_to
  }
  if (filters.sort_by) {
    params.sort_by = filters.sort_by
  }
  if (filters.sort_order) {
    params.sort_order = filters.sort_order
  }
  if (filters.page !== undefined) {
    params.page = String(filters.page)
  }
  if (filters.per_page !== undefined) {
    params.per_page = String(filters.per_page)
  }

  return params
}

// --- Lista de NFs ---

export function useNfList(filters: NfFilters = {}) {
  const params = filtersToParams(filters)

  const query = useQuery({
    queryKey: nfKeys.list(params),
    queryFn: () => apiGet<NfDocument[]>('nf-processor', params, 'list'),
    staleTime: 30_000,
  })

  return {
    data: query.data?.data,
    meta: query.data?.meta as PaginationMeta | undefined,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  }
}

// --- Estatisticas ---

export function useNfStats() {
  const query = useQuery({
    queryKey: nfKeys.stats(),
    queryFn: () => apiGet<NfStats>('nf-processor', undefined, 'stats'),
    staleTime: 30_000,
  })

  return {
    data: query.data?.data,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  }
}

// --- Busca de financial records para reclassificacao ---

export function useFinancialRecordMatches(search: string, jobId?: string) {
  const params: Record<string, string> = {}
  if (search.trim()) params.search = search.trim()
  if (jobId) params.job_id = jobId

  const query = useQuery({
    queryKey: ['nf-financial-matches', params],
    queryFn: () => apiGet<FinancialRecordMatch[]>('nf-processor', params, 'financial-records'),
    staleTime: 15_000,
    enabled: search.trim().length >= 2 || !!jobId,
  })

  return {
    data: query.data?.data ?? [],
    isLoading: query.isLoading,
  }
}

// --- Mutations ---

export function useValidateNf() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ nf_document_id, ...rest }: ValidateNfPayload) =>
      apiMutate<ValidateNfResult>('nf-processor', 'POST', { nf_document_id, ...rest }, 'validate'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: nfKeys.lists() })
      queryClient.invalidateQueries({ queryKey: nfKeys.stats() })
    },
  })
}

export function useRejectNf() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ nf_document_id, rejection_reason }: RejectNfPayload) =>
      apiMutate<RejectNfResult>('nf-processor', 'POST', { nf_document_id, rejection_reason }, 'reject'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: nfKeys.lists() })
      queryClient.invalidateQueries({ queryKey: nfKeys.stats() })
    },
  })
}

export function useReassignNf() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ nf_document_id, financial_record_id, job_id }: ReassignNfPayload) =>
      apiMutate<ReassignNfResult>('nf-processor', 'POST', { nf_document_id, financial_record_id, job_id }, 'reassign'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: nfKeys.lists() })
      queryClient.invalidateQueries({ queryKey: nfKeys.stats() })
    },
  })
}
