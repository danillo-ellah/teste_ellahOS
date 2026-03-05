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


  // Formata valor abreviado legivel
  function fmtShort(value: number): string {
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
    if (value >= 1_000) return `${(value / 1_000).toFixed(0)}k`
    return formatCurrency(value)
  }

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
                'h-7 flex items-center justify-center text-[11px] font-semibold uppercase tracking-wide',
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
              const hasOverdue = (totals?.overduePayable ?? 0) > 0

              return (
                <div
                  key={dateStr}
                  className={cn(
                    'h-[84px] border-b border-r border-border p-1 flex flex-col gap-0.5',
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
                      'text-[11px] font-semibold leading-none w-5 h-5 flex items-center justify-center rounded-full shrink-0',
                      !isCurrentMonth && 'text-muted-foreground/30',
                      isWeekend && isCurrentMonth && 'text-muted-foreground/60',
                      !isWeekend && isCurrentMonth && 'text-foreground',
                      isToday && 'bg-primary text-primary-foreground',
                    )}
                  >
                    {day.getDate()}
                  </span>

                  {/* Blocos coloridos com valor centralizado */}
                  {hasData && (
                    <div className="flex-1 flex flex-col gap-0.5 min-h-0">
                      {totals.payable > 0 && (
                        <div
                          className={cn(
                            'flex-1 rounded-md flex items-center justify-center min-h-[22px] px-0.5',
                            hasOverdue
                              ? 'bg-red-100 dark:bg-red-950/60'
                              : 'bg-amber-100 dark:bg-amber-950/60',
                          )}
                        >
                          <span
                            className={cn(
                              'text-[11px] font-bold tabular-nums leading-none truncate',
                              hasOverdue
                                ? 'text-red-700 dark:text-red-300'
                                : 'text-amber-700 dark:text-amber-300',
                            )}
                          >
                            {fmtShort(totals.payable)}
                          </span>
                        </div>
                      )}
                      {totals.receivable > 0 && (
                        <div className="flex-1 rounded-md flex items-center justify-center min-h-[22px] px-0.5 bg-emerald-100 dark:bg-emerald-950/60">
                          <span className="text-[11px] font-bold tabular-nums leading-none truncate text-emerald-700 dark:text-emerald-300">
                            +{fmtShort(totals.receivable)}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>

      {/* Legenda */}
      <div className="flex gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700" />
          A Pagar
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-red-100 dark:bg-red-950/60 border border-red-300 dark:border-red-700" />
          Vencido
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700" />
          A Receber
        </span>
      </div>
    </div>
  )
}
