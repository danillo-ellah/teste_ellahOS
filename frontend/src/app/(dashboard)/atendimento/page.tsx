'use client'

import Link from 'next/link'
import {
  Headset,
  RefreshCw,
  AlertCircle,
  Clapperboard,
  Clock,
  ClipboardCheck,
  AlertTriangle,
  MessageSquare,
  ExternalLink,
  FileText,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { formatDate } from '@/lib/format'
import { JOB_STATUS_LABELS, JOB_STATUS_COLORS } from '@/lib/constants'
import { useAtendimentoJobs } from '@/hooks/useAtendimentoJobs'
import { usePortalSessions } from '@/hooks/use-portal'
import type { Job } from '@/types/jobs'
import type { PortalSession } from '@/types/portal'

// ─── KPI Card ────────────────────────────────────────────────────────────────

interface KpiCardProps {
  title: string
  value: number | null
  description: string
  icon: React.ReactNode
  highlight?: 'warn' | 'alert' | 'ok' | 'neutral'
  isLoading: boolean
}

function KpiCard({ title, value, description, icon, highlight = 'neutral', isLoading }: KpiCardProps) {
  const highlightClass = {
    warn: 'text-amber-600 dark:text-amber-400',
    alert: 'text-red-600 dark:text-red-400',
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
            {value ?? '-'}
          </p>
        )}
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  )
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function JobStatusBadge({ status }: { status: Job['status'] }) {
  const color = JOB_STATUS_COLORS[status] ?? '#6B7280'
  const label = JOB_STATUS_LABELS[status] ?? status

  return (
    <Badge
      variant="outline"
      className="text-xs font-normal"
      style={{ borderColor: color, color }}
    >
      {label}
    </Badge>
  )
}

// ─── Skeleton da tabela ───────────────────────────────────────────────────────

function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  )
}

// ─── Aba: Meus Jobs ──────────────────────────────────────────────────────────

