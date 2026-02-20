'use client'

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { TrendingUp, TrendingDown, DollarSign, BarChart2, RefreshCw } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { FinancialReportData, FinancialByMonth } from '@/hooks/use-reports'

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

// Mapa de meses abreviados em pt-BR
const MONTH_LABELS: Record<string, string> = {
  '01': 'Jan', '02': 'Fev', '03': 'Mar', '04': 'Abr',
  '05': 'Mai', '06': 'Jun', '07': 'Jul', '08': 'Ago',
  '09': 'Set', '10': 'Out', '11': 'Nov', '12': 'Dez',
}

function formatMonthLabel(monthStr: string): string {
  const parts = monthStr.split('-')
  if (parts.length >= 2) return MONTH_LABELS[parts[1]] ?? parts[1]
  return monthStr
}

// --- Tooltip customizado ---

interface TooltipPayloadEntry {
  dataKey?: string
  value?: number
  payload?: Record<string, unknown>
}

interface CustomTooltipProps {
  active?: boolean
  label?: string
  payload?: TooltipPayloadEntry[]
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null

  const revenue = (payload.find((p) => p.dataKey === 'revenue')?.value ?? 0) as number
  const expenses = (payload.find((p) => p.dataKey === 'expenses')?.value ?? 0) as number
  const balance = revenue - expenses

  return (
    <div className="rounded-lg border border-border bg-popover p-3 shadow-lg text-sm min-w-[160px]">
      <p className="font-semibold text-foreground mb-2">{label}</p>
      <div className="space-y-1">
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Receita</span>
          <span className="text-amber-500 font-medium">{formatBRL(revenue)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Despesas</span>
          <span className="text-rose-400 font-medium">{formatBRL(expenses)}</span>
        </div>
        <div className="flex justify-between gap-4 border-t border-border pt-1">
          <span className="text-muted-foreground">Saldo</span>
          <span
            className={cn(
              'font-semibold',
              balance >= 0 ? 'text-emerald-500' : 'text-red-500',
            )}
          >
            {formatBRL(balance)}
          </span>
        </div>
      </div>
    </div>
  )
}

// --- Cards de resumo ---

interface SummaryCardProps {
  label: string
  value: string
  icon: React.ElementType
  iconColor: string
  trend?: 'up' | 'down'
  trendLabel?: string
}

function SummaryCard({ label, value, icon: Icon, iconColor, trend, trendLabel }: SummaryCardProps) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <Icon className={cn('size-4', iconColor)} />
      </div>
      <p className="text-2xl font-bold tracking-tight text-foreground">{value}</p>
      {trend && trendLabel && (
        <div
          className={cn(
            'flex items-center gap-1 text-xs font-medium',
            trend === 'up' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400',
          )}
        >
          {trend === 'up' ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
          {trendLabel}
        </div>
      )}
    </div>
  )
}

// --- Tabela de detalhamento mensal ---

interface MonthlyTableProps {
  rows: FinancialByMonth[]
}

