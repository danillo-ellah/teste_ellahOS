'use client'

import { useState, useEffect, useRef } from 'react'
import { RefreshCw, HelpCircle, Search, FilterX } from 'lucide-react'
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
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { NfStatsCards } from './_components/nf-stats-cards'
import { NfDocumentTable } from './_components/nf-document-table'
import { NfValidationDialog } from './_components/nf-validation-dialog'
import { NfReassignDialog } from './_components/nf-reassign-dialog'
import { useNfList, useNfStats, useReassignNf, useRejectNf } from '@/hooks/useNf'
import { toast } from 'sonner'
import type { NfDocument, NfFilters, NfStatus, FinancialRecordMatch } from '@/types/nf'

const DEFAULT_FILTERS: NfFilters = {
  page: 1,
  per_page: 20,
  sort_by: 'created_at',
  sort_order: 'desc',
}

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'all', label: 'Todos os status' },
  { value: 'pending_review', label: 'Pendente' },
  { value: 'auto_matched', label: 'Auto-matched' },
  { value: 'confirmed', label: 'Confirmado' },
  { value: 'rejected', label: 'Rejeitado' },
]

const PERIOD_OPTIONS: { value: string; label: string }[] = [
  { value: 'all', label: 'Todo periodo' },
  { value: 'today', label: 'Hoje' },
  { value: 'week', label: 'Esta semana' },
  { value: 'month', label: 'Este mes' },
  { value: 'last_month', label: 'Mes passado' },
]

// --- Filter chip ---

function FilterChip({
  label,
  onRemove,
}: {
  label: string
  onRemove: () => void
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
      {label}
      <button
        type="button"
        onClick={onRemove}
        className="ml-0.5 rounded-full hover:text-red-500 transition-colors"
        aria-label={`Remover filtro: ${label}`}
      >
        &times;
      </button>
    </span>
  )
}

