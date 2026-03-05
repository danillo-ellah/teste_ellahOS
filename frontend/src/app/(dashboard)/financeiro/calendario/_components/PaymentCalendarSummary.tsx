'use client'

import { useMemo } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/format'
import { getCalendarGrid } from '@/lib/cronograma-utils'
import type { PayableEvent, ReceivableEvent } from '@/types/payment-calendar'

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

const WEEK_DAYS = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB']

// ---------------------------------------------------------------------------
// Tipos internos
// ---------------------------------------------------------------------------

interface DayTotals {
  payable: number
  receivable: number
  overduePayable: number
  count: number
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

interface PaymentCalendarSummaryProps {
  payables: PayableEvent[]
  receivables: ReceivableEvent[]
  currentMonth: Date
}

export function PaymentCalendarSummary({
  payables,
  receivables,
  currentMonth,
}: PaymentCalendarSummaryProps) {
  const today = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])

  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()
  const weeks = useMemo(() => getCalendarGrid(year, month), [year, month])

  // Mapa data => totais
  const totalsByDate = useMemo(() => {
    const map = new Map<string, DayTotals>()

    for (const p of payables) {
      const key = p.date
      const existing = map.get(key) ?? { payable: 0, receivable: 0, overduePayable: 0, count: 0 }
      existing.payable += p.amount
      existing.count++
      if (p.is_overdue) existing.overduePayable += p.amount
      map.set(key, existing)
    }

    for (const r of receivables) {
      const key = r.date
      const existing = map.get(key) ?? { payable: 0, receivable: 0, overduePayable: 0, count: 0 }
      existing.receivable += r.amount
      existing.count++
      map.set(key, existing)
    }

    return map
  }, [payables, receivables])

  // Maior valor para escala relativa das barras
  const maxAmount = useMemo(() => {
    let max = 0
    for (const t of totalsByDate.values()) {
      max = Math.max(max, t.payable, t.receivable)
    }
    return max || 1
  }, [totalsByDate])

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        Visao Mensal
      </h3>

      <div className="rounded-lg border border-border overflow-hidden">
        {/* Header: dias da semana */}
        <div className="grid grid-cols-7 border-b border-border bg-neutral-50 dark:bg-neutral-900">
          {WEEK_DAYS.map((d, idx) => (
            <div
              key={d}
              className={cn(
                'h-6 flex items-center justify-center text-[10px] font-semibold uppercase tracking-wide',
                idx === 0 || idx === 6
                  ? 'text-muted-foreground/60'
                  : 'text-muted-foreground',
              )}
            >
              {d}
            </div>
          ))}
        </div>

        {/* Semanas */}
        {weeks.map((week, wIdx) => (
          <div key={wIdx} className="grid grid-cols-7">
            {week.map((day, dIdx) => {
              const isCurrentMonth = day.getMonth() === month
              const isToday = day.getTime() === today.getTime()
              const isWeekend = dIdx === 0 || dIdx === 6
              const dateStr = format(day, 'yyyy-MM-dd')
              const totals = isCurrentMonth ? totalsByDate.get(dateStr) : undefined
              const hasData = totals && totals.count > 0

              // Altura proporcional das barras (relativa ao max)
              const payBarH = totals ? Math.max(2, Math.round((totals.payable / maxAmount) * 16)) : 0
              const recBarH = totals ? Math.max(2, Math.round((totals.receivable / maxAmount) * 16)) : 0
              const hasOverdue = (totals?.overduePayable ?? 0) > 0

              return (
                <div
                  key={dateStr}
                  className={cn(
                    'h-[56px] border-b border-r border-border p-0.5 flex flex-col',
                    !isCurrentMonth && 'bg-muted/20',
                    isWeekend && isCurrentMonth && 'bg-neutral-50/50 dark:bg-neutral-900/30',
                  )}
                  title={
                    hasData
                      ? `${format(day, "dd/MM", { locale: ptBR })} — Pagar: ${formatCurrency(totals.payable)} | Receber: ${formatCurrency(totals.receivable)}`
                      : undefined
                  }
                >
                  {/* Numero do dia */}
                  <span
                    className={cn(
                      'text-[10px] font-semibold leading-none w-4 h-4 flex items-center justify-center rounded-full self-start',
                      !isCurrentMonth && 'text-muted-foreground/30',
                      isWeekend && isCurrentMonth && 'text-muted-foreground/60',
                      !isWeekend && isCurrentMonth && 'text-foreground',
                      isToday && 'bg-primary text-primary-foreground',
                    )}
                  >
                    {day.getDate()}
                  </span>

                  {/* Barras de totais */}
                  {hasData && (
                    <div className="flex-1 flex items-end gap-px px-0.5 pb-0.5">
                      {totals.payable > 0 && (
                        <div
                          className={cn(
                            'flex-1 rounded-sm min-h-[2px] transition-all',
                            hasOverdue
                              ? 'bg-red-400 dark:bg-red-500'
                              : 'bg-amber-400 dark:bg-amber-500',
                          )}
                          style={{ height: `${payBarH}px` }}
                        />
                      )}
                      {totals.receivable > 0 && (
                        <div
                          className="flex-1 rounded-sm bg-emerald-400 dark:bg-emerald-500 min-h-[2px] transition-all"
                          style={{ height: `${recBarH}px` }}
                        />
                      )}
                    </div>
                  )}

                  {/* Valor total compacto */}
                  {hasData && (
                    <div className="px-0.5">
                      {totals.payable > 0 && (
                        <p className={cn(
                          'text-[8px] font-bold tabular-nums leading-tight truncate',
                          hasOverdue
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-amber-600 dark:text-amber-400',
                        )}>
                          {totals.payable >= 1000
                            ? `${(totals.payable / 1000).toFixed(0)}k`
                            : formatCurrency(totals.payable)}
                        </p>
                      )}
                      {totals.receivable > 0 && (
                        <p className="text-[8px] font-bold tabular-nums leading-tight truncate text-emerald-600 dark:text-emerald-400">
                          {totals.receivable >= 1000
                            ? `+${(totals.receivable / 1000).toFixed(0)}k`
                            : `+${formatCurrency(totals.receivable)}`}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>

      {/* Legenda compacta */}
      <div className="flex gap-4 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-sm bg-amber-400 dark:bg-amber-500" />
          A Pagar
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-sm bg-red-400 dark:bg-red-500" />
          Vencido
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-sm bg-emerald-400 dark:bg-emerald-500" />
          A Receber
        </span>
      </div>
    </div>
  )
}
