import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiMutate } from '@/lib/api'
import { jobKeys } from '@/lib/query-keys'
import type { DrivePermissionsResponse } from '@/types/drive'

export const drivePermissionKeys = {
  permissions: (jobId: string, activeOnly?: boolean) =>
    [...jobKeys.detail(jobId), 'drive-permissions', activeOnly ?? true] as const,
}

// --- List permissions (modelo rico: members[].permissions[]) ---

export function useDrivePermissions(jobId: string, activeOnly = true, enabled = true) {
  const query = useQuery({
    queryKey: drivePermissionKeys.permissions(jobId, activeOnly),
    queryFn: () =>
      apiGet<DrivePermissionsResponse>(
        'drive-integration',
        { active_only: String(activeOnly) },
        `${jobId}/permissions`,
      ),
    staleTime: 60_000,
    enabled: !!jobId && enabled,
  })

  const inner = query.data?.data

  return {
    members: inner?.members ?? [],
    meta: inner?.meta ?? { total_members: 0, total_active_permissions: 0, active_only: activeOnly },
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  }
}

// --- Grant permissions ---

export function useGrantMemberPermissions() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ jobId, jobTeamId, email }: { jobId: string; jobTeamId: string; email: string }) =>
      apiMutate(
        'drive-integration',
        'POST',
        { job_team_id: jobTeamId, email },
        `${jobId}/grant-member-permissions`,
      ),
    onSuccess: (_data, { jobId }) => {
      queryClient.invalidateQueries({ queryKey: drivePermissionKeys.permissions(jobId) })
    },
  })
}

// --- Revoke permissions ---

export function useRevokeMemberPermissions() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ jobId, jobTeamId }: { jobId: string; jobTeamId: string }) =>
      apiMutate(
        'drive-integration',
        'POST',
        { job_team_id: jobTeamId },
        `${jobId}/revoke-member-permissions`,
      ),
    onSuccess: (_data, { jobId }) => {
      queryClient.invalidateQueries({ queryKey: drivePermissionKeys.permissions(jobId) })
    },
  })
}

// --- Sync all permissions ---

export function useSyncPermissions() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (jobId: string) =>
      apiMutate(
        'drive-integration',
        'POST',
        undefined,
        `${jobId}/sync-permissions`,
      ),
    onSuccess: (_data, jobId) => {
      queryClient.invalidateQueries({ queryKey: drivePermissionKeys.permissions(jobId) })
    },
  })
}
