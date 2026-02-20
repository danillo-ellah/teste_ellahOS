'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiMutate } from '@/lib/api'
import { allocationKeys, jobKeys } from '@/lib/query-keys'
import type {
  Allocation,
  AllocationConflict,
  CreateAllocationPayload,
  UpdateAllocationPayload,
} from '@/types/allocations'

// Lista alocacoes de um job
export function useAllocations(jobId: string) {
  return useQuery({
    queryKey: allocationKeys.listByJob(jobId),
    queryFn: async () => {
      const res = await apiGet<Allocation[]>('allocations', { job_id: jobId })
      return res.data
    },
    enabled: !!jobId,
    staleTime: 30_000,
  })
}

// Lista alocacoes de uma pessoa em um periodo
export function usePersonAllocations(personId: string, from: string, to: string) {
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
    enabled: !!personId && !!from && !!to,
    staleTime: 30_000,
  })
}

// Conflitos ativos em um periodo
export function useConflicts(from: string, to: string, enabled = true) {
  return useQuery({
    queryKey: allocationKeys.conflicts(from, to),
    queryFn: async () => {
      const res = await apiGet<AllocationConflict[]>('allocations', { from, to }, 'conflicts')
      return res.data
    },
    enabled: enabled && !!from && !!to,
    staleTime: 60_000,
  })
}

// Criar alocacao
export function useCreateAllocation() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (payload: CreateAllocationPayload) => {
      const res = await apiMutate<Allocation>('allocations', 'POST', payload as unknown as Record<string, unknown>)
      return res
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: allocationKeys.listByJob(variables.job_id) })
      qc.invalidateQueries({ queryKey: allocationKeys.listByPerson(variables.people_id, '', '') })
      qc.invalidateQueries({ queryKey: jobKeys.team(variables.job_id) })
    },
  })
}

// Atualizar alocacao
export function useUpdateAllocation() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, jobId, ...payload }: UpdateAllocationPayload & { id: string; jobId: string }) => {
      const res = await apiMutate<Allocation>('allocations', 'PATCH', payload as unknown as Record<string, unknown>, id)
      return res
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: allocationKeys.all })
    },
  })
}

// Soft delete alocacao
export function useDeleteAllocation() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const res = await apiMutate<void>('allocations', 'DELETE', undefined, id)
      return res
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: allocationKeys.all })
    },
  })
}
