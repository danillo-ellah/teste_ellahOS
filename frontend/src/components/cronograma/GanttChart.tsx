'use client'

import { useState, useRef } from 'react'
import { parseISO, differenceInCalendarDays, format, isSameDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { getDaysInRange, getGanttBarColumn, formatDateBR, countWorkingDays } from '@/lib/cronograma-utils'
import { PHASE_STATUS_CONFIG } from '@/types/cronograma'
import type { JobPhase } from '@/types/cronograma'

// --- Tooltip ---

interface TooltipData {
  phase: JobPhase
  x: number
  y: number
}

function GanttTooltip({ data }: { data: TooltipData }) {
  const { phase, x, y } = data
  const workingDays = countWorkingDays(phase.start_date, phase.end_date, phase.skip_weekends)
  const statusConfig = PHASE_STATUS_CONFIG[phase.status]

  return (
    <div
      className="fixed z-50 pointer-events-none"
      style={{ left: x + 12, top: y - 8, maxWidth: 260 }}
    >
      <div className="bg-neutral-900 text-white rounded-lg p-3 shadow-xl text-xs">
        <div className="font-semibold text-sm mb-1">
          {phase.phase_emoji} {phase.phase_label}
        </div>
        <div className="border-t border-neutral-700 my-1.5" />
        <div className="text-neutral-300 space-y-0.5">
          <div>{formatDateBR(phase.start_date)} &rarr; {formatDateBR(phase.end_date)}</div>
          <div>
            {workingDays} {workingDays === 1 ? 'dia' : 'dias'}{phase.skip_weekends ? ' uteis (pula FDS)' : ' corridos'}
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
      </div>
    </div>
  )
}

// --- Props ---

interface GanttChartProps {
  phases: JobPhase[]
  onPhaseClick?: (phase: JobPhase) => void
}

// --- Componente principal ---

export function GanttChart({ phases, onPhaseClick }: GanttChartProps) {
  const [tooltip, setTooltip] = useState<TooltipData | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  if (phases.length === 0) return null

  // Calcular intervalo total do cronograma
  const sortedPhases = [...phases].sort((a, b) =>
    a.start_date.localeCompare(b.start_date),
  )
  const minDate = sortedPhases[0].start_date
  const maxDate = [...phases].sort((a, b) =>
    b.end_date.localeCompare(a.end_date),
  )[0].end_date

  const allDays = getDaysInRange(minDate, maxDate)
  if (allDays.length === 0) return null

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const todayOffset = differenceInCalendarDays(today, parseISO(minDate))
  const showTodayLine = todayOffset >= 0 && todayOffset < allDays.length

  // Largura de cada coluna de dia (px)
  const COL_WIDTH = 32
  const LABEL_COL_WIDTH = 192 // 12rem

  // Agrupar dias por mes para o header
  const monthGroups: Array<{ label: string; startIdx: number; count: number }> = []
  allDays.forEach((day, idx) => {
    const label = format(day, 'MMM yyyy', { locale: ptBR }).toUpperCase()
    const last = monthGroups[monthGroups.length - 1]
    if (last && last.label === label) {
      last.count++
    } else {
      monthGroups.push({ label, startIdx: idx, count: 1 })
    }
  })

  const totalWidth = LABEL_COL_WIDTH + allDays.length * COL_WIDTH

  return (
    <div
      ref={containerRef}
      className="relative overflow-x-auto rounded-lg border border-border bg-neutral-50 dark:bg-neutral-900"
      onMouseLeave={() => setTooltip(null)}
    >
      {/* Tooltip */}
      {tooltip && <GanttTooltip data={tooltip} />}

      <div style={{ minWidth: totalWidth }} className="select-none">
        {/* Header: meses */}
        <div
          className="flex border-b border-border"
          style={{ paddingLeft: LABEL_COL_WIDTH }}
        >
          {monthGroups.map((mg) => (
            <div
              key={mg.label + mg.startIdx}
              className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-r border-border px-2 py-1.5"
              style={{ width: mg.count * COL_WIDTH }}
            >
              {mg.label}
            </div>
          ))}
        </div>

        {/* Header: dias */}
        <div
          className="flex border-b border-border bg-background"
          style={{ paddingLeft: LABEL_COL_WIDTH }}
        >
          {allDays.map((day, idx) => {
            const isToday = isSameDay(day, today)
            const isWeekend = day.getDay() === 0 || day.getDay() === 6

            return (
              <div
                key={idx}
                className={cn(
                  'flex flex-col items-center justify-center text-[10px] border-r border-border/50 py-1',
                  isToday && 'bg-rose-500/10',
                  isWeekend && !isToday && 'bg-neutral-100 dark:bg-neutral-800/60',
                )}
                style={{ width: COL_WIDTH, minWidth: COL_WIDTH }}
              >
                <span className={cn(
                  'font-medium',
                  isToday ? 'text-rose-500' : 'text-muted-foreground',
                )}>
                  {format(day, 'dd')}
                </span>
                <span className={cn(
                  'text-[9px]',
                  isToday ? 'text-rose-400' : 'text-muted-foreground/60',
                )}>
                  {format(day, 'EEE', { locale: ptBR }).slice(0, 3)}
                </span>
              </div>
            )
          })}
        </div>

        {/* Linhas de fase */}
        {[...phases]
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((phase, rowIdx) => {
            const { colStart, colSpan } = getGanttBarColumn(
              phase.start_date,
              phase.end_date,
              minDate,
            )
            const workingDays = countWorkingDays(
              phase.start_date,
              phase.end_date,
              phase.skip_weekends,
            )
            const isCurrentPhase = phase.status === 'in_progress'

            // Posicao absoluta da barra dentro do grid de dias
            const barLeft = (colStart - 2) * COL_WIDTH  // colStart-2 remove a col de label
            const barWidth = colSpan * COL_WIDTH

            return (
              <div
                key={phase.id}
                className={cn(
                  'flex items-center border-b border-border/50 last:border-0',
                  rowIdx % 2 === 0 ? 'bg-background' : 'bg-neutral-50/50 dark:bg-neutral-900/50',
                )}
                style={{ height: 56 }}
              >
                {/* Label (sticky) */}
                <div
                  className="sticky left-0 z-10 flex flex-col justify-center px-3 bg-inherit border-r border-border shrink-0"
                  style={{ width: LABEL_COL_WIDTH, minWidth: LABEL_COL_WIDTH }}
                >
                  <span className="text-sm font-medium truncate leading-tight">
                    {phase.phase_emoji} {phase.phase_label}
                  </span>
                  {phase.complement && (
                    <span className="text-[11px] text-muted-foreground italic truncate leading-tight mt-0.5">
                      {phase.complement}
                    </span>
                  )}
                </div>

                {/* Area de barras */}
                <div className="relative flex-1" style={{ height: 56 }}>
                  {/* Linha hoje */}
                  {showTodayLine && (
                    <div
                      className="absolute top-0 bottom-0 z-20 pointer-events-none"
                      style={{
                        left: todayOffset * COL_WIDTH + COL_WIDTH / 2,
                        borderLeft: '2px dashed #F43F5E',
                      }}
                    />
                  )}

                  {/* Barra da fase */}
                  <div
                    className={cn(
                      'absolute top-3 cursor-pointer transition-all duration-150',
                      'rounded-lg border',
                      isCurrentPhase && 'ring-2',
                    )}
                    style={{
                      left: barLeft,
                      width: Math.max(barWidth, COL_WIDTH),
                      height: 30,
                      backgroundColor: `${phase.phase_color}22`,
                      borderColor: `${phase.phase_color}50`,
                      borderLeft: `3px solid ${phase.phase_color}`,
                      ...(isCurrentPhase ? {
                        backgroundColor: `${phase.phase_color}33`,
                        borderLeftWidth: '4px',
                        ringColor: `${phase.phase_color}40`,
                      } : {}),
                    }}
                    onMouseEnter={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect()
                      setTooltip({
                        phase,
                        x: rect.left,
                        y: rect.top,
                      })
                    }}
                    onMouseMove={(e) => {
                      setTooltip((prev) =>
                        prev ? { ...prev, x: e.clientX, y: e.clientY } : null,
                      )
                    }}
                    onMouseLeave={() => setTooltip(null)}
                    onClick={() => onPhaseClick?.(phase)}
                    role="button"
                    tabIndex={0}
                    aria-label={`${phase.phase_emoji} ${phase.phase_label}: ${formatDateBR(phase.start_date)} ate ${formatDateBR(phase.end_date)}, ${workingDays} dias`}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') onPhaseClick?.(phase)
                    }}
                  >
                    {/* Texto dentro da barra (so mostra se ha espaco) */}
                    {barWidth >= 64 && (
                      <div className="flex flex-col justify-center h-full px-2 overflow-hidden">
                        <span
                          className="text-[11px] font-semibold truncate leading-none"
                          style={{ color: phase.phase_color }}
                        >
                          {workingDays}d
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}

        {/* Footer: totais */}
        <div
          className="flex items-center gap-4 px-4 py-2 border-t border-border bg-background text-xs text-muted-foreground"
        >
          <span>
            <strong className="text-foreground">{phases.length}</strong> fases
          </span>
          <span className="text-border">|</span>
          <span>
            Inicio: <strong className="text-foreground">{formatDateBR(minDate)}</strong>
          </span>
          <span className="text-border">|</span>
          <span>
            Entrega prevista: <strong className="text-foreground">{formatDateBR(maxDate)}</strong>
          </span>
          {showTodayLine && (
            <>
              <span className="text-border">|</span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-rose-500 inline-block" />
                Hoje
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
