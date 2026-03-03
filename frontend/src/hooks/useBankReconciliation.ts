import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiMutate } from '@/lib/api'
import { bankReconciliationKeys } from '@/lib/query-keys'
import type {
  BankStatement,
  BankTransaction,
  ImportOFXBody,
  ReconcileBody,
  UnreconcileBody,
  AutoReconcileResult,
  StatementFilters,
  TransactionFilters,
} from '@/types/bank-reconciliation'
import type { PaginationMeta } from '@/types/jobs'

// Importar tipo de retorno do extrato com statement embutido no meta
interface TransactionMeta extends PaginationMeta {
  statement: BankStatement
}

// Converte filtros de extrato para Record<string, string>
function statementFiltersToParams(filters: Omit<StatementFilters, 'statement_id'>): Record<string, string> {
  const params: Record<string, string> = {}
  if (filters.bank_name) params.bank_name = filters.bank_name
  if (filters.period_from) params.period_from = filters.period_from
  if (filters.period_to) params.period_to = filters.period_to
  if (filters.page !== undefined) params.page = String(filters.page)
  if (filters.per_page !== undefined) params.per_page = String(filters.per_page)
  if (filters.sort_by) params.sort_by = filters.sort_by
  if (filters.sort_order) params.sort_order = filters.sort_order
  return params
}

// Converte filtros de transacao para Record<string, string>
function transactionFiltersToParams(filters: Omit<TransactionFilters, 'statement_id'>): Record<string, string> {
  const params: Record<string, string> = {}
  if (filters.reconciled !== undefined) params.reconciled = String(filters.reconciled)
  if (filters.transaction_type) params.transaction_type = filters.transaction_type
  if (filters.date_from) params.date_from = filters.date_from
  if (filters.date_to) params.date_to = filters.date_to
  if (filters.search?.trim()) params.search = filters.search.trim()
  if (filters.page !== undefined) params.page = String(filters.page)
  if (filters.per_page !== undefined) params.per_page = String(filters.per_page)
  if (filters.sort_by) params.sort_by = filters.sort_by
  if (filters.sort_order) params.sort_order = filters.sort_order
  return params
}

// --- Lista de extratos ---

export function useStatementList(filters: StatementFilters = {}) {
  const params = statementFiltersToParams(filters)

  const query = useQuery({
    queryKey: bankReconciliationKeys.statementList(params),
    queryFn: () => apiGet<BankStatement[]>('bank-reconciliation/statements', params),
    staleTime: 30_000,
  })

  return {
    data: query.data
      ? { data: query.data.data, meta: query.data.meta }
      : undefined,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  }
}

// --- Lista de transacoes de um extrato ---

export function useTransactionList(filters: TransactionFilters) {
  const { statement_id, ...rest } = filters
  const params = transactionFiltersToParams(rest)

  const query = useQuery({
    queryKey: bankReconciliationKeys.transactionList(statement_id, params),
    queryFn: () =>
      apiGet<BankTransaction[]>(
        'bank-reconciliation/transactions',
        { statement_id, ...params },
      ),
    enabled: !!statement_id,
    staleTime: 15_000,
  })

  return {
    data: query.data
      ? {
          data: query.data.data,
          meta: query.data.meta as TransactionMeta | undefined,
        }
      : undefined,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  }
}

// --- Importar arquivo OFX ---

interface ImportResult {
  statement: BankStatement
  inserted_count: number
  skipped_count: number
  period_start: string
  period_end: string
}

export function useImportOFX() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (body: ImportOFXBody) =>
      apiMutate<ImportResult>(
        'bank-reconciliation/import',
        'POST',
        body as unknown as Record<string, unknown>,
      ).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bankReconciliationKeys.statements() })
    },
  })
}

// --- Conciliacao manual ---

export function useReconcile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (body: ReconcileBody | UnreconcileBody) =>
      apiMutate<BankTransaction>(
        'bank-reconciliation/reconcile',
        'POST',
        body as unknown as Record<string, unknown>,
      ).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bankReconciliationKeys.all })
    },
  })
}

// --- Auto-conciliacao ---

export function useAutoReconcile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      statement_id,
      apply,
    }: {
      statement_id: string
      apply: boolean
    }) =>
      apiMutate<AutoReconcileResult>(
        'bank-reconciliation/auto-reconcile',
        'POST',
        { statement_id, apply } as unknown as Record<string, unknown>,
      ).then((r) => r.data),
    onSuccess: (_data, variables) => {
      if (variables.apply) {
        queryClient.invalidateQueries({
          queryKey: bankReconciliationKeys.transactions(variables.statement_id),
        })
        queryClient.invalidateQueries({ queryKey: bankReconciliationKeys.statements() })
      }
    },
  })
}
