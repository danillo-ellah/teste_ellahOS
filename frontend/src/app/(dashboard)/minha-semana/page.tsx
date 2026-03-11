'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  format,
  parseISO,
  startOfWeek,
  endOfWeek,
  addWeeks,
  isToday,
  eachDayOfInterval,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clapperboard,
  ClipboardCheck,
  Clock,
  ExternalLink,
  MapPin,
  Package,
  RefreshCw,
  AlertTriangle,
  Video,
  User,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { JOB_STATUS_LABELS, JOB_STATUS_COLORS, DELIVERABLE_STATUS_LABELS, TEAM_ROLE_LABELS } from '@/lib/constants'
import { useMyWeek } from '@/hooks/useMyWeek'
import type {
  MyWeekJob,
  MyWeekDeliverable,
  MyWeekShootingDate,
  MyWeekApproval,
} from '@/types/my-week'
import type { JobStatus, DeliverableStatus, TeamRole } from '@/types/jobs'

// --- Utilitarios ---

function formatWeekLabel(weekStart: string): string {
  const start = parseISO(weekStart)
  const end = endOfWeek(start, { weekStartsOn: 1 })
  const startStr = format(start, "dd 'de' MMM", { locale: ptBR })
  const endStr = format(end, "dd 'de' MMM", { locale: ptBR })
  return `${startStr} - ${endStr}`
}

function getMonday(date: Date): string {
  const monday = startOfWeek(date, { weekStartsOn: 1 })
  return format(monday, 'yyyy-MM-dd')
}

function healthColor(score: number | null): string {
  if (score === null) return 'text-muted-foreground'
  if (score >= 80) return 'text-emerald-600 dark:text-emerald-400'
  if (score >= 60) return 'text-amber-600 dark:text-amber-400'
  return 'text-red-600 dark:text-red-400'
}

// --- KPI Card ---

interface KpiCardProps {
  title: string
  value: number
  description: string
  icon: React.ReactNode
  highlight?: 'warn' | 'ok' | 'neutral'
  isLoading: boolean
}

function KpiCard({ title, value, description, icon, highlight = 'neutral', isLoading }: KpiCardProps) {
  const highlightClass = {
    warn: 'text-amber-600 dark:text-amber-400',
    ok: 'text-emerald-600 dark:text-emerald-400',
    neutral: 'text-foreground',
  }[highlight]

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <span className="text-muted-foreground">{icon}</span>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-16" />
        ) : (
          <p className={cn('text-3xl font-bold', highlightClass)}>
            {value}
          </p>
        )}
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  )
}

// --- Secao: Meus Jobs ---

