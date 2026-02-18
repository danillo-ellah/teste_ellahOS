import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { peopleKeys } from '@/lib/query-keys'

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
    .order('full_name')

  if (search && search.trim().length > 0) {
    query = query.ilike('full_name', `%${search.trim()}%`)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []).map((p) => ({ id: p.id, name: p.full_name }))
}

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
