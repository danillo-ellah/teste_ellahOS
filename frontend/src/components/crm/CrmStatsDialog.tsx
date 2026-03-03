'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Loader2 } from 'lucide-react'
import { useCrmStats } from '@/hooks/useCrm'

const STAGE_LABELS: Record<string, string> = {
  lead: 'Lead',
  qualificado: 'Qualificado',
  proposta: 'Proposta',
  negociacao: 'Negociacao',
  fechamento: 'Fechamento',
  ganho: 'Ganho',
  perdido: 'Perdido',
}

function formatCurrency(value: number): string {
  if (value >= 1_000_000) {
    return `R$ ${(value / 1_000_000).toFixed(2)}M`
  }
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

interface CrmStatsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CrmStatsDialog({ open, onOpenChange }: CrmStatsDialogProps) {
  const [periodDays, setPeriodDays] = useState(90)
  const { data: stats, isLoading } = useCrmStats(periodDays)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Metricas do Pipeline</DialogTitle>
        </DialogHeader>

        {/* Seletor de periodo */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Periodo de analise:</span>
          {[30, 60, 90, 180, 365].map((d) => (
            <button
              key={d}
              onClick={() => setPeriodDays(d)}
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
                periodDays === d
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {d}d
            </button>
          ))}
        </div>

        {isLoading && (
          <div className="flex justify-center py-8">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {stats && !isLoading && (
          <div className="space-y-5">
            {/* KPIs principais */}
            <div className="grid grid-cols-2 gap-3">
              <MetricCard
                label="Pipeline Total"
                value={formatCurrency(stats.pipeline_value)}
                sub="oportunidades ativas"
              />
              <MetricCard
                label="Pipeline Ponderado"
                value={formatCurrency(stats.weighted_pipeline_value)}
                sub="por probabilidade"
              />
              <MetricCard
                label="Taxa de Conversao"
                value={`${stats.conversion_rate}%`}
                sub={`${stats.won_in_period} ganhas de ${stats.closed_in_period} fechadas`}
                highlight={stats.conversion_rate >= 30 ? 'success' : stats.conversion_rate >= 15 ? 'warning' : 'danger'}
              />
              <MetricCard
                label="Ticket Medio"
                value={formatCurrency(stats.avg_ticket)}
                sub={`${stats.total_won} oportunidades ganhas`}
              />
            </div>

            {/* Distribuicao por stage */}
            <div>
              <h4 className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Por Stage
              </h4>
              <div className="space-y-2">
                {Object.entries(stats.by_stage)
                  .filter(([, v]) => v.count > 0)
                  .sort(([, a], [, b]) => b.total_value - a.total_value)
                  .map(([stage, data]) => (
                    <div key={stage} className="flex items-center gap-2 text-xs">
                      <span className="w-24 shrink-0 text-muted-foreground">
                        {STAGE_LABELS[stage] ?? stage}
                      </span>
                      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary/60"
                          style={{
                            width: `${Math.min(100, (data.count / (stats.total_active + stats.total_won + stats.total_lost)) * 100)}%`,
                          }}
                        />
                      </div>
                      <span className="w-6 shrink-0 text-right font-medium">{data.count}</span>
                      {data.total_value > 0 && (
                        <span className="w-24 shrink-0 text-right text-muted-foreground">
                          {formatCurrency(data.total_value)}
                        </span>
                      )}
                    </div>
                  ))}
              </div>
            </div>

            {/* Distribuicao por origem */}
            {Object.keys(stats.by_source).length > 0 && (
              <div>
                <h4 className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Por Origem
                </h4>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(stats.by_source)
                    .sort(([, a], [, b]) => b - a)
                    .map(([source, count]) => (
                      <div
                        key={source}
                        className="flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs"
                      >
                        <span className="capitalize">{source.replace('_', ' ')}</span>
                        <span className="font-semibold text-muted-foreground">{count}</span>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function MetricCard({
  label,
  value,
  sub,
  highlight,
}: {
  label: string
  value: string
  sub: string
  highlight?: 'success' | 'warning' | 'danger'
}) {
  const highlightClass =
    highlight === 'success'
      ? 'text-emerald-600 dark:text-emerald-400'
      : highlight === 'warning'
        ? 'text-amber-600 dark:text-amber-400'
        : highlight === 'danger'
          ? 'text-red-600 dark:text-red-400'
          : 'text-foreground'

  return (
    <div className="rounded-lg border bg-card p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1 text-lg font-semibold ${highlightClass}`}>{value}</p>
      <p className="text-[11px] text-muted-foreground">{sub}</p>
    </div>
  )
}
