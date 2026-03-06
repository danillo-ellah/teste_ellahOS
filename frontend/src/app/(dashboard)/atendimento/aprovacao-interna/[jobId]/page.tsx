'use client'

import { use } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Printer,
  AlertCircle,
  Headset,
  Building2,
  Briefcase,
  Users,
  Calendar,
  Package,
  DollarSign,
  FileText,
  Clock,
  Info,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { formatDate, formatCurrency, formatIndustryDuration } from '@/lib/format'
import {
  JOB_STATUS_LABELS,
  JOB_STATUS_COLORS,
  PROJECT_TYPE_LABELS,
  TEAM_ROLE_LABELS,
  DELIVERABLE_STATUS_LABELS,
} from '@/lib/constants'
import { useJob } from '@/hooks/useJob'
import { useUserRole } from '@/hooks/useUserRole'
import { FINANCIAL_VIEW_ROLES } from '@/lib/access-control-map'
import type { JobTeamMember, JobDeliverable, JobShootingDate } from '@/types/jobs'

// ─── Props ────────────────────────────────────────────────────────────────────

interface PageProps {
  params: Promise<{ jobId: string }>
}

// ─── Skeleton de carregamento ─────────────────────────────────────────────────

function ApprovalDocSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-9 w-28" />
      </div>
      <Skeleton className="h-24 w-full" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
      <Skeleton className="h-48 w-full" />
      <Skeleton className="h-32 w-full" />
    </div>
  )
}

// ─── Secao com titulo e icone ─────────────────────────────────────────────────

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode
  title: string
  children: React.ReactNode
}) {
  return (
    <Card className="print:shadow-none print:border-none">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2 text-muted-foreground uppercase tracking-wide">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

// ─── Campo de informacao ──────────────────────────────────────────────────────

function InfoField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value ?? '-'}</p>
    </div>
  )
}

// ─── Linha de separacao para impressao ───────────────────────────────────────

function PrintDivider() {
  return <Separator className="my-0 print:my-2" />
}

// ─── Pagina ───────────────────────────────────────────────────────────────────

