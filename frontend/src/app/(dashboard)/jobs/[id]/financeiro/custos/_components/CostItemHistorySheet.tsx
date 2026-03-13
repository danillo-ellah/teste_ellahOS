'use client'

import { useState } from 'react'
import { Plus, Pencil, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useCostItemHistory } from '@/hooks/useCostItemHistory'
import { formatRelativeDate, formatDate, formatCurrency } from '@/lib/format'
import type { CostItemHistoryEntry, CostItemChange, CostItemHistoryAction } from '@/types/cost-item-history'

// ============ Props ============

interface CostItemHistorySheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  jobId: string
}

// ============ Configuracao por acao ============

const ACTION_CONFIG: Record<
  CostItemHistoryAction,
  { label: string; icon: React.ElementType; iconClass: string; badgeClass: string }
> = {
  INSERT: {
    label: 'Criacao',
    icon: Plus,
    iconClass: 'text-emerald-600 dark:text-emerald-400',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800',
  },
  UPDATE: {
    label: 'Edicao',
    icon: Pencil,
    iconClass: 'text-blue-600 dark:text-blue-400',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800',
  },
  DELETE: {
    label: 'Exclusao',
    icon: Trash2,
    iconClass: 'text-red-600 dark:text-red-400',
    badgeClass: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800',
  },
}

// Filtros de acao disponiveis no topo do sheet
const ACTION_FILTERS: Array<{ value: CostItemHistoryAction | 'all'; label: string }> = [
  { value: 'all', label: 'Todos' },
  { value: 'INSERT', label: 'Criacao' },
  { value: 'UPDATE', label: 'Edicao' },
  { value: 'DELETE', label: 'Exclusao' },
]

// ============ Componente principal ============

