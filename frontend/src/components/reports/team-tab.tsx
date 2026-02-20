'use client'

import { useState } from 'react'
import { AlertTriangle, ChevronUp, ChevronDown, RefreshCw, Users } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { TeamReportData, TeamMember } from '@/hooks/use-reports'

// --- Helpers de utilizacao ---

/** Cor da barra de progresso baseada na porcentagem */
function utilizationBarColor(pct: number): string {
  if (pct > 100) return 'bg-red-500'
  if (pct >= 80) return 'bg-amber-500'
  return 'bg-emerald-500'
}

/** Classe de texto para a porcentagem de utilizacao */
function utilizationTextClass(pct: number): string {
  if (pct > 100) return 'text-red-600 dark:text-red-400 font-semibold'
  if (pct >= 80) return 'text-amber-600 dark:text-amber-400 font-semibold'
  return 'text-foreground'
}

// --- Tipos de ordenacao ---

type SortKey = 'full_name' | 'job_count' | 'allocated_days' | 'utilization_pct' | 'conflict_count'
type SortDir = 'asc' | 'desc'

// --- Barra de utilizacao ---

interface UtilizationBarProps {
  pct: number
}

function UtilizationBar({ pct }: UtilizationBarProps) {
  // Limita a barra visualmente em 120% para nao quebrar o layout
  const barWidth = Math.min(pct, 120) / 120 * 100

  return (
    <div className="flex items-center gap-2 min-w-[120px]">
      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all', utilizationBarColor(pct))}
          style={{ width: `${barWidth}%` }}
        />
      </div>
      <span className={cn('text-xs tabular-nums w-12 text-right shrink-0', utilizationTextClass(pct))}>
        {pct.toFixed(1)}%
      </span>
    </div>
  )
}

// --- Badge de tipo de pessoa ---

function PersonTypeBadge({ type }: { type: string }) {
  if (type === 'staff') {
    return (
      <Badge
        variant="secondary"
        className="text-[10px] py-0 px-1.5 h-4 font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
      >
        Staff
      </Badge>
    )
  }
  return (
    <Badge
      variant="secondary"
      className="text-[10px] py-0 px-1.5 h-4 font-medium bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400"
    >
      Freelancer
    </Badge>
  )
}

// --- Badge de conflito ---

function ConflictBadge({ count }: { count: number }) {
  if (count === 0) {
    return <span className="text-muted-foreground">0</span>
  }
  return (
    <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-semibold">
      <AlertTriangle className="size-3.5" />
      {count}
    </span>
  )
}

// --- Cabecalho de coluna com sort ---

interface SortableHeaderProps {
  label: string
  sortKey: SortKey
  currentKey: SortKey
  currentDir: SortDir
  onSort: (key: SortKey) => void
  align?: 'left' | 'right'
}

function SortableHeader({
  label,
  sortKey,
  currentKey,
  currentDir,
  onSort,
  align = 'right',
}: SortableHeaderProps) {
  const isActive = currentKey === sortKey

  return (
    <th
      className={cn(
        'px-4 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground cursor-pointer select-none',
        'hover:text-foreground transition-colors',
        align === 'right' ? 'text-right' : 'text-left',
      )}
      onClick={() => onSort(sortKey)}
    >
      <span className="inline-flex items-center gap-1">
        {align === 'left' && label}
        {isActive ? (
          currentDir === 'desc' ? (
            <ChevronDown className="size-3.5 text-primary" />
          ) : (
            <ChevronUp className="size-3.5 text-primary" />
          )
        ) : (
          <ChevronDown className="size-3.5 opacity-30" />
        )}
        {align === 'right' && label}
      </span>
    </th>
  )
}

// --- Cards de resumo da equipe ---

interface TeamSummaryProps {
  members: TeamMember[]
}

function TeamSummary({ members }: TeamSummaryProps) {
  const totalMembers = members.length
  const overloaded = members.filter((m) => m.utilization_pct > 100).length
  const withConflicts = members.filter((m) => m.conflict_count > 0).length
  const avgUtilization =
    members.length > 0
      ? members.reduce((s, m) => s + m.utilization_pct, 0) / members.length
      : 0

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
      {[
        {
          label: 'Total de Membros',
          value: String(totalMembers),
          colorClass: 'text-blue-500',
        },
        {
          label: 'Utilizacao Media',
          value: `${avgUtilization.toFixed(1)}%`,
          colorClass: utilizationTextClass(avgUtilization),
        },
        {
          label: 'Sobrecarregados',
          value: String(overloaded),
          colorClass: overloaded > 0 ? 'text-red-500' : 'text-muted-foreground',
        },
        {
          label: 'Com Conflitos',
          value: String(withConflicts),
          colorClass: withConflicts > 0 ? 'text-amber-500' : 'text-muted-foreground',
        },
      ].map(({ label, value, colorClass }) => (
        <div
          key={label}
          className="flex flex-col gap-1 rounded-xl border border-border bg-card p-4 shadow-sm"
        >
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p className={cn('text-2xl font-bold tracking-tight', colorClass)}>{value}</p>
        </div>
      ))}
    </div>
  )
}

