'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiGet, apiMutate, safeErrorMessage } from '@/lib/api'
import type {
  JobPhase,
  CreatePhasePayload,
  UpdatePhasePayload,
  ReorderPayload,
  BulkCreatePayload,
} from '@/types/cronograma'

// --- Query key factory ---

export const jobPhasesKeys = {
  all: (jobId: string) => ['job-phases', jobId] as const,
}

// --- Hook ---

export function useJobPhases(jobId: string) {
  const queryClient = useQueryClient()

  // Listar fases
  const query = useQuery({
    queryKey: jobPhasesKeys.all(jobId),
    queryFn: () =>
      apiGet<JobPhase[]>('job-timeline', undefined, `${jobId}/phases`),
    enabled: Boolean(jobId),
  })

  // Criar fase individual
  const createMutation = useMutation({
    mutationFn: (payload: CreatePhasePayload) =>
      apiMutate<JobPhase>('job-timeline', 'POST', payload as unknown as Record<string, unknown>, `${jobId}/phases`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: jobPhasesKeys.all(jobId) })
      toast.success('Fase criada')
    },
    onError: (err) => {
      toast.error(safeErrorMessage(err))
    },
  })

  // Atualizar fase
  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdatePhasePayload }) =>
      apiMutate<JobPhase>(
        'job-timeline',
        'PATCH',
        payload as Record<string, unknown>,
        `${jobId}/phases/${id}`,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: jobPhasesKeys.all(jobId) })
      toast.success('Fase atualizada')
    },
    onError: (err) => {
      toast.error(safeErrorMessage(err))
    },
  })

  // Deletar fase
  const deleteMutation = useMutation({
    mutationFn: (phaseId: string) =>
      apiMutate('job-timeline', 'DELETE', undefined, `${jobId}/phases/${phaseId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: jobPhasesKeys.all(jobId) })
      toast.success('Fase removida')
    },
    onError: (err) => {
      toast.error(safeErrorMessage(err))
    },
  })

  // Reordenar fases
  const reorderMutation = useMutation({
    mutationFn: (payload: ReorderPayload) =>
      apiMutate('job-timeline', 'PUT', payload as unknown as Record<string, unknown>, `${jobId}/phases/reorder`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: jobPhasesKeys.all(jobId) })
    },
    onError: (err) => {
      toast.error(safeErrorMessage(err))
    },
  })

  // Criar fases padrao (bulk-create)
  const bulkCreateMutation = useMutation({
    mutationFn: (payload: BulkCreatePayload) =>
      apiMutate<JobPhase[]>(
        'job-timeline',
        'POST',
        payload as unknown as Record<string, unknown>,
        `${jobId}/phases/bulk`,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: jobPhasesKeys.all(jobId) })
      toast.success('Cronograma criado com 8 fases padrao')
    },
    onError: (err) => {
      toast.error(safeErrorMessage(err))
    },
  })

  return {
    // Query state
    phases: (query.data?.data ?? []) as JobPhase[],
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,

    // Mutations
    createPhase: createMutation.mutate,
    updatePhase: updateMutation.mutate,
    deletePhase: deleteMutation.mutate,
    reorderPhases: reorderMutation.mutate,
    bulkCreate: bulkCreateMutation.mutate,

    // Pending states
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isReordering: reorderMutation.isPending,
    isBulkCreating: bulkCreateMutation.isPending,
  }
}
