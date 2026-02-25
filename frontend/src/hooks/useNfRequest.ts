import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiGet, apiMutate } from '@/lib/api'
import { nfRequestKeys } from '@/lib/query-keys'
import type {
  NfRequestRecord,
  NfRequestStats,
  NfRequestFilters,
  SendNfRequestPayload,
  SendNfRequestResult,
} from '@/types/nf'

// Converte NfRequestFilters para Record<string, string>
function filtersToParams(filters: NfRequestFilters): Record<string, string> {
  const params: Record<string, string> = {}

  if (filters.status && filters.status !== 'all') {
    params.status = filters.status
  }
  if (filters.job_id) {
    params.job_id = filters.job_id
  }
  if (filters.supplier_name) {
    params.supplier_name = filters.supplier_name
  }
  if (filters.record_type && filters.record_type !== 'all') {
    params.record_type = filters.record_type
  }
  if (filters.search?.trim()) {
    params.search = filters.search.trim()
  }
  if (filters.page !== undefined) {
    params.page = String(filters.page)
  }
  if (filters.per_page !== undefined) {
    params.per_page = String(filters.per_page)
  }

  return params
}

// --- Lista de lancamentos sem NF ---

export function useNfRequestList(filters: NfRequestFilters = {}) {
  const params = filtersToParams(filters)

  const query = useQuery({
    queryKey: nfRequestKeys.list(params),
    queryFn: () =>
      apiGet<NfRequestRecord[]>('nf-processor', params, 'request-list'),
    staleTime: 30_000,
  })

  return {
    data: query.data?.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  }
}

// --- Estatisticas do pedido de NF ---

export function useNfRequestStats() {
  const query = useQuery({
    queryKey: nfRequestKeys.stats(),
    queryFn: () =>
      apiGet<NfRequestStats>('nf-processor', undefined, 'request-stats'),
    staleTime: 30_000,
  })

  return {
    data: query.data?.data,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  }
}

// --- Mutacao: enviar pedido de NF ---

export function useSendNfRequest() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ financial_record_ids, message_template }: SendNfRequestPayload) =>
      apiMutate<SendNfRequestResult>(
        'nf-processor',
        'POST',
        { financial_record_ids, message_template },
        'request-send',
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: nfRequestKeys.lists() })
      queryClient.invalidateQueries({ queryKey: nfRequestKeys.stats() })
      toast.success('Pedido de NF enviado com sucesso!')
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Erro ao enviar pedido de NF')
    },
  })
}
