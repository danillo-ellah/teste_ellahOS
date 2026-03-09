import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiMutate } from '@/lib/api'
import { posProducaoKeys, jobKeys } from '@/lib/query-keys'
import type {
  CutVersion,
  CutVersionFormData,
  ApproveRejectFormData,
  PosDeliverable,
  PosBriefing,
  PosStage,
  PosDashboardFilters,
} from '@/types/pos-producao'

// ---------------------------------------------------------------------------
// usePosDashboard — Lista cross-jobs para pagina /pos-producao
// ---------------------------------------------------------------------------

export function usePosDashboard(filters: PosDashboardFilters) {
  const params: Record<string, string> = {}
  if (filters.stage) params.stage = filters.stage
  if (filters.assignee_id) params.assignee_id = filters.assignee_id
  if (filters.job_id) params.job_id = filters.job_id
  if (filters.deadline) params.deadline = filters.deadline

  const query = useQuery({
    queryKey: posProducaoKeys.dashboard(params),
    queryFn: () => apiGet<PosDeliverable[]>('pos-producao', params, 'dashboard'),
    staleTime: 30_000,
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
// useCutVersions — Lista versoes de corte de um entregavel
// ---------------------------------------------------------------------------

export function useCutVersions(deliverableId: string) {
  const query = useQuery({
    queryKey: posProducaoKeys.cutVersions(deliverableId),
    queryFn: () =>
      apiGet<CutVersion[]>('pos-producao', undefined, `${deliverableId}/cut-versions`),
    staleTime: 60_000,
    enabled: !!deliverableId,
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
// useUpdatePosStage — Atualizar etapa de pos
// ---------------------------------------------------------------------------

export function useUpdatePosStage(jobId: string) {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: ({ deliverableId, posStage }: { deliverableId: string; posStage: PosStage }) =>
      apiMutate('pos-producao', 'PATCH', { pos_stage: posStage }, `${deliverableId}/stage`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: jobKeys.deliverables(jobId) })
      queryClient.invalidateQueries({ queryKey: posProducaoKeys.all })
    },
  })

  return {
    mutate: mutation.mutate,
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
  }
}

// ---------------------------------------------------------------------------
// useUpdatePosAssignee — Atribuir responsavel
// ---------------------------------------------------------------------------

export function useUpdatePosAssignee(jobId: string) {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: ({ deliverableId, assigneeId }: { deliverableId: string; assigneeId: string | null }) =>
      apiMutate('pos-producao', 'PATCH', { pos_assignee_id: assigneeId }, `${deliverableId}/assignee`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: jobKeys.deliverables(jobId) })
      queryClient.invalidateQueries({ queryKey: posProducaoKeys.all })
    },
  })

  return {
    mutate: mutation.mutate,
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
  }
}

// ---------------------------------------------------------------------------
// useUpdatePosBriefing — Atualizar briefing tecnico
// ---------------------------------------------------------------------------

export function useUpdatePosBriefing(jobId: string) {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: ({ deliverableId, briefing }: { deliverableId: string; briefing: PosBriefing | null }) =>
      apiMutate('pos-producao', 'PATCH', { pos_briefing: briefing }, `${deliverableId}/briefing`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: jobKeys.deliverables(jobId) })
    },
  })

  return {
    mutate: mutation.mutate,
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
  }
}

// ---------------------------------------------------------------------------
// useUpdatePosDriveUrl — Atualizar link Drive
// ---------------------------------------------------------------------------

export function useUpdatePosDriveUrl(jobId: string) {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: ({ deliverableId, driveUrl }: { deliverableId: string; driveUrl: string | null }) =>
      apiMutate('pos-producao', 'PATCH', { pos_drive_url: driveUrl }, `${deliverableId}/drive-url`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: jobKeys.deliverables(jobId) })
    },
  })

  return {
    mutate: mutation.mutate,
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
  }
}

// ---------------------------------------------------------------------------
// useCreateCutVersion — Criar nova versao de corte
// ---------------------------------------------------------------------------

export function useCreateCutVersion(jobId: string, deliverableId: string) {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: (form: CutVersionFormData) =>
      apiMutate<CutVersion>(
        'pos-producao',
        'POST',
        {
          version_type: form.version_type,
          review_url: form.review_url || null,
          revision_notes: form.revision_notes || null,
        },
        `${deliverableId}/cut-versions`,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: posProducaoKeys.cutVersions(deliverableId) })
      queryClient.invalidateQueries({ queryKey: jobKeys.deliverables(jobId) })
    },
  })

  return {
    mutate: mutation.mutate,
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
  }
}

// ---------------------------------------------------------------------------
// useUpdateCutVersion — Aprovar, rejeitar ou editar versao de corte
// ---------------------------------------------------------------------------

export function useUpdateCutVersion(jobId: string, deliverableId: string) {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: ({ versionId, ...payload }: { versionId: string } & Partial<ApproveRejectFormData & { review_url: string | null }>) =>
      apiMutate<CutVersion>(
        'pos-producao',
        'PATCH',
        payload as Record<string, unknown>,
        `${deliverableId}/cut-versions/${versionId}`,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: posProducaoKeys.cutVersions(deliverableId) })
      queryClient.invalidateQueries({ queryKey: jobKeys.deliverables(jobId) })
      queryClient.invalidateQueries({ queryKey: posProducaoKeys.all })
    },
  })

  return {
    mutate: mutation.mutate,
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
  }
}
