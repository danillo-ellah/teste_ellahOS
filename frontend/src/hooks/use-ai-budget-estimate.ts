'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiMutate } from '@/lib/api'
import { aiBudgetKeys } from '@/lib/query-keys'
import type {
  BudgetEstimateResult,
  BudgetEstimateHistoryItem,
  BudgetEstimateOverrideContext,
} from '@/types/ai'

// --- Hooks ---

/**
 * Busca historico de estimativas de orcamento geradas por IA para um job.
 */
export function useAiBudgetEstimateHistory(jobId: string) {
  return useQuery({
    queryKey: aiBudgetKeys.history(jobId),
    queryFn: async () => {
      const res = await apiGet<BudgetEstimateHistoryItem[]>(
        'ai-budget-estimate',
        { job_id: jobId },
        'history',
      )
      return res.data ?? []
    },
    enabled: !!jobId,
    staleTime: 60_000,
  })
}

/**
 * Mutation para gerar uma nova estimativa de orcamento com IA.
 * Invalida automaticamente o historico apos sucesso.
 */
export function useGenerateAiBudgetEstimate(jobId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (overrideContext?: BudgetEstimateOverrideContext) => {
      const body: Record<string, unknown> = { job_id: jobId }
      if (overrideContext) {
        body.override_context = overrideContext
      }
      const res = await apiMutate<BudgetEstimateResult>(
        'ai-budget-estimate',
        'POST',
        body,
        'generate',
      )
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: aiBudgetKeys.history(jobId),
      })
    },
  })
}

/**
 * Hook combinado: expoe historico + mutation para gerar estimativa.
 * Uso principal: componente AiBudgetEstimateButton.
 */
export function useAiBudgetEstimate(jobId: string) {
  const history = useAiBudgetEstimateHistory(jobId)
  const generate = useGenerateAiBudgetEstimate(jobId)

  return { history, generate }
}
