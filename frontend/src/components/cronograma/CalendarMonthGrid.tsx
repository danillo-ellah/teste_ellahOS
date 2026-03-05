'use client'

import { useMemo, useRef, useEffect, useState } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { getCalendarGrid, getPhasesForDay } from '@/lib/cronograma-utils'
import { CalendarCell } from './CalendarCell'
import type { JobPhase } from '@/types/cronograma'

// TODO: drag-to-reschedule (fase 2 do calendario)

const WEEK_DAYS = [
  { label: 'DOM', full: 'Domingo' },
  { label: 'SEG', full: 'Segunda-feira' },
  { label: 'TER', full: 'Terca-feira' },
  { label: 'QUA', full: 'Quarta-feira' },
  { label: 'QUI', full: 'Quinta-feira' },
  { label: 'SEX', full: 'Sexta-feira' },
  { label: 'SAB', full: 'Sabado' },
]

interface CalendarMonthGridProps {
  phases: JobPhase[]
  currentMonth: Date
  onPhaseClick: (phase: JobPhase) => void
  onDayClick?: (date: Date) => void
  /** Direcao da animacao: 1 = proximo mes (slide esquerda), -1 = mes anterior (slide direita) */
  animDirection?: 1 | -1
}

export function CalendarMonthGrid({
  phases,
  currentMonth,
  onPhaseClick,
  onDayClick,
  animDirection = 1,
}: CalendarMonthGridProps) {
  const today = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])

  const year  = currentMonth.getFullYear()
  const month = currentMonth.getMonth()

  // Grid de 6 semanas x 7 dias
  const weeks = useMemo(() => getCalendarGrid(year, month), [year, month])

  // Animacao de troca de mes via CSS
  const [animClass, setAnimClass] = useState('')
  const prevMonthRef = useRef<string>('')
  const monthKey = `${year}-${month}`

  useEffect(() => {
    if (prevMonthRef.current === '') {
      prevMonthRef.current = monthKey
      return
    }
    if (prevMonthRef.current === monthKey) return

    prevMonthRef.current = monthKey

    const enterClass = animDirection > 0
      ? 'calendar-slide-enter-next'
      : 'calendar-slide-enter-prev'

    setAnimClass(enterClass)
    const id = setTimeout(() => setAnimClass(''), 220)
    return () => clearTimeout(id)
  }, [monthKey, animDirection])

  const ariaLabel = format(currentMonth, "'Calendario de' MMMM 'de' yyyy", { locale: ptBR })

  return (
    <>
      {/* Estilos de animacao inline (CSS transitions, sem framer-motion) */}
      <style>{`
        @keyframes calSlideInNext {
          from { opacity: 0; transform: translateX(24px); }
          to   { opacity: 1; transform: translateX(0);    }
        }
        @keyframes calSlideInPrev {
          from { opacity: 0; transform: translateX(-24px); }
          to   { opacity: 1; transform: translateX(0);     }
        }
        .calendar-slide-enter-next {
          animation: calSlideInNext 200ms ease-out forwards;
        }
        .calendar-slide-enter-prev {
          animation: calSlideInPrev 200ms ease-out forwards;
        }
        @media (prefers-reduced-motion: reduce) {
          .calendar-slide-enter-next,
          .calendar-slide-enter-prev {
            animation: none;
            opacity: 1;
          }
        }
      `}</style>

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
                {/* Desktop: 3 letras | Tablet: 1 letra */}
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
              const dayPhases = isCurrentMonth
                ? getPhasesForDay(phases, day)
                : []

              return (
                <CalendarCell
                  key={`${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`}
                  date={day}
                  phases={dayPhases}
                  isCurrentMonth={isCurrentMonth}
                  isToday={isToday}
                  isWeekend={isWeekend}
                  onPhaseClick={onPhaseClick}
                  onClick={onDayClick}
                />
              )
            })}
          </div>
        ))}
      </div>
    </>
  )
}
