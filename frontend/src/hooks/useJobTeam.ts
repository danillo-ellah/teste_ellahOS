import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiMutate } from '@/lib/api'
import { jobKeys } from '@/lib/query-keys'
import type { JobTeamMember, TeamRole, HiringStatus } from '@/types/jobs'

// --- List ---

export function useJobTeam(jobId: string) {
  const query = useQuery({
    queryKey: jobKeys.team(jobId),
    queryFn: () => apiGet<JobTeamMember[]>('jobs-team', {}, jobId),
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

// --- Add ---

interface AddTeamMemberParams {
  jobId: string
  person_id: string
  role: TeamRole
  fee?: number | null
  hiring_status?: HiringStatus
  is_lead_producer?: boolean
  notes?: string | null
}

export function useAddTeamMember() {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: ({ jobId, ...payload }: AddTeamMemberParams) =>
      apiMutate<JobTeamMember>('jobs-team', 'POST', payload as unknown as Record<string, unknown>, jobId),
    onSuccess: (_data, { jobId }) => {
      queryClient.invalidateQueries({ queryKey: jobKeys.team(jobId) })
      queryClient.invalidateQueries({ queryKey: jobKeys.detail(jobId) })
    },
  })

  return {
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
  }
}

// --- Update ---

interface UpdateTeamMemberParams {
  jobId: string
  memberId: string
  role?: TeamRole
  fee?: number | null
  hiring_status?: HiringStatus
  is_lead_producer?: boolean
  notes?: string | null
}

export function useUpdateTeamMember() {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: ({ jobId, memberId, ...payload }: UpdateTeamMemberParams) =>
      apiMutate<JobTeamMember>('jobs-team', 'PATCH', payload as unknown as Record<string, unknown>, `${jobId}/${memberId}`),
    onSuccess: (_data, { jobId }) => {
      queryClient.invalidateQueries({ queryKey: jobKeys.team(jobId) })
      queryClient.invalidateQueries({ queryKey: jobKeys.detail(jobId) })
    },
  })

  return {
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
  }
}

// --- Remove ---

interface RemoveTeamMemberParams {
  jobId: string
  memberId: string
}

export function useRemoveTeamMember() {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: ({ jobId, memberId }: RemoveTeamMemberParams) =>
      apiMutate<{ id: string; deleted: boolean }>('jobs-team', 'DELETE', undefined, `${jobId}/${memberId}`),
    onSuccess: (_data, { jobId }) => {
      queryClient.invalidateQueries({ queryKey: jobKeys.team(jobId) })
      queryClient.invalidateQueries({ queryKey: jobKeys.detail(jobId) })
    },
  })

  return {
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
  }
}
