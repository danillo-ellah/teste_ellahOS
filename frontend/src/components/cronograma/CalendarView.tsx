'use client'

import { useState, useMemo, useCallback } from 'react'
import { format, addMonths, subMonths } from 'date-fns'
import { ChevronLeft, ChevronRight, CalendarDays, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { getInitialCalendarMonth, formatCalendarMonthTitle, getPhasesForDay } from '@/lib/cronograma-utils'
import { CalendarMonthGrid } from './CalendarMonthGrid'
import type { JobPhase } from '@/types/cronograma'

// ---------------------------------------------------------------------------
// Skeleton de carregamento
// ---------------------------------------------------------------------------

function CalendarSkeleton() {
  return (
    <div className="space-y-2">
      {/* Header navegacao */}
      <div className="flex items-center justify-between px-1 py-2">
        <Skeleton className="h-8 w-8 rounded-md" />
        <Skeleton className="h-6 w-36" />
        <Skeleton className="h-8 w-8 rounded-md" />
      </div>
      {/* Grid */}
      <div className="rounded-lg border border-border overflow-hidden">
        {/* Header dias */}
        <div className="grid grid-cols-7 border-b border-border bg-neutral-50 dark:bg-neutral-900">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-8 flex items-center justify-center">
              <Skeleton className="h-3 w-6" />
            </div>
          ))}
        </div>
        {/* 5 semanas */}
        {Array.from({ length: 5 }).map((_, w) => (
          <div key={w} className="grid grid-cols-7">
            {Array.from({ length: 7 }).map((_, d) => (
              <div key={d} className="min-h-[100px] border-r border-b border-border/60 p-1.5 space-y-1">
                <div className="flex justify-end">
                  <Skeleton className="h-4 w-4 rounded-full" />
                </div>
                {d % 3 !== 0 && <Skeleton className="h-4 rounded-sm" />}
                {d % 5 === 1 && <Skeleton className="h-4 rounded-sm" style={{ width: '70%' }} />}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Empty state: mes sem fases
// ---------------------------------------------------------------------------

function EmptyMonth({
  monthTitle,
  onAddPhase,
}: {
  monthTitle: string
  onAddPhase?: () => void
}) {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
      <div className="bg-background/85 backdrop-blur-sm rounded-lg p-8 flex flex-col items-center text-center gap-3 shadow-sm pointer-events-auto">
        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
          <CalendarDays className="size-5 text-muted-foreground" />
        </div>
        <div>
          <p className="text-sm font-semibold">Nenhuma fase em {monthTitle.toLowerCase()}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Adicione fases ao cronograma para visualizar no calendario.
          </p>
        </div>
        {onAddPhase && (
          <Button size="sm" onClick={onAddPhase}>
            <Plus className="size-4" />
            Adicionar Fase
          </Button>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Legenda do mes
// ---------------------------------------------------------------------------

function CalendarLegend({ phases }: { phases: JobPhase[] }) {
  const MAX_VISIBLE = 5

  if (phases.length === 0) return null

  // Deduplicar por phase_key (pode haver varios dias da mesma fase)
  const unique = phases.filter(
    (p, i, arr) => arr.findIndex((x) => x.phase_key === p.phase_key) === i,
  )

  const visible = unique.slice(0, MAX_VISIBLE)
  const overflow = unique.length - MAX_VISIBLE

  return (
    <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-border">
      <span className="text-xs text-muted-foreground font-medium mr-1">Fases:</span>
      {visible.map((phase) => (
        <span
          key={phase.phase_key}
          className="inline-flex items-center gap-1 text-xs rounded-full px-2 py-0.5"
          style={{
            backgroundColor: `${phase.phase_color}26`,
            color: phase.phase_color,
          }}
        >
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: phase.phase_color }}
          />
          {phase.phase_emoji} {phase.phase_label}
        </span>
      ))}
      {overflow > 0 && (
        <span className="text-xs text-muted-foreground">+{overflow} mais</span>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Props do CalendarView
// ---------------------------------------------------------------------------

interface CalendarViewProps {
  phases: JobPhase[]
  onPhaseClick: (phase: JobPhase) => void
  /**
   * Chamado quando o usuario clica em uma celula vazia.
   * Recebe a data no formato YYYY-MM-DD.
   */
  onAddPhase?: (date?: string) => void
  isLoading?: boolean
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

export function CalendarView({
  phases,
  onPhaseClick,
  onAddPhase,
  isLoading = false,
}: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState<Date>(() =>
    getInitialCalendarMonth(phases),
  )
  // Direcao da animacao: 1 = avancar, -1 = voltar
  const [animDirection, setAnimDirection] = useState<1 | -1>(1)

  const handlePrev = useCallback(() => {
    setAnimDirection(-1)
    setCurrentMonth((m) => subMonths(m, 1))
  }, [])

  const handleNext = useCallback(() => {
    setAnimDirection(1)
    setCurrentMonth((m) => addMonths(m, 1))
  }, [])

  const handleToday = useCallback(() => {
    const today = new Date()
    const target = new Date(today.getFullYear(), today.getMonth(), 1)
    setAnimDirection(target > currentMonth ? 1 : -1)
    setCurrentMonth(target)
  }, [currentMonth])

  const monthTitle = formatCalendarMonthTitle(currentMonth)
  const year  = currentMonth.getFullYear()
  const month = currentMonth.getMonth()

  // Fases que aparecem no mes atual (para a legenda)
  const phasesThisMonth = useMemo(() => {
    if (phases.length === 0) return []

    const result: JobPhase[] = []
    const seen = new Set<string>()

    // Varrer todos os dias do mes e coletar fases unicas
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    for (let d = 1; d <= daysInMonth; d++) {
      const day = new Date(year, month, d)
      const dayPhases = getPhasesForDay(phases, day)
      for (const p of dayPhases) {
        if (!seen.has(p.phase_key)) {
          seen.add(p.phase_key)
          result.push(p)
        }
      }
    }
    return result
  }, [phases, year, month])

  const hasMonthPhases = phasesThisMonth.length > 0

  // Handler de click em celula vazia
  const handleDayClick = useCallback(
    (date: Date) => {
      if (!onAddPhase) return
      const _isWeekend = date.getDay() === 0 || date.getDay() === 6
      const dateStr = format(date, 'yyyy-MM-dd')
      // Passa a data; o handler do pai abre o dialog (com aviso de FDS se necessario)
      onAddPhase(dateStr)
    },
    [onAddPhase],
  )

  if (isLoading) return <CalendarSkeleton />

  return (
    <div
      role="region"
      aria-label="Calendario mensal do cronograma"
      className="space-y-0"
    >
      {/* Navegacao de mes */}
      <div className="flex items-center justify-between px-0 py-2 mb-2">
        {/* Seta anterior */}
        <button
          type="button"
          aria-label="Mes anterior"
          onClick={handlePrev}
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-md',
            'text-muted-foreground hover:text-foreground hover:bg-muted',
            'transition-colors duration-150',
          )}
        >
          <ChevronLeft className="size-5" />
        </button>

        {/* Titulo + botao Hoje */}
        <div className="flex items-center gap-2">
          <h2
            className="text-base font-semibold tracking-wide select-none"
            aria-live="polite"
            aria-atomic="true"
          >
            {monthTitle}
          </h2>
          <button
            type="button"
            aria-label="Ir para o mes atual"
            onClick={handleToday}
            className={cn(
              'hidden sm:flex items-center px-2 py-0.5 rounded border border-border',
              'text-xs text-muted-foreground hover:text-foreground hover:bg-muted',
              'transition-colors duration-150',
            )}
          >
            Hoje
          </button>
        </div>

        {/* Seta proxima */}
        <button
          type="button"
          aria-label="Proximo mes"
          onClick={handleNext}
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-md',
            'text-muted-foreground hover:text-foreground hover:bg-muted',
            'transition-colors duration-150',
          )}
        >
          <ChevronRight className="size-5" />
        </button>
      </div>

      {/* Grid do mes — envolto em container relativo para o empty state overlay */}
      <div className="relative">
        <CalendarMonthGrid
          key={`${year}-${month}`}
          phases={phases}
          currentMonth={currentMonth}
          onPhaseClick={onPhaseClick}
          onDayClick={onAddPhase ? handleDayClick : undefined}
          animDirection={animDirection}
        />

        {/* Empty state overlay (nenhuma fase neste mes) */}
        {!hasMonthPhases && phases.length > 0 && (
          <EmptyMonth
            monthTitle={monthTitle}
            onAddPhase={onAddPhase ? () => onAddPhase() : undefined}
          />
        )}
      </div>

      {/* Legenda */}
      <CalendarLegend phases={phasesThisMonth} />
    </div>
  )
}
