import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { peopleKeys } from '@/lib/query-keys'
import type {
  Person,
  PersonFilters,
  CreatePersonPayload,
  UpdatePersonPayload,
} from '@/types/people'

// --- Dropdown (backward compat) ---

interface PersonOption {
  id: string
  name: string // full_name mapeado para name (padrao SearchableSelect)
}

async function fetchPeople(search?: string): Promise<PersonOption[]> {
  const supabase = createClient()

  let query = supabase
    .from('people')
    .select('id, full_name')
    .is('deleted_at', null)
    .eq('is_active', true)
    .order('full_name')

  if (search && search.trim().length > 0) {
    const safe = search.replace(/[%_\\(),.]/g, '').trim()
    if (safe) query = query.ilike('full_name', `%${safe}%`)
  }

  const { data, error } = await query

  if (error) throw new Error(error.message)
  return (data ?? []).map((p) => ({ id: p.id, name: p.full_name }))
}

/** Hook para dropdown/combobox — retorna {id, name}[] */
export function usePeople(search?: string) {
  const query = useQuery({
    queryKey: peopleKeys.list(search),
    queryFn: () => fetchPeople(search),
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

const PEOPLE_SORT_WHITELIST = new Set([
  'full_name', 'email', 'profession', 'default_role', 'default_rate',
  'is_internal', 'is_active', 'created_at', 'updated_at',
])

function sanitizeSearch(input: string): string {
  return input.replace(/[%_\\(),.]/g, '').trim()
}

async function fetchPeopleList(
  filters: PersonFilters,
): Promise<{ data: Person[]; total: number }> {
  const supabase = createClient()
  const page = filters.page ?? 1
  const perPage = filters.per_page ?? DEFAULT_PER_PAGE
  const from = (page - 1) * perPage
  const to = from + perPage - 1

  let query = supabase
    .from('people')
    .select('*', { count: 'exact' })
    .is('deleted_at', null)

  if (filters.search?.trim()) {
    const safe = sanitizeSearch(filters.search)
    if (safe) {
      query = query.or(
        `full_name.ilike.%${safe}%,email.ilike.%${safe}%`,
      )
    }
  }
  if (filters.is_internal !== undefined) {
    query = query.eq('is_internal', filters.is_internal)
  }
  if (filters.default_role) {
    query = query.eq('default_role', filters.default_role)
  }
  if (filters.is_active !== undefined) {
    query = query.eq('is_active', filters.is_active)
  }

  const sortBy = PEOPLE_SORT_WHITELIST.has(filters.sort_by ?? '') ? filters.sort_by! : 'full_name'
  const ascending = (filters.sort_order ?? 'asc') === 'asc'
  query = query.order(sortBy, { ascending }).range(from, to)

  const { data, count, error } = await query

  if (error) throw new Error(error.message)
  return { data: (data ?? []) as Person[], total: count ?? 0 }
}

/** Hook para lista paginada com filtros completos */
export function usePeopleList(filters: PersonFilters = {}) {
  const query = useQuery({
    queryKey: peopleKeys.listFiltered(filters),
    queryFn: () => fetchPeopleList(filters),
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

async function fetchPerson(id: string): Promise<Person> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('people')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (error) throw new Error(error.message)
  return data as Person
}

export function usePerson(id: string, options?: { enabled?: boolean }) {
  const query = useQuery({
    queryKey: peopleKeys.detail(id),
    queryFn: () => fetchPerson(id),
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

export function useCreatePerson() {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: async (payload: CreatePersonPayload) => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('people')
        .insert(payload)
        .select()
        .single()
      if (error) throw new Error(error.message)
      return data as Person
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: peopleKeys.lists() })
    },
  })

  return {
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
  }
}

export function useUpdatePerson() {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: string
      payload: UpdatePersonPayload
    }) => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('people')
        .update(payload)
        .eq('id', id)
        .is('deleted_at', null)
        .select()
        .single()
      if (error) throw new Error(error.message)
      return data as Person
    },
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: peopleKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: peopleKeys.lists() })
    },
  })

  return {
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
  }
}

export function useDeletePerson() {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient()
      const { error } = await supabase
        .from('people')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
        .is('deleted_at', null)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: peopleKeys.lists() })
    },
  })

  return {
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
  }
}
