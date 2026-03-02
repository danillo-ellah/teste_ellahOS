import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiMutate } from '@/lib/api'
import { cashAdvanceKeys, finDashboardKeys } from '@/lib/query-keys'
import type {
  CashAdvance,
  CashAdvancesSummary,
  CreateCashAdvancePayload,
  DepositCashAdvancePayload,
  CreateReceiptPayload,
  ReviewReceiptPayload,
} from '@/types/cost-management'

export function useCashAdvances(jobId: string) {
  return useQuery({
    queryKey: cashAdvanceKeys.list(jobId),
    queryFn: () => apiGet<CashAdvance[]>('cash-advances', { job_id: jobId }),
    enabled: !!jobId,
    staleTime: 30_000,
  })
}

export function useCashAdvance(id: string) {
  return useQuery({
    queryKey: cashAdvanceKeys.detail(id),
    queryFn: () => apiGet<CashAdvance>('cash-advances', undefined, id),
    enabled: !!id,
  })
}

// Resumo agregado de verbas a vista de um job (totais, saldo, threshold)
export function useCashAdvancesSummary(jobId: string) {
  return useQuery({
    queryKey: [...cashAdvanceKeys.list(jobId), 'summary'],
    queryFn: () => apiGet<CashAdvancesSummary>('cash-advances', { job_id: jobId }, 'summary'),
    enabled: !!jobId,
    staleTime: 30_000,
  })
}

export function useCreateCashAdvance() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateCashAdvancePayload) =>
      apiMutate<CashAdvance>(
        'cash-advances',
        'POST',
        payload as unknown as Record<string, unknown>,
      ),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: cashAdvanceKeys.list(variables.job_id) })
      queryClient.invalidateQueries({ queryKey: cashAdvanceKeys.lists() })
      queryClient.invalidateQueries({ queryKey: finDashboardKeys.all })
    },
  })
}

export function useDepositCashAdvance() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...payload }: DepositCashAdvancePayload & { id: string }) =>
      apiMutate<CashAdvance>(
        'cash-advances',
        'POST',
        payload as unknown as Record<string, unknown>,
        `${id}/deposit`,
      ),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: cashAdvanceKeys.detail(variables.id) })
      queryClient.invalidateQueries({ queryKey: cashAdvanceKeys.lists() })
    },
  })
}

// Aprovacao de adiantamentos acima do threshold (apenas CEO/CFO)
export function useApproveCashAdvance() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiMutate<CashAdvance>('cash-advances', 'POST', undefined, `${id}/approve`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cashAdvanceKeys.lists() })
    },
  })
}

export function useCreateReceipt() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ advanceId, ...payload }: CreateReceiptPayload & { advanceId: string }) =>
      apiMutate(
        'cash-advances',
        'POST',
        payload as Record<string, unknown>,
        `${advanceId}/receipts`,
      ),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: cashAdvanceKeys.detail(variables.advanceId) })
      queryClient.invalidateQueries({ queryKey: cashAdvanceKeys.lists() })
    },
  })
}

export function useReviewReceipt() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      advanceId,
      receiptId,
      ...payload
    }: ReviewReceiptPayload & { advanceId: string; receiptId: string }) =>
      apiMutate(
        'cash-advances',
        'PATCH',
        payload as Record<string, unknown>,
        `${advanceId}/receipts/${receiptId}`,
      ),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: cashAdvanceKeys.detail(variables.advanceId) })
      queryClient.invalidateQueries({ queryKey: cashAdvanceKeys.lists() })
    },
  })
}

export function useCloseCashAdvance() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiMutate('cash-advances', 'POST', undefined, `${id}/close`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cashAdvanceKeys.lists() })
      queryClient.invalidateQueries({ queryKey: finDashboardKeys.all })
    },
  })
}