function MyJobsSection({ jobs, isLoading }: { jobs: MyWeekJob[]; isLoading: boolean }) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clapperboard className="h-4 w-4" />
            Meus Jobs Ativos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </CardContent>
      </Card>
    )
  }

  if (jobs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clapperboard className="h-4 w-4" />
            Meus Jobs Ativos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <Clapperboard className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">Voce nao esta vinculado a nenhum job ativo.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Clapperboard className="h-4 w-4" />
          Meus Jobs Ativos
          <Badge variant="secondary" className="ml-auto text-xs">{jobs.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {jobs.map((job) => {
          const statusLabel = JOB_STATUS_LABELS[job.status as JobStatus] ?? job.status
          const statusColor = JOB_STATUS_COLORS[job.status as JobStatus] ?? '#6B7280'
          const roleLabel = TEAM_ROLE_LABELS[job.team_role as TeamRole] ?? job.team_role

          return (
            <div
              key={job.id}
              className="flex items-center gap-3 rounded-lg border p-3 hover:bg-accent/50 transition-colors"
            >
              {/* Health score indicator */}
              <div className="flex flex-col items-center gap-0.5 min-w-[36px]">
                <span className={cn('text-lg font-bold', healthColor(job.health_score))}>
                  {job.health_score ?? '-'}
                </span>
                <span className="text-[9px] text-muted-foreground uppercase">saude</span>
              </div>

              {/* Info principal */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-muted-foreground">{job.code}</span>
                  <Badge variant="outline" className="text-[10px]" style={{ borderColor: statusColor, color: statusColor }}>
                    {statusLabel}
                  </Badge>
                  {job.is_responsible_producer && (
                    <Badge variant="secondary" className="text-[10px] bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/20">
                      Responsavel
                    </Badge>
                  )}
                </div>
                <p className="text-sm font-medium truncate mt-0.5">{job.title}</p>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                  <span>{job.client_name ?? '-'}</span>
                  {job.agency_name && (
                    <>
                      <span>|</span>
                      <span>{job.agency_name}</span>
                    </>
                  )}
                  {roleLabel && (
                    <>
                      <span>|</span>
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {roleLabel}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Link para o job */}
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" asChild title="Ver job">
                <Link href={`/jobs/${job.id}?tab=geral`}>
                  <ExternalLink className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}

// --- Secao: Entregas da Semana ---

function DeliverablesByDay({
  deliverables,
  weekStart,
  isLoading,
}: {
  deliverables: MyWeekDeliverable[]
  weekStart: string
  isLoading: boolean
}) {
  const days = useMemo(() => {
    const start = parseISO(weekStart)
    const end = endOfWeek(start, { weekStartsOn: 1 })
    return eachDayOfInterval({ start, end })
  }, [weekStart])

  // Agrupar deliverables por dia (hooks devem ser chamados antes de early returns)
  const byDay = useMemo(() => {
    const map = new Map<string, MyWeekDeliverable[]>()
    for (const d of deliverables) {
      if (!d.delivery_date) continue
      const key = d.delivery_date.slice(0, 10)
      const arr = map.get(key) ?? []
      arr.push(d)
      map.set(key, arr)
    }
    return map
  }, [deliverables])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Package className="h-4 w-4" />
          Entregas da Semana
          {deliverables.length > 0 && (
            <Badge variant="secondary" className="ml-auto text-xs">{deliverables.length}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : deliverables.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            Nenhuma entrega programada para esta semana.
          </p>
        ) : (
          <div className="space-y-3">
            {days.map((day) => {
              const dateKey = format(day, 'yyyy-MM-dd')
              const dayDeliverables = byDay.get(dateKey) ?? []
              if (dayDeliverables.length === 0) return null

              const dayLabel = format(day, "EEEE, dd/MM", { locale: ptBR })
              const today = isToday(day)

              return (
                <div key={dateKey}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span
                      className={cn(
                        'text-xs font-semibold uppercase tracking-wide',
                        today ? 'text-blue-600 dark:text-blue-400' : 'text-muted-foreground',
                      )}
                    >
                      {dayLabel}
                    </span>
                    {today && (
                      <Badge className="text-[10px] bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/20" variant="outline">
                        Hoje
                      </Badge>
                    )}
                  </div>
                  <div className="space-y-1.5 pl-3 border-l-2 border-border">
                    {dayDeliverables.map((d) => {
                      const statusLabel = DELIVERABLE_STATUS_LABELS[d.status as DeliverableStatus] ?? d.status
                      return (
                        <div key={d.id} className="flex items-center gap-2 py-1">
                          <span className="font-mono text-[10px] text-muted-foreground min-w-[30px]">
                            {d.job_code}
                          </span>
                          <span className="text-sm flex-1 truncate">{d.description}</span>
                          {d.format && (
                            <span className="text-[10px] text-muted-foreground">{d.format}</span>
                          )}
                          <Badge variant="outline" className="text-[10px]">
                            {statusLabel}
                          </Badge>
                          <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" asChild title="Ver entregaveis">
                            <Link href={`/jobs/${d.job_id}?tab=entregaveis`}>
                              <ExternalLink className="h-3 w-3" />
                            </Link>
                          </Button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// --- Secao: Diarias da Semana ---

function ShootingDatesByDay({
  shootingDates,
  weekStart,
  isLoading,
}: {
  shootingDates: MyWeekShootingDate[]
  weekStart: string
  isLoading: boolean
}) {
  const days = useMemo(() => {
    const start = parseISO(weekStart)
    const end = endOfWeek(start, { weekStartsOn: 1 })
    return eachDayOfInterval({ start, end })
  }, [weekStart])

  // Agrupar por dia (hooks devem ser chamados antes de early returns)
  const byDay = useMemo(() => {
    const map = new Map<string, MyWeekShootingDate[]>()
    for (const s of shootingDates) {
      const key = s.shooting_date.slice(0, 10)
      const arr = map.get(key) ?? []
      arr.push(s)
      map.set(key, arr)
    }
    return map
  }, [shootingDates])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Video className="h-4 w-4" />
          Diarias da Semana
          {shootingDates.length > 0 && (
            <Badge variant="secondary" className="ml-auto text-xs">{shootingDates.length}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : shootingDates.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            Nenhuma diaria agendada para esta semana.
          </p>
        ) : (
          <div className="space-y-3">
            {days.map((day) => {
              const dateKey = format(day, 'yyyy-MM-dd')
              const dayShooting = byDay.get(dateKey) ?? []
              if (dayShooting.length === 0) return null

              const dayLabel = format(day, "EEEE, dd/MM", { locale: ptBR })
              const today = isToday(day)

              return (
                <div key={dateKey}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span
                      className={cn(
                        'text-xs font-semibold uppercase tracking-wide',
                        today ? 'text-blue-600 dark:text-blue-400' : 'text-muted-foreground',
                      )}
                    >
                      {dayLabel}
                    </span>
                    {today && (
                      <Badge className="text-[10px] bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/20" variant="outline">
                        Hoje
                      </Badge>
                    )}
                  </div>
                  <div className="space-y-1.5 pl-3 border-l-2 border-orange-200 dark:border-orange-800">
                    {dayShooting.map((s) => (
                      <div key={s.id} className="flex items-center gap-2 py-1">
                        <span className="font-mono text-[10px] text-muted-foreground min-w-[30px]">
                          {s.job_code}
                        </span>
                        <span className="text-sm flex-1 truncate">
                          {s.description ?? s.job_title}
                        </span>
                        {s.start_time && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {s.start_time}{s.end_time ? ` - ${s.end_time}` : ''}
                          </span>
                        )}
                        {s.location && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground max-w-[150px] truncate">
                            <MapPin className="h-3 w-3 shrink-0" />
                            {s.location}
                          </span>
                        )}
                        <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" asChild title="Ver diarias">
                          <Link href={`/jobs/${s.job_id}?tab=diarias`}>
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// --- Secao: Aprovacoes Pendentes ---

function PendingApprovalsSection({
  approvals,
  isLoading,
}: {
  approvals: MyWeekApproval[]
  isLoading: boolean
}) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4" />
            Aprovacoes Pendentes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <ClipboardCheck className="h-4 w-4" />
          Aprovacoes Pendentes
          {approvals.length > 0 && (
            <Badge variant="secondary" className="ml-auto text-xs bg-amber-500/10 text-amber-600 dark:text-amber-400">
              {approvals.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {approvals.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            Nenhuma aprovacao pendente nos seus jobs.
          </p>
        ) : (
          <div className="space-y-2">
            {approvals.map((a) => (
              <div
                key={a.id}
                className="flex items-center gap-3 rounded-lg border border-amber-200 dark:border-amber-800/40 bg-amber-50/50 dark:bg-amber-950/20 p-3"
              >
                <ClipboardCheck className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">{a.job_code}</span>
                    <span className="text-xs text-amber-700 dark:text-amber-300 font-medium">
                      {a.approval_type === 'interna_orcamento' ? 'Orcamento' : a.approval_type === 'interna_corte' ? 'Corte' : a.approval_type}
                    </span>
                  </div>
                  <p className="text-sm truncate">{a.job_title}</p>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" asChild title="Ver aprovacao">
                  <Link href={`/jobs/${a.job_id}?tab=workflow`}>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// --- Pagina Principal ---

export default function MinhaSemanaPage() {
  const [weekOffset, setWeekOffset] = useState(0)

  const weekStart = useMemo(() => {
    const today = new Date()
    const targetDate = weekOffset === 0 ? today : addWeeks(today, weekOffset)
    return getMonday(targetDate)
  }, [weekOffset])

  const isCurrentWeek = weekOffset === 0

  const { data, isLoading, isError, refetch } = useMyWeek(weekStart)

  const jobs = data?.jobs ?? []
  const deliverables = data?.deliverables ?? []
  const shootingDates = data?.shooting_dates ?? []
  const pendingApprovals = data?.pending_approvals ?? []
  const personName = data?.person_name ?? null

  return (
    <div className="space-y-6 pb-12">
      {/* Cabecalho */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-muted-foreground" />
            Minha Semana
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {personName
              ? `Visao pessoal de ${personName} — ${formatWeekLabel(weekStart)}`
              : `Resumo da semana — ${formatWeekLabel(weekStart)}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Navegacao de semana */}
          <div className="flex items-center rounded-md border">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-r-none"
              onClick={() => setWeekOffset((p) => p - 1)}
              title="Semana anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-3 rounded-none text-xs"
              onClick={() => setWeekOffset(0)}
              disabled={isCurrentWeek}
            >
              Hoje
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-l-none"
              onClick={() => setWeekOffset((p) => p + 1)}
              title="Proxima semana"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="shrink-0">
            <RefreshCw className="size-3.5 mr-1.5" />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Banner de erro */}
      {isError && (
        <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 dark:border-red-800 dark:bg-red-950/30">
          <AlertTriangle className="size-4 shrink-0 text-red-500" />
          <p className="flex-1 text-sm text-red-700 dark:text-red-400">
            Nao foi possivel carregar os dados da semana. Tente novamente.
          </p>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="shrink-0 h-8">
            <RefreshCw className="size-3.5 mr-1.5" />
            Tentar novamente
          </Button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard
          title="Meus Jobs"
          value={jobs.length}
          description="jobs ativos na sua equipe"
          icon={<Clapperboard className="h-4 w-4" />}
          highlight="neutral"
          isLoading={isLoading}
        />
        <KpiCard
          title="Entregas"
          value={deliverables.length}
          description="entregas esta semana"
          icon={<Package className="h-4 w-4" />}
          highlight={deliverables.length > 0 ? 'warn' : 'neutral'}
          isLoading={isLoading}
        />
        <KpiCard
          title="Diarias"
          value={shootingDates.length}
          description="filmagens esta semana"
          icon={<Video className="h-4 w-4" />}
          highlight={shootingDates.length > 0 ? 'warn' : 'neutral'}
          isLoading={isLoading}
        />
        <KpiCard
          title="Aprovacoes"
          value={pendingApprovals.length}
          description="pendentes nos meus jobs"
          icon={<ClipboardCheck className="h-4 w-4" />}
          highlight={pendingApprovals.length > 0 ? 'warn' : 'neutral'}
          isLoading={isLoading}
        />
      </div>

      {/* Grid principal: 2 colunas (desktop), 1 coluna (mobile) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Coluna esquerda: Jobs + Aprovacoes */}
        <div className="space-y-6">
          <MyJobsSection jobs={jobs} isLoading={isLoading} />
          <PendingApprovalsSection approvals={pendingApprovals} isLoading={isLoading} />
        </div>

        {/* Coluna direita: Entregas + Diarias */}
        <div className="space-y-6">
          <DeliverablesByDay
            deliverables={deliverables}
            weekStart={weekStart}
            isLoading={isLoading}
          />
          <ShootingDatesByDay
            shootingDates={shootingDates}
            weekStart={weekStart}
            isLoading={isLoading}
          />
        </div>
      </div>
    </div>
  )
}
