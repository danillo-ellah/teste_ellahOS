'use client'

import Link from 'next/link'
import {
  Clapperboard,
  DollarSign,
  Percent,
  Activity,
  ClipboardCheck,
  TrendingUp,
  TrendingDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import type { DashboardKpis } from '@/hooks/use-dashboard'

// --- Formatadores ---

function formatCurrency(value: number): string {
  if (value >= 1_000_000) {
    return `R$ ${(value / 1_000_000).toFixed(1)}M`
  }
  if (value >= 1_000) {
    return `R$ ${(value / 1_000).toFixed(1)}k`
  }
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(value)
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`
}

function formatHealthScore(value: number): string {
  return `${Math.round(value)}/100`
}

// --- Componente de trend badge ---

interface TrendBadgeProps {
  direction: 'up' | 'down' | 'neutral'
  value?: string
}

function TrendBadge({ direction, value }: TrendBadgeProps) {
  if (direction === 'neutral') return null

  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-medium',
        direction === 'up'
          ? 'bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400'
          : 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400',
      )}
    >
      {direction === 'up' ? (
        <TrendingUp className="size-3" />
      ) : (
        <TrendingDown className="size-3" />
      )}
      {value}
    </span>
  )
}

// --- Card individual ---

interface KpiCardProps {
  icon: React.ElementType
  iconColor: string
  label: string
  value: string
  href: string
  trendDirection?: 'up' | 'down' | 'neutral'
  trendValue?: string
  comparison?: string
  comparisonColor?: string
  /** Exibe barra de progresso abaixo do valor (health score) */
  progressValue?: number
  progressColor?: string
  /** Borda de alerta (aprovacoes pendentes) */
  urgent?: boolean
  /** Ponto vermelho pulsando no icone */
  urgentDot?: boolean
}

function KpiCard({
  icon: Icon,
  iconColor,
  label,
  value,
  href,
  trendDirection = 'neutral',
  trendValue,
  comparison,
  comparisonColor,
  progressValue,
  progressColor,
  urgent,
  urgentDot,
}: KpiCardProps) {
  return (
    <Link
      href={href}
      className={cn(
        'group relative flex min-h-[120px] flex-col rounded-xl border bg-card p-5 shadow-sm transition-all duration-150',
        'hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/50 focus-visible:ring-offset-2',
        urgent
          ? 'border-rose-500/40 bg-rose-50 dark:bg-rose-500/5 dark:border-rose-500/30'
          : 'border-border',
      )}
      tabIndex={0}
      role="article"
      aria-label={`${label}: ${value}`}
    >
      {/* Header: icone + trend */}
      <div className="flex items-center justify-between">
        <div className="relative">
          <Icon className={cn('size-5', iconColor)} />
          {urgentDot && (
            <span className="absolute -right-1 -top-1 size-2 rounded-full bg-rose-500 animate-pulse" />
          )}
        </div>
        <TrendBadge direction={trendDirection} value={trendValue} />
      </div>

      {/* Valor principal */}
      <div className="mt-3">
        <p className="text-4xl font-bold tracking-tight text-foreground">
          {value}
        </p>
        <p className="mt-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
      </div>

      {/* Barra de progresso (health score) */}
      {progressValue !== undefined && (
        <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn('h-full rounded-full transition-all', progressColor)}
            style={{ width: `${Math.min(100, Math.max(0, progressValue))}%` }}
          />
        </div>
      )}

      {/* Comparacao */}
      {comparison && (
        <p className={cn('mt-2 text-xs', comparisonColor ?? 'text-muted-foreground')}>
          {comparison}
        </p>
      )}
    </Link>
  )
}

// --- Skeleton ---

function KpiCardSkeleton() {
  return (
    <div className="flex min-h-[120px] flex-col rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <Skeleton className="size-5 rounded" />
        <Skeleton className="h-5 w-12 rounded-full" />
      </div>
      <div className="mt-3 space-y-2">
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-3 w-20" />
      </div>
      <Skeleton className="mt-3 h-3 w-32" />
    </div>
  )
}

// --- Componente principal ---

interface KpiCardsProps {
  data: DashboardKpis | undefined
  isLoading: boolean
}

export function KpiCards({ data, isLoading }: KpiCardsProps) {
  if (isLoading) {
    return (
      <section
        aria-label="Indicadores chave de desempenho"
        className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-5"
      >
        {Array.from({ length: 5 }).map((_, i) => (
          <KpiCardSkeleton key={i} />
        ))}
      </section>
    )
  }

  const activeJobs = data?.active_jobs ?? 0
  const revenueMes = data?.revenue_month ?? 0
  const avgMargin = data?.avg_margin ?? 0
  const healthScore = data?.avg_health_score ?? 0
  const pendingApprovals = data?.pending_approvals ?? 0

  // Health score: cor da barra
  const healthProgressColor =
    healthScore >= 71
      ? 'bg-green-500'
      : healthScore >= 41
        ? 'bg-amber-500'
        : 'bg-red-500'

  // Margem: trend
  const marginTrend = avgMargin >= 30 ? 'up' : avgMargin < 20 ? 'down' : 'neutral'

  return (
    <section
      aria-label="Indicadores chave de desempenho"
      className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-5"
    >
      {/* Jobs Ativos */}
      <KpiCard
        icon={Clapperboard}
        iconColor="text-rose-500"
        label="Jobs Ativos"
        value={String(activeJobs)}
        href="/jobs"
        trendDirection="neutral"
      />

      {/* Faturamento do Mes */}
      <KpiCard
        icon={DollarSign}
        iconColor="text-amber-500"
        label="Faturamento do Mes"
        value={formatCurrency(revenueMes)}
        href="/financeiro"
        trendDirection="neutral"
      />

      {/* Margem Media */}
      <KpiCard
        icon={Percent}
        iconColor="text-emerald-500"
        label="Margem Media"
        value={formatPercent(avgMargin)}
        href="/financeiro"
        trendDirection={marginTrend}
        comparison={
          avgMargin < 20
            ? 'Abaixo da meta (20%)'
            : avgMargin >= 30
              ? 'Acima da meta (30%)'
              : 'Dentro do esperado'
        }
        comparisonColor={
          avgMargin < 20
            ? 'text-red-600 dark:text-red-400'
            : avgMargin >= 30
              ? 'text-green-600 dark:text-green-400'
              : 'text-muted-foreground'
        }
      />

      {/* Health Score Medio */}
      <KpiCard
        icon={Activity}
        iconColor="text-blue-500"
        label="Health Score Medio"
        value={formatHealthScore(healthScore)}
        href="/jobs"
        trendDirection="neutral"
        progressValue={healthScore}
        progressColor={healthProgressColor}
      />

      {/* Aprovacoes Pendentes - ocupa 2 colunas no mobile */}
      <div className="col-span-2 md:col-span-1">
        <KpiCard
          icon={ClipboardCheck}
          iconColor="text-violet-500"
          label="Aprovacoes Pendentes"
          value={String(pendingApprovals)}
          href="/approvals?status=pending"
          trendDirection="neutral"
          urgent={pendingApprovals > 0}
          urgentDot={pendingApprovals > 0}
          comparison={
            pendingApprovals > 0
              ? `${pendingApprovals} aguardando resposta`
              : 'Nenhuma pendente'
          }
          comparisonColor={
            pendingApprovals > 0
              ? 'text-rose-600 dark:text-rose-400'
              : 'text-muted-foreground'
          }
        />
      </div>
    </section>
  )
}