function MonthlyTable({ rows }: MonthlyTableProps) {
  if (rows.length === 0) return null

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-border">
        <h3 className="text-[15px] font-semibold text-foreground">Detalhamento Mensal</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Mes
              </th>
              <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Jobs
              </th>
              <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Receita
              </th>
              <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Despesas
              </th>
              <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Saldo
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => {
              const balance = row.balance ?? (row.revenue - row.expenses)
              const isPositive = balance >= 0
              return (
                <tr
                  key={row.month}
                  className={cn(
                    'border-b border-border last:border-0 transition-colors',
                    idx % 2 === 0 ? '' : 'bg-muted/30',
                    'hover:bg-muted/50',
                  )}
                >
                  <td className="px-5 py-3 font-medium text-foreground">
                    {formatMonthLabel(row.month)}{' '}
                    <span className="text-muted-foreground text-xs">
                      {row.month.split('-')[0]}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right text-muted-foreground">
                    {row.job_count}
                  </td>
                  <td className="px-5 py-3 text-right text-amber-600 dark:text-amber-400 font-medium">
                    {formatBRL(row.revenue)}
                  </td>
                  <td className="px-5 py-3 text-right text-rose-500 font-medium">
                    {formatBRL(row.expenses)}
                  </td>
                  <td
                    className={cn(
                      'px-5 py-3 text-right font-semibold',
                      isPositive
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-red-600 dark:text-red-400',
                    )}
                  >
                    {formatBRL(balance)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// --- Skeleton ---

function FinancialTabSkeleton() {
  return (
    <div className="space-y-6">
      {/* Cards de resumo */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-3">
            <div className="flex justify-between">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="size-4 rounded" />
            </div>
            <Skeleton className="h-7 w-32" />
          </div>
        ))}
      </div>
      {/* Grafico */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <Skeleton className="h-5 w-40 mb-4" />
        <Skeleton className="h-[240px] w-full" />
      </div>
      {/* Tabela */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <Skeleton className="h-5 w-48" />
        </div>
        <div className="divide-y divide-border">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between px-5 py-3">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-8" />
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-28" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// --- Empty state ---

function FinancialEmpty() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-card py-16 text-center">
      <BarChart2 className="size-10 text-muted-foreground/40" />
      <p className="text-sm font-medium text-muted-foreground">
        Nenhum dado financeiro no periodo selecionado
      </p>
      <p className="text-xs text-muted-foreground/70">
        Tente ajustar o intervalo de datas nos filtros acima.
      </p>
    </div>
  )
}

// --- Componente principal ---

interface FinancialTabProps {
  data: FinancialReportData | undefined
  isLoading: boolean
  isError: boolean
  onRetry?: () => void
}

export function FinancialTab({ data, isLoading, isError, onRetry }: FinancialTabProps) {
  if (isLoading) return <FinancialTabSkeleton />

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30 py-12 text-center">
        <p className="text-sm text-red-700 dark:text-red-400">
          Nao foi possivel carregar o relatorio financeiro.
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

  const byMonth = data?.result?.by_month ?? []
  const summary = data?.result?.summary

  if (byMonth.length === 0) return <FinancialEmpty />

  const totalRevenue = summary?.total_revenue ?? byMonth.reduce((s, r) => s + r.revenue, 0)
  const totalExpenses = summary?.total_expenses ?? byMonth.reduce((s, r) => s + r.expenses, 0)
  const totalBalance = summary?.total_balance ?? (totalRevenue - totalExpenses)
  const avgMonthly = summary?.avg_monthly_revenue ?? (totalRevenue / byMonth.length)

  // Formatar dados para o grafico
  const chartData = byMonth.map((row) => ({
    ...row,
    month: formatMonthLabel(row.month),
  }))

  const isBalancePositive = totalBalance >= 0

  return (
    <div className="space-y-6">
      {/* Cards de resumo */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
        <SummaryCard
          label="Receita Total"
          value={formatBRL(totalRevenue)}
          icon={TrendingUp}
          iconColor="text-amber-500"
        />
        <SummaryCard
          label="Despesas Total"
          value={formatBRL(totalExpenses)}
          icon={TrendingDown}
          iconColor="text-rose-400"
        />
        <SummaryCard
          label="Saldo"
          value={formatBRL(totalBalance)}
          icon={DollarSign}
          iconColor={isBalancePositive ? 'text-emerald-500' : 'text-red-500'}
          trend={isBalancePositive ? 'up' : 'down'}
          trendLabel={isBalancePositive ? 'Positivo' : 'Negativo'}
        />
        <SummaryCard
          label="Media Mensal"
          value={formatBRL(avgMonthly)}
          icon={BarChart2}
          iconColor="text-blue-500"
        />
      </div>

      {/* Grafico de area */}
      <section
        aria-label="Grafico de receita e despesas mensais"
        className="rounded-xl border border-border bg-card p-5 shadow-sm"
      >
        <h3 className="mb-4 text-[15px] font-semibold text-foreground">
          Receita vs Despesas por Mes
        </h3>
        <div
          role="img"
          aria-label={`Grafico de area mostrando receita e despesas: total de ${formatBRL(totalRevenue)} no periodo`}
          tabIndex={0}
        >
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart
              data={chartData}
              margin={{ top: 8, right: 0, bottom: 0, left: 0 }}
            >
              <defs>
                <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradExpenses" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#FB7185" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#FB7185" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="currentColor"
                strokeOpacity={0.12}
                vertical={false}
              />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: 'currentColor', opacity: 0.6 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={formatBRLShort}
                tick={{ fontSize: 11, fill: 'currentColor', opacity: 0.6 }}
                axisLine={false}
                tickLine={false}
                width={60}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ opacity: 0.08 }} />
              <Area
                type="monotone"
                dataKey="revenue"
                name="Receita"
                stroke="#F59E0B"
                strokeWidth={2}
                fill="url(#gradRevenue)"
              />
              <Area
                type="monotone"
                dataKey="expenses"
                name="Despesas"
                stroke="#FB7185"
                strokeWidth={2}
                fill="url(#gradExpenses)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Legenda manual */}
        <div className="mt-3 flex items-center gap-5 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="inline-block size-3 rounded-sm bg-amber-500" />
            Receita
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block size-3 rounded-sm bg-rose-400" />
            Despesas
          </span>
        </div>
      </section>

      {/* Tabela mensal */}
      <MonthlyTable rows={byMonth} />
    </div>
  )
}
