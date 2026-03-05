'use client'

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { formatDateBR, countWorkingDays } from '@/lib/cronograma-utils'
import { PHASE_STATUS_CONFIG } from '@/types/cronograma'
import type { JobPhase } from '@/types/cronograma'

interface CalendarPhasePillProps {
  phase: JobPhase
  /** Dia e FDS — se skip_weekends: opacity-50 italic */
  isWeekend: boolean
  /** Exibe o complemento abaixo do nome (so desktop) */
  showComplement?: boolean
  onClick: (phase: JobPhase) => void
}

export function CalendarPhasePill({
  phase,
  isWeekend,
  showComplement = true,
  onClick,
}: CalendarPhasePillProps) {
  const isWeekendAndSkip = isWeekend && phase.skip_weekends
  const workingDays = countWorkingDays(phase.start_date, phase.end_date, phase.skip_weekends)
  const statusConfig = PHASE_STATUS_CONFIG[phase.status]

  const bgNormal = `${phase.phase_color}26`   // 15% opacidade
  const bgHover  = `${phase.phase_color}40`   // 25% opacidade

  return (
    <TooltipProvider delayDuration={400}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            role="button"
            aria-label={`${phase.phase_emoji} ${phase.phase_label}: ${formatDateBR(phase.start_date)} ate ${formatDateBR(phase.end_date)}`}
            onClick={(e) => {
              e.stopPropagation()
              onClick(phase)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.stopPropagation()
                onClick(phase)
              }
            }}
            className={cn(
              'w-full text-left rounded-md px-1.5 py-0.5 mb-0.5 cursor-pointer',
              'transition-all duration-100',
              'group',
              isWeekendAndSkip && 'opacity-50',
            )}
            style={{
              backgroundColor: bgNormal,
              borderLeft: `2px solid ${phase.phase_color}`,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = bgHover
              e.currentTarget.style.borderLeftWidth = '3px'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = bgNormal
              e.currentTarget.style.borderLeftWidth = '2px'
            }}
          >
            {/* Linha principal: emoji + nome */}
            <div className="flex items-center gap-0.5 min-w-0">
              <span className="text-[11px] leading-tight shrink-0">
                {phase.phase_emoji}
              </span>
              <span
                className={cn(
                  'text-[11px] font-medium leading-tight truncate',
                  isWeekendAndSkip && 'italic',
                )}
                style={{ color: phase.phase_color }}
              >
                {phase.phase_label}
              </span>
            </div>

            {/* Complemento (so desktop, so se showComplement) */}
            {showComplement && phase.complement && (
              <div className="hidden lg:block text-[10px] italic text-muted-foreground leading-tight truncate mt-0.5">
                {phase.complement}
              </div>
            )}
          </button>
        </TooltipTrigger>

        <TooltipContent
          side="top"
          className="bg-neutral-900 text-white rounded-lg p-3 shadow-xl text-xs max-w-[240px]"
        >
          <div className="font-semibold text-sm mb-1">
            {phase.phase_emoji} {phase.phase_label}
          </div>
          <div className="border-t border-neutral-700 my-1.5" />
          <div className="text-neutral-300 space-y-0.5">
            <div>
              {formatDateBR(phase.start_date)} &rarr; {formatDateBR(phase.end_date)}
            </div>
            <div>
              {workingDays} {workingDays === 1 ? 'dia' : 'dias'}
              {phase.skip_weekends ? ' uteis (pula FDS)' : ' corridos'}
            </div>
            {phase.complement && (
              <div className="text-neutral-400 italic mt-1">&ldquo;{phase.complement}&rdquo;</div>
            )}
          </div>
          <div className="mt-1.5 flex items-center gap-1.5">
            <span
              className="h-1.5 w-1.5 rounded-full inline-block"
              style={{ backgroundColor: statusConfig.dotColor }}
            />
            <span className="text-neutral-400 uppercase tracking-wide text-[10px]">
              {statusConfig.label}
            </span>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
