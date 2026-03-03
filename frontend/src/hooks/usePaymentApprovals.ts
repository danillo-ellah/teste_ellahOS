import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiMutate } from '@/lib/api'
import { paymentApprovalKeys, costItemKeys } from '@/lib/query-keys'
import type {
  PaymentApproval,
  PaymentApprovalRule,
  CheckApprovalResult,
  RequestApprovalResult,
  CreateApprovalRulePayload,
  UpdateApprovalRulePayload,
} from '@/types/cost-management'

// ============ Check ============

/**
 * Verifica se um valor requer aprovacao hierarquica.
 * Executa automaticamente quando costItemId e amount sao fornecidos.
 */
export function useCheckApproval(costItemId: string, amount: number) {
  return useQuery({
    queryKey: paymentApprovalKeys.check(costItemId, amount),
    queryFn: () =>
      apiMutate<CheckApprovalResult>(
        'payment-approvals',
        'POST',
        { cost_item_id: costItemId, amount },
        'check',
      ),
    enabled: !!costItemId && amount > 0,
    staleTime: 60_000,
    select: (res) => res.data,
  })
}

// ============ Request ============

/**
 * Solicita aprovacao hierarquica para pagamento de um cost item.
 * Invalida a lista de aprovacoes e o item de custo apos sucesso.
 */
export function useRequestApproval() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (costItemId: string) =>
      apiMutate<RequestApprovalResult>(
        'payment-approvals',
        'POST',
        { cost_item_id: costItemId },
        'request',
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: paymentApprovalKeys.lists() })
      queryClient.invalidateQueries({ queryKey: paymentApprovalKeys.rules() })
      queryClient.invalidateQueries({ queryKey: costItemKeys.lists() })
    },
  })
}

// ============ Decide ============

/**
 * Aprova ou rejeita uma solicitacao de aprovacao.
 * Invalida listas e o custo item associado.
 */
export function useDecideApproval() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      approvalId,
      decision,
      notes,
    }: {
      approvalId: string
      decision: 'approved' | 'rejected'
      notes?: string
    }) =>
      apiMutate<PaymentApproval>(
        'payment-approvals',
        'POST',
        { decision, notes },
        `${approvalId}/decide`,
      ),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: paymentApprovalKeys.lists() })
      queryClient.invalidateQueries({ queryKey: paymentApprovalKeys.detail(variables.approvalId) })
      queryClient.invalidateQueries({ queryKey: costItemKeys.lists() })
    },
  })
}

// ============ List / Pending ============

/**
 * Lista aprovacoes do tenant, filtrando por status e opcionalmente por job.
 */
export function usePendingApprovals(jobId?: string) {
  const params: Record<string, string> = { status: 'pending' }
  if (jobId) params.job_id = jobId

  return useQuery({
    queryKey: paymentApprovalKeys.pending(jobId),
    queryFn: () => apiGet<PaymentApproval[]>('payment-approvals', params),
    staleTime: 30_000,
    select: (res) => res.data,
  })
}

/**
 * Lista aprovacoes com filtros arbitrarios (status, job_id, paginacao).
 */
export function usePaymentApprovals(filters: {
  status?: 'pending' | 'approved' | 'rejected'
  job_id?: string
  page?: number
  per_page?: number
} = {}) {
  const params: Record<string, string> = {}
  if (filters.status) params.status = filters.status
  if (filters.job_id) params.job_id = filters.job_id
  if (filters.page !== undefined) params.page = String(filters.page)
  if (filters.per_page !== undefined) params.per_page = String(filters.per_page)

  return useQuery({
    queryKey: paymentApprovalKeys.list(params),
    queryFn: () => apiGet<PaymentApproval[]>('payment-approvals', params),
    staleTime: 30_000,
  })
}

// ============ Rules ============

/**
 * Lista regras de aprovacao do tenant.
 */
export function useApprovalRules() {
  return useQuery({
    queryKey: paymentApprovalKeys.rules(),
    queryFn: () => apiGet<PaymentApprovalRule[]>('payment-approvals', undefined, 'rules'),
    staleTime: 120_000,
    select: (res) => res.data,
  })
}

/**
 * Cria nova regra de aprovacao. Apenas admin/ceo.
 */
export function useCreateApprovalRule() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateApprovalRulePayload) =>
      apiMutate<PaymentApprovalRule>(
        'payment-approvals',
        'POST',
        payload as unknown as Record<string, unknown>,
        'rules',
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: paymentApprovalKeys.rules() })
    },
  })
}

/**
 * Atualiza regra de aprovacao. Apenas admin/ceo.
 */
export function useUpdateApprovalRule() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...payload }: UpdateApprovalRulePayload & { id: string }) =>
      apiMutate<PaymentApprovalRule>(
        'payment-approvals',
        'PATCH',
        payload as unknown as Record<string, unknown>,
        `rules/${id}`,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: paymentApprovalKeys.rules() })
    },
  })
}
