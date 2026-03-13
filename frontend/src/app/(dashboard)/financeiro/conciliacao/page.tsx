'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Landmark,
  Upload,
  RefreshCw,
  Search,
  FilterX,
  Wand2,
  CheckCircle2,
  AlertCircle,
  CircleDot,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Card,
  CardContent,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { OFXUploadDialog } from './_components/OFXUploadDialog'
import { TransactionsTable } from './_components/TransactionsTable'
import { useStatementList, useTransactionList, useAutoReconcile } from '@/hooks/useBankReconciliation'
import { toast } from 'sonner'
import type { BankStatement, TransactionFilters } from '@/types/bank-reconciliation'

const DEFAULT_TX_FILTERS: Omit<TransactionFilters, 'statement_id'> = {
  page: 1,
  per_page: 50,
  sort_by: 'transaction_date',
  sort_order: 'asc',
}

export default function ConciliacaoPage() {
  const [uploadOpen, setUploadOpen] = useState(false)
  const [selectedStatement, setSelectedStatement] = useState<BankStatement | null>(null)
  const [txFilters, setTxFilters] = useState<Omit<TransactionFilters, 'statement_id'>>(DEFAULT_TX_FILTERS)
  const [searchInput, setSearchInput] = useState('')
  const [reconcileFilter, setReconcileFilter] = useState<'all' | 'reconciled' | 'unreconciled'>('all')

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { mutateAsync: autoReconcile, isPending: isAutoReconciling } = useAutoReconcile()

  // Lista de extratos
  const {
    data: statementsData,
    isLoading: statementsLoading,
    refetch: refetchStatements,
  } = useStatementList({ sort_by: 'import_date', sort_order: 'desc', per_page: 20 })

  const statements = statementsData?.data ?? []

  // Selecionar automaticamente o primeiro extrato ao carregar
  useEffect(() => {
    if (!selectedStatement && statements.length > 0) {
      setSelectedStatement(statements[0])
    }
  }, [statements, selectedStatement])

  // Filtros de transacoes (com debounce para busca)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setTxFilters((prev) => ({ ...prev, search: searchInput.trim() || undefined, page: 1 }))
    }, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [searchInput])

  // Aplicar filtro de conciliacao
  useEffect(() => {
    setTxFilters((prev) => ({
      ...prev,
      reconciled: reconcileFilter === 'all' ? undefined : reconcileFilter === 'reconciled',
      page: 1,
    }))
  }, [reconcileFilter])

  // Transacoes do extrato selecionado
  const txQueryFilters: TransactionFilters = selectedStatement
    ? { statement_id: selectedStatement.id, ...txFilters }
    : { statement_id: '' }

  const {
    data: txData,
    isLoading: txLoading,
    isError: txError,
    refetch: refetchTransactions,
  } = useTransactionList(txQueryFilters)

  function handleStatementSelect(statement: BankStatement) {
    setSelectedStatement(statement)
    setTxFilters(DEFAULT_TX_FILTERS)
    setSearchInput('')
    setReconcileFilter('all')
  }

  function handleUploadSuccess(statement: BankStatement) {
    setUploadOpen(false)
    refetchStatements()
    setSelectedStatement(statement)
    toast.success(`Extrato "${statement.bank_name}" importado com sucesso`)
  }

  async function handleAutoReconcile(apply: boolean) {
    if (!selectedStatement) return
    try {
      const result = await autoReconcile({ statement_id: selectedStatement.id, apply })
      if (apply) {
        toast.success(
          `Auto-conciliacao aplicada: ${result.applied_count} transacoes conciliadas`,
        )
        refetchTransactions()
        refetchStatements()
      } else {
        toast.info(
          `${result.matches_found} correspondencias encontradas de ${result.total_transactions} transacoes pendentes`,
        )
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro na auto-conciliacao'
      toast.error(msg)
    }
  }

  function handleTxFiltersChange(partial: Partial<Omit<TransactionFilters, 'statement_id'>>) {
    setTxFilters((prev) => ({ ...prev, ...partial }))
  }

  function clearFilters() {
    setSearchInput('')
    setReconcileFilter('all')
    setTxFilters(DEFAULT_TX_FILTERS)
  }

  const hasActiveFilters = !!(txFilters.search || reconcileFilter !== 'all')

  const reconciliationPct = selectedStatement?.reconciliation_pct ?? 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs text-zinc-500">
            Financeiro <span className="mx-1 text-zinc-400">/</span> Conciliacao Bancaria
          </p>
          <h1 className="mt-0.5 text-2xl font-semibold tracking-tight">Conciliacao Bancaria</h1>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => { refetchStatements(); refetchTransactions() }}
            className="gap-1.5"
          >
            <RefreshCw className="h-4 w-4" />
            Atualizar
          </Button>
          <Button size="sm" onClick={() => setUploadOpen(true)} className="gap-1.5">
            <Upload className="h-4 w-4" />
            Importar Extrato (OFX)
          </Button>
        </div>
      </div>

      {/* Layout em 2 colunas: lista de extratos + detalhe */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_1fr]">
        {/* Coluna esquerda: lista de extratos */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide px-1">
            Extratos importados
          </p>

          {statementsLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full rounded-lg" />
              ))}
            </div>
          ) : statements.length === 0 ? (
            <Card>
              <CardContent className="p-4 text-center text-sm text-zinc-500">
                <Landmark className="h-8 w-8 mx-auto mb-2 text-zinc-300" />
                Nenhum extrato importado ainda.
                <br />
                Clique em &quot;Importar Extrato&quot; para comecar.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-1.5">
              {statements.map((stmt) => {
                const isSelected = selectedStatement?.id === stmt.id
                const pct = stmt.reconciliation_pct ?? 0
                return (
                  <button
                    key={stmt.id}
                    type="button"
                    onClick={() => handleStatementSelect(stmt)}
                    className={cn(
                      'w-full text-left rounded-lg border p-3 transition-colors',
                      isSelected
                        ? 'border-primary bg-primary/5'
                        : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-900',
                    )}
                  >
                    <div className="flex items-start justify-between gap-1 mb-1">
                      <span className="text-sm font-medium truncate">{stmt.bank_name}</span>
                      <Badge
                        variant={pct === 100 ? 'default' : 'secondary'}
                        className="text-xs shrink-0"
                      >
                        {pct}%
                      </Badge>
                    </div>
                    {stmt.account_identifier && (
                      <p className="text-xs text-zinc-500 mb-1">***{stmt.account_identifier}</p>
                    )}
                    <p className="text-xs text-zinc-400">
                      {new Date(stmt.period_start).toLocaleDateString('pt-BR')} a{' '}
                      {new Date(stmt.period_end).toLocaleDateString('pt-BR')}
                    </p>
                    <div className="mt-2 h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all',
                          pct === 100 ? 'bg-green-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-400',
                        )}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="mt-1 text-xs text-zinc-400">
                      {stmt.reconciled_entries}/{stmt.total_entries} transacoes
                    </p>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Coluna direita: detalhe do extrato */}
        <div className="space-y-4">
          {selectedStatement ? (
            <>
              {/* Info do extrato selecionado */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
                        <Landmark className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-base font-semibold">{selectedStatement.bank_name}</h2>
                          {selectedStatement.account_identifier && (
                            <span className="text-sm text-zinc-500">
                              ***{selectedStatement.account_identifier}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-zinc-500">
                          {new Date(selectedStatement.period_start).toLocaleDateString('pt-BR')} a{' '}
                          {new Date(selectedStatement.period_end).toLocaleDateString('pt-BR')}
                          {selectedStatement.file_name && (
                            <span className="ml-2 text-zinc-400">({selectedStatement.file_name})</span>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Stats de conciliacao */}
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        <span className="text-zinc-600 dark:text-zinc-400">
                          {selectedStatement.reconciled_entries} conciliadas
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <AlertCircle className="h-4 w-4 text-red-400" />
                        <span className="text-zinc-600 dark:text-zinc-400">
                          {selectedStatement.total_entries - selectedStatement.reconciled_entries} pendentes
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <CircleDot className="h-4 w-4 text-zinc-400" />
                        <span className="text-zinc-600 dark:text-zinc-400">
                          {selectedStatement.total_entries} total
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Barra de progresso */}
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs text-zinc-500 mb-1">
                      <span>Progresso da conciliacao</span>
                      <span className="font-medium">{reconciliationPct}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all duration-300',
                          reconciliationPct === 100
                            ? 'bg-green-500'
                            : reconciliationPct >= 50
                            ? 'bg-amber-500'
                            : 'bg-red-400',
                        )}
                        style={{ width: `${reconciliationPct}%` }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Filtros e acoes */}
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center flex-1">
                  {/* Busca */}
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                    <Input
                      placeholder="Buscar por descricao..."
                      className="pl-9 h-9"
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                    />
                  </div>

                  {/* Filtro de status */}
                  <Select
                    value={reconcileFilter}
                    onValueChange={(v) => setReconcileFilter(v as typeof reconcileFilter)}
                  >
                    <SelectTrigger className="h-9 w-full sm:w-[180px]">
                      <SelectValue placeholder="Todas as transacoes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as transacoes</SelectItem>
                      <SelectItem value="unreconciled">Nao conciliadas</SelectItem>
                      <SelectItem value="reconciled">Conciliadas</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Limpar filtros */}
                  {hasActiveFilters && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearFilters}
                      className="gap-1.5 text-rose-500 hover:text-rose-600 h-9"
                    >
                      <FilterX className="h-4 w-4" />
                      Limpar
                    </Button>
                  )}
                </div>

                {/* Botao auto-conciliar */}
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 h-9 shrink-0"
                  disabled={isAutoReconciling}
                  onClick={() => handleAutoReconcile(true)}
                >
                  <Wand2 className="h-4 w-4" />
                  {isAutoReconciling ? 'Conciliando...' : 'Auto-conciliar'}
                </Button>
              </div>

              {/* Tabela de transacoes */}
              <TransactionsTable
                transactions={txData?.data}
                meta={txData?.meta}
                isLoading={txLoading}
                isError={txError}
                filters={txQueryFilters}
                onFiltersChange={handleTxFiltersChange}
                onRefetch={() => {
                  refetchTransactions()
                  refetchStatements()
                }}
              />
            </>
          ) : (
            /* Estado vazio — nenhum extrato selecionado */
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-zinc-200 dark:border-zinc-700 py-20 text-center">
              <Landmark className="h-12 w-12 text-zinc-300 mb-3" />
              <h3 className="text-base font-medium text-zinc-700 dark:text-zinc-300">
                Nenhum extrato selecionado
              </h3>
              <p className="mt-1 text-sm text-zinc-500 max-w-xs">
                Selecione um extrato na lista ao lado ou importe um novo arquivo OFX do seu banco.
              </p>
              <Button
                size="sm"
                className="mt-4 gap-1.5"
                onClick={() => setUploadOpen(true)}
              >
                <Upload className="h-4 w-4" />
                Importar Extrato (OFX)
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Dialog de upload */}
      <OFXUploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        onSuccess={handleUploadSuccess}
      />
    </div>
  )
}
