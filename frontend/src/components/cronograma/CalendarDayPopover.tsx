'use client'

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { PHASE_STATUS_CONFIG } from '@/types/cronograma'
import type { JobPhase } from '@/types/cronograma'

interface CalendarDayPopoverProps {
  date: Date
  phases: JobPhase[]
  onPhaseClick: (phase: JobPhase) => void
  /** Elemento trigger (badge "+N mais" ou emoji no mobile) */
  children: React.ReactNode
}

export function CalendarDayPopover({
  date,
  phases,
  onPhaseClick,
  children,
}: CalendarDayPopoverProps) {
  const title = format(date, "EEEE, d 'de' MMMM", { locale: ptBR })

  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>

      <PopoverContent
        side="bottom"
        align="start"
        className="p-0 w-[220px] max-h-[300px] overflow-y-auto shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecalho */}
        <div className="px-3 py-2 border-b border-border">
          <p className="text-xs font-semibold capitalize text-foreground">{title}</p>
        </div>

        {/* Lista de fases */}
        <div className="p-1 flex flex-col gap-0.5">
          {phases.length === 0 ? (
            <p className="text-xs text-muted-foreground px-2 py-1.5">
              Nenhuma fase neste dia.
            </p>
          ) : (
            phases.map((phase) => {
              const statusConfig = PHASE_STATUS_CONFIG[phase.status]
              const bgColor = `${phase.phase_color}26`

              return (
                <button
                  key={phase.id}
                  type="button"
                  onClick={() => onPhaseClick(phase)}
                  className={cn(
                    'w-full text-left rounded-md px-2 py-1.5 transition-colors duration-100',
                    'hover:bg-muted',
                  )}
                  style={{
                    borderLeft: `2px solid ${phase.phase_color}`,
                    backgroundColor: bgColor,
                  }}
                >
                  <div className="flex items-center gap-1 min-w-0">
                    <span className="text-[12px] shrink-0">{phase.phase_emoji}</span>
                    <span
                      className="text-[11px] font-medium truncate"
                      style={{ color: phase.phase_color }}
                    >
                      {phase.phase_label}
                    </span>
                  </div>
                  {phase.complement && (
                    <p className="text-[10px] text-muted-foreground italic truncate mt-0.5 pl-4">
                      {phase.complement}
                    </p>
                  )}
                  <div className="mt-0.5 pl-4 flex items-center gap-1">
                    <span
                      className="h-1 w-1 rounded-full inline-block"
                      style={{ backgroundColor: statusConfig.dotColor }}
                    />
                    <span className="text-[9px] text-muted-foreground uppercase tracking-wide">
                      {statusConfig.label}
                    </span>
                  </div>
                </button>
              )
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
