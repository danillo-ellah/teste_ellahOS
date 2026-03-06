import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiMutate } from '@/lib/api'
import { receivableKeys, finDashboardKeys, cashflowKeys } from '@/lib/query-keys'
import type {
  Receivable,
  ReceivableFilters,
  ReceivableListMeta,
  ReceivablesSummary,
  CreateReceivablePayload,
  UpdateReceivablePayload,
} from '@/types/receivables'

function filtersToParams(filters: ReceivableFilters): Record<string, string> {
  const params: Record<string, string> = {}
  if (filters.job_id) params.job_id = filters.job_id
  if (filters.status) params.status = filters.status
  if (filters.search?.trim()) params.search = filters.search.trim()
  if (filters.due_date_from) params.due_date_from = filters.due_date_from
  if (filters.due_date_to) params.due_date_to = filters.due_date_to
  if (filters.page !== undefined) params.page = String(filters.page)
  if (filters.per_page !== undefined) params.per_page = String(filters.per_page)
  if (filters.sort_by) params.sort_by = filters.sort_by
  if (filters.sort_order) params.sort_order = filters.sort_order
  return params
}

export function useReceivables(filters: ReceivableFilters = {}) {
  const params = filtersToParams(filters)
  const query = useQuery({
    queryKey: receivableKeys.list(params),
    queryFn: () => apiGet<Receivable[]>('receivables', params),
    staleTime: 30_000,
    enabled: !!filters.job_id,
  })

  return {
    data: query.data?.data,
    meta: query.data?.meta as ReceivableListMeta | undefined,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  }
}

export function useReceivableSummary(jobId: string) {
  return useQuery({
    queryKey: receivableKeys.summary(jobId),
    queryFn: () => apiGet<ReceivablesSummary>('receivables', undefined, `summary/${jobId}`),
    enabled: !!jobId,
    staleTime: 60_000,
  })
}

export function useCreateReceivable() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateReceivablePayload) =>
      apiMutate<Receivable>('receivables', 'POST', payload as unknown as Record<string, unknown>),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: receivableKeys.all })
      queryClient.invalidateQueries({ queryKey: finDashboardKeys.all })
      queryClient.invalidateQueries({ queryKey: cashflowKeys.all })
    },
  })
}

export function useUpdateReceivable() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...payload }: UpdateReceivablePayload & { id: string }) =>
      apiMutate<Receivable>('receivables', 'PATCH', payload as Record<string, unknown>, id),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: receivableKeys.all })
      queryClient.invalidateQueries({ queryKey: receivableKeys.detail(variables.id) })
      queryClient.invalidateQueries({ queryKey: finDashboardKeys.all })
      queryClient.invalidateQueries({ queryKey: cashflowKeys.all })
    },
  })
}

export function useDeleteReceivable() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiMutate<{ id: string; deleted: boolean }>('receivables', 'DELETE', undefined, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: receivableKeys.all })
      queryClient.invalidateQueries({ queryKey: finDashboardKeys.all })
      queryClient.invalidateQueries({ queryKey: cashflowKeys.all })
    },
  })
}
