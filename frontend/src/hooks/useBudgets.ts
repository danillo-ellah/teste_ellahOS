import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { budgetKeys } from '@/lib/query-keys'
import type {
  JobBudget,
  BudgetItem,
  CreateJobBudgetPayload,
  UpdateJobBudgetPayload,
  CreateBudgetItemPayload,
  UpdateBudgetItemPayload,
} from '@/types/financial'

// --- Budgets ---

async function fetchBudgetsByJob(jobId: string): Promise<JobBudget[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('job_budgets')
    .select('*')
    .eq('job_id', jobId)
    .is('deleted_at', null)
    .order('version', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []) as JobBudget[]
}

/** Lista orcamentos de um job */
export function useBudgetsByJob(jobId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: budgetKeys.listByJob(jobId),
    queryFn: () => fetchBudgetsByJob(jobId),
    staleTime: 60_000,
    enabled: (options?.enabled ?? true) && !!jobId,
  })
}

async function fetchBudget(id: string): Promise<JobBudget> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('job_budgets')
    .select('*, budget_items(*)')
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (error) throw new Error(error.message)
  return data as JobBudget
}

/** Detalhe de um orcamento com itens */
export function useBudget(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: budgetKeys.detail(id),
    queryFn: () => fetchBudget(id),
    staleTime: 60_000,
    enabled: (options?.enabled ?? true) && !!id,
  })
}

export function useCreateBudget() {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: async (payload: CreateJobBudgetPayload) => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('job_budgets')
        .insert(payload)
        .select()
        .single()
      if (error) throw new Error(error.message)
      return data as JobBudget
    },
    onSuccess: (_data, payload) => {
      if (payload.job_id) {
        queryClient.invalidateQueries({
          queryKey: budgetKeys.listByJob(payload.job_id),
        })
      }
      queryClient.invalidateQueries({ queryKey: budgetKeys.lists() })
    },
  })

  return {
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
  }
}

export function useUpdateBudget() {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: string
      payload: UpdateJobBudgetPayload
    }) => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('job_budgets')
        .update(payload)
        .eq('id', id)
        .is('deleted_at', null)
        .select()
        .single()
      if (error) throw new Error(error.message)
      return data as JobBudget
    },
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: budgetKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: budgetKeys.lists() })
    },
  })

  return {
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
  }
}

export function useDeleteBudget() {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: async ({ id }: { id: string; jobId?: string }) => {
      const supabase = createClient()
      const { error } = await supabase
        .from('job_budgets')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
        .is('deleted_at', null)
      if (error) throw new Error(error.message)
    },
    onSuccess: (_data, { jobId }) => {
      queryClient.invalidateQueries({ queryKey: budgetKeys.lists() })
      if (jobId) {
        queryClient.invalidateQueries({
          queryKey: budgetKeys.listByJob(jobId),
        })
      }
    },
  })

  return {
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
  }
}

// --- Budget Items ---

async function fetchBudgetItems(budgetId: string): Promise<BudgetItem[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('budget_items')
    .select('*')
    .eq('budget_id', budgetId)
    .is('deleted_at', null)
    .order('display_order')

  if (error) throw new Error(error.message)
  return (data ?? []) as BudgetItem[]
}

/** Lista itens de um orcamento */
export function useBudgetItems(
  budgetId: string,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: budgetKeys.items(budgetId),
    queryFn: () => fetchBudgetItems(budgetId),
    staleTime: 60_000,
    enabled: (options?.enabled ?? true) && !!budgetId,
  })
}

export function useCreateBudgetItem() {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: async (payload: CreateBudgetItemPayload) => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('budget_items')
        .insert(payload)
        .select()
        .single()
      if (error) throw new Error(error.message)
      return data as BudgetItem
    },
    onSuccess: (_data, payload) => {
      queryClient.invalidateQueries({
        queryKey: budgetKeys.items(payload.budget_id),
      })
      queryClient.invalidateQueries({
        queryKey: budgetKeys.detail(payload.budget_id),
      })
    },
  })

  return {
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
  }
}

export function useUpdateBudgetItem() {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: async ({
      id,
      budgetId,
      payload,
    }: {
      id: string
      budgetId: string
      payload: UpdateBudgetItemPayload
    }) => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('budget_items')
        .update(payload)
        .eq('id', id)
        .is('deleted_at', null)
        .select()
        .single()
      if (error) throw new Error(error.message)
      return data as BudgetItem
    },
    onSuccess: (_data, { budgetId }) => {
      queryClient.invalidateQueries({
        queryKey: budgetKeys.items(budgetId),
      })
      queryClient.invalidateQueries({
        queryKey: budgetKeys.detail(budgetId),
      })
    },
  })

  return {
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
  }
}

export function useDeleteBudgetItem() {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: async ({
      id,
      budgetId,
    }: {
      id: string
      budgetId: string
    }) => {
      const supabase = createClient()
      const { error } = await supabase
        .from('budget_items')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
        .is('deleted_at', null)
      if (error) throw new Error(error.message)
    },
    onSuccess: (_data, { budgetId }) => {
      queryClient.invalidateQueries({
        queryKey: budgetKeys.items(budgetId),
      })
      queryClient.invalidateQueries({
        queryKey: budgetKeys.detail(budgetId),
      })
    },
  })

  return {
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
  }
}
