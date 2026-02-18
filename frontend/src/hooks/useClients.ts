import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { clientKeys } from '@/lib/query-keys'
import type {
  Client,
  ClientFilters,
  CreateClientPayload,
  UpdateClientPayload,
} from '@/types/clients'

// --- Dropdown (backward compat) ---

interface ClientOption {
  id: string
  name: string
}

async function fetchClients(search?: string): Promise<ClientOption[]> {
  const supabase = createClient()

  let query = supabase
    .from('clients')
    .select('id, name')
    .is('deleted_at', null)
    .eq('is_active', true)
    .order('name')

  if (search && search.trim().length > 0) {
    query = query.ilike('name', `%${search.trim()}%`)
  }

  const { data, error } = await query

  if (error) throw new Error(error.message)
  return (data ?? []) as ClientOption[]
}

/** Hook para dropdown/combobox — retorna {id, name}[] */
export function useClients(search?: string) {
  const query = useQuery({
    queryKey: clientKeys.list(search),
    queryFn: () => fetchClients(search),
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

async function fetchClientsList(
  filters: ClientFilters,
): Promise<{ data: Client[]; total: number }> {
  const supabase = createClient()
  const page = filters.page ?? 1
  const perPage = filters.per_page ?? DEFAULT_PER_PAGE
  const from = (page - 1) * perPage
  const to = from + perPage - 1

  let query = supabase
    .from('clients')
    .select('*', { count: 'exact' })
    .is('deleted_at', null)

  if (filters.search?.trim()) {
    query = query.or(
      `name.ilike.%${filters.search.trim()}%,trading_name.ilike.%${filters.search.trim()}%,cnpj.ilike.%${filters.search.trim()}%`,
    )
  }
  if (filters.segment) {
    query = query.eq('segment', filters.segment)
  }
  if (filters.is_active !== undefined) {
    query = query.eq('is_active', filters.is_active)
  }

  const sortBy = filters.sort_by ?? 'name'
  const ascending = (filters.sort_order ?? 'asc') === 'asc'
  query = query.order(sortBy, { ascending }).range(from, to)

  const { data, count, error } = await query

  if (error) throw new Error(error.message)
  return { data: (data ?? []) as Client[], total: count ?? 0 }
}

/** Hook para lista paginada com filtros completos */
export function useClientsList(filters: ClientFilters = {}) {
  const query = useQuery({
    queryKey: clientKeys.listFiltered(filters),
    queryFn: () => fetchClientsList(filters),
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

async function fetchClient(id: string): Promise<Client> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (error) throw new Error(error.message)
  return data as Client
}

export function useClient(id: string, options?: { enabled?: boolean }) {
  const query = useQuery({
    queryKey: clientKeys.detail(id),
    queryFn: () => fetchClient(id),
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

export function useCreateClient() {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: async (payload: CreateClientPayload) => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('clients')
        .insert(payload)
        .select()
        .single()
      if (error) throw new Error(error.message)
      return data as Client
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clientKeys.lists() })
    },
  })

  return {
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
  }
}

export function useUpdateClient() {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: string
      payload: UpdateClientPayload
    }) => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('clients')
        .update(payload)
        .eq('id', id)
        .select()
        .single()
      if (error) throw new Error(error.message)
      return data as Client
    },
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: clientKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: clientKeys.lists() })
    },
  })

  return {
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
  }
}

export function useDeleteClient() {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient()
      const { error } = await supabase
        .from('clients')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clientKeys.lists() })
    },
  })

  return {
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
  }
}
