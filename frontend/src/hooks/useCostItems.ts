import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiMutate } from '@/lib/api'
import { costItemKeys, finDashboardKeys, nfKeys } from '@/lib/query-keys'
import type {
  CostItem,
  CostItemFilters,
  CostItemListMeta,
  CreateCostItemPayload,
  BudgetSummary,
  PayPayload,
  PayResult,
  BatchPreviewResult,
} from '@/types/cost-management'

function filtersToParams(filters: CostItemFilters): Record<string, string> {
  const params: Record<string, string> = {}
  if (filters.job_id) params.job_id = filters.job_id
  if (filters.item_status) params.item_status = filters.item_status
  if (filters.payment_status) params.payment_status = filters.payment_status
  if (filters.nf_request_status) params.nf_request_status = filters.nf_request_status
  if (filters.vendor_id) params.vendor_id = filters.vendor_id
  if (filters.search?.trim()) params.search = filters.search.trim()
  if (filters.payment_due_date_gte) params.payment_due_date_gte = filters.payment_due_date_gte
  if (filters.payment_due_date_lte) params.payment_due_date_lte = filters.payment_due_date_lte
  if (filters.page !== undefined) params.page = String(filters.page)
  if (filters.per_page !== undefined) params.per_page = String(filters.per_page)
  if (filters.sort_by) params.sort_by = filters.sort_by
  if (filters.sort_order) params.sort_order = filters.sort_order
  return params
}

export function useCostItems(filters: CostItemFilters = {}) {
  const params = filtersToParams(filters)
  const query = useQuery({
    queryKey: costItemKeys.list(params),
    queryFn: () => apiGet<CostItem[]>('cost-items', params),
    staleTime: 30_000,
    enabled: !!filters.job_id || !!filters.payment_due_date_gte,
  })

  return {
    data: query.data?.data,
    meta: query.data?.meta as CostItemListMeta | undefined,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  }
}

export function useCostItem(id: string) {
  return useQuery({
    queryKey: costItemKeys.detail(id),
    queryFn: () => apiGet<CostItem>('cost-items', undefined, id),
    enabled: !!id,
  })
}

export function useBudgetSummary(jobId: string) {
  return useQuery({
    queryKey: costItemKeys.budgetSummary(jobId),
    queryFn: () => apiGet<BudgetSummary>('cost-items', undefined, `budget-summary/${jobId}`),
    enabled: !!jobId,
    staleTime: 60_000,
  })
}

export function useReferenceJobs(jobId: string) {
  return useQuery({
    queryKey: costItemKeys.referenceJobs(jobId),
    queryFn: () => apiGet('cost-items', undefined, `reference-jobs/${jobId}`),
    enabled: !!jobId,
    staleTime: 120_000,
  })
}

export function useCreateCostItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateCostItemPayload) =>
      apiMutate<CostItem>('cost-items', 'POST', payload as unknown as Record<string, unknown>),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: costItemKeys.lists() })
      queryClient.invalidateQueries({ queryKey: finDashboardKeys.all })
    },
  })
}

export function useUpdateCostItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...payload }: Record<string, unknown> & { id: string }) =>
      apiMutate<CostItem>('cost-items', 'PATCH', payload, id),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: costItemKeys.lists() })
      queryClient.invalidateQueries({ queryKey: costItemKeys.detail(variables.id) })
      queryClient.invalidateQueries({ queryKey: finDashboardKeys.all })
    },
  })
}

export function useDeleteCostItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiMutate<{ deleted: boolean }>('cost-items', 'DELETE', undefined, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: costItemKeys.lists() })
      queryClient.invalidateQueries({ queryKey: finDashboardKeys.all })
    },
  })
}

export function useBatchCreateCostItems() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: { items: CreateCostItemPayload[] }) =>
      apiMutate<CostItem[]>('cost-items', 'POST', payload as Record<string, unknown>, 'batch'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: costItemKeys.lists() })
      queryClient.invalidateQueries({ queryKey: finDashboardKeys.all })
    },
  })
}

export function useCopyCostItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, target_job_id }: { id: string; target_job_id: string }) =>
      apiMutate<CostItem>('cost-items', 'POST', { target_job_id }, `${id}/copy-to-job`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: costItemKeys.lists() })
    },
  })
}

export function useApplyTemplate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (jobId: string) =>
      apiMutate<CostItem[]>('cost-items', 'POST', undefined, `apply-template/${jobId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: costItemKeys.lists() })
    },
  })
}

export function useUpdateBudgetMode() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ jobId, budget_mode }: { jobId: string; budget_mode: string }) =>
      apiMutate('cost-items', 'PATCH', { budget_mode }, `budget-mode/${jobId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: costItemKeys.all })
      queryClient.invalidateQueries({ queryKey: finDashboardKeys.all })
    },
  })
}

// ============ NF Link hooks ============

export function useLinkNfToCostItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: { nf_document_id: string; cost_item_id: string }) =>
      apiMutate<CostItem>('nf-processor', 'POST', payload as unknown as Record<string, unknown>, 'link-cost-item'),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: costItemKeys.lists() })
      queryClient.invalidateQueries({ queryKey: costItemKeys.detail(variables.cost_item_id) })
      queryClient.invalidateQueries({ queryKey: nfKeys.lists() })
      queryClient.invalidateQueries({ queryKey: finDashboardKeys.all })
    },
  })
}

// ============ Payment Manager hooks ============

export function usePayCostItems() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: PayPayload) =>
      apiMutate<PayResult>('payment-manager', 'POST', payload as unknown as Record<string, unknown>, 'pay'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: costItemKeys.lists() })
      queryClient.invalidateQueries({ queryKey: finDashboardKeys.all })
    },
  })
}

export function useUndoPayment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (costItemId: string) =>
      apiMutate('payment-manager', 'POST', undefined, `undo-pay/${costItemId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: costItemKeys.lists() })
      queryClient.invalidateQueries({ queryKey: finDashboardKeys.all })
    },
  })
}

export function useBatchPreview(costItemIds: string[]) {
  return useQuery({
    queryKey: ['payment-manager', 'batch-preview', costItemIds],
    queryFn: () =>
      apiGet<BatchPreviewResult>(
        'payment-manager',
        { cost_item_ids: costItemIds.join(',') },
        'batch-preview',
      ),
    enabled: costItemIds.length > 0,
  })
}
