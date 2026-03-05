'use client'

import type { ReactNode } from 'react'
import { useMemo, useRef, useEffect, useState } from 'react'
import { format, addMonths, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/format'
import { getCalendarGrid } from '@/lib/cronograma-utils'
import type { PayableEvent, ReceivableEvent } from '@/types/payment-calendar'

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

const WEEK_DAYS = [
  { label: 'DOM', full: 'Domingo' },
  { label: 'SEG', full: 'Segunda-feira' },
  { label: 'TER', full: 'Terca-feira' },
  { label: 'QUA', full: 'Quarta-feira' },
  { label: 'QUI', full: 'Quinta-feira' },
  { label: 'SEX', full: 'Sexta-feira' },
  { label: 'SAB', full: 'Sabado' },
]

// Maximo de pills visiveis por celula antes de colapsar em "+N"
const MAX_PILLS = 3

// ---------------------------------------------------------------------------
// Tipos internos
// ---------------------------------------------------------------------------

type DayEvent =
  | { kind: 'payable'; data: PayableEvent }
  | { kind: 'receivable'; data: ReceivableEvent }

// ---------------------------------------------------------------------------
// Pill colorida de evento
// ---------------------------------------------------------------------------

interface EventPillProps {
  event: DayEvent
  compact?: boolean
}

function EventPill({ event, compact = false }: EventPillProps) {
  const { kind, data } = event

  if (kind === 'receivable') {
    return (
      <span
        className={cn(
          'inline-flex items-center rounded px-1.5 font-medium truncate max-w-full',
          compact ? 'text-[10px] py-0' : 'text-xs py-0.5',
          'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
        )}
        title={data.description}
      >
        {compact ? formatCurrency(data.amount) : data.description}
      </span>
    )
  }

  // Payable: cor depende do status
  const isOverdue = data.is_overdue
  const isPaid = data.status === 'pago'

  const colorCls = isPaid
    ? 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400'
    : isOverdue
      ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'
      : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'

  return (
    <span
      className={cn(
        'inline-flex items-center rounded px-1.5 font-medium truncate max-w-full',
        compact ? 'text-[10px] py-0' : 'text-xs py-0.5',
        colorCls,
      )}
      title={data.description}
    >
      {compact ? formatCurrency(data.amount) : data.description}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Popover de detalhe do dia
// ---------------------------------------------------------------------------

interface DayPopoverProps {
  date: Date
  events: DayEvent[]
  onPayableClick?: (item: PayableEvent) => void
  children: ReactNode
}

function DayPopover({ date, events, onPayableClick, children }: DayPopoverProps) {
  if (events.length === 0) return <>{children}</>

  const dateLabel = format(date, "EEEE, dd 'de' MMMM", { locale: ptBR })
  const totalPayable = events
    .filter(e => e.kind === 'payable')
    .reduce((sum, e) => sum + e.data.amount, 0)
  const totalReceivable = events
    .filter(e => e.kind === 'receivable')
    .reduce((sum, e) => sum + e.data.amount, 0)

  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="center" side="right">
        {/* Cabecalho */}
        <div className="px-4 py-3 border-b">
          <p className="text-sm font-semibold capitalize">{dateLabel}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {events.length} evento(s)
          </p>
        </div>

        {/* Lista de eventos */}
        <div className="max-h-72 overflow-y-auto divide-y">
          {events.map((event, idx) => {
            const isPayable = event.kind === 'payable'
            const { data } = event
            const isOverdue = isPayable && (event.data as PayableEvent).is_overdue
            const isPaid = isPayable && (event.data as PayableEvent).status === 'pago'

            return (
              <div
                key={`${event.kind}-${data.id}-${idx}`}
                className={cn(
                  'px-4 py-2.5 text-sm',
                  isPayable && !isPaid && 'cursor-pointer hover:bg-muted/40 transition-colors',
                )}
                onClick={() => {
                  if (isPayable && !isPaid && onPayableClick) {
                    onPayableClick(event.data as PayableEvent)
                  }
                }}
              >
                {/* Tipo + status */}
                <div className="flex items-center gap-2 mb-1">
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-[10px] px-1.5 py-0 h-4 border-0',
                      !isPayable
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                        : isPaid
                          ? 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400'
                          : isOverdue
                            ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
                    )}
                  >
                    {!isPayable ? 'Receita' : isPaid ? 'Pago' : isOverdue ? 'Vencido' : 'Pendente'}
                  </Badge>
                  <span className="text-xs text-muted-foreground truncate">
                    {data.job_code}
                  </span>
                </div>

                {/* Descricao */}
                <p className="font-medium truncate">{data.description}</p>

                {/* Fornecedor ou cliente */}
                <p className="text-xs text-muted-foreground truncate">
                  {isPayable
                    ? (event.data as PayableEvent).vendor_name ?? data.job_title
                    : (event.data as ReceivableEvent).client_name ?? data.job_title}
                </p>

                {/* Valor */}
                <p className={cn(
                  'text-sm font-semibold tabular-nums mt-1',
                  !isPayable
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : isPaid
                      ? 'text-muted-foreground'
                      : isOverdue
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-amber-600 dark:text-amber-400',
                )}>
                  {formatCurrency(data.amount)}
                </p>
              </div>
            )
          })}
        </div>

        {/* Rodape com totais */}
        {(totalPayable > 0 || totalReceivable > 0) && (
          <>
            <Separator />
            <div className="px-4 py-2.5 flex justify-between text-xs">
              {totalPayable > 0 && (
                <span className="text-amber-600 dark:text-amber-400">
                  Pagar: <strong>{formatCurrency(totalPayable)}</strong>
                </span>
              )}
              {totalReceivable > 0 && (
                <span className="text-emerald-600 dark:text-emerald-400">
                  Receber: <strong>{formatCurrency(totalReceivable)}</strong>
                </span>
              )}
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  )
}

// ---------------------------------------------------------------------------
// Celula de dia
// ---------------------------------------------------------------------------

interface DayCellProps {
  date: Date
  events: DayEvent[]
  isCurrentMonth: boolean
  isToday: boolean
  isWeekend: boolean
  onPayableClick?: (item: PayableEvent) => void
}

function DayCell({ date, events, isCurrentMonth, isToday, isWeekend, onPayableClick }: DayCellProps) {
  const visible = events.slice(0, MAX_PILLS)
  const overflow = events.length - MAX_PILLS

  const cellContent = (
    <div
      className={cn(
        'min-h-[80px] sm:min-h-[100px] border-b border-r border-border p-1 flex flex-col gap-0.5',
        'transition-colors',
        !isCurrentMonth && 'bg-muted/20',
        isWeekend && isCurrentMonth && 'bg-neutral-50/50 dark:bg-neutral-900/30',
        events.length > 0 && 'cursor-pointer hover:bg-muted/30',
      )}
    >
      {/* Numero do dia */}
      <span
        className={cn(
          'text-xs font-semibold self-start leading-none mb-1 w-5 h-5 flex items-center justify-center rounded-full',
          !isCurrentMonth && 'text-muted-foreground/40',
          isWeekend && isCurrentMonth && 'text-muted-foreground/70',
          !isWeekend && isCurrentMonth && 'text-foreground',
          isToday && 'bg-primary text-primary-foreground',
        )}
      >
        {date.getDate()}
      </span>

      {/* Pills de eventos */}
      <div className="flex flex-col gap-0.5 overflow-hidden min-w-0">
        {visible.map((event, idx) => (
          <EventPill
            key={`${event.kind}-${event.data.id}-${idx}`}
            event={event}
            compact
          />
        ))}
        {overflow > 0 && (
          <span className="text-[10px] text-muted-foreground font-medium pl-1">
            +{overflow} mais
          </span>
        )}
      </div>
    </div>
  )

  if (events.length === 0) return cellContent

  return (
    <DayPopover date={date} events={events} onPayableClick={onPayableClick}>
      {cellContent}
    </DayPopover>
  )
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

interface PaymentCalendarViewProps {
  payables: PayableEvent[]
  receivables: ReceivableEvent[]
  currentMonth: Date
  onMonthChange: (date: Date) => void
  onPayableClick?: (item: PayableEvent) => void
}

export function PaymentCalendarView({
  payables,
  receivables,
  currentMonth,
  onMonthChange,
  onPayableClick,
}: PaymentCalendarViewProps) {
  const today = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])

  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()

  // Grid de 6 semanas x 7 dias (reutiliza funcao do cronograma)
  const weeks = useMemo(() => getCalendarGrid(year, month), [year, month])

  // Mapa data => eventos para acesso O(1) por celula
  const eventsByDate = useMemo(() => {
    const map = new Map<string, DayEvent[]>()

    for (const p of payables) {
      const key = p.date
      const list = map.get(key) ?? []
      list.push({ kind: 'payable', data: p })
      map.set(key, list)
    }

    for (const r of receivables) {
      const key = r.date
      const list = map.get(key) ?? []
      list.push({ kind: 'receivable', data: r })
      map.set(key, list)
    }

    return map
  }, [payables, receivables])

  // Animacao de slide ao trocar mes (identico ao CalendarMonthGrid do cronograma)
  const [animClass, setAnimClass] = useState('')
  const animDirectionRef = useRef<1 | -1>(1)
  const prevMonthRef = useRef<string>('')
  const monthKey = `${year}-${month}`

  useEffect(() => {
    if (prevMonthRef.current === '') {
      prevMonthRef.current = monthKey
      return
    }
    if (prevMonthRef.current === monthKey) return

    prevMonthRef.current = monthKey
    const enterClass = animDirectionRef.current > 0
      ? 'pay-cal-slide-next'
      : 'pay-cal-slide-prev'

    setAnimClass(enterClass)
    const id = setTimeout(() => setAnimClass(''), 220)
    return () => clearTimeout(id)
  }, [monthKey])

  function handlePrev() {
    animDirectionRef.current = -1
    onMonthChange(subMonths(currentMonth, 1))
  }

  function handleNext() {
    animDirectionRef.current = 1
    onMonthChange(addMonths(currentMonth, 1))
  }

  const monthTitle = format(currentMonth, 'MMMM yyyy', { locale: ptBR })
  const ariaLabel = format(currentMonth, "'Calendario de' MMMM 'de' yyyy", { locale: ptBR })

  return (
    <div className="space-y-3">
      {/* Estilos de animacao (sem framer-motion) */}
      <style>{`
        @keyframes payCalSlideNext {
          from { opacity: 0; transform: translateX(24px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes payCalSlidePrev {
          from { opacity: 0; transform: translateX(-24px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        .pay-cal-slide-next { animation: payCalSlideNext 200ms ease-out forwards; }
        .pay-cal-slide-prev { animation: payCalSlidePrev 200ms ease-out forwards; }
        @media (prefers-reduced-motion: reduce) {
          .pay-cal-slide-next, .pay-cal-slide-prev { animation: none; opacity: 1; }
        }
      `}</style>

      {/* Navegacao de mes */}
      <div className="flex items-center justify-between">
        <Button variant="outline" size="icon" onClick={handlePrev} aria-label="Mes anterior">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-sm font-semibold capitalize">{monthTitle}</h2>
        <Button variant="outline" size="icon" onClick={handleNext} aria-label="Proximo mes">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Grid do calendario */}
      <div
        role="grid"
        aria-label={ariaLabel}
        className={cn(
          'rounded-lg border border-border overflow-hidden',
          animClass,
        )}
      >
        {/* Header: dias da semana */}
        <div
          role="row"
          className="grid grid-cols-7 border-b border-border bg-neutral-50 dark:bg-neutral-900"
        >
          {WEEK_DAYS.map((d, idx) => {
            const isFds = idx === 0 || idx === 6
            return (
              <div
                key={d.label}
                role="columnheader"
                aria-label={d.full}
                className={cn(
                  'h-8 flex items-center justify-center',
                  'text-[11px] font-semibold uppercase tracking-wide',
                  isFds
                    ? 'text-muted-foreground/60'
                    : 'text-muted-foreground',
                )}
              >
                <span className="hidden sm:inline">{d.label}</span>
                <span className="sm:hidden">{d.label[0]}</span>
              </div>
            )
          })}
        </div>

        {/* Semanas */}
        {weeks.map((week, wIdx) => (
          <div key={wIdx} role="row" className="grid grid-cols-7">
            {week.map((day, dIdx) => {
              const isCurrentMonth = day.getMonth() === month
              const isToday = day.getTime() === today.getTime()
              const isWeekend = dIdx === 0 || dIdx === 6
              const dateStr = format(day, 'yyyy-MM-dd')
              // Dias fora do mes atual nao exibem eventos
              const dayEvents = isCurrentMonth ? (eventsByDate.get(dateStr) ?? []) : []

              return (
                <DayCell
                  key={`${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`}
                  date={day}
                  events={dayEvents}
                  isCurrentMonth={isCurrentMonth}
                  isToday={isToday}
                  isWeekend={isWeekend}
                  onPayableClick={onPayableClick}
                />
              )
            })}
          </div>
        ))}
      </div>

      {/* Legenda */}
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-emerald-200 dark:bg-emerald-900/60" />
          Receita
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-amber-200 dark:bg-amber-900/60" />
          Pendente
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-red-200 dark:bg-red-900/60" />
          Vencido
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-neutral-200 dark:bg-neutral-700" />
          Pago
        </span>
      </div>
    </div>
  )
}
