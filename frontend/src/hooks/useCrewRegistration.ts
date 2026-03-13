'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiMutate } from '@/lib/api'
import { jobKeys } from '@/lib/query-keys'

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

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
