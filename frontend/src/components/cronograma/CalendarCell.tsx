'use client'

import { cn } from '@/lib/utils'
import { CalendarPhasePill } from './CalendarPhasePill'
import { CalendarDayPopover } from './CalendarDayPopover'
import type { JobPhase } from '@/types/cronograma'

// Limites de fases visiveis por breakpoint (controlado via CSS + JS)
// Desktop: 3  |  Tablet: 2  |  Mobile: so emojis
const MAX_VISIBLE_DESKTOP = 3
const MAX_VISIBLE_TABLET = 2

interface CalendarCellProps {
  date: Date
  /** Fases ja filtradas para este dia */
  phases: JobPhase[]
  isCurrentMonth: boolean
  isToday: boolean
  isWeekend: boolean
  onPhaseClick: (phase: JobPhase) => void
  onClick?: (date: Date) => void
}

export function CalendarCell({
  date,
  phases,
  isCurrentMonth,
  isToday,
  isWeekend,
  onPhaseClick,
  onClick,
}: CalendarCellProps) {
  const dayNumber = date.getDate()
  const hasPhases = phases.length > 0

  // Calcular overflow para desktop e tablet
  const overflowDesktop = Math.max(0, phases.length - MAX_VISIBLE_DESKTOP)
  const overflowTablet  = Math.max(0, phases.length - MAX_VISIBLE_TABLET)

  const visibleDesktop = phases.slice(0, MAX_VISIBLE_DESKTOP)
  const visibleTablet  = phases.slice(0, MAX_VISIBLE_TABLET)

  function handleCellClick() {
    if (!isCurrentMonth) return
    onClick?.(date)
  }

  return (
    <div
      role="gridcell"
      aria-label={[
        `${dayNumber} de ${date.toLocaleString('pt-BR', { month: 'long' })}`,
        phases.length > 0 ? `${phases.length} ${phases.length === 1 ? 'fase' : 'fases'}` : '',
      ].filter(Boolean).join(', ')}
      aria-current={isToday ? 'date' : undefined}
      className={cn(
        // Layout
        'relative flex flex-col min-h-[64px] md:min-h-[96px] lg:min-h-[120px]',
        'border-r border-b border-border/60',
        // Padding
        'p-1.5',
        // Backgrounds
        !isCurrentMonth && 'bg-neutral-50/50 dark:bg-neutral-900/30',
        isCurrentMonth && isWeekend && !isToday && 'bg-neutral-50 dark:bg-neutral-900/60',
        isCurrentMonth && !isWeekend && !isToday && 'bg-background',
        isToday && 'bg-rose-500/5 dark:bg-rose-500/8 ring-inset ring-1 ring-rose-500/40',
        // Cursor: so clicavel se e do mes atual
        isCurrentMonth && onClick && 'cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/50',
        // Dias de outros meses: sem interacao
        !isCurrentMonth && 'pointer-events-none',
      )}
      onClick={handleCellClick}
    >
      {/* Numero do dia — topo direito */}
      <div className="flex justify-end mb-0.5">
        {isToday ? (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[11px] font-bold text-white leading-none">
            {dayNumber}
          </span>
        ) : (
          <span
            className={cn(
              'text-xs font-medium leading-none',
              !isCurrentMonth && 'text-muted-foreground/40',
              isWeekend && isCurrentMonth && 'text-muted-foreground',
              !isWeekend && isCurrentMonth && 'text-foreground',
            )}
          >
            {dayNumber}
          </span>
        )}
      </div>

      {/* Conteudo: apenas para dias do mes atual */}
      {isCurrentMonth && (
        <>
          {/* Desktop (lg+): max 3 pills + badge overflow */}
          <div className="hidden lg:flex flex-col gap-0.5 flex-1">
            {visibleDesktop.map((phase) => (
              <CalendarPhasePill
                key={phase.id}
                phase={phase}
                isWeekend={isWeekend}
                showComplement
                onClick={onPhaseClick}
              />
            ))}
            {overflowDesktop > 0 && (
              <CalendarDayPopover
                date={date}
                phases={phases}
                onPhaseClick={onPhaseClick}
              >
                <button
                  type="button"
                  aria-label={`Ver todas as ${phases.length} fases de ${dayNumber}`}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full text-left text-[10px] text-muted-foreground px-1.5 py-0.5 rounded-md bg-muted hover:bg-muted/80 transition-colors duration-100 cursor-pointer"
                >
                  + {overflowDesktop} mais
                </button>
              </CalendarDayPopover>
            )}
          </div>

          {/* Tablet (md, hidden lg): max 2 pills + badge overflow */}
          <div className="hidden md:flex lg:hidden flex-col gap-0.5 flex-1">
            {visibleTablet.map((phase) => (
              <CalendarPhasePill
                key={phase.id}
                phase={phase}
                isWeekend={isWeekend}
                showComplement={false}
                onClick={onPhaseClick}
              />
            ))}
            {overflowTablet > 0 && (
              <CalendarDayPopover
                date={date}
                phases={phases}
                onPhaseClick={onPhaseClick}
              >
                <button
                  type="button"
                  aria-label={`Ver todas as ${phases.length} fases`}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full text-left text-[10px] text-muted-foreground px-1.5 py-0.5 rounded-md bg-muted hover:bg-muted/80 transition-colors duration-100 cursor-pointer"
                >
                  + {overflowTablet} mais
                </button>
              </CalendarDayPopover>
            )}
          </div>

          {/* Mobile (< md): so emojis, tap abre popover */}
          {hasPhases ? (
            <CalendarDayPopover
              date={date}
              phases={phases}
              onPhaseClick={onPhaseClick}
            >
              <div
                className="flex md:hidden flex-col gap-0.5 flex-1 cursor-pointer"
                role="button"
                aria-label={`${phases.length} ${phases.length === 1 ? 'fase' : 'fases'} em ${dayNumber}`}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') e.stopPropagation()
                }}
                tabIndex={0}
              >
                {phases.map((phase) => (
                  <span
                    key={phase.id}
                    className="text-sm leading-none min-w-[28px] min-h-[28px] flex items-center justify-center"
                    title={phase.phase_label}
                  >
                    {phase.phase_emoji}
                  </span>
                ))}
              </div>
            </CalendarDayPopover>
          ) : (
            <div className="flex md:hidden flex-1" />
          )}
        </>
      )}
    </div>
  )
}
