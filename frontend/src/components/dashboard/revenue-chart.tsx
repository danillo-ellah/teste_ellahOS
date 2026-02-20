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
} from 'recharts'
import { Skeleton } from '@/components/ui/skeleton'
import type { RevenueMonth } from '@/hooks/use-dashboard'

// Mapa de meses em pt-BR abreviados
const MONTH_LABELS: Record<string, string> = {
  '01': 'Jan',
  '02': 'Fev',
  '03': 'Mar',
  '04': 'Abr',
  '05': 'Mai',
  '06': 'Jun',
  '07': 'Jul',
  '08': 'Ago',
  '09': 'Set',
  '10': 'Out',
  '11': 'Nov',
  '12': 'Dez',
}

function formatMonthLabel(monthStr: string): string {
  // monthStr pode ser "2025-12" ou "2025-12-01"
  const parts = monthStr.split('-')
  if (parts.length >= 2) {
    return MONTH_LABELS[parts[1]] ?? parts[1]
  }
  return monthStr
}

function formatCurrencyFull(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(value)
}

function formatCurrencyShort(value: number): string {
  if (value >= 1_000_000) return `R$${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `R$${(value / 1_000).toFixed(0)}k`
  return `R$${value}`
}

// Interface local para o tooltip do recharts (evita discrepancias de tipagem entre versoes)
interface RechartsTooltipPayloadEntry {
  dataKey?: string
  value?: number
  payload?: Record<string, unknown>
}

interface RechartsTooltipProps {
  active?: boolean
  label?: string
  payload?: RechartsTooltipPayloadEntry[]
}

// Tooltip customizado
function CustomTooltip({ active, payload, label }: RechartsTooltipProps) {
  if (!active || !payload?.length) return null

  const revenueEntry = payload.find((p) => p.dataKey === 'revenue')
  const costEntry = payload.find((p) => p.dataKey === 'cost')
  const revenue = typeof revenueEntry?.value === 'number' ? revenueEntry.value : 0
  const cost = typeof costEntry?.value === 'number' ? costEntry.value : 0
  const jobCount = (payload[0]?.payload?.job_count as number) ?? 0

  return (
    <div className="rounded-lg border border-border bg-popover p-3 shadow-lg text-sm">
      <p className="font-semibold text-foreground mb-1">{label}</p>
      <p className="text-amber-500">
        Receita: {formatCurrencyFull(revenue)}
      </p>
      <p className="text-zinc-400">
        Custo: {formatCurrencyFull(cost)}
      </p>
      <p className="text-muted-foreground mt-1">
        {jobCount} {jobCount === 1 ? 'job' : 'jobs'}
      </p>
    </div>
  )
}

interface RevenueChartProps {
  data: RevenueMonth[] | undefined
  isLoading: boolean
}

const PERIOD_OPTIONS = [
  { label: '3 meses', value: 3 },
  { label: '6 meses', value: 6 },
  { label: '12 meses', value: 12 },
]

export function RevenueChart({ data, isLoading }: RevenueChartProps) {
  const [selectedPeriod, setSelectedPeriod] = useState(6)

  // Formatar dados para recharts
  const chartData = (data ?? [])
    .slice(-selectedPeriod)
    .map((item) => ({
      ...item,
      month: formatMonthLabel(item.month),
    }))

  const totalRevenue = chartData.reduce((acc, item) => acc + item.revenue, 0)
  const avgRevenue = chartData.length > 0 ? totalRevenue / chartData.length : 0
  const bestMonth = chartData.reduce(
    (best, item) => (item.revenue > best.revenue ? item : best),
    chartData[0] ?? { revenue: 0, month: '-' },
  )

  if (isLoading) {
    return (
      <section
        aria-label="Grafico de faturamento mensal"
        className="rounded-xl border border-border bg-card p-5 shadow-sm"
      >
        <div className="mb-4 flex items-center justify-between">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-8 w-28" />
        </div>
        <div className="flex items-end gap-2 h-[200px]">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton
              key={i}
              className="flex-1 rounded-t"
              style={{ height: `${40 + (i % 3) * 40}px` }}
            />
          ))}
        </div>
        <div className="mt-4 flex gap-4 border-t border-border pt-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex-1 space-y-1">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-5 w-24" />
            </div>
          ))}
        </div>
      </section>
    )
  }

  const isEmpty = chartData.length === 0 || totalRevenue === 0

  return (
    <section
      aria-label="Grafico de faturamento mensal"
      className="rounded-xl border border-border bg-card p-5 shadow-sm"
    >
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-[15px] font-semibold text-foreground">
          Faturamento Mensal
        </h2>
        {/* Seletor de periodo */}
        <div className="flex gap-1 rounded-md border border-border p-0.5">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setSelectedPeriod(opt.value)}
              className={
                selectedPeriod === opt.value
                  ? 'rounded px-2 py-1 text-xs font-medium bg-secondary text-foreground'
                  : 'rounded px-2 py-1 text-xs font-medium text-muted-foreground hover:text-foreground'
              }
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {isEmpty ? (
        <div className="flex h-[200px] flex-col items-center justify-center gap-2">
          <p className="text-sm text-muted-foreground">
            Nenhum dado financeiro no periodo
          </p>
        </div>
      ) : (
        <>
          {/* Grafico */}
          <div
            role="img"
            aria-label={`Grafico de barras de faturamento: total de ${formatCurrencyFull(totalRevenue)} nos ultimos ${selectedPeriod} meses`}
            tabIndex={0}
          >
            <ResponsiveContainer width="100%" height={200}>
              <BarChart
                data={chartData}
                margin={{ top: 8, right: 0, bottom: 0, left: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="currentColor"
                  strokeOpacity={0.15}
                  vertical={false}
                />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11, fill: 'currentColor', opacity: 0.6 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={formatCurrencyShort}
                  tick={{ fontSize: 11, fill: 'currentColor', opacity: 0.6 }}
                  axisLine={false}
                  tickLine={false}
                  width={56}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ opacity: 0.1 }} />
                <Bar
                  dataKey="revenue"
                  name="Receita"
                  fill="#F59E0B"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={48}
                />
                <Bar
                  dataKey="cost"
                  name="Custo"
                  fill="#71717A"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={48}
                  opacity={0.5}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Rodape de resumo */}
          <div className="mt-4 flex gap-4 border-t border-border pt-4">
            <div className="flex-1">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Total
              </p>
              <p className="text-[15px] font-semibold text-foreground">
                {formatCurrencyFull(totalRevenue)}
              </p>
            </div>
            <div className="flex-1">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Media mensal
              </p>
              <p className="text-[15px] font-semibold text-foreground">
                {formatCurrencyFull(avgRevenue)}
              </p>
            </div>
            <div className="flex-1">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Melhor mes
              </p>
              <p className="text-[15px] font-semibold text-foreground">
                {bestMonth?.month ?? '-'}
              </p>
            </div>
          </div>
        </>
      )}
    </section>
  )
}
