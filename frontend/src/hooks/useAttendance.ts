import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiMutate } from '@/lib/api'
import { attendanceKeys } from '@/lib/query-keys'
import type {
  ClientCommunication,
  ScopeItem,
  PendingExtra,
  ClientLogistics,
  JobInternalApproval,
  ClientMilestone,
  DashboardCounts,
  CreateCommunicationPayload,
  UpdateCommunicationPayload,
  CreateScopeItemPayload,
  DecideScopeItemPayload,
  CreateLogisticsPayload,
  UpdateLogisticsPayload,
  UpsertInternalApprovalPayload,
  CreateMilestonePayload,
  UpdateMilestonePayload,
} from '@/types/attendance'

// ============ Communications ============

export function useCommunications(jobId: string, filters: Record<string, string> = {}) {
  const params = { job_id: jobId, ...filters }
  return useQuery({
    queryKey: attendanceKeys.communicationList(jobId, filters),
    queryFn: () => apiGet<ClientCommunication[]>('attendance', params, 'communications'),
    enabled: !!jobId,
    staleTime: 30_000,
  })
}

export function useCreateCommunication() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateCommunicationPayload) =>
      apiMutate<ClientCommunication>('attendance', 'POST', payload as unknown as Record<string, unknown>, 'communications'),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: attendanceKeys.communications(variables.job_id) })
    },
  })
}

export function useUpdateCommunication(jobId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...payload }: UpdateCommunicationPayload & { id: string }) =>
      apiMutate<ClientCommunication>('attendance', 'PATCH', payload as Record<string, unknown>, `communications/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: attendanceKeys.communications(jobId) })
    },
  })
}

export function useDeleteCommunication(jobId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiMutate<{ deleted: boolean }>('attendance', 'DELETE', undefined, `communications/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: attendanceKeys.communications(jobId) })
    },
  })
}

// ============ Scope Items ============

export function useScopeItems(jobId: string) {
  return useQuery({
    queryKey: attendanceKeys.scopeItems(jobId),
    queryFn: () => apiGet<ScopeItem[]>('attendance', { job_id: jobId }, 'scope-items'),
    enabled: !!jobId,
    staleTime: 30_000,
  })
}

export function useCreateScopeItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateScopeItemPayload) =>
      apiMutate<ScopeItem>('attendance', 'POST', payload as unknown as Record<string, unknown>, 'scope-items'),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: attendanceKeys.scopeItems(variables.job_id) })
      queryClient.invalidateQueries({ queryKey: attendanceKeys.pendingExtras() })
      queryClient.invalidateQueries({ queryKey: attendanceKeys.all })
    },
  })
}

export function useDecideScopeItem(jobId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...payload }: DecideScopeItemPayload & { id: string }) =>
      apiMutate<ScopeItem>('attendance', 'PATCH', payload as Record<string, unknown>, `scope-items/${id}/decide`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: attendanceKeys.scopeItems(jobId) })
      queryClient.invalidateQueries({ queryKey: attendanceKeys.pendingExtras() })
      queryClient.invalidateQueries({ queryKey: attendanceKeys.all })
    },
  })
}

// ============ Logistics ============

export function useClientLogistics(jobId: string) {
  return useQuery({
    queryKey: attendanceKeys.logistics(jobId),
    queryFn: () => apiGet<ClientLogistics[]>('attendance', { job_id: jobId }, 'logistics'),
    enabled: !!jobId,
    staleTime: 30_000,
  })
}

export function useCreateLogistics() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateLogisticsPayload) =>
      apiMutate<ClientLogistics>('attendance', 'POST', payload as unknown as Record<string, unknown>, 'logistics'),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: attendanceKeys.logistics(variables.job_id) })
    },
  })
}

export function useUpdateLogistics(jobId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...payload }: UpdateLogisticsPayload & { id: string }) =>
      apiMutate<ClientLogistics>('attendance', 'PATCH', payload as Record<string, unknown>, `logistics/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: attendanceKeys.logistics(jobId) })
    },
  })
}

// ============ Internal Approval ============

export function useInternalApproval(jobId: string) {
  return useQuery({
    queryKey: attendanceKeys.internalApproval(jobId),
    queryFn: () => apiGet<JobInternalApproval>('attendance', { job_id: jobId }, 'internal-approval'),
    enabled: !!jobId,
    staleTime: 60_000,
  })
}

export function useUpsertInternalApproval(jobId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: UpsertInternalApprovalPayload) =>
      apiMutate<JobInternalApproval>('attendance', 'PUT', payload as unknown as Record<string, unknown>, 'internal-approval'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: attendanceKeys.internalApproval(jobId) })
    },
  })
}

export function useApproveInternalApproval(jobId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiMutate<JobInternalApproval>('attendance', 'POST', undefined, `internal-approval/${id}/approve`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: attendanceKeys.internalApproval(jobId) })
    },
  })
}

// ============ Milestones ============

export function useClientMilestones(jobId: string) {
  return useQuery({
    queryKey: attendanceKeys.milestones(jobId),
    queryFn: () => apiGet<ClientMilestone[]>('attendance', { job_id: jobId }, 'milestones'),
    enabled: !!jobId,
    staleTime: 30_000,
  })
}

export function useCreateMilestone() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateMilestonePayload) =>
      apiMutate<ClientMilestone>('attendance', 'POST', payload as unknown as Record<string, unknown>, 'milestones'),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: attendanceKeys.milestones(variables.job_id) })
    },
  })
}

export function useUpdateMilestone(jobId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...payload }: UpdateMilestonePayload & { id: string }) =>
      apiMutate<ClientMilestone>('attendance', 'PATCH', payload as Record<string, unknown>, `milestones/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: attendanceKeys.milestones(jobId) })
    },
  })
}

// ============ Dashboard ============

export function useAttendanceDashboardCounts(jobIds: string[]) {
  return useQuery({
    queryKey: attendanceKeys.dashboardCounts(jobIds),
    queryFn: () => apiGet<DashboardCounts>('attendance', { job_ids: jobIds.join(',') }, 'dashboard-counts'),
    enabled: jobIds.length > 0,
    staleTime: 30_000,
  })
}

export function usePendingExtras() {
  return useQuery({
    queryKey: attendanceKeys.pendingExtras(),
    queryFn: () => apiGet<PendingExtra[]>('attendance', undefined, 'pending-extras'),
    staleTime: 30_000,
  })
}
