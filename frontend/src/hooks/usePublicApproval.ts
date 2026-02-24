'use client'

import { useQuery, useMutation } from '@tanstack/react-query'
import { apiPublicGet, apiPublicMutate } from '@/lib/api'
import { approvalKeys } from '@/lib/query-keys'
import type { PublicApprovalData, RespondPayload } from '@/types/approvals'

// Busca dados publicos de uma aprovacao pelo token (sem auth)
export function usePublicApproval(token: string) {
  return useQuery({
    queryKey: approvalKeys.public(token),
    queryFn: async () => {
      const res = await apiPublicGet<PublicApprovalData>('approvals', `public/${token}`)
      return res.data
    },
    enabled: !!token,
    staleTime: 0,
    retry: 1,
  })
}

// Responder a uma aprovacao (aprovar/rejeitar) - sem auth
export function useRespondApproval(token: string) {
  return useMutation({
    mutationFn: async (payload: RespondPayload) => {
      const res = await apiPublicMutate<{ message: string }>(
        'approvals',
        `public/${token}/respond`,
        payload as unknown as Record<string, unknown>,
      )
      return res
    },
  })
}
