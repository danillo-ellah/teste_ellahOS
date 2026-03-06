'use client'

import Link from 'next/link'
import { Briefcase, TrendingUp, TrendingDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import type { CrmDashboardData } from '@/hooks/useCrm'

// --- Helpers ---

function formatCompact(value: number): string {
  const abs = Math.abs(value)
  const sign = value < 0 ? '-' : ''
  if (abs >= 1_000_000) return `${sign}R$ ${(abs / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000) return `${sign}R$ ${(abs / 1_000).toFixed(1)}k`
  return `${sign}R$ ${Math.round(abs)}`
}

// --- Props ---

interface CommercialSnapshotProps {
  data: CrmDashboardData | undefined
  isLoading: boolean
}

export function CommercialSnapshot({ data, isLoading }: CommercialSnapshotProps) {
  if (isLoading) {
    return <Skeleton className="h-[140px] w-full rounded-xl" />
  }

  if (!data) return null

  const { pipeline_summary, month_summary } = data
  const revenuePct = month_summary.vs_last_month_revenue_pct
  const isPositive = revenuePct >= 0

  return (
    <Link
      href="/crm"
      className="group flex flex-col rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Briefcase className="size-4 text-violet-500" />
          <h3 className="text-sm font-semibold text-foreground">Pipeline Comercial</h3>
        </div>
        <span className="text-xs text-muted-foreground group-hover:underline">
          Ver CRM
        </span>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-4">
        {/* Pipeline ativo */}
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Pipeline
          </p>
          <p className="mt-1 text-xl font-bold tracking-tight text-foreground">
            {formatCompact(pipeline_summary.total_value)}
          </p>
          <p className="text-xs text-muted-foreground">
            {pipeline_summary.total_count} oportunidade{pipeline_summary.total_count !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Jobs fechados este mes */}
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Fechados/Mes
          </p>
          <p className="mt-1 text-xl font-bold tracking-tight text-foreground">
            {month_summary.jobs_closed}
          </p>
          <p className="text-xs text-muted-foreground">
            {formatCompact(month_summary.revenue)}
          </p>
        </div>

        {/* Variacao vs mes anterior */}
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            vs Mes Anterior
          </p>
          <div className="mt-1 flex items-center gap-1">
            {isPositive ? (
              <TrendingUp className="size-4 text-green-500" />
            ) : (
              <TrendingDown className="size-4 text-red-500" />
            )}
            <span
              className={cn(
                'text-xl font-bold tracking-tight',
                isPositive
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-red-600 dark:text-red-400',
              )}
            >
              {isPositive ? '+' : ''}{revenuePct.toFixed(0)}%
            </span>
          </div>
          <p className="text-xs text-muted-foreground">receita</p>
        </div>
      </div>
    </Link>
  )
}
