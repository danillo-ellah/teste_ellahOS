'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { AllocationGantt } from '@/components/team/AllocationGantt'
import { apiGet } from '@/lib/api'
import { allocationKeys } from '@/lib/query-keys'
import { formatDate } from '@/lib/format'
import type { Allocation, AllocationConflict } from '@/types/allocations'

// ---- Helpers de data sem date-fns ----

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

function toLocalISODate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function monthBounds(year: number, month: number): { from: string; to: string } {
  const firstDay = new Date(year, month - 1, 1)
  const lastDay = new Date(year, month, 0)
  return {
    from: toLocalISODate(firstDay),
    to: toLocalISODate(lastDay),
  }
}

function addMonths(year: number, month: number, delta: number): { year: number; month: number } {
  const d = new Date(year, month - 1 + delta, 1)
  return { year: d.getFullYear(), month: d.getMonth() + 1 }
}

// ---- MonthSwitcher ----

interface MonthSwitcherProps {
  year: number
  month: number
  onPrev: () => void
  onNext: () => void
  onToday: () => void
}

function MonthSwitcher({ year, month, onPrev, onNext, onToday }: MonthSwitcherProps) {
  const now = new Date()
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="icon-sm" onClick={onPrev} aria-label="Mes anterior">
        <ChevronLeft className="size-4" />
      </Button>
      <div className="min-w-[160px] text-center">
        <span className="text-sm font-semibold">
          {MONTH_NAMES[month - 1]} {year}
        </span>
      </div>
      <Button variant="outline" size="icon-sm" onClick={onNext} aria-label="Proximo mes">
        <ChevronRight className="size-4" />
      </Button>
      {!isCurrentMonth && (
        <Button variant="ghost" size="sm" onClick={onToday} className="text-xs text-muted-foreground">
          Hoje
        </Button>
      )}
    </div>
  )
}

// ---- Painel de conflitos ----

interface ConflictsPanelProps {
  conflicts: AllocationConflict[]
  isLoading: boolean
}

