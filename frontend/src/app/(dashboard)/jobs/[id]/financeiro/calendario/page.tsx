'use client'

import { useState, useMemo, useCallback, use } from 'react'
import { startOfMonth, endOfMonth, format, addMonths, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  CalendarDays,
  List,
  LayoutGrid,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/format'
import { PaymentDialog } from '@/components/financial/PaymentDialog'
import { PaymentCalendarKpis } from '@/app/(dashboard)/financeiro/calendario/_components/PaymentCalendarKpis'
import { PaymentCalendarSummary } from '@/app/(dashboard)/financeiro/calendario/_components/PaymentCalendarSummary'
import { PaymentCalendarView } from '@/app/(dashboard)/financeiro/calendario/_components/PaymentCalendarView'
import { PaymentListView } from '@/app/(dashboard)/financeiro/calendario/_components/PaymentListView'
import { PostponeDialog } from '@/app/(dashboard)/financeiro/calendario/_components/PostponeDialog'
import { usePaymentCalendarEvents, usePaymentCalendarKpis } from '@/hooks/usePaymentCalendar'
import type { PayableEvent } from '@/types/payment-calendar'

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

type ViewMode = 'calendar' | 'list'

// ---------------------------------------------------------------------------
// BatchPayBar
// ---------------------------------------------------------------------------

interface BatchPayBarProps {
  count: number
  total: number
  onPay: () => void
  onPostpone: () => void
  onClear: () => void
}

function BatchPayBar({ count, total, onPay, onPostpone, onClear }: BatchPayBarProps) {
  return (
    <div className="fixed bottom-0 inset-x-0 z-50 border-t bg-background/95 backdrop-blur-sm px-4 py-3 flex items-center justify-between shadow-lg">
      <div className="text-sm">
        <span className="font-semibold">{count} item(s) selecionado(s)</span>
        <span className="text-muted-foreground ml-2">
          Total:{' '}
          <span className="font-semibold text-foreground">{formatCurrency(total)}</span>
        </span>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onClear}>
          Limpar
        </Button>
        <Button variant="outline" size="sm" onClick={onPostpone}>
          Prorrogar
        </Button>
        <Button size="sm" onClick={onPay}>
          Pagar Selecionados
        </Button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page — wrapper per-job que filtra todos os componentes pelo jobId
// ---------------------------------------------------------------------------

interface Props {
  params: Promise<{ id: string }>
}

export default function JobPaymentCalendarPage({ params }: Props) {
  const { id: jobId } = use(params)

  const [currentMonth, setCurrentMonth] = useState<Date>(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })
  const [viewMode, setViewMode] = useState<ViewMode>('list')

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [postponeOpen, setPostponeOpen] = useState(false)
  const [postponeIds, setPostponeIds] = useState<string[]>([])

  const startDate = useMemo(
    () => format(startOfMonth(currentMonth), 'yyyy-MM-dd'),
    [currentMonth],
  )
  const endDate = useMemo(
    () => format(endOfMonth(currentMonth), 'yyyy-MM-dd'),
    [currentMonth],
  )

  // Queries filtradas pelo jobId
  const { data: eventsData, isLoading: eventsLoading } = usePaymentCalendarEvents(
    startDate,
    endDate,
    jobId,
  )
  const { data: kpisData, isLoading: kpisLoading } = usePaymentCalendarKpis(
    startDate,
    endDate,
    jobId,
  )

  const payables = eventsData?.data?.payables ?? []
  const receivables = eventsData?.data?.receivables ?? []
  const kpis = kpisData?.data

  const selectedTotal = useMemo(
    () => payables.filter(p => selectedIds.has(p.id)).reduce((sum, p) => sum + p.amount, 0),
    [payables, selectedIds],
  )

  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const handleSelectAll = useCallback((ids: string[], checked: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      for (const id of ids) {
        if (checked) next.add(id)
        else next.delete(id)
      }
      return next
    })
  }, [])

  function handlePayableClickCalendar(item: PayableEvent) {
    if (item.status === 'pago') return
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.add(item.id)
      return next
    })
    setPaymentOpen(true)
  }

  function handlePostponeSingle(costItemId: string) {
    setPostponeIds([costItemId])
    setPostponeOpen(true)
  }

  function handlePostponeBatch() {
    setPostponeIds(Array.from(selectedIds))
    setPostponeOpen(true)
  }

  function handlePaymentSuccess() {
    setSelectedIds(new Set())
  }

  function handlePostponeSuccess() {
    setSelectedIds(new Set())
  }

  const monthTitle = format(currentMonth, 'MMMM yyyy', { locale: ptBR })

  return (
    <div className={cn('space-y-5', selectedIds.size > 0 && 'pb-20')}>
      {/* Header da sub-pagina */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-base font-semibold">Calendario de Pagamentos</h2>
        </div>

        <div className="flex items-center gap-2">
          {/* Navegacao de mes */}
          <div className="flex items-center gap-1 border rounded-md px-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setCurrentMonth(prev => subMonths(prev, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium capitalize min-w-[120px] text-center">
              {monthTitle}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setCurrentMonth(prev => addMonths(prev, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Toggle view */}
          <div className="flex border rounded-md overflow-hidden">
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                'rounded-none h-8 px-3 gap-1.5',
                viewMode === 'calendar' && 'bg-muted font-semibold',
              )}
              onClick={() => setViewMode('calendar')}
              aria-pressed={viewMode === 'calendar'}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span className="hidden sm:inline text-xs">Calendario</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                'rounded-none h-8 px-3 gap-1.5 border-l',
                viewMode === 'list' && 'bg-muted font-semibold',
              )}
              onClick={() => setViewMode('list')}
              aria-pressed={viewMode === 'list'}
            >
              <List className="h-3.5 w-3.5" />
              <span className="hidden sm:inline text-xs">Lista</span>
            </Button>
          </div>
        </div>
      </div>

      {/* KPIs filtrados por job */}
      <PaymentCalendarKpis kpis={kpis} isLoading={kpisLoading} />

      {/* Conteudo principal */}
      {viewMode === 'calendar' ? (
        <div className="space-y-6">
          <PaymentCalendarSummary
            payables={payables}
            receivables={receivables}
            currentMonth={currentMonth}
          />
          <PaymentCalendarView
            payables={payables}
            receivables={receivables}
            currentMonth={currentMonth}
            onMonthChange={setCurrentMonth}
            onPayableClick={handlePayableClickCalendar}
          />
        </div>
      ) : (
        <PaymentListView
          payables={payables}
          receivables={receivables}
          selectedIds={selectedIds}
          onToggleSelect={handleToggleSelect}
          onSelectAll={handleSelectAll}
          onPostponeSingle={handlePostponeSingle}
          isLoading={eventsLoading}
        />
      )}

      {/* BatchPayBar */}
      {selectedIds.size > 0 && (
        <BatchPayBar
          count={selectedIds.size}
          total={selectedTotal}
          onPay={() => setPaymentOpen(true)}
          onPostpone={handlePostponeBatch}
          onClear={() => setSelectedIds(new Set())}
        />
      )}

      {/* Dialogs */}
      <PaymentDialog
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        selectedItemIds={Array.from(selectedIds)}
        onSuccess={handlePaymentSuccess}
      />

      <PostponeDialog
        open={postponeOpen}
        onOpenChange={setPostponeOpen}
        costItemIds={postponeIds}
        onSuccess={handlePostponeSuccess}
      />
    </div>
  )
}
