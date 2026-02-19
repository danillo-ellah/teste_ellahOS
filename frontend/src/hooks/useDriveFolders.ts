import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiMutate } from '@/lib/api'
import { jobKeys } from '@/lib/query-keys'
import type { DriveFolderRow, DriveStructureResponse } from '@/types/drive'

// Query key factory
export const driveFolderKeys = {
  folders: (jobId: string) => [...jobKeys.detail(jobId), 'drive-folders'] as const,
}

// --- List folders ---

export function useDriveFolders(jobId: string) {
  const query = useQuery({
    queryKey: driveFolderKeys.folders(jobId),
    queryFn: () =>
      apiGet<{ data: DriveFolderRow[]; meta: { total: number } }>(
        'drive-integration',
        {},
        `${jobId}/folders`,
      ),
    staleTime: 120_000,
    enabled: !!jobId,
  })

  // Resposta aninhada: apiGet retorna { data: { data: [...], meta: {...} } }
  const inner = query.data?.data

  return {
    data: inner?.data ?? [],
    total: inner?.meta?.total ?? 0,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  }
}

// --- Create structure (manual trigger) ---

export function useCreateDriveStructure() {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: (jobId: string) =>
      apiMutate<DriveStructureResponse>(
        'drive-integration',
        'POST',
        undefined,
        `${jobId}/create-structure`,
      ),
    onSuccess: (_data, jobId) => {
      queryClient.invalidateQueries({ queryKey: driveFolderKeys.folders(jobId) })
      queryClient.invalidateQueries({ queryKey: jobKeys.detail(jobId) })
    },
  })

  return {
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
  }
}

// --- Recreate structure ---

export function useRecreateDriveStructure() {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: (jobId: string) =>
      apiMutate<DriveStructureResponse>(
        'drive-integration',
        'POST',
        undefined,
        `${jobId}/recreate`,
      ),
    onSuccess: (_data, jobId) => {
      queryClient.invalidateQueries({ queryKey: driveFolderKeys.folders(jobId) })
      queryClient.invalidateQueries({ queryKey: jobKeys.detail(jobId) })
    },
  })

  return {
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
  }
}