function MyJobsTab({
  jobs,
  isLoading,
  isError,
  onRefetch,
}: {
  jobs: Job[]
  isLoading: boolean
  isError: boolean
  onRefetch: () => void
}) {
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
        <AlertCircle className="h-10 w-10 text-destructive" aria-hidden="true" />
        <p className="text-sm text-muted-foreground">Erro ao carregar jobs.</p>
        <Button variant="outline" size="sm" onClick={onRefetch}>
          Tentar novamente
        </Button>
      </div>
    )
  }

  if (isLoading) return <TableSkeleton />

  if (jobs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Clapperboard className="h-12 w-12 text-muted-foreground mb-4" aria-hidden="true" />
        <p className="text-lg font-medium">Nenhum job ativo encontrado</p>
        <p className="text-sm text-muted-foreground mt-1">
          Voce ainda nao esta vinculado a nenhum job com role de Atendimento.
        </p>
        <Button variant="outline" size="sm" className="mt-4" asChild>
          <Link href="/jobs">Ver todos os jobs</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">Codigo</TableHead>
            <TableHead>Titulo</TableHead>
            <TableHead className="hidden sm:table-cell">Cliente</TableHead>
            <TableHead className="hidden md:table-cell">Agencia</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="hidden lg:table-cell">Entrega Prevista</TableHead>
            <TableHead className="text-right">Acoes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {jobs.map((job) => (
            <TableRow key={job.id}>
              {/* Codigo */}
              <TableCell className="font-mono text-xs text-muted-foreground">
                {job.job_code}
              </TableCell>

              {/* Titulo */}
              <TableCell className="font-medium max-w-[200px]">
                <span className="truncate block">{job.title}</span>
              </TableCell>

              {/* Cliente */}
              <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                {job.clients?.name ?? '-'}
              </TableCell>

              {/* Agencia */}
              <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                {job.agencies?.name ?? '-'}
              </TableCell>

              {/* Status */}
              <TableCell>
                <JobStatusBadge status={job.status} />
              </TableCell>

              {/* Entrega prevista */}
              <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                {formatDate(job.expected_delivery_date)}
              </TableCell>

              {/* Acoes */}
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  {/* Link para aprovacao interna */}
                  <Button variant="ghost" size="icon" className="h-8 w-8" asChild title="Aprovacao Interna">
                    <Link href={`/atendimento/aprovacao-interna/${job.id}`}>
                      <FileText className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  </Button>
                  {/* Link para detalhe do job */}
                  <Button variant="ghost" size="icon" className="h-8 w-8" asChild title="Ver job">
                    <Link href={`/jobs/${job.id}`}>
                      <ExternalLink className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

// ─── Aba: Aprovacoes Pendentes ────────────────────────────────────────────────

function PendingApprovalsTab({
  sessions,
  isLoading,
  isError,
  onRefetch,
}: {
  sessions: PortalSession[]
  isLoading: boolean
  isError: boolean
  onRefetch: () => void
}) {
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
        <AlertCircle className="h-10 w-10 text-destructive" aria-hidden="true" />
        <p className="text-sm text-muted-foreground">Erro ao carregar aprovacoes pendentes.</p>
        <Button variant="outline" size="sm" onClick={onRefetch}>
          Tentar novamente
        </Button>
      </div>
    )
  }

  if (isLoading) return <TableSkeleton rows={4} />

  if (sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <ClipboardCheck className="h-12 w-12 text-muted-foreground mb-4" aria-hidden="true" />
        <p className="text-lg font-medium">Nenhuma aprovacao pendente</p>
        <p className="text-sm text-muted-foreground mt-1">
          Nao ha sessoes ativas de portal aguardando aprovacao do cliente.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Job</TableHead>
            <TableHead>Link / Destinatario</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="hidden md:table-cell">Criado em</TableHead>
            <TableHead className="hidden lg:table-cell">Expira em</TableHead>
            <TableHead className="text-right">Acoes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sessions.map((session) => (
            <TableRow key={session.id}>
              {/* Job */}
              <TableCell>
                <p className="text-xs text-muted-foreground font-mono">
                  {session.jobs?.code ?? '-'}
                </p>
                <p className="text-sm font-medium truncate max-w-[160px]">
                  {session.jobs?.title ?? '-'}
                </p>
              </TableCell>

              {/* Link / Destinatario */}
              <TableCell>
                <p className="text-sm font-medium">{session.label}</p>
                {session.contacts && (
                  <p className="text-xs text-muted-foreground">{session.contacts.name}</p>
                )}
              </TableCell>

              {/* Status */}
              <TableCell>
                <Badge
                  variant={session.is_active ? 'default' : 'secondary'}
                  className={cn(
                    'text-xs',
                    session.is_active
                      ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20'
                      : '',
                  )}
                >
                  {session.is_active ? 'Aguardando' : 'Inativo'}
                </Badge>
              </TableCell>

              {/* Criado em */}
              <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                {formatDate(session.created_at)}
              </TableCell>

              {/* Expira em */}
              <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                {formatDate(session.expires_at)}
              </TableCell>

              {/* Acoes */}
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  {session.jobs?.id && (
                    <Button variant="ghost" size="icon" className="h-8 w-8" asChild title="Ver job">
                      <Link href={`/jobs/${session.jobs.id}`}>
                        <ExternalLink className="h-4 w-4" aria-hidden="true" />
                      </Link>
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

// ─── Aba: Comunicacoes (placeholder) ─────────────────────────────────────────

function CommunicationsTab() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
      <div className="rounded-full bg-amber-500/10 p-4">
        <MessageSquare className="h-10 w-10 text-amber-500" aria-hidden="true" />
      </div>
      <div>
        <p className="text-lg font-semibold">Em breve: Historico de Comunicacao</p>
        <p className="text-sm text-muted-foreground mt-1 max-w-sm">
          Centralizar todo o historico de comunicacao com clientes e agencias — emails,
          WhatsApp, aprovacoes e anotacoes — em uma unica linha do tempo por job.
        </p>
      </div>
    </div>
  )
}

// ─── Pagina Principal ────────────────────────────────────────────────────────

export default function AtendimentoPage() {
  const { jobs, kpis, isLoading, isError, refetch } = useAtendimentoJobs()

  // Busca sessoes ativas do portal para a aba de aprovacoes
  const {
    data: sessions,
    isLoading: isSessionsLoading,
    isError: isSessionsError,
    refetch: refetchSessions,
  } = usePortalSessions()

  const activeSessions = (sessions ?? []).filter((s: PortalSession) => s.is_active)

  function handleRefetchAll() {
    refetch()
    refetchSessions()
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Cabecalho */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <Headset className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
            Atendimento
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Central de acompanhamento de jobs, aprovacoes e comunicacao com clientes.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefetchAll} className="shrink-0">
          <RefreshCw className="size-3.5 mr-1.5" />
          Atualizar
        </Button>
      </div>

      {/* Banner de erro */}
      {(isError || isSessionsError) && (
        <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 dark:border-red-800 dark:bg-red-950/30">
          <AlertTriangle className="size-4 shrink-0 text-red-500" />
          <p className="flex-1 text-sm text-red-700 dark:text-red-400">
            Nao foi possivel carregar todos os dados. Tente novamente.
          </p>
          <Button variant="outline" size="sm" onClick={handleRefetchAll} className="shrink-0 h-8">
            <RefreshCw className="size-3.5 mr-1.5" />
            Tentar novamente
          </Button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard
          title="Jobs que acompanho"
          value={kpis.activeJobsCount}
          description="jobs ativos no seu radar"
          icon={<Clapperboard className="h-4 w-4" />}
          highlight="neutral"
          isLoading={isLoading}
        />
        <KpiCard
          title="Aprovacoes pendentes"
          value={kpis.pendingApprovalCount}
          description="aguardando aprovacao do cliente"
          icon={<Clock className="h-4 w-4" />}
          highlight={kpis.pendingApprovalCount > 0 ? 'warn' : 'neutral'}
          isLoading={isLoading}
        />
        <KpiCard
          title="Entregas proximas"
          value={kpis.upcomingDeliveriesCount}
          description="nos proximos 7 dias"
          icon={<ClipboardCheck className="h-4 w-4" />}
          highlight={kpis.upcomingDeliveriesCount > 0 ? 'warn' : 'neutral'}
          isLoading={isLoading}
        />
        <KpiCard
          title="Sem aprovacao interna"
          value={kpis.noInternalApprovalCount}
          description="jobs em producao sem aprovacao interna"
          icon={<AlertTriangle className="h-4 w-4" />}
          highlight={kpis.noInternalApprovalCount > 0 ? 'alert' : 'neutral'}
          isLoading={isLoading}
        />
      </div>

      {/* Abas */}
      <Tabs defaultValue="meus-jobs">
        <TabsList>
          <TabsTrigger value="meus-jobs">
            Meus Jobs
            {!isLoading && kpis.activeJobsCount > 0 && (
              <span className="ml-1.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                {kpis.activeJobsCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="aprovacoes-pendentes">
            Aprovacoes Pendentes
            {!isSessionsLoading && activeSessions.length > 0 && (
              <span className="ml-1.5 rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                {activeSessions.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="comunicacoes">Comunicacoes</TabsTrigger>
        </TabsList>

        <TabsContent value="meus-jobs" className="mt-4">
          <MyJobsTab
            jobs={jobs}
            isLoading={isLoading}
            isError={isError}
            onRefetch={refetch}
          />
        </TabsContent>

        <TabsContent value="aprovacoes-pendentes" className="mt-4">
          <PendingApprovalsTab
            sessions={activeSessions}
            isLoading={isSessionsLoading}
            isError={isSessionsError}
            onRefetch={refetchSessions}
          />
        </TabsContent>

        <TabsContent value="comunicacoes" className="mt-4">
          <CommunicationsTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
