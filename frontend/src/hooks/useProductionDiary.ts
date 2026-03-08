import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiMutate } from '@/lib/api'
import { productionDiaryKeys } from '@/lib/query-keys'
import type {
  DiaryEntry,
  DiaryEntryFormData,
  DiaryPhoto,
  SceneItem,
  AttendanceItem,
  EquipmentItem,
} from '@/types/production-diary'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Converte DiaryEntryFormData (strings de formulario) para o payload da API. */
function formDataToPayload(
  jobId: string,
  form: DiaryEntryFormData,
): Record<string, unknown> {
  return {
    job_id: jobId,
    shooting_date: form.shooting_date || null,
    shooting_date_id: form.shooting_date_id || null,
    day_number: form.day_number !== '' ? Number(form.day_number) : null,
    weather_condition: form.weather_condition,
    call_time: form.call_time || null,
    wrap_time: form.wrap_time || null,
    filming_start_time: form.filming_start_time || null,
    lunch_time: form.lunch_time || null,
    location: form.location || null,
    planned_scenes: form.planned_scenes || null,
    filmed_scenes: form.filmed_scenes || null,
    total_takes: form.total_takes !== '' ? Number(form.total_takes) : null,
    observations: form.observations || null,
    issues: form.issues || null,
    highlights: form.highlights || null,
    scenes_list: form.scenes_list.length > 0 ? form.scenes_list : [],
    day_status: form.day_status || null,
    executive_summary: form.executive_summary || null,
    attendance_list: form.attendance_list.length > 0 ? form.attendance_list : [],
    equipment_list: form.equipment_list.length > 0 ? form.equipment_list : [],
    next_steps: form.next_steps || null,
    director_signature: form.director_signature || null,
  }
}

// ---------------------------------------------------------------------------
// useProductionDiaryList
// ---------------------------------------------------------------------------

export function useProductionDiaryList(jobId: string) {
  const query = useQuery({
    queryKey: productionDiaryKeys.list(jobId),
    queryFn: () =>
      apiGet<DiaryEntry[]>('production-diary', { job_id: jobId }),
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
// useCreateDiaryEntry
// ---------------------------------------------------------------------------

interface CreateDiaryEntryParams {
  jobId: string
  form: DiaryEntryFormData
}

export function useCreateDiaryEntry(jobId: string) {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: ({ jobId: jid, form }: CreateDiaryEntryParams) =>
      apiMutate<DiaryEntry>(
        'production-diary',
        'POST',
        formDataToPayload(jid, form),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: productionDiaryKeys.list(jobId),
      })
    },
  })

  return {
    mutate: mutation.mutate,
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
  }
}

// ---------------------------------------------------------------------------
// useUpdateDiaryEntry
// ---------------------------------------------------------------------------

interface UpdateDiaryEntryParams {
  entryId: string
  form: DiaryEntryFormData
}

export function useUpdateDiaryEntry(jobId: string) {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: ({ entryId, form }: UpdateDiaryEntryParams) =>
      apiMutate<DiaryEntry>(
        'production-diary',
        'PATCH',
        formDataToPayload(jobId, form),
        entryId,
      ),
    onSuccess: (_data, { entryId }) => {
      queryClient.invalidateQueries({
        queryKey: productionDiaryKeys.list(jobId),
      })
      queryClient.invalidateQueries({
        queryKey: productionDiaryKeys.detail(entryId),
      })
    },
  })

  return {
    mutate: mutation.mutate,
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
  }
}

// ---------------------------------------------------------------------------
// useDeleteDiaryEntry
// ---------------------------------------------------------------------------

interface DeleteDiaryEntryParams {
  entryId: string
}

export function useDeleteDiaryEntry(jobId: string) {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: ({ entryId }: DeleteDiaryEntryParams) =>
      apiMutate<{ id: string; deleted: boolean }>(
        'production-diary',
        'DELETE',
        undefined,
        entryId,
      ),
    onSuccess: (_data, { entryId }) => {
      queryClient.invalidateQueries({
        queryKey: productionDiaryKeys.list(jobId),
      })
      queryClient.removeQueries({
        queryKey: productionDiaryKeys.detail(entryId),
      })
    },
  })

  return {
    mutate: mutation.mutate,
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
  }
}

// ---------------------------------------------------------------------------
// useAddDiaryPhoto
// ---------------------------------------------------------------------------

export interface AddDiaryPhotoParams {
  entryId: string
  url: string
  thumbnail_url?: string | null
  caption?: string | null
  photo_type: DiaryPhoto['photo_type']
  taken_at?: string | null
}

export function useAddDiaryPhoto(jobId: string) {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: ({ entryId, ...payload }: AddDiaryPhotoParams) =>
      apiMutate<DiaryPhoto>(
        'production-diary',
        'POST',
        payload as unknown as Record<string, unknown>,
        `${entryId}/photos`,
      ),
    onSuccess: (_data, { entryId }) => {
      queryClient.invalidateQueries({
        queryKey: productionDiaryKeys.list(jobId),
      })
      queryClient.invalidateQueries({
        queryKey: productionDiaryKeys.detail(entryId),
      })
    },
  })

  return {
    mutate: mutation.mutate,
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
  }
}

// Re-exporta tipos de sub-itens para uso nos componentes sem precisar importar
// de dois lugares diferentes.
export type { SceneItem, AttendanceItem, EquipmentItem }