export default function NfValidationPage() {
  const [filters, setFilters] = useState<NfFilters>(DEFAULT_FILTERS)
  const [searchInput, setSearchInput] = useState('')
  const [validationTarget, setValidationTarget] = useState<NfDocument | null>(null)
  const [reassignTarget, setReassignTarget] = useState<NfDocument | null>(null)
  const [validationOpen, setValidationOpen] = useState(false)
  const [reassignOpen, setReassignOpen] = useState(false)

  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  const { mutateAsync: reassignNf } = useReassignNf()
  const { mutateAsync: rejectNf } = useRejectNf()

  // Debounce busca 300ms
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setFilters((prev) => ({ ...prev, search: searchInput || undefined, page: 1 }))
    }, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [searchInput])

  const { data: nfs, meta, isLoading, isError, refetch } = useNfList(filters)
  const {
    data: stats,
    isLoading: statsLoading,
    refetch: refetchStats,
  } = useNfStats()

  function handleRefresh() {
    refetch()
    refetchStats()
    toast.info('Atualizando...')
  }

  function handleFiltersChange(partial: Partial<NfFilters>) {
    setFilters((prev) => ({ ...prev, ...partial }))
  }

  function handleStatusFilter(status: NfStatus | null) {
    setFilters((prev) => ({
      ...prev,
      status: status ?? 'all',
      page: 1,
    }))
  }

  function handleValidate(nf: NfDocument) {
    setValidationTarget(nf)
    setValidationOpen(true)
  }

  function handleReassign(nf: NfDocument) {
    setReassignTarget(nf)
    setReassignOpen(true)
  }

  async function handleBulkReject(ids: string[]) {
    if (ids.length === 0) return
    try {
      await Promise.all(
        ids.map((id) =>
          rejectNf({ nf_document_id: id, rejection_reason: 'Rejeitado em lote' }),
        ),
      )
      toast.success(`${ids.length} NF(s) rejeitada(s)`)
      refetch()
      refetchStats()
    } catch {
      toast.error('Erro ao rejeitar NFs em lote')
    }
  }

  async function handleReassignSelect(record: FinancialRecordMatch) {
    if (!reassignTarget) return
    try {
      await reassignNf({
        nf_document_id: reassignTarget.id,
        financial_record_id: record.id,
        job_id: record.job_id ?? undefined,
      })
      toast.success('NF reclassificada com sucesso')
      setReassignTarget(null)
    } catch {
      toast.error('Erro ao reclassificar NF. Tente novamente.')
    }
  }

  // Filtros ativos (para chips e botao limpar)
  const activeStatus =
    filters.status && filters.status !== 'all' ? filters.status : null
  const activePeriod =
    filters.period && filters.period !== 'all' ? filters.period : null
  const hasActiveFilters = !!(activeStatus ?? activePeriod ?? filters.search ?? filters.job_id)

  function clearFilters() {
    setSearchInput('')
    setFilters(DEFAULT_FILTERS)
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs text-zinc-500">
            Financeiro{' '}
            <span className="mx-1 text-zinc-400">/</span>
            NFs
          </p>
          <h1 className="mt-0.5 text-2xl font-semibold tracking-tight">
            Validacao de NFs
          </h1>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="gap-1.5"
          >
            <RefreshCw className="h-4 w-4" />
            Atualizar
          </Button>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
                <HelpCircle className="h-4 w-4 text-zinc-400" />
                <span className="sr-only">Ajuda</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left" className="max-w-xs text-xs">
              Esta pagina exibe as NFs recebidas por email. Confirme o match
              automatico ou classifique manualmente cada NF para um lancamento
              financeiro.
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Stats Cards */}
      <NfStatsCards
        stats={stats}
        isLoading={statsLoading}
        activeStatus={filters.status}
        onStatusFilter={handleStatusFilter}
      />

      {/* Filter Bar */}
      <div className="mt-6 space-y-2">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {/* Busca */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <Input
              placeholder="Buscar por fornecedor..."
              className="pl-9"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>

          {/* Status */}
          <Select
            value={filters.status ?? 'all'}
            onValueChange={(v) =>
              handleFiltersChange({ status: v === 'all' ? undefined : (v as NfStatus), page: 1 })
            }
          >
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Periodo */}
          <Select
            value={filters.period ?? 'all'}
            onValueChange={(v) =>
              handleFiltersChange({
                period:
                  v === 'all'
                    ? undefined
                    : (v as NfFilters['period']),
                page: 1,
              })
            }
          >
            <SelectTrigger className="w-full sm:w-[160px]">
              <SelectValue placeholder="Periodo" />
            </SelectTrigger>
            <SelectContent>
              {PERIOD_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Limpar filtros */}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="gap-1.5 text-zinc-500 hover:text-foreground"
            >
              <FilterX className="h-4 w-4" />
              Limpar filtros
            </Button>
          )}
        </div>

        {/* Filter chips */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-1.5">
            {activeStatus && (
              <FilterChip
                label={`Status: ${STATUS_OPTIONS.find((o) => o.value === activeStatus)?.label ?? activeStatus}`}
                onRemove={() =>
                  handleFiltersChange({ status: undefined, page: 1 })
                }
              />
            )}
            {activePeriod && (
              <FilterChip
                label={`Periodo: ${PERIOD_OPTIONS.find((o) => o.value === activePeriod)?.label ?? activePeriod}`}
                onRemove={() =>
                  handleFiltersChange({ period: undefined, page: 1 })
                }
              />
            )}
            {filters.search && (
              <FilterChip
                label={`Busca: "${filters.search}"`}
                onRemove={() => {
                  setSearchInput('')
                  handleFiltersChange({ search: undefined, page: 1 })
                }}
              />
            )}
          </div>
        )}
      </div>

      {/* Tabela */}
      <div className="mt-4">
        <NfDocumentTable
          nfs={nfs}
          meta={meta}
          isLoading={isLoading}
          isError={isError}
          hasActiveFilters={hasActiveFilters}
          filters={filters}
          onFiltersChange={handleFiltersChange}
          onValidate={handleValidate}
          onReassign={handleReassign}
          onRefetch={refetch}
          onBulkReject={handleBulkReject}
        />
      </div>

      {/* Modal de validacao */}
      <NfValidationDialog
        nf={validationTarget}
        open={validationOpen}
        onOpenChange={(open) => {
          setValidationOpen(open)
          if (!open) setValidationTarget(null)
        }}
        onSuccess={() => {
          refetch()
          refetchStats()
        }}
      />

      {/* Modal de reclassificacao direto da tabela */}
      <NfReassignDialog
        open={reassignOpen}
        onOpenChange={(open) => {
          setReassignOpen(open)
          if (!open) setReassignTarget(null)
        }}
        onSelect={handleReassignSelect}
        currentJobId={reassignTarget?.matched_job_id}
      />
    </div>
  )
}
