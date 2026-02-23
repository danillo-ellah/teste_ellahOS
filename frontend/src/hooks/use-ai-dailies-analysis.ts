'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiMutate } from '@/lib/api'
import { dailiesKeys } from '@/lib/query-keys'
import type {
  DailyEntryInput,
  DailiesAnalysisResult,
  DailiesAnalysisHistoryItem,
} from '@/types/ai'

/**
 * Busca historico de analises de dailies geradas por IA para um job.
 */
export function useAiDailiesHistory(jobId: string) {
  return useQuery({
    queryKey: dailiesKeys.history(jobId),
    queryFn: async () => {
      const res = await apiGet<DailiesAnalysisHistoryItem[]>(
        'ai-dailies-analysis',
        { job_id: jobId },
        'history',
      )
      return res.data ?? []
    },
    enabled: !!jobId,
    staleTime: 60_000,
  })
}

interface AnalyzeDailiesParams {
  dailies_data: DailyEntryInput[]
  deliverables_status?: boolean
}

/**
 * Mutation para enviar dailies e gerar analise com IA.
 * Invalida automaticamente o historico apos sucesso.
 */
export function useAnalyzeDailies(jobId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: AnalyzeDailiesParams) => {
      const res = await apiMutate<DailiesAnalysisResult>(
        'ai-dailies-analysis',
        'POST',
        {
          job_id: jobId,
          dailies_data: params.dailies_data,
          deliverables_status: params.deliverables_status,
        },
        'analyze',
      )
      return res.data!
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dailiesKeys.history(jobId) })
    },
  })
}

/**
 * Hook combinado: expoe historico + mutation para analisar dailies.
 * Uso principal: componente DailiesAnalysisPanel.
 */
export function useAiDailiesAnalysis(jobId: string) {
  const history = useAiDailiesHistory(jobId)
  const analyze = useAnalyzeDailies(jobId)
  return { history, analyze }
}
