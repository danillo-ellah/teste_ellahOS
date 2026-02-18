import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { financialKeys } from '@/lib/query-keys'
import type {
  FinancialRecord,
  FinancialRecordFilters,
  CreateFinancialRecordPayload,
  UpdateFinancialRecordPayload,
} from '@/types/financial'

// --- Lista paginada ---

const DEFAULT_PER_PAGE = 20

interface FinancialSummary {
  total_receitas: number
  total_despesas: number
  saldo: number
}

async function fetchFinancialRecords(
  filters: FinancialRecordFilters,
): Promise<{ data: FinancialRecord[]; total: number }> {
  const supabase = createClient()
  const page = filters.page ?? 1
  const perPage = filters.per_page ?? DEFAULT_PER_PAGE
  const from = (page - 1) * perPage
  const to = from + perPage - 1

  let query = supabase
    .from('financial_records')
    .select('*, people(full_name), jobs(title, code)', { count: 'exact' })
    .is('deleted_at', null)

  if (filters.job_id) {
    query = query.eq('job_id', filters.job_id)
  }
  if (filters.type) {
    query = query.eq('type', filters.type)
  }
  if (filters.status) {
    query = query.eq('status', filters.status)
  }
  if (filters.category) {
    query = query.eq('category', filters.category)
  }
  if (filters.search?.trim()) {
    query = query.ilike('description', `%${filters.search.trim()}%`)
  }

  const sortBy = filters.sort_by ?? 'created_at'
  const ascending = (filters.sort_order ?? 'desc') === 'asc'
  query = query.order(sortBy, { ascending }).range(from, to)

  const { data, count, error } = await query

  if (error) throw new Error(error.message)
  return { data: (data ?? []) as FinancialRecord[], total: count ?? 0 }
}

/** Hook para lista paginada de lancamentos financeiros */
export function useFinancialRecords(filters: FinancialRecordFilters = {}) {
  const query = useQuery({
    queryKey: financialKeys.list(filters),
    queryFn: () => fetchFinancialRecords(filters),
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

// --- Resumo financeiro (agregacoes) ---

async function fetchFinancialSummary(
  jobId?: string,
): Promise<FinancialSummary> {
  const supabase = createClient()

  let query = supabase
    .from('financial_records')
    .select('type, amount, status')
    .is('deleted_at', null)
    .neq('status', 'cancelado')

  if (jobId) {
    query = query.eq('job_id', jobId)
  }

  const { data, error } = await query

  if (error) throw new Error(error.message)

  const records = data ?? []
  let total_receitas = 0
  let total_despesas = 0

  for (const r of records) {
    if (r.type === 'receita') total_receitas += Number(r.amount)
    else total_despesas += Number(r.amount)
  }

  return {
    total_receitas,
    total_despesas,
    saldo: total_receitas - total_despesas,
  }
}

/** Hook para resumo financeiro (receitas, despesas, saldo) */
export function useFinancialSummary(jobId?: string) {
  return useQuery({
    queryKey: financialKeys.summary(jobId),
    queryFn: () => fetchFinancialSummary(jobId),
    staleTime: 30_000,
  })
}

// --- Detalhe ---

async function fetchFinancialRecord(id: string): Promise<FinancialRecord> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('financial_records')
    .select('*, people(full_name), jobs(title, code)')
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (error) throw new Error(error.message)
  return data as FinancialRecord
}

export function useFinancialRecord(
  id: string,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: financialKeys.detail(id),
    queryFn: () => fetchFinancialRecord(id),
    staleTime: 60_000,
    enabled: (options?.enabled ?? true) && !!id,
  })
}

// --- Mutations ---

export function useCreateFinancialRecord() {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: async (payload: CreateFinancialRecordPayload) => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('financial_records')
        .insert(payload)
        .select('*, people(full_name), jobs(title, code)')
        .single()
      if (error) throw new Error(error.message)
      return data as FinancialRecord
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: financialKeys.lists() })
      queryClient.invalidateQueries({ queryKey: financialKeys.summary() })
    },
  })

  return {
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
  }
}

export function useUpdateFinancialRecord() {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: string
      payload: UpdateFinancialRecordPayload
    }) => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('financial_records')
        .update(payload)
        .eq('id', id)
        .select('*, people(full_name), jobs(title, code)')
        .single()
      if (error) throw new Error(error.message)
      return data as FinancialRecord
    },
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: financialKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: financialKeys.lists() })
      queryClient.invalidateQueries({ queryKey: financialKeys.summary() })
    },
  })

  return {
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
  }
}

export function useDeleteFinancialRecord() {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient()
      const { error } = await supabase
        .from('financial_records')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: financialKeys.lists() })
      queryClient.invalidateQueries({ queryKey: financialKeys.summary() })
    },
  })

  return {
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
  }
}
