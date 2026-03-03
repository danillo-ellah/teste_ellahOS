import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiMutate } from '@/lib/api'
import { costItemKeys, paymentProofKeys } from '@/lib/query-keys'

// ============ Types ============

export interface PaymentProofLinkedItem {
  cost_item_id: string
  allocated_amount: number | null
  cost_item_name?: string
}

export interface PaymentProof {
  id: string
  tenant_id: string
  job_id: string | null
  file_url: string
  file_name: string | null
  payment_date: string
  bank_reference: string | null
  amount: number | null
  payer_name: string | null
  notes: string | null
  uploaded_by: string | null
  created_at: string
  updated_at: string
  linked_items?: PaymentProofLinkedItem[]
}

export interface UploadPaymentProofPayload {
  job_id: string
  file_url: string
  file_name?: string
  payment_date: string
  bank_reference?: string
  amount?: number
  payer_name?: string
  notes?: string
  // Vinculos com cost items (enviados junto ao upload para atomicidade)
  link_items?: { cost_item_id: string; allocated_amount?: number }[]
}

export interface LinkProofToItemsPayload {
  items: { cost_item_id: string; allocated_amount?: number }[]
}

// ============ Hooks ============

/**
 * Lista comprovantes de pagamento de um job.
 * Chama GET payment-manager/proofs?job_id=...
 */
export function usePaymentProofs(jobId?: string) {
  const params: Record<string, string> = {}
  if (jobId) params.job_id = jobId

  return useQuery({
    queryKey: paymentProofKeys.list({ job_id: jobId }),
    queryFn: () => apiGet<PaymentProof[]>('payment-manager', params, 'proofs'),
    enabled: !!jobId,
    staleTime: 30_000,
  })
}

/**
 * Lista comprovantes vinculados a um cost item especifico.
 * Chama GET payment-manager/proofs?cost_item_id=...
 */
export function usePaymentProofsByCostItem(costItemId?: string) {
  const params: Record<string, string> = {}
  if (costItemId) params.cost_item_id = costItemId

  return useQuery({
    queryKey: paymentProofKeys.list({ cost_item_id: costItemId }),
    queryFn: () => apiGet<PaymentProof[]>('payment-manager', params, 'proofs'),
    enabled: !!costItemId,
    staleTime: 30_000,
  })
}

/**
 * Cria um novo comprovante e opcionalmente vincula a cost items.
 * Chama POST payment-manager/proofs
 */
export function useUploadPaymentProof() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: UploadPaymentProofPayload) =>
      apiMutate<PaymentProof>(
        'payment-manager',
        'POST',
        payload as unknown as Record<string, unknown>,
        'proofs',
      ),
    onSuccess: (_data, variables) => {
      // Invalida lista de comprovantes do job
      queryClient.invalidateQueries({
        queryKey: paymentProofKeys.list({ job_id: variables.job_id }),
      })
      // Invalida cost items para refletir payment_proof_url atualizado
      queryClient.invalidateQueries({ queryKey: costItemKeys.lists() })
    },
  })
}

/**
 * Vincula um comprovante existente a um ou mais cost items.
 * Chama POST payment-manager/proofs/:id/link
 */
export function useLinkProofToItems() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      proofId,
      payload,
    }: {
      proofId: string
      payload: LinkProofToItemsPayload
    }) =>
      apiMutate<PaymentProof>(
        'payment-manager',
        'POST',
        payload as unknown as Record<string, unknown>,
        `proofs/${proofId}/link`,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: paymentProofKeys.lists() })
      queryClient.invalidateQueries({ queryKey: costItemKeys.lists() })
    },
  })
}

/**
 * Remove vinculo entre comprovante e um cost item especifico.
 * Chama DELETE payment-manager/proofs/:proofId/link/:costItemId
 */
export function useUnlinkProofFromItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      proofId,
      costItemId,
    }: {
      proofId: string
      costItemId: string
    }) =>
      apiMutate<{ unlinked: boolean }>(
        'payment-manager',
        'DELETE',
        undefined,
        `proofs/${proofId}/link/${costItemId}`,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: paymentProofKeys.lists() })
      queryClient.invalidateQueries({ queryKey: costItemKeys.lists() })
    },
  })
}