function ConflictsPanel({ conflicts, isLoading }: ConflictsPanelProps) {
  if (isLoading) {
    return (
      <Card className="shrink-0">
        <CardHeader className="border-b border-border pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <AlertTriangle className="size-4 text-amber-500" />
            Conflitos
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton className="h-3.5 w-32" />
              <Skeleton className="h-3 w-48" />
              <Skeleton className="h-3 w-40" />
            </div>
          ))}
        </CardContent>
      </Card>
    )
  }

  if (conflicts.length === 0) {
    return (
      <Card className="shrink-0">
        <CardHeader className="border-b border-border pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <AlertTriangle className="size-4 text-muted-foreground" />
            Conflitos
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 flex flex-col items-center justify-center text-center gap-2 py-8">
          <div className="size-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
            <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className="text-xs text-muted-foreground">Nenhum conflito neste periodo</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="shrink-0">
      <CardHeader className="border-b border-border pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <AlertTriangle className="size-4 text-red-500" />
          Conflitos
          <Badge variant="destructive" className="ml-auto text-xs tabular-nums">
            {conflicts.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4 space-y-4 max-h-[480px] overflow-y-auto">
        {conflicts.map((c, idx) => (
          <div
            key={`${c.person_id}-${idx}`}
            className="rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 p-3 space-y-2"
          >
            <div className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-red-500 shrink-0" />
              <p className="text-xs font-semibold text-foreground truncate">
                {c.person_name}
              </p>
            </div>
            <div className="text-xs text-muted-foreground">
              <span className="font-medium text-red-600 dark:text-red-400">
                Sobreposicao:{' '}
              </span>
              {formatDate(c.overlap_start)} ate {formatDate(c.overlap_end)}
            </div>
            <div className="space-y-1">
              {c.allocations.map((a) => (
                <div
                  key={a.allocation_id}
                  className="flex items-center gap-1.5 text-[11px] text-muted-foreground"
                >
                  <span className="font-mono font-medium text-foreground/80">
                    {a.job_code}
                  </span>
                  <span className="truncate">{a.job_title}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

// ---- Legends ----

function GanttLegend() {
  return (
    <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
      <div className="flex items-center gap-1.5">
        <div className="size-3 rounded bg-violet-500" />
        <span>Alocacoes</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="size-3 rounded bg-red-500" />
        <span>Conflito de agenda</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="size-3 rounded bg-rose-200 dark:bg-rose-950/60" />
        <span>Hoje</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="size-3 rounded bg-muted" />
        <span>Fim de semana</span>
      </div>
    </div>
  )
}

// ---- Page ----

export default function TeamCalendarPage() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)

  const { from, to } = useMemo(() => monthBounds(year, month), [year, month])

  // Query de alocacoes do periodo
  const {
    data: allocationsData,
    isLoading: isLoadingAllocations,
    isError: isErrorAllocations,
    refetch: refetchAllocations,
  } = useQuery({
    queryKey: [...allocationKeys.all, 'range', from, to],
    queryFn: async () => {
      const res = await apiGet<Allocation[]>('allocations', { from, to })
      return res.data ?? []
    },
    staleTime: 60_000,
  })

  // Query de conflitos do periodo
  const {
    data: conflictsData,
    isLoading: isLoadingConflicts,
    isError: isErrorConflicts,
    refetch: refetchConflicts,
  } = useQuery({
    queryKey: allocationKeys.conflicts(from, to),
    queryFn: async () => {
      const res = await apiGet<AllocationConflict[]>('allocations', { from, to }, 'conflicts')
      return res.data ?? []
    },
    staleTime: 60_000,
  })

  function handlePrev() {
    const next = addMonths(year, month, -1)
    setYear(next.year)
    setMonth(next.month)
  }

  function handleNext() {
    const next = addMonths(year, month, 1)
    setYear(next.year)
    setMonth(next.month)
  }

  function handleToday() {
    const n = new Date()
    setYear(n.getFullYear())
    setMonth(n.getMonth() + 1)
  }

  function handleRefresh() {
    void refetchAllocations()
    void refetchConflicts()
  }

  const isLoading = isLoadingAllocations || isLoadingConflicts
  const isError = isErrorAllocations || isErrorConflicts

  const allocations = allocationsData ?? []
  const conflicts = conflictsData ?? []

  const uniquePeopleCount = useMemo(() => new Set(allocations.map((a) => a.people_id)).size, [allocations])
  const uniqueJobsCount = useMemo(() => new Set(allocations.map((a) => a.job_id)).size, [allocations])

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6 min-h-0">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <CalendarDays className="size-5 text-muted-foreground shrink-0" />
          <div>
            <h1 className="text-lg font-semibold leading-tight">Calendario de Equipe</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Visualize alocacoes e conflitos de agenda por pessoa
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <MonthSwitcher
            year={year}
            month={month}
            onPrev={handlePrev}
            onNext={handleNext}
            onToday={handleToday}
          />
          <Button
            variant="outline"
            size="icon-sm"
            onClick={handleRefresh}
            disabled={isLoading}
            aria-label="Atualizar"
          >
            <RefreshCw className={`size-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Erro global */}
      {isError && !isLoading && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 flex items-center justify-between gap-4">
          <p className="text-sm text-destructive">
            Erro ao carregar dados do calendario. Verifique sua conexao.
          </p>
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            Tentar novamente
          </Button>
        </div>
      )}

      {/* Estatisticas rapidas */}
      {!isLoading && !isError && (
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="font-medium text-foreground tabular-nums">
              {uniquePeopleCount}
            </span>
            pessoa{uniquePeopleCount !== 1 ? 's' : ''} alocada
            {uniquePeopleCount !== 1 ? 's' : ''}
          </div>
          <span className="text-muted-foreground/40">|</span>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="font-medium text-foreground tabular-nums">
              {uniqueJobsCount}
            </span>
            job{uniqueJobsCount !== 1 ? 's' : ''} no periodo
          </div>
          {conflicts.length > 0 && (
            <>
              <span className="text-muted-foreground/40">|</span>
              <div className="flex items-center gap-1.5 text-xs">
                <span className="size-2 rounded-full bg-red-500" />
                <span className="font-medium text-red-600 dark:text-red-400 tabular-nums">
                  {conflicts.length}
                </span>
                <span className="text-muted-foreground">
                  conflito{conflicts.length !== 1 ? 's' : ''} detectado{conflicts.length !== 1 ? 's' : ''}
                </span>
              </div>
            </>
          )}
        </div>
      )}

      {/* Layout principal: Gantt + Painel lateral */}
      <div className="flex flex-col lg:flex-row gap-4 min-h-0">
        {/* Gantt — ocupa o espaco restante */}
        <div className="flex-1 min-w-0 space-y-3">
          <GanttLegend />
          <AllocationGantt
            year={year}
            month={month}
            allocations={allocations}
            conflicts={conflicts}
            isLoading={isLoading}
          />
        </div>

        {/* Painel lateral de conflitos */}
        <div className="lg:w-72 xl:w-80 shrink-0">
          <ConflictsPanel
            conflicts={conflicts}
            isLoading={isLoadingConflicts}
          />
        </div>
      </div>
    </div>
  )
}
