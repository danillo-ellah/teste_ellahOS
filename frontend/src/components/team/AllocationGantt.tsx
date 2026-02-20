'use client'

import { useMemo } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { formatDate } from '@/lib/format'
import type { Allocation, AllocationConflict } from '@/types/allocations'

// ---- Constantes de cor por job (rotacao ciclica) ----
const JOB_COLORS = [
  { bar: 'bg-violet-500 dark:bg-violet-600', text: 'text-white', conflict: 'bg-red-500 dark:bg-red-600' },
  { bar: 'bg-blue-500 dark:bg-blue-600', text: 'text-white', conflict: 'bg-red-500 dark:bg-red-600' },
  { bar: 'bg-emerald-500 dark:bg-emerald-600', text: 'text-white', conflict: 'bg-red-500 dark:bg-red-600' },
  { bar: 'bg-amber-500 dark:bg-amber-600', text: 'text-white', conflict: 'bg-red-500 dark:bg-red-600' },
  { bar: 'bg-cyan-500 dark:bg-cyan-600', text: 'text-white', conflict: 'bg-red-500 dark:bg-red-600' },
  { bar: 'bg-purple-500 dark:bg-purple-600', text: 'text-white', conflict: 'bg-red-500 dark:bg-red-600' },
  { bar: 'bg-rose-500 dark:bg-rose-600', text: 'text-white', conflict: 'bg-red-500 dark:bg-red-600' },
  { bar: 'bg-teal-500 dark:bg-teal-600', text: 'text-white', conflict: 'bg-red-500 dark:bg-red-600' },
]

// ---- Helpers de data (sem date-fns) ----

/** Retorna o numero de dias em um mes (1-based month) */
function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

/** Formata Date para string YYYY-MM-DD local */
function toLocalISODate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Parseia YYYY-MM-DD sem converter fuso */
function parseLocalDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** Retorna o dia-do-mes (1-based) de uma string ISO dentro do mes */
function dayOfMonth(iso: string): number {
  return parseLocalDate(iso).getDate()
}

// ---- Tipos internos ----

export interface GanttRow {
  personId: string
  personName: string
  allocations: Allocation[]
}

interface ConflictRange {
  start: string
  end: string
}

interface AllocationGanttProps {
  year: number
  month: number // 1-based
  allocations: Allocation[]
  conflicts: AllocationConflict[]
  isLoading?: boolean
}

// ---- Componente principal ----

