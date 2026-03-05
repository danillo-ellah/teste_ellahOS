'use client'

import { useMemo } from 'react'
import { CalendarDays, Clock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import { formatCurrency, formatDate } from '@/lib/format'
import type { PayableEvent, ReceivableEvent } from '@/types/payment-calendar'

// ---------------------------------------------------------------------------
// Tipos internos
// ---------------------------------------------------------------------------

type ListEvent =
  | { kind: 'payable'; data: PayableEvent }
  | { kind: 'receivable'; data: ReceivableEvent }

// ---------------------------------------------------------------------------
// Utilitarios
// ---------------------------------------------------------------------------

function groupEventsByDate(
  payables: PayableEvent[],
  receivables: ReceivableEvent[],
): Map<string, ListEvent[]> {
  const map = new Map<string, ListEvent[]>()

  for (const p of payables) {
    const key = p.date || 'sem_data'
    const list = map.get(key) ?? []
    list.push({ kind: 'payable', data: p })
    map.set(key, list)
  }

  for (const r of receivables) {
    const key = r.date || 'sem_data'
    const list = map.get(key) ?? []
    list.push({ kind: 'receivable', data: r })
    map.set(key, list)
  }

  // Ordenar: sem_data vai para o final
  return new Map(
    [...map.entries()].sort(([a], [b]) => {
      if (a === 'sem_data') return 1
      if (b === 'sem_data') return -1
      return a.localeCompare(b)
    }),
  )
}

function isOverdueDate(dateStr: string): boolean {
  if (dateStr === 'sem_data') return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const d = new Date(dateStr + 'T00:00:00')
  return d < today
}

// ---------------------------------------------------------------------------
// Badge de NF
// ---------------------------------------------------------------------------

function NfStatusBadge({ status }: { status: string | null }) {
  if (!status) return null

  const labelMap: Record<string, string> = {
    aprovado: 'NF OK',
    pendente: 'NF Pend.',
    rejeitado: 'NF Rej.',
    nao_solicitado: 'Sem NF',
  }

  const colorMap: Record<string, string> = {
    aprovado: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
    pendente: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
    rejeitado: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
    nao_solicitado: 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400',
  }

  const label = labelMap[status] ?? status
  const color = colorMap[status] ?? 'bg-neutral-100 text-neutral-500'

  return (
    <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded', color)}>
      {label}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Item de evento na lista
// ---------------------------------------------------------------------------

interface EventItemProps {
  event: ListEvent
  isSelected: boolean
  onToggleSelect: (id: string) => void
  onPostpone: (id: string) => void
}

function EventItem({ event, isSelected, onToggleSelect, onPostpone }: EventItemProps) {
  const { kind, data } = event
  const isPayable = kind === 'payable'
  const payable = isPayable ? (data as PayableEvent) : null
  const receivable = !isPayable ? (data as ReceivableEvent) : null

  const isOverdue = payable?.is_overdue ?? false
  const isPaid = payable?.status === 'pago'
  const isPendente = payable?.status === 'pendente'

  // Cor da pill de tipo
  const typePillCls = !isPayable
    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
    : isPaid
      ? 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400'
      : isOverdue
        ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'
        : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'

  const typeLabel = !isPayable
    ? receivable?.type === 'invoice' ? 'NF' : 'Receita'
    : isPaid
      ? 'Pago'
      : isOverdue
        ? 'Vencido'
        : 'Pendente'

  return (
    <div
      className={cn(
        'flex items-start gap-3 px-4 py-2.5 hover:bg-muted/20 transition-colors',
        isSelected && 'bg-muted/30',
      )}
    >
      {/* Checkbox — apenas para payables pendentes/vencidos */}
      <div className="pt-0.5 w-4 shrink-0">
        {isPayable && !isPaid ? (
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => onToggleSelect(data.id)}
            aria-label={`Selecionar ${data.description}`}
          />
        ) : (
          <span className="w-4 h-4 block" />
        )}
      </div>

      {/* Pill de tipo */}
      <span className={cn(
        'shrink-0 mt-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded',
        typePillCls,
      )}>
        {typeLabel}
      </span>

      {/* Conteudo principal */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{data.description}</p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className="text-xs text-muted-foreground truncate">
            {isPayable
              ? (payable?.vendor_name ?? data.job_title)
              : (receivable?.client_name ?? data.job_title)}
          </span>
          <span className="text-xs text-muted-foreground/60">·</span>
          <span className="text-xs text-muted-foreground font-mono">{data.job_code}</span>
          {isPayable && payable?.nf_status && (
            <NfStatusBadge status={payable.nf_status} />
          )}
        </div>
      </div>

      {/* Valor + acao prorrogar */}
      <div className="flex flex-col items-end gap-1 shrink-0">
        <span className={cn(
          'text-sm font-semibold tabular-nums',
          !isPayable
            ? 'text-emerald-600 dark:text-emerald-400'
            : isPaid
              ? 'text-muted-foreground'
              : isOverdue
                ? 'text-red-600 dark:text-red-400'
                : 'text-amber-600 dark:text-amber-400',
        )}>
          {formatCurrency(data.amount)}
        </span>

        {/* Botao prorrogar — somente payables pendentes */}
        {isPayable && isPendente && (
          <Button
            variant="ghost"
            size="sm"
            className="h-5 px-1.5 text-[10px] text-muted-foreground hover:text-foreground"
            onClick={() => onPostpone(data.id)}
          >
            <Clock className="h-3 w-3 mr-0.5" />
            Prorrogar
          </Button>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Grupo de data
// ---------------------------------------------------------------------------

interface DateGroupProps {
  date: string
  events: ListEvent[]
  selectedIds: Set<string>
  onToggleSelect: (id: string) => void
  onSelectAll: (ids: string[], checked: boolean) => void
  onPostpone: (id: string) => void
}

function DateGroup({
  date,
  events,
  selectedIds,
  onToggleSelect,
  onSelectAll,
  onPostpone,
}: DateGroupProps) {
  const displayDate = date === 'sem_data' ? 'Sem data de vencimento' : formatDate(date)
  const isOverdue = isOverdueDate(date)

  // Apenas payables selecionaveis
  const selectableIds = events
    .filter(e => e.kind === 'payable' && (e.data as PayableEvent).status !== 'pago')
    .map(e => e.data.id)

  const allSelected =
    selectableIds.length > 0 && selectableIds.every(id => selectedIds.has(id))
  const someSelected = selectableIds.some(id => selectedIds.has(id))

  // Totais do grupo
  const totalPayable = events
    .filter(e => e.kind === 'payable' && (e.data as PayableEvent).status !== 'pago')
    .reduce((sum, e) => sum + e.data.amount, 0)
  const totalReceivable = events
    .filter(e => e.kind === 'receivable')
    .reduce((sum, e) => sum + e.data.amount, 0)

  return (
    <div className="rounded-md border overflow-hidden">
      {/* Header do grupo */}
      <div className="flex items-center justify-between gap-3 bg-muted/40 px-4 py-2.5 border-b">
        <div className="flex items-center gap-3">
          {selectableIds.length > 0 ? (
            <Checkbox
              checked={allSelected}
              data-state={someSelected && !allSelected ? 'indeterminate' : undefined}
              onCheckedChange={checked => onSelectAll(selectableIds, !!checked)}
              aria-label={`Selecionar todos os itens de ${displayDate}`}
            />
          ) : (
            <span className="w-4 h-4 block" />
          )}
          <span className="text-sm font-semibold">{displayDate}</span>
          {isOverdue && (
            <Badge variant="destructive" className="text-xs">Vencido</Badge>
          )}
          <span className="text-xs text-muted-foreground">{events.length} item(s)</span>
        </div>

        {/* Totais no header */}
        <div className="flex items-center gap-3 text-xs tabular-nums shrink-0">
          {totalReceivable > 0 && (
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
              +{formatCurrency(totalReceivable)}
            </span>
          )}
          {totalPayable > 0 && (
            <span className={cn(
              'font-semibold',
              isOverdue
                ? 'text-red-600 dark:text-red-400'
                : 'text-amber-600 dark:text-amber-400',
            )}>
              -{formatCurrency(totalPayable)}
            </span>
          )}
        </div>
      </div>

      {/* Lista de eventos do dia */}
      <div className="divide-y">
        {events.map((event, idx) => (
          <EventItem
            key={`${event.kind}-${event.data.id}-${idx}`}
            event={event}
            isSelected={selectedIds.has(event.data.id)}
            onToggleSelect={onToggleSelect}
            onPostpone={onPostpone}
          />
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

interface PaymentListViewProps {
  payables: PayableEvent[]
  receivables: ReceivableEvent[]
  selectedIds: Set<string>
  onToggleSelect: (id: string) => void
  onSelectAll: (ids: string[], checked: boolean) => void
  /** Callback ao clicar em "Prorrogar" de um item individual */
  onPostponeSingle: (costItemId: string) => void
  isLoading?: boolean
}

export function PaymentListView({
  payables,
  receivables,
  selectedIds,
  onToggleSelect,
  onSelectAll,
  onPostponeSingle,
  isLoading = false,
}: PaymentListViewProps) {
  const groups = useMemo(
    () => groupEventsByDate(payables, receivables),
    [payables, receivables],
  )

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-md border overflow-hidden animate-pulse">
            <div className="bg-muted/40 px-4 py-2.5 flex items-center justify-between">
              <div className="h-4 w-32 bg-muted rounded" />
              <div className="h-4 w-20 bg-muted rounded" />
            </div>
            <div className="divide-y">
              {Array.from({ length: 2 }).map((_, j) => (
                <div key={j} className="flex items-center gap-3 px-4 py-2.5">
                  <div className="h-4 w-4 bg-muted rounded" />
                  <div className="h-4 flex-1 bg-muted rounded" />
                  <div className="h-4 w-20 bg-muted rounded" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (groups.size === 0) {
    return (
      <div className="rounded-md border py-16 text-center">
        <CalendarDays className="mx-auto h-8 w-8 text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">
          Nenhum evento de pagamento no periodo selecionado.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {Array.from(groups.entries()).map(([date, events]) => (
        <DateGroup
          key={date}
          date={date}
          events={events}
          selectedIds={selectedIds}
          onToggleSelect={onToggleSelect}
          onSelectAll={onSelectAll}
          onPostpone={onPostponeSingle}
        />
      ))}
    </div>
  )
}
