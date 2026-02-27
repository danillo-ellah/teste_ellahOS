'use client'

import { useEffect, useRef, useState } from 'react'
import {
  Search,
  FilterX,
  Receipt,
  SearchX,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
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
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/format'
import { NfRequestStatusBadge } from './nf-request-status-badge'
import type {
  NfRequestRecord,
  NfRequestFilters,
  NfRequestSupplierGroup,
  NfRequestRecordType,
} from '@/types/nf'

function groupBySupplier(records: NfRequestRecord[]): NfRequestSupplierGroup[] {
  const map = new Map<string, NfRequestSupplierGroup>()

  for (const record of records) {
    const key = record.supplier_name ?? 'Sem fornecedor'
    const existing = map.get(key)

    if (existing) {
      existing.records.push(record)
      existing.total_amount += record.amount
    } else {
      map.set(key, {
        supplier_name: key,
        supplier_email: record.supplier_email,
        supplier_cnpj: record.supplier_cnpj,
        total_amount: record.amount,
        records: [record],
      })
    }
  }

  // Ordena: grupos com maior valor total primeiro
  return Array.from(map.values()).sort((a, b) => b.total_amount - a.total_amount)
}

// --- Skeleton de linha ---

function RecordRowSkeleton() {
  return (
    <div className="flex items-center gap-3 px-3 py-2">
      <Skeleton className="h-4 w-4 shrink-0 rounded" />
      <Skeleton className="h-4 flex-1" />
      <Skeleton className="h-4 w-12 rounded-full" />
      <Skeleton className="h-4 w-16" />
      <Skeleton className="h-4 w-14 rounded-full" />
    </div>
  )
}

// --- Linha de financial record ---

interface RecordRowProps {
  record: NfRequestRecord
  selected: boolean
  onToggle: (id: string) => void
}

function RecordRow({ record, selected, onToggle }: RecordRowProps) {
  return (
    <div
      className={cn(
        'flex h-11 cursor-pointer items-center gap-3 px-3 py-2 transition-colors',
        selected
          ? 'border-l-2 border-rose-400 bg-rose-50 dark:bg-rose-950/20'
          : 'border-l-2 border-transparent hover:bg-zinc-50 dark:hover:bg-zinc-800/50',
      )}
      onClick={() => onToggle(record.id)}
      role="row"
    >
      <Checkbox
        checked={selected}
        onCheckedChange={() => onToggle(record.id)}
        aria-label={`Selecionar: ${record.description} - ${formatCurrency(record.amount)}`}
        className="shrink-0"
        onClick={(e) => e.stopPropagation()}
      />

      <Tooltip>
        <TooltipTrigger asChild>
          <span className="flex-1 truncate text-sm text-zinc-800 dark:text-zinc-200">
            {record.description}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs text-xs">
          {record.description}
        </TooltipContent>
      </Tooltip>

      {record.job_code && (
        <Badge variant="outline" className="shrink-0 text-xs">
          {record.job_code}
        </Badge>
      )}

      <span className="w-[80px] shrink-0 text-right font-mono text-sm text-zinc-700 dark:text-zinc-300">
        {formatCurrency(record.amount)}
      </span>

      <div className="shrink-0">
        <NfRequestStatusBadge status={record.nf_request_status} />
      </div>
    </div>
  )
}

// --- Header de grupo de fornecedor ---

interface SupplierGroupHeaderProps {
  group: NfRequestSupplierGroup
  allSelected: boolean
  someSelected: boolean
  onToggleAll: () => void
  collapsed: boolean
  onToggleCollapse: () => void
}

function SupplierGroupHeader({
  group,
  allSelected,
  someSelected,
  onToggleAll,
  collapsed,
  onToggleCollapse,
}: SupplierGroupHeaderProps) {
  // Para o estado indeterminate: usamos data-state manualmente via wrapper
  const isIndeterminate = someSelected && !allSelected

  return (
    <div className="flex items-center gap-3 border-t border-zinc-200 bg-zinc-50 px-3 py-2 first:border-t-0 dark:border-zinc-700 dark:bg-zinc-800/60">
      <Checkbox
        checked={isIndeterminate ? 'indeterminate' : allSelected}
        onCheckedChange={() => onToggleAll()}
        aria-label={`Selecionar todos os itens de ${group.supplier_name}`}
        aria-checked={allSelected ? 'true' : someSelected ? 'mixed' : 'false'}
        className="shrink-0"
      />

      <button
        type="button"
        onClick={onToggleCollapse}
        className="flex flex-1 items-center gap-2 text-left"
      >
        <span className="text-xs font-medium uppercase tracking-wide text-zinc-600 dark:text-zinc-400">
          {group.supplier_name}
        </span>
        <Badge variant="outline" className="text-xs">
          {group.records.length} {group.records.length === 1 ? 'item' : 'itens'}
        </Badge>
        {collapsed ? (
          <ChevronDown className="ml-auto h-3.5 w-3.5 text-zinc-400" />
        ) : (
          <ChevronUp className="ml-auto h-3.5 w-3.5 text-zinc-400" />
        )}
      </button>

      <span className="ml-auto shrink-0 font-mono text-sm text-zinc-600 dark:text-zinc-400">
        {formatCurrency(group.total_amount)}
      </span>
    </div>
  )
}

// --- Empty states ---

function EmptyStateNoData({ onViewFinancial }: { onViewFinancial: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <Receipt className="h-12 w-12 text-zinc-300" />
      <p className="mt-4 text-lg font-semibold text-foreground">
        Todos em dia!
      </p>
      <p className="mt-2 max-w-sm text-center text-sm text-zinc-500">
        Nao ha lancamentos aguardando nota fiscal.
      </p>
      <Button
        variant="outline"
        className="mt-6"
        onClick={onViewFinancial}
      >
        Ver Lancamentos
      </Button>
    </div>
  )
}

function EmptyStateFiltered({ onClear }: { onClear: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <SearchX className="h-12 w-12 text-zinc-300" />
      <p className="mt-4 text-lg font-semibold text-foreground">
        Nenhum lancamento encontrado
      </p>
      <p className="mt-2 text-sm text-zinc-500">
        Tente ajustar os filtros.
      </p>
      <Button variant="outline" className="mt-6" onClick={onClear}>
        Limpar filtros
      </Button>
    </div>
  )
}

// --- Componente principal ---

const RECORD_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: 'all', label: 'Todos os tipos' },
  { value: 'servico', label: 'Servicos' },
  { value: 'diaria', label: 'Diarias' },
  { value: 'aluguel', label: 'Aluguel' },
  { value: 'outros', label: 'Outros' },
]