export function AllocationGantt({
  year,
  month,
  allocations,
  conflicts,
  isLoading = false,
}: AllocationGanttProps) {
  const totalDays = daysInMonth(year, month)
  const days = Array.from({ length: totalDays }, (_, i) => i + 1)

  // Mapa jobId -> indice de cor
  const jobColorIndex = useMemo(() => {
    const map = new Map<string, number>()
    let idx = 0
    for (const alloc of allocations) {
      if (!map.has(alloc.job_id)) {
        map.set(alloc.job_id, idx % JOB_COLORS.length)
        idx++
      }
    }
    return map
  }, [allocations])

  // Agrupa alocacoes por pessoa
  const rows = useMemo<GanttRow[]>(() => {
    const personMap = new Map<string, GanttRow>()
    for (const alloc of allocations) {
      const pid = alloc.people_id
      if (!personMap.has(pid)) {
        personMap.set(pid, {
          personId: pid,
          personName: alloc.people?.full_name ?? 'Pessoa desconhecida',
          allocations: [],
        })
      }
      personMap.get(pid)!.allocations.push(alloc)
    }
    return Array.from(personMap.values()).sort((a, b) =>
      a.personName.localeCompare(b.personName, 'pt-BR')
    )
  }, [allocations])

  // Mapa personId -> lista de ranges de conflito
  const conflictMap = useMemo(() => {
    const map = new Map<string, ConflictRange[]>()
    for (const c of conflicts) {
      const existing = map.get(c.person_id) ?? []
      existing.push({ start: c.overlap_start, end: c.overlap_end })
      map.set(c.person_id, existing)
    }
    return map
  }, [conflicts])

  // Verifica se um dia (1-based) esta dentro de um range de conflito de uma pessoa
  function isDayConflict(personId: string, day: number): boolean {
    const ranges = conflictMap.get(personId)
    if (!ranges) return false
    const date = new Date(year, month - 1, day)
    const dateStr = toLocalISODate(date)
    return ranges.some((r) => dateStr >= r.start && dateStr <= r.end)
  }

  // Calcula grid-column-start e span para uma alocacao dentro do mes
  function calcBarPosition(alloc: Allocation): { start: number; span: number } | null {
    const monthStart = toLocalISODate(new Date(year, month - 1, 1))
    const monthEnd = toLocalISODate(new Date(year, month - 1, totalDays))

    // Clipa ao mes corrente
    const effectiveStart = alloc.allocation_start < monthStart ? monthStart : alloc.allocation_start
    const effectiveEnd = alloc.allocation_end > monthEnd ? monthEnd : alloc.allocation_end

    if (effectiveStart > monthEnd || effectiveEnd < monthStart) return null

    const startDay = dayOfMonth(effectiveStart)
    const endDay = dayOfMonth(effectiveEnd)
    const span = endDay - startDay + 1
    if (span <= 0) return null

    return { start: startDay, span }
  }

  // Verifica se uma alocacao tem conflito em algum dia do seu periodo
  function allocationHasConflict(alloc: Allocation, personId: string): boolean {
    const ranges = conflictMap.get(personId)
    if (!ranges) return false
    const pos = calcBarPosition(alloc)
    if (!pos) return false
    for (let d = pos.start; d < pos.start + pos.span; d++) {
      const dateStr = toLocalISODate(new Date(year, month - 1, d))
      if (ranges.some((r) => dateStr >= r.start && dateStr <= r.end)) return true
    }
    return false
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        <GanttHeaderSkeleton totalDays={totalDays} />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full rounded-lg" />
        ))}
      </div>
    )
  }

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
        <p className="text-sm">Nenhuma alocacao encontrada para este periodo.</p>
      </div>
    )
  }

  const LABEL_COL_WIDTH = 160 // px fixo para coluna de nome
  const DAY_COL_WIDTH = 36   // px por dia

  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: `${LABEL_COL_WIDTH}px repeat(${totalDays}, ${DAY_COL_WIDTH}px)`,
    minWidth: LABEL_COL_WIDTH + totalDays * DAY_COL_WIDTH,
    position: 'relative',
  }

  // Dia atual
  const today = new Date()
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() + 1 === month
  const todayDay = isCurrentMonth ? today.getDate() : null

  return (
    <TooltipProvider delayDuration={200}>
      <div className="w-full overflow-x-auto rounded-xl border border-border bg-card">
        {/* Header: dias */}
        <div style={gridStyle} className="border-b border-border">
          {/* Celula vazia do label */}
          <div className="px-3 py-2 text-xs font-semibold text-muted-foreground sticky left-0 bg-card z-10 border-r border-border">
            Pessoa
          </div>
          {days.map((d) => {
            const date = new Date(year, month - 1, d)
            const isWeekend = date.getDay() === 0 || date.getDay() === 6
            const isToday = todayDay === d
            return (
              <div
                key={d}
                className={[
                  'text-center py-2 text-xs font-medium select-none border-r border-border/40',
                  isWeekend ? 'text-muted-foreground/60 bg-muted/30' : 'text-muted-foreground',
                  isToday ? 'bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 font-bold' : '',
                ].join(' ')}
              >
                {d}
              </div>
            )
          })}
        </div>

        {/* Linhas por pessoa */}
        {rows.map((row, rowIdx) => {
          const rowConflicts = conflictMap.get(row.personId)
          const hasAnyConflict = !!rowConflicts && rowConflicts.length > 0

          return (
            <div
              key={row.personId}
              style={gridStyle}
              className={[
                'border-b border-border/50 last:border-b-0',
                rowIdx % 2 === 0 ? 'bg-card' : 'bg-muted/20',
              ].join(' ')}
            >
              {/* Coluna de nome */}
              <div className="px-3 py-1.5 flex items-center gap-1.5 sticky left-0 bg-inherit z-10 border-r border-border min-h-[44px]">
                {hasAnyConflict && (
                  <span
                    className="size-2 rounded-full bg-red-500 shrink-0"
                    role="img"
                    aria-label="Possui conflitos de agenda neste periodo"
                  />
                )}
                <span className="text-xs font-medium truncate" title={row.personName}>
                  {row.personName}
                </span>
              </div>

              {/* Celulas de dia (fundo) */}
              {days.map((d) => {
                const date = new Date(year, month - 1, d)
                const isWeekend = date.getDay() === 0 || date.getDay() === 6
                const isConflict = isDayConflict(row.personId, d)
                const isToday = todayDay === d
                return (
                  <div
                    key={d}
                    className={[
                      'relative border-r border-border/30 min-h-[44px]',
                      isWeekend ? 'bg-muted/20' : '',
                      isToday ? 'bg-rose-50/60 dark:bg-rose-950/20' : '',
                      isConflict ? 'bg-red-100/60 dark:bg-red-950/30' : '',
                    ].join(' ')}
                  />
                )
              })}

              {/* Barras de alocacao sobrepostas usando position absolute */}
              {/* As barras sao renderizadas fora do grid flow, absolutas dentro do row */}
              {row.allocations.map((alloc) => {
                const pos = calcBarPosition(alloc)
                if (!pos) return null

                const colorIdx = jobColorIndex.get(alloc.job_id) ?? 0
                const color = JOB_COLORS[colorIdx]
                const hasConflict = allocationHasConflict(alloc, row.personId)

                const barLabel = alloc.job
                  ? `${alloc.job.code} — ${alloc.job.title}`
                  : alloc.job_id

                const tooltipContent = [
                  barLabel,
                  `${formatDate(alloc.allocation_start)} ate ${formatDate(alloc.allocation_end)}`,
                  hasConflict ? 'CONFLITO DE AGENDA' : '',
                ]
                  .filter(Boolean)
                  .join('\n')

                // Calcula left e width em pixels a partir da posicao no grid
                const left = LABEL_COL_WIDTH + (pos.start - 1) * DAY_COL_WIDTH + 2
                const width = pos.span * DAY_COL_WIDTH - 4

                return (
                  <Tooltip key={alloc.id}>
                    <TooltipTrigger asChild>
                      <div
                        className={[
                          'absolute top-1 h-[28px] rounded-md flex items-center px-2 cursor-pointer z-20 overflow-hidden',
                          hasConflict
                            ? 'bg-red-500 dark:bg-red-600 ring-2 ring-red-700 dark:ring-red-400'
                            : color.bar,
                          color.text,
                          'transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
                        ].join(' ')}
                        style={{ left, width: Math.max(width, 2) }}
                        role="listitem"
                        tabIndex={0}
                        aria-label={tooltipContent}
                      >
                        <span className="text-[10px] font-semibold truncate leading-none select-none">
                          {width > 50 && alloc.job?.code ? alloc.job.code : ''}
                        </span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="whitespace-pre-line max-w-[220px]">
                      {tooltipContent}
                    </TooltipContent>
                  </Tooltip>
                )
              })}
            </div>
          )
        })}
      </div>
    </TooltipProvider>
  )
}

// ---- Skeleton do header ----

function GanttHeaderSkeleton({ totalDays }: { totalDays: number }) {
  return (
    <div className="flex gap-1 overflow-hidden">
      <Skeleton className="h-8 w-40 shrink-0" />
      {Array.from({ length: totalDays }).map((_, i) => (
        <Skeleton key={i} className="h-8 w-9 shrink-0" />
      ))}
    </div>
  )
}
