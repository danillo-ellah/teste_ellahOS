import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { clientKeys } from '@/lib/query-keys'

interface ClientOption {
  id: string
  name: string
}

// Busca clientes diretamente via Supabase client (sem Edge Function dedicada)
async function fetchClients(search?: string): Promise<ClientOption[]> {
  const supabase = createClient()

  let query = supabase
    .from('clients')
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

  return (data ?? []) as ClientOption[]
}

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
