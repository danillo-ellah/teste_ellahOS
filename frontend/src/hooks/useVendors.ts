import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiMutate } from '@/lib/api'
import { vendorKeys, costItemKeys } from '@/lib/query-keys'
import type {
  Vendor,
  VendorSuggestion,
  BrazilianBank,
  VendorFilters,
  CreateVendorPayload,
  UpdateVendorPayload,
  MergeVendorsResult,
} from '@/types/cost-management'

function filtersToParams(filters: VendorFilters): Record<string, string> {
  const params: Record<string, string> = {}
  if (filters.search?.trim()) params.search = filters.search.trim()
  if (filters.entity_type) params.entity_type = filters.entity_type
  if (filters.is_active !== undefined) params.is_active = String(filters.is_active)
  if (filters.page !== undefined) params.page = String(filters.page)
  if (filters.per_page !== undefined) params.per_page = String(filters.per_page)
  if (filters.sort_by) params.sort_by = filters.sort_by
  if (filters.sort_order) params.sort_order = filters.sort_order
  return params
}

export function useVendors(filters: VendorFilters = {}) {
  const params = filtersToParams(filters)
  const query = useQuery({
    queryKey: vendorKeys.list(params),
    queryFn: () => apiGet<Vendor[]>('vendors', params),
    staleTime: 30_000,
  })

  return {
    data: query.data?.data,
    meta: query.data?.meta,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  }
}

export function useVendor(id: string) {
  return useQuery({
    queryKey: vendorKeys.detail(id),
    queryFn: () => apiGet<Vendor>('vendors', undefined, id),
    enabled: !!id,
    staleTime: 30_000,
  })
}

export function useVendorSuggest(q: string, enabled = true) {
  return useQuery({
    queryKey: vendorKeys.suggest(q),
    queryFn: () => apiGet<VendorSuggestion[]>('vendors', { q }, 'suggest'),
    enabled,
    staleTime: 10_000,
  })
}

export function useBrazilianBanks() {
  return useQuery({
    queryKey: vendorKeys.banks(),
    queryFn: () => apiGet<BrazilianBank[]>('vendors', undefined, 'banks'),
    staleTime: Infinity, // Dados estaticos
  })
}

export function useCreateVendor() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateVendorPayload) =>
      apiMutate<Vendor>('vendors', 'POST', payload as unknown as Record<string, unknown>),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vendorKeys.lists() })
    },
  })
}

export function useUpdateVendor() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...payload }: UpdateVendorPayload & { id: string }) =>
      apiMutate<Vendor>('vendors', 'PATCH', payload as Record<string, unknown>, id),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: vendorKeys.lists() })
      queryClient.invalidateQueries({ queryKey: vendorKeys.detail(variables.id) })
    },
  })
}

export function useDeleteVendor() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiMutate<{ deleted: boolean }>('vendors', 'DELETE', undefined, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vendorKeys.lists() })
    },
  })
}

export function useMergeVendors() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ sourceId, targetId }: { sourceId: string; targetId: string }) =>
      apiMutate<MergeVendorsResult>('vendors', 'POST', { target_vendor_id: targetId }, `${sourceId}/merge`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vendorKeys.lists() })
      queryClient.invalidateQueries({ queryKey: costItemKeys.lists() })
    },
  })
}

export function useCreateBankAccount() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ vendorId, ...payload }: Record<string, unknown> & { vendorId: string }) =>
      apiMutate('vendors', 'POST', payload, `${vendorId}/bank-accounts`),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: vendorKeys.detail(variables.vendorId) })
    },
  })
}

export function useUpdateBankAccount() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      vendorId,
      bankAccountId,
      ...payload
    }: Record<string, unknown> & { vendorId: string; bankAccountId: string }) =>
      apiMutate('vendors', 'PATCH', payload, `${vendorId}/bank-accounts/${bankAccountId}`),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: vendorKeys.detail(variables.vendorId) })
    },
  })
}

export function useDeleteBankAccount() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ vendorId, bankAccountId }: { vendorId: string; bankAccountId: string }) =>
      apiMutate('vendors', 'DELETE', undefined, `${vendorId}/bank-accounts/${bankAccountId}`),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: vendorKeys.detail(variables.vendorId) })
    },
  })
}
