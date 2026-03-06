'use client'

import Link from 'next/link'
import { AlertTriangle, Wallet, Calendar, TrendingDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import type { CashflowProjection } from '@/types/cashflow'
import type { TenantFinancialDashboard } from '@/types/cost-management'

// --- Helpers ---

function formatCompact(value: number): string {
  const abs = Math.abs(value)
  const sign = value < 0 ? '-' : ''
  if (abs >= 1_000_000) return `${sign}R$ ${(abs / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000) return `${sign}R$ ${(abs / 1_000).toFixed(1)}k`
  return `${sign}R$ ${Math.round(abs)}`
}

// --- Props ---

interface CashflowStripProps {
  cashflow: CashflowProjection | undefined
  tenantDashboard: TenantFinancialDashboard | undefined
  isLoading: boolean
}

export function CashflowStrip({ cashflow, tenantDashboard, isLoading }: CashflowStripProps) {
  if (isLoading) {
    return <Skeleton className="h-[72px] w-full rounded-xl" />
  }

  if (!cashflow) return null

  const openingBalance = cashflow.opening_balance
  const kpis = cashflow.kpis
  const isDanger = kpis.is_danger
  const daysUntilDanger = kpis.days_until_danger

  // Projecao 30d: ultimo entry da serie ou opening_balance
  const projected30d = cashflow.series.length > 0
    ? cashflow.series[cashflow.series.length - 1].cumulative_balance
    : openingBalance

  // Pagamentos da semana
  const weekPayment = tenantDashboard?.upcoming_payments_30d?.by_week?.[0]
  const weekTotal = weekPayment?.total ?? 0
  const weekCount = weekPayment?.items_count ?? 0
  const weekLabel = weekPayment?.week_label

  return (
    <div
      className={cn(
        'rounded-xl border px-5 py-4 transition-colors',
        isDanger
          ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-500/5'
          : 'border-border bg-card',
      )}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Saldo projetado + projecao 30d */}
        <div className="flex flex-wrap items-center gap-x-8 gap-y-2">
          <Link href="/financeiro/fluxo-caixa" className="group flex items-center gap-2.5">
            <Wallet className={cn('size-4 shrink-0', isDanger ? 'text-red-500' : 'text-emerald-500')} />
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Saldo projetado
              </p>
              <p className={cn(
                'text-lg font-bold tracking-tight group-hover:underline',
                openingBalance < 0 ? 'text-red-600 dark:text-red-400' : 'text-foreground',
              )}>
                {formatCompact(openingBalance)}
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-2.5">
            <TrendingDown className={cn(
              'size-4 shrink-0',
              projected30d < 0 ? 'text-red-500' : 'text-blue-500',
            )} />
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Projecao 30d
              </p>
              <p className={cn(
                'text-lg font-bold tracking-tight',
                projected30d < 0 ? 'text-red-600 dark:text-red-400' : 'text-foreground',
              )}>
                {formatCompact(projected30d)}
              </p>
            </div>
          </div>

          {isDanger && daysUntilDanger != null && (
            <div className="flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1 dark:bg-red-500/15">
              <AlertTriangle className="size-3.5 text-red-600 dark:text-red-400 animate-pulse" />
              <span className="text-xs font-medium text-red-700 dark:text-red-400">
                Saldo negativo em {daysUntilDanger} dia{daysUntilDanger !== 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>

        {/* Pagamentos da semana */}
        <Link
          href="/financeiro/calendario"
          className="group flex items-center gap-2.5 rounded-lg border border-border bg-background/50 px-4 py-2.5 transition-colors hover:bg-muted/50 sm:min-w-[180px]"
        >
          <Calendar className="size-4 shrink-0 text-amber-500" />
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {weekLabel ? `Semana ${weekLabel}` : 'Esta semana'}
            </p>
            {weekTotal > 0 ? (
              <p className="text-sm font-bold text-foreground group-hover:underline">
                {formatCompact(weekTotal)}{' '}
                <span className="text-xs font-normal text-muted-foreground">
                  ({weekCount} pagto{weekCount !== 1 ? 's' : ''})
                </span>
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Nenhum pagamento
              </p>
            )}
          </div>
        </Link>
      </div>
    </div>
  )
}
