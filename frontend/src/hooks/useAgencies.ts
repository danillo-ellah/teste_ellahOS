import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { agencyKeys } from '@/lib/query-keys'
import type {
  Agency,
  AgencyFilters,
  CreateAgencyPayload,
  UpdateAgencyPayload,
} from '@/types/clients'

// --- Dropdown (backward compat) ---

interface AgencyOption {
  id: string
  name: string
}

async function fetchAgencies(search?: string): Promise<AgencyOption[]> {
  const supabase = createClient()

  let query = supabase
    .from('agencies')
    .select('id, name')
    .is('deleted_at', null)
    .eq('is_active', true)
    .order('name')

  if (search && search.trim().length > 0) {
    query = query.ilike('name', `%${search.trim()}%`)
  }

  const { data, error } = await query

  if (error) throw new Error(error.message)
  return (data ?? []) as AgencyOption[]
}

/** Hook para dropdown/combobox — retorna {id, name}[] */
export function useAgencies(search?: string) {
  const query = useQuery({
    queryKey: agencyKeys.list(search),
    queryFn: () => fetchAgencies(search),
    staleTime: 5 * 60_000,
  })

  return {
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  }
}

// --- Lista paginada ---

const DEFAULT_PER_PAGE = 20

async function fetchAgenciesList(
  filters: AgencyFilters,
): Promise<{ data: Agency[]; total: number }> {
  const supabase = createClient()
  const page = filters.page ?? 1
  const perPage = filters.per_page ?? DEFAULT_PER_PAGE
  const from = (page - 1) * perPage
  const to = from + perPage - 1

  let query = supabase
    .from('agencies')
    .select('*', { count: 'exact' })
    .is('deleted_at', null)

  if (filters.search?.trim()) {
    query = query.or(
      `name.ilike.%${filters.search.trim()}%,trading_name.ilike.%${filters.search.trim()}%,cnpj.ilike.%${filters.search.trim()}%`,
    )
  }
  if (filters.is_active !== undefined) {
    query = query.eq('is_active', filters.is_active)
  }

  const sortBy = filters.sort_by ?? 'name'
  const ascending = (filters.sort_order ?? 'asc') === 'asc'
  query = query.order(sortBy, { ascending }).range(from, to)

  const { data, count, error } = await query

  if (error) throw new Error(error.message)
  return { data: (data ?? []) as Agency[], total: count ?? 0 }
}

/** Hook para lista paginada com filtros completos */
export function useAgenciesList(filters: AgencyFilters = {}) {
  const query = useQuery({
    queryKey: agencyKeys.listFiltered(filters),
    queryFn: () => fetchAgenciesList(filters),
    staleTime: 30_000,
  })

  const perPage = filters.per_page ?? DEFAULT_PER_PAGE
  const total = query.data?.total ?? 0

  return {
    data: query.data?.data,
    meta: {
      total,
      page: filters.page ?? 1,
      per_page: perPage,
      total_pages: Math.ceil(total / perPage),
    },
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  }
}

// --- Detalhe ---

async function fetchAgency(id: string): Promise<Agency> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('agencies')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (error) throw new Error(error.message)
  return data as Agency
}

export function useAgency(id: string, options?: { enabled?: boolean }) {
  const query = useQuery({
    queryKey: agencyKeys.detail(id),
    queryFn: () => fetchAgency(id),
    staleTime: 60_000,
    enabled: (options?.enabled ?? true) && !!id,
  })

  return {
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  }
}

// --- Mutations ---

export function useCreateAgency() {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: async (payload: CreateAgencyPayload) => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('agencies')
        .insert(payload)
        .select()
        .single()
      if (error) throw new Error(error.message)
      return data as Agency
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: agencyKeys.lists() })
    },
  })

  return {
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
  }
}

export function useUpdateAgency() {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: string
      payload: UpdateAgencyPayload
    }) => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('agencies')
        .update(payload)
        .eq('id', id)
        .select()
        .single()
      if (error) throw new Error(error.message)
      return data as Agency
    },
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: agencyKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: agencyKeys.lists() })
    },
  })

  return {
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
  }
}

export function useDeleteAgency() {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient()
      const { error } = await supabase
        .from('agencies')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: agencyKeys.lists() })
    },
  })

  return {
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
  }
}
