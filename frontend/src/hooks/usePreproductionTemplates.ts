import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiMutate } from '@/lib/api'
import { preproductionTemplateKeys } from '@/lib/query-keys'
import type {
  ChecklistTemplate,
  ChecklistItem,
  CreateTemplatePayload,
  UpdateTemplatePayload,
} from '@/types/preproduction'

// Lista todos templates ativos do tenant
export function useTemplateList(filters: Record<string, string> = {}) {
  return useQuery({
    queryKey: preproductionTemplateKeys.list(filters),
    queryFn: () =>
      apiGet<ChecklistTemplate[]>('preproduction-templates', filters),
    staleTime: 60_000,
  })
}

// Busca template para um project_type especifico
export function useTemplateForType(projectType: string | null) {
  const params: Record<string, string> = projectType ? { project_type: projectType } : {}
  return useQuery({
    queryKey: preproductionTemplateKeys.forType(projectType),
    queryFn: () =>
      apiGet<ChecklistTemplate[]>('preproduction-templates', params),
    staleTime: 60_000,
  })
}

// Resolve template com fallback: tipo especifico -> padrao -> default items
export function useResolveChecklistTemplate(projectType: string | null) {
  // Busca template especifico para o tipo
  const specificQuery = useQuery({
    queryKey: preproductionTemplateKeys.forType(projectType),
    queryFn: () =>
      apiGet<ChecklistTemplate[]>(
        'preproduction-templates',
        projectType ? { project_type: projectType } : {},
      ),
    staleTime: 60_000,
    enabled: !!projectType,
  })

  // Busca template padrao (fallback)
  const defaultQuery = useQuery({
    queryKey: preproductionTemplateKeys.forType(null),
    queryFn: () => apiGet<ChecklistTemplate[]>('preproduction-templates'),
    staleTime: 60_000,
    enabled: !projectType || (specificQuery.isSuccess && (specificQuery.data?.data?.length ?? 0) === 0),
  })

  const isLoading = specificQuery.isLoading || (specificQuery.isSuccess && (specificQuery.data?.data?.length ?? 0) === 0 && defaultQuery.isLoading)

  // Resolver template: especifico > padrao > null
  let template: ChecklistTemplate | null = null
  if (specificQuery.data?.data?.length) {
    template = specificQuery.data.data[0]
  } else if (defaultQuery.data?.data?.length) {
    // Filtrar para pegar so o template padrao (project_type null)
    const defaultTpl = defaultQuery.data.data.find((t) => t.project_type === null)
    template = defaultTpl ?? defaultQuery.data.data[0] ?? null
  }

  return { template, isLoading }
}

// Converte itens do template em ChecklistItems do job (todos unchecked)
export function templateToChecklistItems(
  template: ChecklistTemplate,
): ChecklistItem[] {
  return template.items.map((item) => ({
    id: item.id,
    label: item.label,
    checked: false,
    position: item.position,
    is_extra: false,
  }))
}

// Mutations
export function useCreateTemplate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateTemplatePayload) =>
      apiMutate<ChecklistTemplate>(
        'preproduction-templates',
        'POST',
        payload as unknown as Record<string, unknown>,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: preproductionTemplateKeys.all,
      })
    },
  })
}

export function useUpdateTemplate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      ...payload
    }: UpdateTemplatePayload & { id: string }) =>
      apiMutate<ChecklistTemplate>(
        'preproduction-templates',
        'PATCH',
        payload as Record<string, unknown>,
        id,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: preproductionTemplateKeys.all,
      })
    },
  })
}

export function useDeactivateTemplate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiMutate('preproduction-templates', 'DELETE', {}, id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: preproductionTemplateKeys.all,
      })
    },
  })
}

export function useSeedTemplates() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () =>
      apiMutate<{ templates_created: number }>(
        'preproduction-templates',
        'POST',
        {},
        'seed',
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: preproductionTemplateKeys.all,
      })
    },
  })
}
