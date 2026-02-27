'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { CostCategory } from '@/types/cost-management'

// ============ Query Keys ============

export const categoryKeys = {
  all: ['cost-categories'] as const,
  lists: () => [...categoryKeys.all, 'list'] as const,
  list: (productionType: string) => [...categoryKeys.lists(), productionType] as const,
}

// ============ Fetch helpers ============

async function fetchCategories(productionType: string): Promise<CostCategory[]> {
  const supabase = createClient()

  let query = supabase
    .from('cost_categories')
    .select('*')
    .is('deleted_at', null)
    .order('item_number', { ascending: true })

  if (productionType !== 'all') {
    query = query.eq('production_type', productionType)
  }

  const { data, error } = await query

  if (error) throw new Error(error.message)
  return (data ?? []) as unknown as CostCategory[]
}

// ============ Hooks ============

export function useCostCategories(productionType: string) {
  const query = useQuery({
    queryKey: categoryKeys.list(productionType),
    queryFn: () => fetchCategories(productionType),
    staleTime: 30_000,
  })

  return {
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  }
}

// ============ Create ============

interface CreateCategoryPayload {
  item_number: number
  display_name: string
  production_type: string
  description?: string | null
  sort_order?: number
  is_active?: boolean
}

export function useCreateCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: CreateCategoryPayload) => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('cost_categories')
        .insert(payload)
        .select('*')
        .single()

      if (error) throw new Error(error.message)
      return data as unknown as CostCategory
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.lists() })
    },
  })
}

// ============ Update ============

interface UpdateCategoryPayload {
  id: string
  item_number?: number
  display_name?: string
  description?: string | null
  sort_order?: number
  is_active?: boolean
}

export function useUpdateCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...payload }: UpdateCategoryPayload) => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('cost_categories')
        .update(payload)
        .eq('id', id)
        .select('*')
        .single()

      if (error) throw new Error(error.message)
      return data as unknown as CostCategory
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.lists() })
    },
  })
}

// ============ Toggle Active ============

export function useToggleCategoryActive() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('cost_categories')
        .update({ is_active })
        .eq('id', id)
        .select('*')
        .single()

      if (error) throw new Error(error.message)
      return data as unknown as CostCategory
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.lists() })
    },
  })
}

// ============ Delete (soft) ============

export function useDeleteCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient()
      const { error } = await supabase
        .from('cost_categories')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)

      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.lists() })
    },
  })
}

// ============ Duplicate Template ============

interface DuplicateTemplatePayload {
  fromType: string
  toType: string
}

export function useDuplicateTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ fromType, toType }: DuplicateTemplatePayload) => {
      const supabase = createClient()

      // Busca categorias de origem
      const { data: sourceCategories, error: fetchError } = await supabase
        .from('cost_categories')
        .select('*')
        .eq('production_type', fromType)
        .is('deleted_at', null)
        .order('item_number', { ascending: true })

      if (fetchError) throw new Error(fetchError.message)
      if (!sourceCategories || sourceCategories.length === 0) {
        throw new Error('Nenhuma categoria encontrada no tipo de origem')
      }

      // Prepara inserts sem id, tenant_id (Supabase preenche), created_at, updated_at, deleted_at
      const inserts = sourceCategories.map((cat) => ({
        item_number: cat.item_number,
        display_name: cat.display_name,
        production_type: toType,
        description: cat.description,
        is_active: cat.is_active,
        sort_order: cat.sort_order,
        parent_id: null,
      }))

      const { data, error: insertError } = await supabase
        .from('cost_categories')
        .insert(inserts)
        .select('id')

      if (insertError) throw new Error(insertError.message)
      return { count: data?.length ?? 0 }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.lists() })
    },
  })
}
