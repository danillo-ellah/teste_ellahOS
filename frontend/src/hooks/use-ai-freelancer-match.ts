'use client'

import { useMutation } from '@tanstack/react-query'
import { apiMutate } from '@/lib/api'
import type { FreelancerMatchResult, FreelancerMatchRequest } from '@/types/ai'

/**
 * Mutation para buscar sugestoes de freelancers ranqueados por IA.
 * Envia job_id + role + filtros opcionais e retorna lista ordenada por match_score.
 */
export function useSuggestFreelancers() {
  return useMutation({
    mutationFn: async (params: FreelancerMatchRequest) => {
      const res = await apiMutate<FreelancerMatchResult>(
        'ai-freelancer-match',
        'POST',
        params as unknown as Record<string, unknown>,
        'suggest',
      )
      return res.data!
    },
  })
}
