import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiMutate } from '@/lib/api'
import { jobKeys } from '@/lib/query-keys'
import type { DrivePermissionEntry, DrivePermissionsResponse } from '@/types/drive'

export const drivePermissionKeys = {
  permissions: (jobId: string) => [...jobKeys.detail(jobId), 'drive-permissions'] as const,
}

// --- List permissions ---

export function useDrivePermissions(jobId: string, enabled = true) {
  const query = useQuery({
    queryKey: drivePermissionKeys.permissions(jobId),
    queryFn: () =>
      apiGet<DrivePermissionsResponse>(
        'drive-integration',
        {},
        `${jobId}/permissions`,
      ),
    staleTime: 60_000,
    enabled: !!jobId && enabled,
  })

  const inner = query.data?.data

  return {
    data: (inner?.data ?? []) as DrivePermissionEntry[],
    meta: inner?.meta ?? { total: 0, synced_at: null },
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  }
}

// --- Grant permissions ---

export function useGrantMemberPermissions() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ jobId, personId, email }: { jobId: string; personId: string; email: string }) =>
      apiMutate(
        'drive-integration',
        'POST',
        { person_id: personId, email },
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
    mutationFn: ({ jobId, personId }: { jobId: string; personId: string }) =>
      apiMutate(
        'drive-integration',
        'POST',
        { person_id: personId },
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
