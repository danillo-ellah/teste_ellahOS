'use client'

import { TrendingUp, DollarSign, Percent } from 'lucide-react'
import type { CrmStats } from '@/hooks/useCrm'

function formatCurrency(value: number): string {
  if (value >= 1_000_000) {
    return `R$ ${(value / 1_000_000).toFixed(1)}M`
  }
  if (value >= 1_000) {
    return `R$ ${(value / 1_000).toFixed(0)}K`
  }
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

interface CrmStatsBarProps {
  stats: CrmStats
}

export function CrmStatsBar({ stats }: CrmStatsBarProps) {
  return (
    <div className="grid grid-cols-3 gap-3 md:grid-cols-6">
      <StatCard
        icon={<DollarSign className="size-4 text-blue-500" />}
        label="Pipeline"
        value={formatCurrency(stats.pipeline_value)}
        sub="valor total ativo"
        className="col-span-1"
      />
      <StatCard
        icon={<TrendingUp className="size-4 text-violet-500" />}
        label="Ponderado"
        value={formatCurrency(stats.weighted_pipeline_value)}
        sub="por probabilidade"
        className="col-span-1"
      />
      <StatCard
        icon={<Percent className="size-4 text-emerald-500" />}
        label="Conversao"
        value={`${stats.conversion_rate}%`}
        sub={`ultimos ${stats.period_days}d`}
        className="col-span-1"
      />
      <StatCard
        label="Ticket Medio"
        value={formatCurrency(stats.avg_ticket)}
        sub="oportunidades ganhas"
        className="col-span-1"
      />
      <StatCard
        label="Ativas"
        value={String(stats.total_active)}
        sub="em andamento"
        className="col-span-1"
      />
      <StatCard
        label="Ganhas"
        value={String(stats.total_won)}
        sub={`vs ${stats.total_lost} perdidas`}
        className="col-span-1"
      />
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
  sub,
  className = '',
}: {
  icon?: React.ReactNode
  label: string
  value: string
  sub: string
  className?: string
}) {
  return (
    <div
      className={`flex flex-col gap-1 rounded-lg border bg-card p-3 ${className}`}
    >
      <div className="flex items-center gap-1.5">
        {icon}
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <span className="text-lg font-semibold leading-none">{value}</span>
      <span className="text-[11px] text-muted-foreground">{sub}</span>
    </div>
  )
}
