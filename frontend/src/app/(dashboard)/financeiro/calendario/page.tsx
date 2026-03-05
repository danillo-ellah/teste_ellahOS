'use client'

import { useState, useMemo, useCallback } from 'react'
import { startOfMonth, endOfMonth, format, addMonths, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  CalendarDays,
  List,
  LayoutGrid,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/format'
import { PaymentDialog } from '@/components/financial/PaymentDialog'
import { PaymentCalendarKpis } from './_components/PaymentCalendarKpis'
import { PaymentCalendarSummary } from './_components/PaymentCalendarSummary'
import { PaymentCalendarView } from './_components/PaymentCalendarView'
import { PaymentListView } from './_components/PaymentListView'
import { PostponeDialog } from './_components/PostponeDialog'
import { usePaymentCalendarEvents, usePaymentCalendarKpis } from '@/hooks/usePaymentCalendar'
import type { PayableEvent } from '@/types/payment-calendar'

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

type ViewMode = 'calendar' | 'list'

// ---------------------------------------------------------------------------
// BatchPayBar — fixo no bottom quando ha itens selecionados
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
// Page
// ---------------------------------------------------------------------------

export default function PaymentCalendarPage() {
  const [currentMonth, setCurrentMonth] = useState<Date>(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })
  const [viewMode, setViewMode] = useState<ViewMode>('list')

  // Selecao de items (somente payables)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Dialogs
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [postponeOpen, setPostponeOpen] = useState(false)
  /** IDs para o PostponeDialog — pode ser batch (selectedIds) ou item unico */
  const [postponeIds, setPostponeIds] = useState<string[]>([])

  // Range do mes selecionado (YYYY-MM-DD)
  const startDate = useMemo(
    () => format(startOfMonth(currentMonth), 'yyyy-MM-dd'),
    [currentMonth],
  )
  const endDate = useMemo(
    () => format(endOfMonth(currentMonth), 'yyyy-MM-dd'),
    [currentMonth],
  )

  // Queries da EF payment-calendar
  const {
    data: eventsData,
    isLoading: eventsLoading,
  } = usePaymentCalendarEvents(startDate, endDate)

  const {
    data: kpisData,
    isLoading: kpisLoading,
  } = usePaymentCalendarKpis(startDate, endDate)

  const payables = eventsData?.data?.payables ?? []
  const receivables = eventsData?.data?.receivables ?? []
  const kpis = kpisData?.data

  // Total dos itens selecionados para BatchPayBar
  const selectedTotal = useMemo(() => {
    return payables
      .filter(p => selectedIds.has(p.id))
      .reduce((sum, p) => sum + p.amount, 0)
  }, [payables, selectedIds])

  // Handlers de selecao
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

  // Ao clicar num payable no calendario, seleciona e abre pagamento
  function handlePayableClickCalendar(item: PayableEvent) {
    if (item.status === 'pago') return
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.add(item.id)
      return next
    })
    setPaymentOpen(true)
  }

  // Prorrogar um item individual (botao na lista)
  function handlePostponeSingle(costItemId: string) {
    setPostponeIds([costItemId])
    setPostponeOpen(true)
  }

  // Prorrogar batch (BatchPayBar)
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

  // Navegacao de mes (usada pelo header — nao pelo PaymentCalendarView que tem seus proprios botoes)
  function handlePrevMonth() {
    setCurrentMonth(prev => subMonths(prev, 1))
  }
  function handleNextMonth() {
    setCurrentMonth(prev => addMonths(prev, 1))
  }

  const monthTitle = format(currentMonth, 'MMMM yyyy', { locale: ptBR })

  return (
    <div className={cn('space-y-5', selectedIds.size > 0 && 'pb-20')}>
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/financeiro" className="hover:text-foreground transition-colors">
          Financeiro
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium">Calendario de Pagamentos</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <CalendarDays className="h-5 w-5 text-muted-foreground shrink-0" />
          <h1 className="text-xl font-semibold">Calendario de Pagamentos</h1>
        </div>

        {/* Navegacao de mes + toggle de view */}
        <div className="flex items-center gap-2">
          {/* Navegacao — visivel em ambas as views (no calendar view os botoes duplicam, mas sao semanticamente diferentes) */}
          <div className="flex items-center gap-1 border rounded-md px-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handlePrevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium capitalize min-w-[120px] text-center">
              {monthTitle}
            </span>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleNextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Toggle Calendario / Lista */}
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

      {/* KPIs */}
      <PaymentCalendarKpis kpis={kpis} isLoading={kpisLoading} />

      {/* Conteudo principal */}
      {viewMode === 'calendar' ? (
        <div className="space-y-6">
          {/* Calendario compacto com totais por dia */}
          <PaymentCalendarSummary
            payables={payables}
            receivables={receivables}
            currentMonth={currentMonth}
          />

          {/* Calendario detalhado com pills individuais */}
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

      {/* BatchPayBar — fixo no bottom quando ha selecao */}
      {selectedIds.size > 0 && (
        <BatchPayBar
          count={selectedIds.size}
          total={selectedTotal}
          onPay={() => setPaymentOpen(true)}
          onPostpone={handlePostponeBatch}
          onClear={() => setSelectedIds(new Set())}
        />
      )}

      {/* Dialog de pagamento */}
      <PaymentDialog
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        selectedItemIds={Array.from(selectedIds)}
        onSuccess={handlePaymentSuccess}
      />

      {/* Dialog de prorrogacao */}
      <PostponeDialog
        open={postponeOpen}
        onOpenChange={setPostponeOpen}
        costItemIds={postponeIds}
        onSuccess={handlePostponeSuccess}
      />
    </div>
  )
}
