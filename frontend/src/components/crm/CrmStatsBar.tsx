'use client'

import { TrendingUp, DollarSign, Percent, Target, Trophy, Activity } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { useCrmStats } from '@/hooks/useCrm'

function formatCurrency(value: number): string {
  if (value >= 1_000_000) {
    return `R$ ${(value / 1_000_000).toFixed(1)}M`
  }
  if (value >= 1_000) {
    return `R$ ${(value / 1_000).toFixed(0)}K`
  }
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function CrmStatsBar() {
  const { data: stats, isLoading } = useCrmStats(90)

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-[88px] rounded-xl" />
        ))}
      </div>
    )
  }

  if (!stats) return null

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      <StatCard
        icon={<DollarSign className="size-4" />}
        iconBg="bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400"
        label="Em negociacao"
        value={formatCurrency(stats.pipeline_value)}
        sub="valor total ativo"
      />
      <StatCard
        icon={<TrendingUp className="size-4" />}
        iconBg="bg-violet-100 text-violet-600 dark:bg-violet-900/50 dark:text-violet-400"
        label="Estimado"
        value={formatCurrency(stats.weighted_pipeline_value)}
        sub="por probabilidade"
      />
      <StatCard
        icon={<Percent className="size-4" />}
        iconBg="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400"
        label="Conversao"
        value={`${stats.conversion_rate}%`}
        sub={`ultimos ${stats.period_days}d`}
      />
      <StatCard
        icon={<Target className="size-4" />}
        iconBg="bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400"
        label="Ticket Medio"
        value={formatCurrency(stats.avg_ticket)}
        sub="oportunidades ganhas"
      />
      <StatCard
        icon={<Activity className="size-4" />}
        iconBg="bg-sky-100 text-sky-600 dark:bg-sky-900/50 dark:text-sky-400"
        label="Ativas"
        value={String(stats.total_active)}
        sub="em andamento"
      />
      <StatCard
        icon={<Trophy className="size-4" />}
        iconBg="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400"
        label="Ganhas"
        value={String(stats.total_won)}
        sub={`vs ${stats.total_lost} perdidas`}
      />
    </div>
  )
}

function StatCard({
  icon,
  iconBg,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode
  iconBg: string
  label: string
  value: string
  sub: string
}) {
  return (
    <div className="flex flex-col gap-2.5 rounded-xl border border-border/60 bg-card p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.2)]">
      <div className="flex items-center gap-2">
        <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${iconBg}`}>
          {icon}
        </div>
        <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide leading-tight">{label}</span>
      </div>
      <div>
        <span className="text-xl font-bold leading-none tabular-nums tracking-tight">{value}</span>
        <span className="block text-[10px] text-muted-foreground/70 mt-1">{sub}</span>
      </div>
    </div>
  )
}
