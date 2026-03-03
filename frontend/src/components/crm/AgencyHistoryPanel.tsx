'use client'

import { Building2, Briefcase, TrendingUp, Clock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { formatCurrency, formatDate } from '@/lib/format'
import { useAgencyHistory } from '@/hooks/useCrm'

// Status badge colors para jobs (reutiliza padrao da aplicacao)
const JOB_STATUS_COLORS: Record<string, string> = {
  ativo: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  concluido: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  cancelado: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  pausado: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  pre_producao: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  producao: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  pos_producao: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  entregue: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
}

function formatStatus(status: string): string {
  const labels: Record<string, string> = {
    ativo: 'Ativo',
    concluido: 'Concluido',
    cancelado: 'Cancelado',
    pausado: 'Pausado',
    pre_producao: 'Pre-producao',
    producao: 'Em Producao',
    pos_producao: 'Pos-producao',
    entregue: 'Entregue',
  }
  return labels[status] ?? status
}

interface AgencyHistoryPanelProps {
  agencyId: string | null
  agencyName?: string | null
}

export function AgencyHistoryPanel({ agencyId, agencyName }: AgencyHistoryPanelProps) {
  const { data: history, isLoading } = useAgencyHistory(agencyId)

  if (!agencyId) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Building2 className="size-4 text-muted-foreground" />
            Historico da Agencia
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">Nenhuma agencia associada.</p>
        </CardContent>
      </Card>
    )
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Building2 className="size-4 text-muted-foreground" />
            Historico da Agencia
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-16 rounded-lg" />
          <Skeleton className="h-10 rounded-lg" />
          <Skeleton className="h-10 rounded-lg" />
        </CardContent>
      </Card>
    )
  }

  const displayName = history?.agency.name ?? agencyName ?? 'Agencia'

  // Sem historico
  if (!history || history.recent_jobs.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Building2 className="size-4 text-muted-foreground" />
            Historico da Agencia
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-dashed p-4 text-center">
            <Building2 className="mx-auto size-8 text-muted-foreground/40" />
            <p className="mt-2 text-xs font-medium text-muted-foreground">Sem historico</p>
            <p className="text-[11px] text-muted-foreground/70">
              Nenhum job encontrado para {displayName}
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const { stats, recent_jobs } = history

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <Building2 className="size-4 text-muted-foreground" />
          Historico — {displayName}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-2">
          <StatCard
            icon={<Briefcase className="size-3.5 text-blue-500" />}
            label="Jobs"
            value={String(stats.total_jobs)}
          />
          <StatCard
            icon={<TrendingUp className="size-3.5 text-emerald-500" />}
            label="Ticket medio"
            value={formatCurrency(stats.avg_ticket)}
          />
          <StatCard
            icon={<TrendingUp className="size-3.5 text-violet-500" />}
            label="Taxa fechamento"
            value={`${stats.win_rate.toFixed(0)}%`}
          />
          {stats.last_job_date && (
            <StatCard
              icon={<Clock className="size-3.5 text-amber-500" />}
              label="Ultimo job"
              value={formatDate(stats.last_job_date)}
            />
          )}
        </div>

        {/* Lista de jobs recentes */}
        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Ultimos jobs
          </p>
          <div className="space-y-1.5">
            {recent_jobs.slice(0, 5).map((job) => (
              <div
                key={job.id}
                className="flex items-center gap-2 rounded-md border bg-card px-2.5 py-2"
              >
                <div className="flex-1 min-w-0">
                  <p className="truncate text-xs font-medium" title={job.title}>
                    {job.title}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {job.code && (
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {job.code}
                      </span>
                    )}
                    <span className="text-[10px] text-muted-foreground">
                      {formatDate(job.created_at)}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  {job.estimated_value != null && (
                    <span className="text-[11px] font-medium tabular-nums">
                      {formatCurrency(job.estimated_value)}
                    </span>
                  )}
                  <Badge
                    variant="secondary"
                    className={cn(
                      'text-[10px] px-1.5 py-0',
                      JOB_STATUS_COLORS[job.status] ?? 'bg-muted text-muted-foreground',
                    )}
                  >
                    {formatStatus(job.status)}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="rounded-lg border bg-muted/30 p-2.5">
      <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
        {icon}
        <span className="text-[10px] uppercase tracking-wide">{label}</span>
      </div>
      <span className="text-xs font-semibold tabular-nums">{value}</span>
    </div>
  )
}
