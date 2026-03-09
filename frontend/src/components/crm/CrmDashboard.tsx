'use client'

import { memo } from 'react'
import {
  AlertTriangle,
  BarChart3,
  Building2,
  CheckCircle2,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Trophy,
  XCircle,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useCrmDashboard, useDirectorRanking } from '@/hooks/useCrm'
import { formatCurrency, formatDate } from '@/lib/format'
import { AREA_CONFIG } from '@/lib/constants'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatShortCurrency(value: number): string {
  if (value >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `R$ ${(value / 1_000).toFixed(0)}K`
  return formatCurrency(value)
}

function PctBadge({ pct }: { pct: number }) {
  const isPositive = pct >= 0
  const label = `${isPositive ? '+' : ''}${pct.toFixed(1)}%`
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs font-medium ${
        isPositive
          ? 'text-emerald-600 dark:text-emerald-400'
          : 'text-red-600 dark:text-red-400'
      }`}
    >
      {isPositive ? (
        <TrendingUp className="size-3" />
      ) : (
        <TrendingDown className="size-3" />
      )}
      {label}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Skeleton de carregamento
// ---------------------------------------------------------------------------

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Skeleton className="size-6 rounded" />
        <div className="space-y-1">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-3.5 w-32" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-lg" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Skeleton className="h-56 rounded-lg" />
        <Skeleton className="h-56 rounded-lg" />
        <Skeleton className="h-44 rounded-lg" />
        <Skeleton className="h-44 rounded-lg" />
      </div>
      <Skeleton className="h-44 rounded-lg" />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Ranking de Diretores
// ---------------------------------------------------------------------------

const DirectorRankingSection = memo(function DirectorRankingSection() {
  const { data, isLoading } = useDirectorRanking(12)

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3 pt-5">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Trophy className="size-4 text-muted-foreground" />
            Ranking de Diretores (12 meses)
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-5">
          <div className="flex flex-col gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  const directors = data?.directors ?? []

  return (
    <Card>
      <CardHeader className="pb-3 pt-5">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <Trophy className="size-4 text-muted-foreground" />
          Ranking de Diretores (12 meses)
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-5">
        {directors.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhuma concorrencia com diretor registrada.
          </p>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs text-muted-foreground">
                  <th className="pb-2 pl-1 pr-3 text-left font-medium">#</th>
                  <th className="pb-2 pr-3 text-left font-medium">Diretor</th>
                  <th className="pb-2 pr-3 text-right font-medium">Concorrencias</th>
                  <th className="pb-2 pr-3 text-right font-medium">Ganhas</th>
                  <th className="pb-2 pr-3 text-right font-medium">Perdidas</th>
                  <th className="pb-2 pr-6 text-right font-medium">Win Rate</th>
                  <th className="pb-2 pr-1 text-right font-medium">Valor Ganho</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {directors.map((dir, idx) => {
                  const winRate = dir.win_rate ?? 0
                  const barColor =
                    winRate >= 60
                      ? 'bg-emerald-500'
                      : winRate >= 40
                      ? 'bg-amber-500'
                      : 'bg-red-500'
                  const textColor =
                    winRate >= 60
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : winRate >= 40
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-red-600 dark:text-red-400'

                  return (
                    <tr key={dir.person_id} className="group">
                      <td className="py-2.5 pl-1 pr-3 text-xs font-bold text-muted-foreground">
                        {idx + 1}
                      </td>
                      <td className="max-w-[140px] truncate py-2.5 pr-3 font-medium">
                        {dir.name}
                      </td>
                      <td className="py-2.5 pr-3 text-right tabular-nums">
                        {dir.total_bids}
                      </td>
                      <td className="py-2.5 pr-3 text-right tabular-nums text-emerald-600 dark:text-emerald-400">
                        {dir.wins}
                      </td>
                      <td className="py-2.5 pr-3 text-right tabular-nums text-red-600 dark:text-red-400">
                        {dir.losses}
                      </td>
                      <td className="py-2.5 pr-6">
                        <div className="flex items-center justify-end gap-2">
                          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted/60">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                              style={{ width: `${Math.min(winRate, 100)}%` }}
                            />
                          </div>
                          <span className={`w-10 text-right text-xs font-semibold tabular-nums ${textColor}`}>
                            {winRate.toFixed(0)}%
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 pr-1 text-right font-semibold tabular-nums">
                        {formatCurrency(dir.total_value_won)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
})

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

export function CrmDashboard() {
  const { data, isLoading, isError, refetch, isFetching } = useCrmDashboard()

  const area = AREA_CONFIG.comercial

  // Mes/ano corrente para o header
  const now = new Date()
  const monthLabel = now.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })
  const monthLabelCapitalized =
    monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)

  if (isLoading) return <DashboardSkeleton />

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <AlertTriangle className="size-8 text-destructive" />
        <p className="text-sm text-muted-foreground">
          Erro ao carregar o dashboard. Tente novamente.
        </p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="mr-2 size-3.5" />
          Tentar novamente
        </Button>
      </div>
    )
  }

  if (!data) return null

  const { pipeline_summary, month_summary, alerts_count, funnel, top_agencies, by_pe, competition_stats, recent_closings } =
    data

  const maxFunnelCount = Math.max(...funnel.map((f) => f.count), 1)

  // BAIXO-04: cores do funil consistentes com STAGE_CONFIG
  const FUNNEL_COLORS: Record<string, string> = {
    lead: 'bg-slate-500',
    qualificado: 'bg-blue-500',
    proposta: 'bg-violet-500',
    negociacao: 'bg-amber-500',
    fechamento: 'bg-orange-500',
    ganho: 'bg-emerald-500',
    perdido: 'bg-red-500',
    pausado: 'bg-slate-400',
  }

  return (
    <div className="flex flex-col gap-6">
      {/* ------------------------------------------------------------------ */}
      {/* Header                                                               */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <BarChart3 className={`size-6 ${area.textClass}`} />
          <div>
            <h1 className="text-xl font-semibold">Comercial — Dashboard</h1>
            <p className="text-sm text-muted-foreground">{monthLabelCapitalized}</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          className="gap-2 self-start sm:self-auto"
        >
          <RefreshCw className={`size-3.5 ${isFetching ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 3 cards de KPI                                                       */}
      {/* ------------------------------------------------------------------ */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Pipeline ativo */}
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-medium text-muted-foreground">Pipeline Ativo</p>
            <p className="mt-1.5 text-2xl font-bold leading-none">
              {formatShortCurrency(pipeline_summary.total_value)}
            </p>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {pipeline_summary.total_count} oportunidade
              {pipeline_summary.total_count !== 1 ? 's' : ''}
              {pipeline_summary.total_paused > 0 && (
                <> &middot; {pipeline_summary.total_paused} pausada{pipeline_summary.total_paused !== 1 ? 's' : ''}</>
              )}
            </p>
          </CardContent>
        </Card>

        {/* Esse mes */}
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-medium text-muted-foreground">Esse Mes</p>
            <p className="mt-1.5 text-2xl font-bold leading-none">
              {month_summary.jobs_closed} fechado{month_summary.jobs_closed !== 1 ? 's' : ''}
            </p>
            <div className="mt-1.5 flex items-center gap-2">
              <p className="text-sm text-muted-foreground">
                {formatShortCurrency(month_summary.revenue)}
              </p>
              <PctBadge pct={month_summary.vs_last_month_revenue_pct} />
            </div>
          </CardContent>
        </Card>

        {/* Alertas */}
        <Card className={alerts_count > 0 ? 'border-amber-400/50 bg-amber-500/5' : ''}>
          <CardContent className="p-5">
            <p className="text-xs font-medium text-muted-foreground">
              {alerts_count > 0 ? 'Atencao!' : 'Alertas'}
            </p>
            <p
              className={`mt-1.5 text-2xl font-bold leading-none ${
                alerts_count > 0 ? 'text-amber-600 dark:text-amber-400' : ''
              }`}
            >
              {alerts_count}
            </p>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {alerts_count === 0
                ? 'Nenhum item urgente'
                : `item${alerts_count !== 1 ? 's' : ''} com prazo/inatividade`}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Grid de 2 colunas                                                   */}
      {/* ------------------------------------------------------------------ */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Funil */}
        <Card>
          <CardHeader className="pb-3 pt-5">
            <CardTitle className="text-sm font-semibold">Funil de Oportunidades</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 pb-5">
            {funnel.map((item) => (
              <div key={item.stage} className="flex items-center gap-3">
                <span className="w-28 shrink-0 text-xs text-muted-foreground">{item.label}</span>
                <div className="flex-1 rounded-full bg-muted/60 h-5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${FUNNEL_COLORS[item.stage] ?? 'bg-violet-500'}`}
                    style={{
                      width: `${Math.max(
                        4,
                        (item.count / maxFunnelCount) * 100,
                      )}%`,
                    }}
                  />
                </div>
                <span className="w-6 shrink-0 text-right text-sm font-semibold tabular-nums">
                  {item.count}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Por PE */}
        <Card>
          <CardHeader className="pb-3 pt-5">
            <CardTitle className="text-sm font-semibold">Por Produtor Executivo</CardTitle>
          </CardHeader>
          <CardContent className="pb-5">
            {by_pe.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma oportunidade atribuida.</p>
            ) : (
              <div className="divide-y">
                {by_pe.map((pe) => (
                  <div
                    key={pe.profile_id}
                    className="flex items-center justify-between py-2.5"
                  >
                    <span className="text-sm font-medium truncate max-w-[160px]">
                      {pe.name}
                    </span>
                    <div className="flex items-center gap-4 shrink-0">
                      <Badge variant="secondary" className="text-xs">
                        {pe.active_count} ativ{pe.active_count !== 1 ? 'as' : 'a'}
                      </Badge>
                      <span className="text-sm font-semibold tabular-nums">
                        {formatShortCurrency(pe.active_value)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Agencias */}
        <Card>
          <CardHeader className="pb-3 pt-5">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Building2 className="size-4 text-muted-foreground" />
              Top Agencias (ano)
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-5">
            {top_agencies.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum job com agencia neste ano.
              </p>
            ) : (
              <div className="flex flex-col gap-2.5">
                {top_agencies.map((agency, idx) => (
                  <div key={agency.agency_id} className="flex items-center gap-3">
                    <span className="w-5 text-center text-xs font-bold text-muted-foreground">
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{agency.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {agency.total_jobs} job{agency.total_jobs !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold tabular-nums">
                      {formatShortCurrency(agency.total_value)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Concorrencias */}
        <Card>
          <CardHeader className="pb-3 pt-5">
            <CardTitle className="text-sm font-semibold">
              Concorrencias (ultimos 6 meses)
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-5">
            {competition_stats.total_bids === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhuma concorrencia registrada no periodo.
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-lg bg-muted/50 p-3 text-center">
                    <p className="text-2xl font-bold">{competition_stats.total_bids}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">Participacoes</p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-3 text-center">
                    <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                      {competition_stats.total_won}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">Ganhas</p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-3 text-center">
                    <p className="text-2xl font-bold text-violet-600 dark:text-violet-400">
                      {competition_stats.win_rate}%
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">Win Rate</p>
                  </div>
                </div>
                {competition_stats.top_loss_reason && (
                  <p className="text-xs text-muted-foreground">
                    Principal motivo de perda:{' '}
                    <span className="font-medium text-foreground">
                      {competition_stats.top_loss_reason}
                    </span>
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Ultimos Fechamentos (full width)                                     */}
      {/* ------------------------------------------------------------------ */}
      <Card>
        <CardHeader className="pb-3 pt-5">
          <CardTitle className="text-sm font-semibold">Ultimos Fechamentos</CardTitle>
        </CardHeader>
        <CardContent className="pb-5">
          {recent_closings.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum fechamento registrado ainda.
            </p>
          ) : (
            <div className="divide-y">
              {recent_closings.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 py-2.5"
                >
                  {item.stage === 'ganho' ? (
                    <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
                  ) : (
                    <XCircle className="size-4 shrink-0 text-red-500" />
                  )}

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.title}</p>
                    {item.assigned_name && (
                      <p className="text-xs text-muted-foreground truncate">
                        {item.assigned_name}
                      </p>
                    )}
                  </div>

                  <div className="shrink-0 text-right">
                    {item.value != null && (
                      <p className="text-sm font-semibold tabular-nums">
                        {formatShortCurrency(item.value)}
                      </p>
                    )}
                    {item.closed_at && (
                      <p className="text-xs text-muted-foreground">
                        {formatDate(item.closed_at)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ------------------------------------------------------------------ */}
      {/* Ranking de Diretores (full width)                                    */}
      {/* ------------------------------------------------------------------ */}
      <DirectorRankingSection />
    </div>
  )
}
