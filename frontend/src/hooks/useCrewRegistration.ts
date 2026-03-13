'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiMutate } from '@/lib/api'
import { jobKeys } from '@/lib/query-keys'

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export type CrewRegistrationStatus = 'pendente' | 'aprovado' | 'reprovado'

export interface CrewRegistration {
  id: string
  full_name: string
  email: string
  job_role: string
  num_days: number
  daily_rate: number
  total: number
  is_veteran: boolean
  vendor_id: string | null
  status: CrewRegistrationStatus
  approved_at: string | null
  created_at: string
}

export interface CrewRegistrationListData {
  registrations: CrewRegistration[]
  summary: {
    count: number
    grand_total: number
  }
}

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const crewKeys = {
  registrations: (jobId: string) => [...jobKeys.detail(jobId), 'crew-registrations'] as const,
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export function useCrewRegistrations(jobId: string) {
  return useQuery({
    queryKey: crewKeys.registrations(jobId),
    queryFn: () =>
      apiGet<CrewRegistrationListData>('crew-registration', undefined, `registrations/${jobId}`),
    enabled: !!jobId,
    staleTime: 30_000,
    select: (res) => res.data,
  })
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export function useToggleCrewRegistration() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (payload: { job_id: string; enabled: boolean }) =>
      apiMutate<{ token: string; enabled: boolean }>(
        'crew-registration',
        'POST',
        payload as unknown as Record<string, unknown>,
        'enable',
      ),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: jobKeys.detail(variables.job_id) })
    },
  })
}

export function useApproveCrewRegistration() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (payload: { registration_id: string; action: 'approve' | 'reject'; job_id: string }) =>
      apiMutate<{ status: string }>(
        'crew-registration',
        'POST',
        { registration_id: payload.registration_id, action: payload.action },
        'approve',
      ),
    // Optimistic update — muda status na tela instantaneamente
    onMutate: async (variables) => {
      const key = crewKeys.registrations(variables.job_id)
      await qc.cancelQueries({ queryKey: key })
      const previous = qc.getQueryData(key)

      qc.setQueryData(key, (old: { data: CrewRegistrationListData } | undefined) => {
        if (!old?.data) return old
        const newStatus: CrewRegistrationStatus = variables.action === 'approve' ? 'aprovado' : 'reprovado'
        return {
          ...old,
          data: {
            ...old.data,
            registrations: old.data.registrations.map((r) =>
              r.id === variables.registration_id
                ? { ...r, status: newStatus, approved_at: new Date().toISOString() }
                : r,
            ),
          },
        }
      })

      return { previous }
    },
    onError: (_err, variables, context) => {
      // Rollback em caso de erro
      if (context?.previous) {
        qc.setQueryData(crewKeys.registrations(variables.job_id), context.previous)
      }
    },
    onSettled: (_data, _err, variables) => {
      qc.invalidateQueries({ queryKey: crewKeys.registrations(variables.job_id) })
      qc.invalidateQueries({ queryKey: jobKeys.detail(variables.job_id) })
    },
  })
}