export default function AprovacaoInternaPage({ params }: PageProps) {
  const { jobId } = use(params)

  const { data: job, isLoading, isError, error } = useJob(jobId, {
    include: ['team', 'deliverables', 'shooting_dates'],
  })
  const { role } = useUserRole()

  // Verifica se o usuario pode ver dados financeiros
  const canViewFinancial = role !== null && FINANCIAL_VIEW_ROLES.includes(role)

  // Data de geracao do documento
  const generatedAt = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })

  function handlePrint() {
    window.print()
  }

  // ─── Loading ───────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="space-y-6 pb-12">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/atendimento">
              <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
            </Link>
          </Button>
        </div>
        <ApprovalDocSkeleton />
      </div>
    )
  }

  // ─── Erro ──────────────────────────────────────────────────────────────────

  if (isError || !job) {
    const isNotFound = error?.message?.includes('404') || error?.message?.includes('nao encontrado')
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
        <AlertCircle className="h-12 w-12 text-destructive" aria-hidden="true" />
        <p className="text-lg font-semibold">
          {isNotFound ? 'Job nao encontrado' : 'Erro ao carregar o job'}
        </p>
        <p className="text-sm text-muted-foreground max-w-sm">
          {isNotFound
            ? 'O job solicitado nao existe ou voce nao tem permissao para acessar.'
            : 'Nao foi possivel carregar os dados do job. Tente novamente.'}
        </p>
        <Button variant="outline" size="sm" asChild>
          <Link href="/atendimento">
            <ArrowLeft className="h-4 w-4 mr-1" /> Voltar ao Atendimento
          </Link>
        </Button>
      </div>
    )
  }

  // ─── Dados derivados ───────────────────────────────────────────────────────

  const statusLabel = JOB_STATUS_LABELS[job.status] ?? job.status
  const statusColor = JOB_STATUS_COLORS[job.status] ?? '#6B7280'
  const projectTypeLabel = PROJECT_TYPE_LABELS[job.job_type] ?? job.job_type

  // Diretor e PE da equipe
  // Nota: 'atendimento' e 'coordenador_producao' sao novos valores do enum (migration G-04)
  // que ainda nao constam no tipo TeamRole gerado — usamos cast para string
  const director = job.team?.find((m: JobTeamMember) => m.role === 'diretor')
  const producerExecutive = job.team?.find((m: JobTeamMember) => (m.role as string) === 'produtor_executivo')
  const coordinator = job.team?.find((m: JobTeamMember) => (m.role as string) === 'coordenador_producao')
  const atendimentoMember = job.team?.find((m: JobTeamMember) => (m.role as string) === 'atendimento')

  // Equipe principal (roles relevantes para o documento)
  const mainTeamRoles = new Set(['diretor', 'produtor_executivo', 'coordenador_producao', 'atendimento', 'dop'])
  const mainTeam = (job.team ?? []).filter((m: JobTeamMember) =>
    mainTeamRoles.has(m.role as string),
  )

  // Entregaveis agrupados
  const deliverables = job.deliverables ?? []

  // Datas de filmagem ordenadas
  const shootingDates = [...(job.shooting_dates ?? [])].sort(
    (a: JobShootingDate, b: JobShootingDate) =>
      new Date(a.shooting_date).getTime() - new Date(b.shooting_date).getTime(),
  )

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 pb-12 max-w-4xl mx-auto print:max-w-full print:mx-0">
      {/* Cabecalho da pagina — oculto na impressao */}
      <div className="flex items-center justify-between print:hidden">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/atendimento">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Voltar ao Atendimento
          </Link>
        </Button>
        <Button variant="outline" size="sm" onClick={handlePrint}>
          <Printer className="h-4 w-4 mr-1.5" />
          Imprimir / PDF
        </Button>
      </div>

      {/* Timbrado / cabecalho do documento */}
      <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-6 dark:border-amber-500/20 dark:bg-amber-950/20 print:rounded-none print:bg-white print:border-b-2 print:border-b-black print:border-t-0 print:border-l-0 print:border-r-0">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Headset className="h-5 w-5 text-amber-600 dark:text-amber-400" aria-hidden="true" />
              <span className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                Documento de Aprovacao Interna
              </span>
            </div>
            <h1 className="text-2xl font-bold text-foreground leading-tight">
              {job.title}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground font-mono">{job.job_code}</p>
          </div>
          <div className="text-right shrink-0">
            <Badge
              variant="outline"
              className="text-xs font-semibold"
              style={{ borderColor: statusColor, color: statusColor }}
            >
              {statusLabel}
            </Badge>
            <p className="mt-2 text-xs text-muted-foreground">Gerado em {generatedAt}</p>
          </div>
        </div>
      </div>

      {/* Grid de informacoes principais */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Cliente e Agencia */}
        <Section icon={<Building2 className="h-4 w-4" />} title="Cliente e Agencia">
          <div className="space-y-4">
            <InfoField label="Cliente" value={job.clients?.name} />
            <PrintDivider />
            <InfoField label="Agencia" value={job.agencies?.name ?? 'Sem agencia'} />
            {job.brand && (
              <>
                <PrintDivider />
                <InfoField label="Marca / Produto" value={job.brand} />
              </>
            )}
          </div>
        </Section>

        {/* Projeto */}
        <Section icon={<FileText className="h-4 w-4" />} title="Dados do Projeto">
          <div className="space-y-4">
            <InfoField label="Tipo de Projeto" value={projectTypeLabel} />
            <PrintDivider />
            <InfoField
              label="Status Atual"
              value={
                <span style={{ color: statusColor }} className="font-semibold">
                  {statusLabel}
                </span>
              }
            />
            <PrintDivider />
            <InfoField
              label="Aprovado em"
              value={job.approved_at ? formatDate(job.approved_at) : 'Nao aprovado'}
            />
            {job.approved_by_name && (
              <>
                <PrintDivider />
                <InfoField label="Aprovado por" value={job.approved_by_name} />
              </>
            )}
          </div>
        </Section>
      </div>

      {/* Equipe Principal */}
      <Section icon={<Users className="h-4 w-4" />} title="Equipe Principal">
        {mainTeam.length === 0 ? (
          <p className="text-sm text-muted-foreground">Equipe ainda nao definida.</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
            {mainTeam.map((member: JobTeamMember) => {
              const roleLabel =
                TEAM_ROLE_LABELS[member.role as keyof typeof TEAM_ROLE_LABELS] ?? member.role
              return (
                <div
                  key={member.id}
                  className="rounded-md border border-border px-3 py-2 space-y-0.5"
                >
                  <p className="text-xs text-muted-foreground">{roleLabel}</p>
                  <p className="text-sm font-medium">{member.person_name ?? '-'}</p>
                  {member.is_lead_producer && (
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
                      Produtor Responsavel
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        )}
        {/* Resumo de responsaveis chave */}
        {(director || producerExecutive || coordinator || atendimentoMember) && (
          <div className="mt-4 pt-4 border-t border-border grid grid-cols-2 gap-3 sm:grid-cols-4">
            <InfoField label="Diretor(a)" value={director?.person_name} />
            <InfoField label="PE" value={producerExecutive?.person_name} />
            <InfoField label="Coordenador(a)" value={coordinator?.person_name} />
            <InfoField label="Atendimento" value={atendimentoMember?.person_name} />
          </div>
        )}
      </Section>

      {/* Datas de Filmagem */}
      {shootingDates.length > 0 && (
        <Section icon={<Calendar className="h-4 w-4" />} title="Datas de Filmagem">
          <div className="space-y-2">
            {shootingDates.map((date: JobShootingDate, idx: number) => (
              <div
                key={date.id}
                className={cn(
                  'flex items-start gap-3 rounded-md px-3 py-2',
                  idx % 2 === 0 ? 'bg-muted/40' : '',
                )}
              >
                <div className="rounded bg-primary/10 px-2 py-1 text-xs font-mono font-semibold text-primary shrink-0">
                  {formatDate(date.shooting_date)}
                </div>
                <div className="min-w-0 flex-1">
                  {date.location && (
                    <p className="text-sm font-medium truncate">{date.location}</p>
                  )}
                  {date.description && (
                    <p className="text-xs text-muted-foreground">{date.description}</p>
                  )}
                  {(date.start_time || date.end_time) && (
                    <p className="text-xs text-muted-foreground">
                      {date.start_time ?? ''}
                      {date.start_time && date.end_time ? ' – ' : ''}
                      {date.end_time ?? ''}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Total: {shootingDates.length} {shootingDates.length === 1 ? 'diaria' : 'diarias'} de
            filmagem
          </p>
        </Section>
      )}

      {/* Prazos */}
      <Section icon={<Clock className="h-4 w-4" />} title="Prazos">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <InfoField label="Inicio Previsto" value={formatDate(job.expected_start_date)} />
          <InfoField label="Entrega Prevista" value={formatDate(job.expected_delivery_date)} />
          <InfoField label="Inicio Real" value={formatDate(job.actual_start_date)} />
          <InfoField label="Entrega Real" value={formatDate(job.actual_delivery_date)} />
        </div>
        {job.kickoff_ppm_date && (
          <div className="mt-4 pt-4 border-t border-border">
            <InfoField label="Kickoff / PPM" value={formatDate(job.kickoff_ppm_date)} />
          </div>
        )}
      </Section>

      {/* Entregaveis */}
      {deliverables.length > 0 && (
        <Section icon={<Package className="h-4 w-4" />} title="Entregaveis">
          <div className="space-y-2">
            {deliverables.map((d: JobDeliverable, idx: number) => {
              const statusLabel =
                DELIVERABLE_STATUS_LABELS[d.status as keyof typeof DELIVERABLE_STATUS_LABELS] ??
                d.status
              const statusColorClass = {
                pendente: 'text-zinc-500',
                em_producao: 'text-blue-600 dark:text-blue-400',
                aguardando_aprovacao: 'text-amber-600 dark:text-amber-400',
                aprovado: 'text-emerald-600 dark:text-emerald-400',
                entregue: 'text-cyan-600 dark:text-cyan-400',
              }[d.status] ?? 'text-zinc-500'

              return (
                <div
                  key={d.id}
                  className={cn(
                    'flex items-start gap-3 rounded-md px-3 py-2.5',
                    idx % 2 === 0 ? 'bg-muted/40' : '',
                  )}
                >
                  <span className="text-xs text-muted-foreground font-mono shrink-0 mt-0.5 w-5 text-right">
                    {d.display_order}.
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium">{d.description}</p>
                      <span className={cn('text-xs font-semibold shrink-0', statusColorClass)}>
                        {statusLabel}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-3 mt-1">
                      {d.format && (
                        <span className="text-xs text-muted-foreground">
                          Formato: {d.format}
                        </span>
                      )}
                      {d.resolution && (
                        <span className="text-xs text-muted-foreground">
                          Resolucao: {d.resolution}
                        </span>
                      )}
                      {d.duration_seconds != null && (
                        <span className="text-xs text-muted-foreground">
                          Duracao: {formatIndustryDuration(d.duration_seconds)}
                        </span>
                      )}
                      {d.delivery_date && (
                        <span className="text-xs text-muted-foreground">
                          Entrega: {formatDate(d.delivery_date)}
                        </span>
                      )}
                    </div>
                    {d.notes && (
                      <p className="mt-1 text-xs text-muted-foreground italic">{d.notes}</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Total: {deliverables.length}{' '}
            {deliverables.length === 1 ? 'entregavel' : 'entregaveis'}
          </p>
        </Section>
      )}

      {/* Financeiro — visivel apenas para roles autorizados */}
      {canViewFinancial && (
        <Section icon={<DollarSign className="h-4 w-4" />} title="Valor Fechado (Restrito)">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <InfoField
              label="Valor Fechado"
              value={
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                  {formatCurrency(job.closed_value)}
                </span>
              }
            />
            <InfoField label="Custo Producao" value={formatCurrency(job.production_cost)} />
            <InfoField label="Custo Outros" value={formatCurrency(job.other_costs)} />
            {job.margin_percentage != null && (
              <InfoField
                label="Margem"
                value={
                  <span
                    className={cn(
                      'font-semibold',
                      job.margin_percentage >= 30
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : job.margin_percentage >= 15
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-red-600 dark:text-red-400',
                    )}
                  >
                    {job.margin_percentage.toFixed(1)}%
                  </span>
                }
              />
            )}
            {job.tax_percentage != null && (
              <InfoField label="Impostos" value={`${job.tax_percentage}%`} />
            )}
            {job.agency_commission_percentage != null && (
              <InfoField
                label="Comissao Agencia"
                value={`${job.agency_commission_percentage}%`}
              />
            )}
          </div>
          <div className="mt-3 flex items-center gap-1.5 rounded-md bg-amber-50 dark:bg-amber-950/30 px-3 py-2 border border-amber-200 dark:border-amber-500/20">
            <Info className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
            <p className="text-xs text-amber-700 dark:text-amber-400">
              Dados financeiros restritos — nao incluir em documentos enviados ao cliente.
            </p>
          </div>
        </Section>
      )}

      {/* Briefing e Notas Internas */}
      {(job.briefing || job.internal_notes) && (
        <Section icon={<Info className="h-4 w-4" />} title="Briefing e Notas">
          {job.briefing && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium">Briefing</p>
              <p className="text-sm whitespace-pre-line leading-relaxed">{job.briefing}</p>
            </div>
          )}
          {job.briefing && job.internal_notes && (
            <Separator className="my-4" />
          )}
          {job.internal_notes && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium">Notas Internas</p>
              <p className="text-sm whitespace-pre-line leading-relaxed text-muted-foreground">
                {job.internal_notes}
              </p>
            </div>
          )}
        </Section>
      )}

      {/* Integracao Drive */}
      {job.drive_folder_url && (
        <Section icon={<Briefcase className="h-4 w-4" />} title="Recursos">
          <div className="space-y-2">
            <InfoField
              label="Pasta no Drive"
              value={
                <a
                  href={job.drive_folder_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline text-sm"
                >
                  Abrir pasta no Google Drive
                </a>
              }
            />
            {job.ppm_url && (
              <InfoField
                label="PPM"
                value={
                  <a
                    href={job.ppm_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline text-sm"
                  >
                    Abrir PPM
                  </a>
                }
              />
            )}
          </div>
        </Section>
      )}

      {/* Rodape do documento — visivel em impressao */}
      <div className="hidden print:block border-t border-gray-300 pt-4 mt-8">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>ELLAHOS — Documento de Aprovacao Interna</span>
          <span>{generatedAt}</span>
        </div>
        <p className="mt-1 text-[10px] text-gray-400">
          Documento gerado automaticamente. Use como referencia interna.
        </p>
      </div>
    </div>
  )
}
