'use client'

import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/lib/api'
import { peopleKeys, allocationKeys } from '@/lib/query-keys'
import type { Allocation } from '@/types/allocations'

interface PersonJobHistoryItem {
  job_id: string
  job_code: string
  job_title: string
  job_status: string
  role: string
  allocation_start: string | null
  allocation_end: string | null
}

// Historico de jobs de uma pessoa (via job_team)
export function usePersonJobHistory(personId: string) {
  return useQuery({
    queryKey: peopleKeys.jobHistory(personId),
    queryFn: async () => {
      const res = await apiGet<PersonJobHistoryItem[]>(
        'jobs-team',
        { person_id: personId },
      )
      return res.data
    },
    enabled: !!personId,
    staleTime: 60_000,
  })
}

// Alocacoes proximos 30 dias de uma pessoa
export function usePersonAvailability(personId: string) {
  const today = new Date()
  const from = today.toISOString().split('T')[0]
  const future = new Date(today)
  future.setDate(future.getDate() + 30)
  const to = future.toISOString().split('T')[0]

  return useQuery({
    queryKey: allocationKeys.listByPerson(personId, from, to),
    queryFn: async () => {
      const res = await apiGet<Allocation[]>('allocations', {
        people_id: personId,
        from,
        to,
      })
      return res.data
    },
    enabled: !!personId,
    staleTime: 30_000,
  })
}
