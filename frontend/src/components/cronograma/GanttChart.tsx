'use client'

import { useState, useRef, useCallback } from 'react'
import { parseISO, differenceInCalendarDays, format, isSameDay, addDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { getDaysInRange, getGanttBarColumn, formatDateBR, countWorkingDays } from '@/lib/cronograma-utils'
import { PHASE_STATUS_CONFIG } from '@/types/cronograma'
import type { JobPhase, UpdatePhasePayload } from '@/types/cronograma'

// --- Drag types ---

type DragMode = 'move' | 'resize-start' | 'resize-end'

interface DragState {
  phaseId: string
  mode: DragMode
  /** Mouse X at drag start */
  startMouseX: number
  /** Original start_date ISO */
  origStart: string
  /** Original end_date ISO */
  origEnd: string
  /** Current day delta from drag start */
  dayDelta: number
}

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

// --- Drag hint tooltip (shows new dates during drag) ---

function DragHint({ startDate, endDate, x, y }: { startDate: string; endDate: string; x: number; y: number }) {
  return (
    <div
      className="fixed z-[60] pointer-events-none"
      style={{ left: x, top: y - 32 }}
    >
      <div className="bg-neutral-800 text-white rounded-md px-2.5 py-1 shadow-lg text-xs font-medium whitespace-nowrap">
        {formatDateBR(startDate)} &rarr; {formatDateBR(endDate)}
      </div>
    </div>
  )
}

// --- Props ---

interface GanttChartProps {
  phases: JobPhase[]
  onPhaseClick?: (phase: JobPhase) => void
  onPhaseDrag?: (phaseId: string, payload: UpdatePhasePayload) => void
}

// --- Helpers ---

function shiftDate(isoDate: string, days: number): string {
  return format(addDays(parseISO(isoDate), days), 'yyyy-MM-dd')
}

// --- Componente principal ---

export function GanttChart({ phases, onPhaseClick, onPhaseDrag }: GanttChartProps) {
  const [tooltip, setTooltip] = useState<TooltipData | null>(null)
  const [drag, setDrag] = useState<DragState | null>(null)
  const [dragMousePos, setDragMousePos] = useState<{ x: number; y: number } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  /** Tracks if a drag with actual movement occurred — used to suppress click after drag */
  const didDragRef = useRef(false)

  // Filtrar fases que possuem datas definidas (fases sem datas nao aparecem no gantt)
  const datedPhases = phases.filter((p) => p.start_date && p.end_date)
  if (datedPhases.length === 0) return null

  // Calcular intervalo total do cronograma
  const sortedPhases = [...datedPhases].sort((a, b) =>
    a.start_date!.localeCompare(b.start_date!),
  )
  const minDate = sortedPhases[0].start_date!
  const maxDate = [...datedPhases].sort((a, b) =>
    b.end_date!.localeCompare(a.end_date!),
  )[0].end_date!

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

  // --- Drag handlers ---

  const handleDragStart = (e: React.MouseEvent, phase: JobPhase, mode: DragMode) => {
    if (!phase.start_date || !phase.end_date || !onPhaseDrag) return
    e.preventDefault()
    e.stopPropagation()
    setTooltip(null)
    didDragRef.current = false
    setDrag({
      phaseId: phase.id,
      mode,
      startMouseX: e.clientX,
      origStart: phase.start_date,
      origEnd: phase.end_date,
      dayDelta: 0,
    })
    setDragMousePos({ x: e.clientX, y: e.clientY })
  }

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!drag) return
    const deltaX = e.clientX - drag.startMouseX
    const dayDelta = Math.round(deltaX / COL_WIDTH)
    if (dayDelta !== drag.dayDelta) {
      setDrag((prev) => prev ? { ...prev, dayDelta } : null)
      if (dayDelta !== 0) didDragRef.current = true
    }
    setDragMousePos({ x: e.clientX, y: e.clientY })
  }, [drag])

  const handleMouseUp = useCallback(() => {
    if (!drag || drag.dayDelta === 0 || !onPhaseDrag) {
      setDrag(null)
      setDragMousePos(null)
      return
    }

    const { mode, origStart, origEnd, dayDelta } = drag
    let newStart = origStart
    let newEnd = origEnd

    if (mode === 'move') {
      newStart = shiftDate(origStart, dayDelta)
      newEnd = shiftDate(origEnd, dayDelta)
    } else if (mode === 'resize-end') {
      newEnd = shiftDate(origEnd, dayDelta)
      // Garantir que end >= start
      if (newEnd < origStart) newEnd = origStart
    } else if (mode === 'resize-start') {
      newStart = shiftDate(origStart, dayDelta)
      // Garantir que start <= end
      if (newStart > origEnd) newStart = origEnd
    }

    onPhaseDrag(drag.phaseId, { start_date: newStart, end_date: newEnd })
    setDrag(null)
    setDragMousePos(null)
  }, [drag, onPhaseDrag])

  // Calcular datas de preview durante drag
  function getDragPreview(phase: JobPhase): { startDate: string; endDate: string; barLeft: number; barWidth: number } | null {
    if (!drag || drag.phaseId !== phase.id || !phase.start_date || !phase.end_date) return null
    const { mode, origStart, origEnd, dayDelta } = drag
    if (dayDelta === 0) return null

    let newStart = origStart
    let newEnd = origEnd

    if (mode === 'move') {
      newStart = shiftDate(origStart, dayDelta)
      newEnd = shiftDate(origEnd, dayDelta)
    } else if (mode === 'resize-end') {
      newEnd = shiftDate(origEnd, dayDelta)
      if (newEnd < origStart) newEnd = origStart
    } else if (mode === 'resize-start') {
      newStart = shiftDate(origStart, dayDelta)
      if (newStart > origEnd) newStart = origEnd
    }

    const { colStart, colSpan } = getGanttBarColumn(newStart, newEnd, minDate)
    const barLeft = (colStart - 2) * COL_WIDTH
    const barWidth = colSpan * COL_WIDTH

    return { startDate: newStart, endDate: newEnd, barLeft, barWidth }
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative overflow-x-auto rounded-lg border border-border bg-neutral-50 dark:bg-neutral-900',
        drag && 'cursor-grabbing',
      )}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => {
        if (drag) {
          // Cancelar drag em vez de confirmar — evita mudancas acidentais
          setDrag(null)
          setDragMousePos(null)
          didDragRef.current = false
        }
        setTooltip(null)
      }}
    >
      {/* Tooltip */}
      {!drag && tooltip && <GanttTooltip data={tooltip} />}

      {/* Drag hint */}
      {drag && drag.dayDelta !== 0 && dragMousePos && (() => {
        const phase = datedPhases.find((p) => p.id === drag.phaseId)
        if (!phase) return null
        const preview = getDragPreview(phase)
        if (!preview) return null
        return <DragHint startDate={preview.startDate} endDate={preview.endDate} x={dragMousePos.x} y={dragMousePos.y} />
      })()}

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

        {/* Linhas de fase (somente fases com datas) */}
        {[...datedPhases]
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
            const isDragging = drag?.phaseId === phase.id && drag.dayDelta !== 0

            // Posicao da barra (usa preview se arrastando)
            const preview = getDragPreview(phase)
            const barLeft = preview ? preview.barLeft : (colStart - 2) * COL_WIDTH
            const barWidth = preview ? preview.barWidth : colSpan * COL_WIDTH

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
                      'absolute top-3 transition-all duration-150 group',
                      'rounded-lg border',
                      isCurrentPhase && 'ring-2',
                      isDragging && 'opacity-80 shadow-lg ring-2 ring-primary/30 !transition-none',
                      !drag && onPhaseDrag ? 'cursor-grab' : drag?.phaseId === phase.id ? 'cursor-grabbing' : 'cursor-pointer',
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
                      ...(!drag ? { transition: 'left 0.15s, width 0.15s' } : {}),
                    }}
                    onMouseEnter={(e) => {
                      if (drag) return
                      const rect = e.currentTarget.getBoundingClientRect()
                      setTooltip({ phase, x: rect.left, y: rect.top })
                    }}
                    onMouseMove={(e) => {
                      if (drag) return
                      setTooltip((prev) =>
                        prev ? { ...prev, x: e.clientX, y: e.clientY } : null,
                      )
                    }}
                    onMouseLeave={() => { if (!drag) setTooltip(null) }}
                    onMouseDown={(e) => {
                      if (!onPhaseDrag) {
                        // No drag support, just click
                        return
                      }
                      // Check if clicking on resize handles
                      const rect = e.currentTarget.getBoundingClientRect()
                      const relX = e.clientX - rect.left
                      const handleZone = 8 // px from edge

                      if (relX <= handleZone) {
                        handleDragStart(e, phase, 'resize-start')
                      } else if (relX >= rect.width - handleZone) {
                        handleDragStart(e, phase, 'resize-end')
                      } else {
                        handleDragStart(e, phase, 'move')
                      }
                    }}
                    onClick={(e) => {
                      // Suppress click if a drag with movement just happened
                      if (didDragRef.current) {
                        didDragRef.current = false
                        return
                      }
                      e.stopPropagation()
                      onPhaseClick?.(phase)
                    }}
                    role="button"
                    tabIndex={0}
                    aria-label={`${phase.phase_emoji} ${phase.phase_label}: ${formatDateBR(phase.start_date)} ate ${formatDateBR(phase.end_date)}, ${workingDays} dias`}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') onPhaseClick?.(phase)
                    }}
                  >
                    {/* Resize handle esquerdo */}
                    {onPhaseDrag && (
                      <div
                        className="absolute left-0 top-0 bottom-0 w-2 cursor-col-resize opacity-0 group-hover:opacity-100 transition-opacity z-10"
                        style={{ borderLeft: `2px solid ${phase.phase_color}` }}
                      />
                    )}

                    {/* Texto dentro da barra (so mostra se ha espaco) */}
                    {barWidth >= 64 && (
                      <div className="flex flex-col justify-center h-full px-2 overflow-hidden">
                        <span
                          className="text-[11px] font-semibold truncate leading-none"
                          style={{ color: phase.phase_color }}
                        >
                          {isDragging && preview
                            ? `${countWorkingDays(preview.startDate, preview.endDate, phase.skip_weekends)}d`
                            : `${workingDays}d`}
                        </span>
                      </div>
                    )}

                    {/* Resize handle direito */}
                    {onPhaseDrag && (
                      <div
                        className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize opacity-0 group-hover:opacity-100 transition-opacity z-10"
                        style={{ borderRight: `2px solid ${phase.phase_color}` }}
                      />
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
            <strong className="text-foreground">{datedPhases.length}</strong> fases
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
