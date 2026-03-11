import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiMutate } from '@/lib/api'
import { workflowKeys, jobKeys } from '@/lib/query-keys'
import type {
  WorkflowStep,
  WorkflowEvidence,
  UpdateStepPayload,
  AddEvidencePayload,
} from '@/types/workflow'

// ---------------------------------------------------------------------------
// useWorkflowSteps — Lista os 16 passos do workflow de um job
// ---------------------------------------------------------------------------

export function useWorkflowSteps(jobId: string) {
  const query = useQuery({
    queryKey: workflowKeys.steps(jobId),
    queryFn: () => apiGet<WorkflowStep[]>('job-workflow', { job_id: jobId }, 'steps'),
    staleTime: 60_000,
    enabled: !!jobId,
  })

  return {
    data: query.data?.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  }
}

// ---------------------------------------------------------------------------
// useInitializeWorkflow — Cria os 16 passos padrao (idempotente)
// ---------------------------------------------------------------------------

export function useInitializeWorkflow(jobId: string) {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: () =>
      apiMutate<WorkflowStep[]>('job-workflow', 'POST', {}, `initialize?job_id=${jobId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workflowKeys.steps(jobId) })
    },
  })

  return {
    mutate: mutation.mutate,
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
  }
}

// ---------------------------------------------------------------------------
// useUpdateWorkflowStep — Atualizar status, notas, valores de um step
// ---------------------------------------------------------------------------

export function useUpdateWorkflowStep(jobId: string) {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: ({ stepId, ...payload }: { stepId: string } & UpdateStepPayload) =>
      apiMutate<WorkflowStep>('job-workflow', 'PATCH', payload, `steps/${stepId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workflowKeys.steps(jobId) })
      queryClient.invalidateQueries({ queryKey: jobKeys.history(jobId) })
    },
  })

  return {
    mutate: mutation.mutate,
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
  }
}

// ---------------------------------------------------------------------------
// useWorkflowEvidence — Lista evidencias de um step
// ---------------------------------------------------------------------------

export function useWorkflowEvidence(stepId: string) {
  const query = useQuery({
    queryKey: workflowKeys.evidence(stepId),
    queryFn: () => apiGet<WorkflowEvidence[]>('job-workflow', undefined, `steps/${stepId}/evidence`),
    staleTime: 60_000,
    enabled: !!stepId,
  })

  return {
    data: query.data?.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  }
}

// ---------------------------------------------------------------------------
// useAddWorkflowEvidence — Upload de evidencia (foto/NF/recibo)
// ---------------------------------------------------------------------------

export function useAddWorkflowEvidence(jobId: string, stepId: string) {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: (payload: AddEvidencePayload) =>
      apiMutate<WorkflowEvidence>('job-workflow', 'POST', payload as unknown as Record<string, unknown>, `steps/${stepId}/evidence`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workflowKeys.evidence(stepId) })
      queryClient.invalidateQueries({ queryKey: workflowKeys.steps(jobId) })
    },
  })

  return {
    mutate: mutation.mutate,
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
  }
}