// --- Skeleton ---

function TeamTabSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-3">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-7 w-16" />
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <Skeleton className="h-5 w-40" />
        </div>
        <div className="divide-y divide-border">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-4 w-16 rounded-full" />
              <Skeleton className="h-4 w-8 ml-auto" />
              <Skeleton className="h-4 w-8" />
              <Skeleton className="h-2 w-32 rounded-full" />
              <Skeleton className="h-4 w-8" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// --- Empty state ---

function TeamEmpty() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-card py-16 text-center">
      <Users className="size-10 text-muted-foreground/40" />
      <p className="text-sm font-medium text-muted-foreground">
        Nenhum dado de equipe no periodo selecionado
      </p>
      <p className="text-xs text-muted-foreground/70">
        Tente ajustar o intervalo de datas nos filtros acima.
      </p>
    </div>
  )
}

// --- Componente principal ---

interface TeamTabProps {
  data: TeamReportData | undefined
  isLoading: boolean
  isError: boolean
  onRetry?: () => void
}

export function TeamTab({ data, isLoading, isError, onRetry }: TeamTabProps) {
  const [sortKey, setSortKey] = useState<SortKey>('utilization_pct')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'))
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  if (isLoading) return <TeamTabSkeleton />

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30 py-12 text-center">
        <p className="text-sm text-red-700 dark:text-red-400">
          Nao foi possivel carregar o relatorio de equipe.
        </p>
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry} className="gap-2">
            <RefreshCw className="size-3.5" />
            Tentar novamente
          </Button>
        )}
      </div>
    )
  }

  const members = data?.result ?? []
  if (members.length === 0) return <TeamEmpty />

  // Ordenar membros
  const sortedMembers = [...members].sort((a, b) => {
    const av = a[sortKey]
    const bv = b[sortKey]
    if (typeof av === 'number' && typeof bv === 'number') {
      return sortDir === 'desc' ? bv - av : av - bv
    }
    if (typeof av === 'string' && typeof bv === 'string') {
      return sortDir === 'desc' ? bv.localeCompare(av) : av.localeCompare(bv)
    }
    return 0
  })

  return (
    <div className="space-y-6">
      {/* Cards de resumo */}
      <TeamSummary members={members} />

      {/* Tabela */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="text-[15px] font-semibold text-foreground">
            Membros da Equipe
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <SortableHeader
                  label="Nome"
                  sortKey="full_name"
                  currentKey={sortKey}
                  currentDir={sortDir}
                  onSort={handleSort}
                  align="left"
                />
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Tipo
                </th>
                <SortableHeader
                  label="Jobs"
                  sortKey="job_count"
                  currentKey={sortKey}
                  currentDir={sortDir}
                  onSort={handleSort}
                />
                <SortableHeader
                  label="Dias Alocados"
                  sortKey="allocated_days"
                  currentKey={sortKey}
                  currentDir={sortDir}
                  onSort={handleSort}
                />
                <SortableHeader
                  label="Utilizacao"
                  sortKey="utilization_pct"
                  currentKey={sortKey}
                  currentDir={sortDir}
                  onSort={handleSort}
                />
                <SortableHeader
                  label="Conflitos"
                  sortKey="conflict_count"
                  currentKey={sortKey}
                  currentDir={sortDir}
                  onSort={handleSort}
                />
              </tr>
            </thead>
            <tbody>
              {sortedMembers.map((member, idx) => (
                <tr
                  key={member.person_id}
                  className={cn(
                    'border-b border-border last:border-0 transition-colors hover:bg-muted/50',
                    idx % 2 === 0 ? '' : 'bg-muted/30',
                    member.utilization_pct > 100 && 'bg-red-50/40 dark:bg-red-950/10',
                  )}
                >
                  <td className="px-4 py-3">
                    <span className="font-medium text-foreground">{member.full_name}</span>
                  </td>
                  <td className="px-4 py-3">
                    <PersonTypeBadge type={member.person_type} />
                  </td>
                  <td className="px-4 py-3 text-right text-muted-foreground">
                    {member.job_count}
                  </td>
                  <td className="px-4 py-3 text-right text-muted-foreground">
                    {member.allocated_days}d
                  </td>
                  <td className="px-4 py-3">
                    <UtilizationBar pct={member.utilization_pct} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <ConflictBadge count={member.conflict_count} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