interface FinancialRecordPickerProps {
  records: NfRequestRecord[] | undefined
  isLoading: boolean
  isError: boolean
  filters: NfRequestFilters
  onFiltersChange: (partial: Partial<NfRequestFilters>) => void
  selectedIds: Set<string>
  onToggleRecord: (id: string) => void
  onToggleSupplierGroup: (group: NfRequestSupplierGroup) => void
  onSelectAll: () => void
  onDeselectAll: () => void
  onViewFinancial: () => void
}

export function FinancialRecordPicker({
  records,
  isLoading,
  isError,
  filters,
  onFiltersChange,
  selectedIds,
  onToggleRecord,
  onToggleSupplierGroup,
  onSelectAll,
  onDeselectAll,
  onViewFinancial,
}: FinancialRecordPickerProps) {
  const [searchInput, setSearchInput] = useState(filters.search ?? '')
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  // Debounce busca 300ms
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      onFiltersChange({ search: searchInput || undefined })
    }, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput])

  const hasActiveFilters = !!(
    filters.search ||
    (filters.record_type && filters.record_type !== 'all') ||
    filters.supplier_name
  )

  function clearFilters() {
    setSearchInput('')
    onFiltersChange({ search: undefined, record_type: undefined, supplier_name: undefined })
  }

  function toggleGroupCollapse(supplierName: string) {
    setCollapsedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(supplierName)) next.delete(supplierName)
      else next.add(supplierName)
      return next
    })
  }

  const groups = records ? groupBySupplier(records) : []
  const totalItems = records?.length ?? 0
  const allSelected = totalItems > 0 && selectedIds.size === totalItems

  const globalCheckIndeterminate =
    selectedIds.size > 0 && selectedIds.size < totalItems

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <p className="text-sm text-red-500">Erro ao carregar lancamentos. Tente novamente.</p>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      {/* Filtros */}
      <div className="space-y-2 px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <Input
              placeholder="Buscar descricao ou fornecedor..."
              className="pl-9 text-sm"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              aria-label="Buscar lancamentos"
            />
          </div>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="shrink-0 gap-1.5 text-zinc-500 hover:text-foreground"
            >
              <FilterX className="h-4 w-4" />
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Select
            value={filters.record_type ?? 'all'}
            onValueChange={(v) =>
              onFiltersChange({
                record_type: v === 'all' ? undefined : (v as NfRequestRecordType),
              })
            }
          >
            <SelectTrigger className="h-8 flex-1 text-xs">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              {RECORD_TYPE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value} className="text-xs">
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Header de selecao global */}
      {!isLoading && totalItems > 0 && (
        <div className="flex items-center gap-3 border-b border-zinc-200 px-3 py-2 dark:border-zinc-800">
          <Checkbox
            checked={globalCheckIndeterminate ? 'indeterminate' : allSelected}
            onCheckedChange={() => {
              if (allSelected || globalCheckIndeterminate) {
                onDeselectAll()
              } else {
                onSelectAll()
              }
            }}
            aria-label="Selecionar todos os lancamentos"
            aria-checked={
              allSelected ? 'true' : globalCheckIndeterminate ? 'mixed' : 'false'
            }
          />
          <span className="text-xs text-zinc-500">
            {selectedIds.size > 0
              ? `${selectedIds.size} de ${totalItems} selecionados`
              : `Selecionar todos (${totalItems} itens)`}
          </span>
          {selectedIds.size > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto h-6 text-xs text-zinc-400 hover:text-zinc-700"
              onClick={onDeselectAll}
            >
              Limpar selecao
            </Button>
          )}
        </div>
      )}

      {/* Lista de grupos */}
      <ScrollArea className="flex-1" aria-label="Lancamentos sem nota fiscal">
        {isLoading ? (
          <div className="py-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <RecordRowSkeleton key={i} />
            ))}
          </div>
        ) : groups.length === 0 ? (
          hasActiveFilters ? (
            <EmptyStateFiltered onClear={clearFilters} />
          ) : (
            <EmptyStateNoData onViewFinancial={onViewFinancial} />
          )
        ) : (
          <div role="list">
            {groups.map((group) => {
              const selectedInGroup = group.records.filter((r) =>
                selectedIds.has(r.id),
              )
              const allGroupSelected =
                selectedInGroup.length === group.records.length
              const someGroupSelected =
                selectedInGroup.length > 0 && !allGroupSelected
              const isCollapsed = collapsedGroups.has(group.supplier_name)

              return (
                <div
                  key={group.supplier_name}
                  role="group"
                  aria-labelledby={`group-${group.supplier_name}`}
                >
                  <SupplierGroupHeader
                    group={group}
                    allSelected={allGroupSelected}
                    someSelected={someGroupSelected}
                    onToggleAll={() => onToggleSupplierGroup(group)}
                    collapsed={isCollapsed}
                    onToggleCollapse={() =>
                      toggleGroupCollapse(group.supplier_name)
                    }
                  />

                  {!isCollapsed &&
                    group.records.map((record) => (
                      <RecordRow
                        key={record.id}
                        record={record}
                        selected={selectedIds.has(record.id)}
                        onToggle={onToggleRecord}
                      />
                    ))}
                </div>
              )
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}
