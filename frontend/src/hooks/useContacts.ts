import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { contactKeys, clientKeys, agencyKeys } from '@/lib/query-keys'
import type {
  Contact,
  CreateContactPayload,
  UpdateContactPayload,
} from '@/types/clients'

// --- Lista ---

async function fetchContacts(
  clientId?: string,
  agencyId?: string,
): Promise<Contact[]> {
  const supabase = createClient()

  let query = supabase
    .from('contacts')
    .select('*')
    .is('deleted_at', null)
    .order('is_primary', { ascending: false })
    .order('name')

  if (clientId) {
    query = query.eq('client_id', clientId)
  } else if (agencyId) {
    query = query.eq('agency_id', agencyId)
  }

  const { data, error } = await query

  if (error) throw new Error(error.message)
  return (data ?? []) as Contact[]
}

/** Lista contatos de um cliente ou agencia */
export function useContacts(clientId?: string, agencyId?: string) {
  const entityId = clientId ?? agencyId ?? ''
  const query = useQuery({
    queryKey: contactKeys.list(entityId),
    queryFn: () => fetchContacts(clientId, agencyId),
    staleTime: 60_000,
    enabled: !!entityId,
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

export function useCreateContact() {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: async (payload: CreateContactPayload) => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('contacts')
        .insert(payload)
        .select()
        .single()
      if (error) throw new Error(error.message)
      return data as Contact
    },
    onSuccess: (data) => {
      if (data.client_id) {
        queryClient.invalidateQueries({
          queryKey: contactKeys.list(data.client_id),
        })
        queryClient.invalidateQueries({
          queryKey: clientKeys.detail(data.client_id),
        })
      }
      if (data.agency_id) {
        queryClient.invalidateQueries({
          queryKey: contactKeys.list(data.agency_id),
        })
        queryClient.invalidateQueries({
          queryKey: agencyKeys.detail(data.agency_id),
        })
      }
    },
  })

  return {
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
  }
}

export function useUpdateContact() {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: string
      payload: UpdateContactPayload
    }) => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('contacts')
        .update(payload)
        .eq('id', id)
        .select()
        .single()
      if (error) throw new Error(error.message)
      return data as Contact
    },
    onSuccess: (data) => {
      if (data.client_id) {
        queryClient.invalidateQueries({
          queryKey: contactKeys.list(data.client_id),
        })
      }
      if (data.agency_id) {
        queryClient.invalidateQueries({
          queryKey: contactKeys.list(data.agency_id),
        })
      }
    },
  })

  return {
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
  }
}

export function useDeleteContact() {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: async ({
      id,
      entityId,
    }: {
      id: string
      entityId: string
    }) => {
      const supabase = createClient()
      const { error } = await supabase
        .from('contacts')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: (_data, { entityId }) => {
      queryClient.invalidateQueries({
        queryKey: contactKeys.list(entityId),
      })
    },
  })

  return {
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
  }
}
