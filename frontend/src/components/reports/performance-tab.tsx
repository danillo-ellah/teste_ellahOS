'use client'

import { useState } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { ChevronUp, ChevronDown, RefreshCw, BarChart2 } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { PerformanceReportData, PerformanceItem } from '@/hooks/use-reports'

// --- Formatadores ---

function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(value)
}

function formatBRLShort(value: number): string {
  if (value >= 1_000_000) return `R$${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `R$${(value / 1_000).toFixed(0)}k`
  return `R$${value}`
}

function formatPct(value: number): string {
  return `${value.toFixed(1)}%`
}

/** Cor da barra de margem baseada no valor */
function marginColor(margin: number): string {
  if (margin < 15) return '#EF4444' // vermelho
  if (margin > 30) return '#22C55E' // verde
  return '#F59E0B' // amarelo
}

/** Classe de texto de margem */
function marginTextClass(margin: number): string {
  if (margin < 15) return 'text-red-600 dark:text-red-400 font-semibold'
  if (margin > 30) return 'text-emerald-600 dark:text-emerald-400 font-semibold'
  return 'text-foreground'
}

// --- Tooltip customizado ---

interface TooltipPayloadEntry {
  dataKey?: string
  value?: number
  payload?: PerformanceItem
}

interface CustomTooltipProps {
  active?: boolean
  label?: string
  payload?: TooltipPayloadEntry[]
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null

  const item = payload[0]?.payload
  if (!item) return null

  return (
    <div className="rounded-lg border border-border bg-popover p-3 shadow-lg text-sm min-w-[180px]">
      <p className="font-semibold text-foreground mb-2">{label}</p>
      <div className="space-y-1">
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Jobs</span>
          <span className="font-medium">{item.job_count}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Receita</span>
          <span className="text-amber-500 font-medium">{formatBRL(item.total_revenue)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Margem media</span>
          <span className={marginTextClass(item.avg_margin)}>{formatPct(item.avg_margin)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Health Score</span>
          <span className="font-medium">{item.avg_health_score.toFixed(0)}/100</span>
        </div>
      </div>
    </div>
  )
}

// --- Tipos de ordenacao ---

type SortKey = keyof Pick<
  PerformanceItem,
  'group_label' | 'job_count' | 'total_revenue' | 'avg_margin' | 'avg_health_score' | 'completed_count' | 'cancelled_count'
>

type SortDir = 'asc' | 'desc'

// --- Cabecalho de coluna com sort ---

interface SortableHeaderProps {
  label: string
  sortKey: SortKey
  currentKey: SortKey
  currentDir: SortDir
  onSort: (key: SortKey) => void
  align?: 'left' | 'right'
}

function SortableHeader({ label, sortKey, currentKey, currentDir, onSort, align = 'right' }: SortableHeaderProps) {
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

// --- Skeleton ---

function PerformanceTabSkeleton() {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <Skeleton className="h-5 w-48 mb-4" />
        <Skeleton className="h-[220px] w-full" />
      </div>
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <Skeleton className="h-5 w-40" />
        </div>
        <div className="divide-y divide-border">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between px-4 py-3 gap-4">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-8" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-8" />
              <Skeleton className="h-4 w-8" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// --- Empty state ---

function PerformanceEmpty() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-card py-16 text-center">
      <BarChart2 className="size-10 text-muted-foreground/40" />
      <p className="text-sm font-medium text-muted-foreground">
        Nenhum dado de performance no periodo selecionado
      </p>
      <p className="text-xs text-muted-foreground/70">
        Tente ajustar o intervalo de datas ou o agrupamento.
      </p>
    </div>
  )
}

// --- Componente principal ---

interface PerformanceTabProps {
  data: PerformanceReportData | undefined
  isLoading: boolean
  isError: boolean
  onRetry?: () => void
}

export function PerformanceTab({ data, isLoading, isError, onRetry }: PerformanceTabProps) {
  const [sortKey, setSortKey] = useState<SortKey>('total_revenue')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'))
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  if (isLoading) return <PerformanceTabSkeleton />

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30 py-12 text-center">
        <p className="text-sm text-red-700 dark:text-red-400">
          Nao foi possivel carregar o relatorio de performance.
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

  const items = data?.result ?? []
  if (items.length === 0) return <PerformanceEmpty />

  // Ordenar dados para a tabela
  const sortedItems = [...items].sort((a, b) => {
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

  // Top 10 por receita para o grafico horizontal
  const chartData = [...items]
    .sort((a, b) => b.total_revenue - a.total_revenue)
    .slice(0, 10)

  return (
    <div className="space-y-6">
      {/* Grafico de barras horizontais */}
      <section
        aria-label="Ranking de performance por grupo"
        className="rounded-xl border border-border bg-card p-5 shadow-sm"
      >
        <h3 className="mb-4 text-[15px] font-semibold text-foreground">
          Ranking por Receita (Top 10)
        </h3>
        <div
          role="img"
          aria-label="Grafico de barras horizontais com ranking de receita por grupo"
          tabIndex={0}
        >
          <ResponsiveContainer width="100%" height={Math.max(180, chartData.length * 40)}>
            <BarChart
              layout="vertical"
              data={chartData}
              margin={{ top: 0, right: 16, bottom: 0, left: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="currentColor"
                strokeOpacity={0.12}
                horizontal={false}
              />
              <XAxis
                type="number"
                tickFormatter={formatBRLShort}
                tick={{ fontSize: 11, fill: 'currentColor', opacity: 0.6 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="group_label"
                tick={{ fontSize: 11, fill: 'currentColor', opacity: 0.8 }}
                axisLine={false}
                tickLine={false}
                width={120}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ opacity: 0.08 }} />
              <Bar dataKey="total_revenue" radius={[0, 4, 4, 0]} maxBarSize={28}>
                {chartData.map((entry, idx) => (
                  <Cell key={idx} fill={marginColor(entry.avg_margin)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Legenda de cores de margem */}
        <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="inline-block size-3 rounded-sm bg-red-500" />
            Margem &lt; 15%
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block size-3 rounded-sm bg-amber-500" />
            Margem 15-30%
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block size-3 rounded-sm bg-emerald-500" />
            Margem &gt; 30%
          </span>
        </div>
      </section>

      {/* Tabela com sort */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="text-[15px] font-semibold text-foreground">
            Detalhamento Completo
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <SortableHeader
                  label="Agrupamento"
                  sortKey="group_label"
                  currentKey={sortKey}
                  currentDir={sortDir}
                  onSort={handleSort}
                  align="left"
                />
                <SortableHeader
                  label="Jobs"
                  sortKey="job_count"
                  currentKey={sortKey}
                  currentDir={sortDir}
                  onSort={handleSort}
                />
                <SortableHeader
                  label="Receita Total"
                  sortKey="total_revenue"
                  currentKey={sortKey}
                  currentDir={sortDir}
                  onSort={handleSort}
                />
                <SortableHeader
                  label="Margem Media"
                  sortKey="avg_margin"
                  currentKey={sortKey}
                  currentDir={sortDir}
                  onSort={handleSort}
                />
                <SortableHeader
                  label="Health Score"
                  sortKey="avg_health_score"
                  currentKey={sortKey}
                  currentDir={sortDir}
                  onSort={handleSort}
                />
                <SortableHeader
                  label="Finalizados"
                  sortKey="completed_count"
                  currentKey={sortKey}
                  currentDir={sortDir}
                  onSort={handleSort}
                />
                <SortableHeader
                  label="Cancelados"
                  sortKey="cancelled_count"
                  currentKey={sortKey}
                  currentDir={sortDir}
                  onSort={handleSort}
                />
              </tr>
            </thead>
            <tbody>
              {sortedItems.map((item, idx) => (
                <tr
                  key={item.group_label}
                  className={cn(
                    'border-b border-border last:border-0 transition-colors hover:bg-muted/50',
                    idx % 2 === 0 ? '' : 'bg-muted/30',
                  )}
                >
                  <td className="px-4 py-3 font-medium text-foreground">
                    {item.group_label}
                  </td>
                  <td className="px-4 py-3 text-right text-muted-foreground">
                    {item.job_count}
                  </td>
                  <td className="px-4 py-3 text-right text-amber-600 dark:text-amber-400 font-medium">
                    {formatBRL(item.total_revenue)}
                  </td>
                  <td className={cn('px-4 py-3 text-right', marginTextClass(item.avg_margin))}>
                    {formatPct(item.avg_margin)}
                  </td>
                  <td className="px-4 py-3 text-right text-muted-foreground">
                    {item.avg_health_score.toFixed(0)}/100
                  </td>
                  <td className="px-4 py-3 text-right text-emerald-600 dark:text-emerald-400">
                    {item.completed_count}
                  </td>
                  <td className="px-4 py-3 text-right text-rose-500">
                    {item.cancelled_count}
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
