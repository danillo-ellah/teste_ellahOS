import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { agencyKeys } from '@/lib/query-keys'

interface AgencyOption {
  id: string
  name: string
}

// Busca agencias diretamente via Supabase client (sem Edge Function dedicada)
async function fetchAgencies(search?: string): Promise<AgencyOption[]> {
  const supabase = createClient()

  let query = supabase
    .from('agencies')
    .select('id, name')
    .is('deleted_at', null)
    .order('name')

  // Filtro de busca por nome quando fornecido
  if (search && search.trim().length > 0) {
    query = query.ilike('name', `%${search.trim()}%`)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []) as AgencyOption[]
}

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