export function CostItemHistorySheet({
  open,
  onOpenChange,
  jobId,
}: CostItemHistorySheetProps) {
  const [page, setPage] = useState(1)
  const [actionFilter, setActionFilter] = useState<CostItemHistoryAction | 'all'>('all')

  // Resetar pagina ao trocar filtro
  function handleActionFilter(value: CostItemHistoryAction | 'all') {
    setActionFilter(value)
    setPage(1)
  }

  const { data: entries, meta, isLoading, isError, refetch } = useCostItemHistory(jobId, {
    page,
    perPage: 15,
    action: actionFilter === 'all' ? undefined : actionFilter,
  })

  const list = entries ?? []

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-[420px] flex flex-col p-0">
        {/* Cabecalho fixo */}
        <SheetHeader className="px-5 pt-5 pb-4 border-b border-border shrink-0">
          <SheetTitle className="text-base">Historico de Alteracoes</SheetTitle>
          <SheetDescription className="text-xs">
            {meta
              ? `${meta.total} ${meta.total === 1 ? 'registro' : 'registros'} encontrado${meta.total === 1 ? '' : 's'}`
              : 'Carregando...'}
          </SheetDescription>

          {/* Filtros de acao */}
          <div className="flex gap-1.5 pt-1 flex-wrap">
            {ACTION_FILTERS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => handleActionFilter(value)}
                className={[
                  'px-2.5 py-1 rounded-md text-xs font-medium transition-colors border',
                  actionFilter === value
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-transparent text-muted-foreground border-border hover:bg-muted hover:text-foreground',
                ].join(' ')}
              >
                {label}
              </button>
            ))}
          </div>
        </SheetHeader>

        {/* Conteudo com scroll */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {isLoading && <HistorySkeleton />}

          {isError && (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <p className="text-sm text-muted-foreground">Erro ao carregar historico.</p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                Tentar novamente
              </Button>
            </div>
          )}

          {!isLoading && !isError && list.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <p className="text-sm font-medium text-muted-foreground">
                Nenhuma alteracao registrada ainda
              </p>
              <p className="text-xs text-muted-foreground">
                As mudancas nos itens de custo aparecerão aqui automaticamente.
              </p>
            </div>
          )}

          {!isLoading && !isError && list.length > 0 && (
            <div className="relative">
              {/* Linha vertical da timeline */}
              <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />

              <div className="space-y-0">
                {list.map((entry, index) => (
                  <HistoryEntryItem
                    key={entry.id}
                    entry={entry}
                    isLast={index === list.length - 1}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Paginacao fixada no rodape */}
        {meta && meta.total_pages > 1 && (
          <div className="shrink-0 border-t border-border px-5 py-3 flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="size-4 mr-1" />
              Anterior
            </Button>
            <span className="text-xs text-muted-foreground">
              Pagina {page} de {meta.total_pages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= meta.total_pages}
              onClick={() => setPage((p) => p + 1)}
            >
              Proxima
              <ChevronRight className="size-4 ml-1" />
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

// ============ Item da timeline ============

function HistoryEntryItem({
  entry,
  isLast,
}: {
  entry: CostItemHistoryEntry
  isLast: boolean
}) {
  const config = ACTION_CONFIG[entry.action]
  const Icon = config.icon
  const hasChanges = entry.action === 'UPDATE' && entry.changes && entry.changes.length > 0

  // Texto descritivo do cabecalho da entrada
  const actionVerb =
    entry.action === 'INSERT'
      ? 'criou'
      : entry.action === 'UPDATE'
        ? 'editou'
        : 'removeu'

  return (
    <div className={`relative flex gap-3 pb-5 ${isLast ? 'pb-0' : ''}`}>
      {/* Circulo do icone */}
      <div className="relative z-10 flex items-center justify-center size-8 rounded-full bg-background border border-border shrink-0">
        <Icon className={`size-3.5 ${config.iconClass}`} />
      </div>

      {/* Conteudo */}
      <div className="flex-1 min-w-0 pt-0.5">
        {/* Linha principal */}
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm leading-snug">
            <span className="font-medium">{entry.user_name || 'Sistema'}</span>
            {' '}
            <span className="text-muted-foreground">{actionVerb}</span>
            {' '}
            <span className="font-medium">{entry.item_label}</span>
          </p>
          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 shrink-0 ${config.badgeClass}`}>
            {config.label}
          </Badge>
        </div>

        {/* Data relativa */}
        <p className="text-xs text-muted-foreground mt-0.5">
          {formatRelativeDate(entry.created_at)}
        </p>

        {/* Diff de campos (somente UPDATE) */}
        {hasChanges && (
          <div className="mt-2 space-y-1.5">
            {entry.changes.map((change, i) => (
              <FieldDiff key={i} change={change} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ============ Diff de um campo ============

function FieldDiff({ change }: { change: CostItemChange }) {
  const oldFormatted = formatFieldValue(change.field, change.old_value)
  const newFormatted = formatFieldValue(change.field, change.new_value)

  // Se ambos sao iguais apos formatacao, nao exibir
  if (oldFormatted === newFormatted) return null

  return (
    <div className="rounded-md border border-border bg-muted/30 px-2.5 py-2">
      <p className="text-[11px] font-semibold text-foreground mb-1">{change.label}</p>
      <div className="flex flex-col gap-1">
        {change.old_value != null && change.old_value !== '' && (
          <span className="inline-block rounded px-1.5 py-0.5 text-[11px] bg-red-50 text-red-700 line-through dark:bg-red-950/30 dark:text-red-400">
            {oldFormatted}
          </span>
        )}
        {change.new_value != null && change.new_value !== '' && (
          <span className="inline-block rounded px-1.5 py-0.5 text-[11px] bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400">
            {newFormatted}
          </span>
        )}
      </div>
    </div>
  )
}

// ============ Skeleton de carregamento ============

function HistorySkeleton() {
  return (
    <div className="space-y-5">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex gap-3">
          <Skeleton className="size-8 rounded-full shrink-0" />
          <div className="space-y-2 flex-1 pt-0.5">
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-3 w-1/3" />
            {i % 2 === 0 && (
              <div className="space-y-1 mt-1">
                <Skeleton className="h-12 w-full rounded-md" />
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

// ============ Helpers de formatacao de valores ============

// Campos monetarios (detectados pelo nome)
const CURRENCY_FIELDS = new Set([
  'unit_value',
  'total_value',
  'overtime_value',
  'total_with_overtime',
  'actual_paid_value',
  'overtime_rate',
  'amount',
  'budget_value',
])

// Campos de data (detectados pelo sufixo ou nome)
const DATE_FIELDS = new Set([
  'payment_due_date',
  'payment_date',
  'nf_requested_at',
  'created_at',
  'updated_at',
  'deleted_at',
])

// Campos booleanos
const BOOLEAN_FIELDS = new Set([
  'is_category_header',
  'nf_validation_ok',
])

function formatFieldValue(field: string, value: unknown): string {
  if (value == null || value === '') return '-'

  if (CURRENCY_FIELDS.has(field) && typeof value === 'number') {
    return formatCurrency(value)
  }

  if (DATE_FIELDS.has(field) && typeof value === 'string') {
    return formatDate(value)
  }

  if (BOOLEAN_FIELDS.has(field)) {
    return value ? 'Sim' : 'Nao'
  }

  if (typeof value === 'number') {
    // Quantidades e outras numericas com formatacao BR
    return value.toLocaleString('pt-BR')
  }

  return String(value)
}
