import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiMutate } from '@/lib/api'
import { locationKeys } from '@/lib/query-keys'
import type {
  Location,
  JobLocation,
  CreateLocationPayload,
  LinkJobLocationPayload,
  UpdateJobLocationPayload,
} from '@/types/locations'

// --- Listar locacoes do tenant (para combobox de busca) ---

export function useLocations(search?: string) {
  const params: Record<string, string> = {}
  if (search) params.search = search

  const query = useQuery({
    queryKey: locationKeys.list(params),
    queryFn: () => apiGet<Location[]>('locations', params),
    staleTime: 60_000,
  })

  return {
    data: query.data?.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  }
}

// --- Listar locacoes de um job ---

export function useJobLocations(jobId: string) {
  const query = useQuery({
    queryKey: locationKeys.byJob(jobId),
    queryFn: () => apiGet<JobLocation[]>('locations', {}, `job/${jobId}`),
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

// --- Criar locacao (nova) ---

export function useCreateLocation() {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: (payload: CreateLocationPayload) =>
      apiMutate<Location>('locations', 'POST', payload as unknown as Record<string, unknown>),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: locationKeys.lists() })
    },
  })

  return {
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
  }
}

// --- Vincular locacao existente a job ---

export function useLinkJobLocation() {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: (payload: LinkJobLocationPayload) =>
      apiMutate<JobLocation>('locations', 'POST', payload as unknown as Record<string, unknown>, 'job-link'),
    onSuccess: (_data, payload) => {
      queryClient.invalidateQueries({ queryKey: locationKeys.byJob(payload.job_id) })
    },
  })

  return {
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
  }
}

// --- Atualizar vinculo job-locacao ---

interface UpdateJobLocationParams extends UpdateJobLocationPayload {
  jobLocationId: string
  jobId: string
}

export function useUpdateJobLocation() {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: ({ jobLocationId, jobId: _jobId, ...payload }: UpdateJobLocationParams) =>
      apiMutate<JobLocation>(
        'locations',
        'PATCH',
        payload as unknown as Record<string, unknown>,
        `job-link/${jobLocationId}`,
      ),
    onSuccess: (_data, { jobId }) => {
      queryClient.invalidateQueries({ queryKey: locationKeys.byJob(jobId) })
    },
  })

  return {
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
  }
}

// --- Desvincular locacao de job ---

interface UnlinkJobLocationParams {
  jobLocationId: string
  jobId: string
}

export function useUnlinkJobLocation() {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: ({ jobLocationId }: UnlinkJobLocationParams) =>
      apiMutate<{ deleted: boolean }>(
        'locations',
        'DELETE',
        undefined,
        `job-link/${jobLocationId}`,
      ),
    onSuccess: (_data, { jobId }) => {
      queryClient.invalidateQueries({ queryKey: locationKeys.byJob(jobId) })
    },
  })

  return {
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
  }
}
