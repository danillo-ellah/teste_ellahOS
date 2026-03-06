'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Building2,
  User,
  Mail,
  Phone,
  Calendar,
  DollarSign,
  Tag,
  Shield,
  Briefcase,
  ExternalLink,
  Pencil,
  ChevronRight,
  Plus,
  Loader2,
  FileText,
  Bell,
  Users,
  FileCheck,
  MessageCircle,
  ChevronDown,
  Pause,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { formatCurrency, formatDate, isOverdue, daysUntil } from '@/lib/format'
import {
  useOpportunityActivities,
  useAddActivity,
  useUpdateOpportunity,
  useConvertToJob,
  type OpportunityDetail,
  type OpportunityActivity,
  type AddActivityPayload,
  type OpportunityStage,
} from '@/hooks/useCrm'
import { safeErrorMessage } from '@/lib/api'
import { STAGE_CONFIG } from './CrmKanban'
import { ProposalSection } from './ProposalSection'
import { AgencyHistoryPanel } from './AgencyHistoryPanel'
import { OpportunityDialog } from './OpportunityDialog'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { useUserRole } from '@/hooks/useUserRole'

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

const NEXT_STAGE: Partial<Record<OpportunityStage, OpportunityStage>> = {
  lead: 'qualificado',
  qualificado: 'proposta',
  proposta: 'negociacao',
  negociacao: 'fechamento',
  fechamento: 'ganho',
  pausado: 'qualificado',
}

const LOSS_CATEGORY_OPTIONS: { value: string; label: string }[] = [
  { value: 'preco', label: 'Preco' },
  { value: 'diretor', label: 'Diretor' },
  { value: 'prazo', label: 'Prazo' },
  { value: 'escopo', label: 'Escopo' },
  { value: 'relacionamento', label: 'Relacionamento' },
  { value: 'outro', label: 'Outro' },
]

const LOSS_CATEGORY_LABEL: Record<string, string> = {
  preco: 'Preco',
  diretor: 'Diretor',
  prazo: 'Prazo',
  escopo: 'Escopo',
  relacionamento: 'Relacionamento',
  outro: 'Outro',
}

const ACTIVITY_TYPE_OPTIONS: { value: AddActivityPayload['activity_type']; label: string }[] = [
  { value: 'note', label: 'Anotacao' },
  { value: 'call', label: 'Ligacao' },
  { value: 'email', label: 'E-mail' },
  { value: 'meeting', label: 'Reuniao' },
  { value: 'follow_up', label: 'Follow-up' },
]

const ACTIVITY_TYPE_ICON: Record<string, React.ReactNode> = {
  note: <FileText className="size-3.5" />,
  call: <Phone className="size-3.5" />,
  email: <Mail className="size-3.5" />,
  meeting: <Users className="size-3.5" />,
  proposal: <FileCheck className="size-3.5" />,
  follow_up: <Bell className="size-3.5" />,
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface OpportunityFullDetailProps {
  opportunity: OpportunityDetail
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

export function OpportunityFullDetail({ opportunity }: OpportunityFullDetailProps) {
  const router = useRouter()
  const { role } = useUserRole()
  const canConvert = role === 'admin' || role === 'ceo' || role === 'produtor_executivo'

  const [editOpen, setEditOpen] = useState(false)
  const [activityType, setActivityType] = useState<AddActivityPayload['activity_type']>('note')
  const [activityText, setActivityText] = useState('')
  const [lossOpen, setLossOpen] = useState(false)
  const [lossCategory, setLossCategory] = useState<'preco' | 'diretor' | 'prazo' | 'escopo' | 'relacionamento' | 'outro' | ''>('')
  const [lossReason, setLossReason] = useState('')
  const [winnerCompetitor, setWinnerCompetitor] = useState('')
  const [winnerValue, setWinnerValue] = useState('')
  const [winReason, setWinReason] = useState('')
  const [winFormOpen, setWinFormOpen] = useState(false)
  const [convertOpen, setConvertOpen] = useState(false)

  const { data: activities } = useOpportunityActivities(opportunity.id)
  const addActivityMutation = useAddActivity(opportunity.id)
  const updateMutation = useUpdateOpportunity(opportunity.id)
  const convertMutation = useConvertToJob(opportunity.id)

  const config = STAGE_CONFIG[opportunity.stage]
  const nextStage = NEXT_STAGE[opportunity.stage]
  const isActive =
    opportunity.stage !== 'ganho' &&
    opportunity.stage !== 'perdido' &&
    opportunity.stage !== 'pausado'

  async function handleAddActivity() {
    const text = activityText.trim()
    if (!text) return
    try {
      await addActivityMutation.mutateAsync({ activity_type: activityType, description: text })
      setActivityText('')
      toast.success('Atividade registrada')
    } catch (err) {
      toast.error(safeErrorMessage(err as Error))
    }
  }

  async function handleMoveStage() {
    if (!nextStage) return
    try {
      await updateMutation.mutateAsync({ stage: nextStage })
      toast.success(`Movido para ${STAGE_CONFIG[nextStage].label}`)
    } catch (err) {
      toast.error(safeErrorMessage(err as Error))
    }
  }

  async function handlePause() {
    try {
      await updateMutation.mutateAsync({ stage: 'pausado' })
      toast.success('Oportunidade pausada')
    } catch (err) {
      toast.error(safeErrorMessage(err as Error))
    }
  }

  async function handleMarkLost() {
    if (!lossCategory) {
      toast.error('Selecione o motivo principal da perda')
      return
    }
    try {
      await updateMutation.mutateAsync({
        stage: 'perdido',
        loss_category: lossCategory,
        loss_reason: lossReason.trim() || null,
        winner_competitor: winnerCompetitor.trim() || null,
        winner_value: winnerValue ? parseFloat(winnerValue) : null,
      })
      toast.success('Oportunidade marcada como perdida')
      setLossCategory('')
      setLossReason('')
      setWinnerCompetitor('')
      setWinnerValue('')
      setLossOpen(false)
    } catch (err) {
      toast.error(safeErrorMessage(err as Error))
    }
  }

  async function handleMarkWon() {
    try {
      await updateMutation.mutateAsync({
        stage: 'ganho',
        win_reason: winReason.trim() || null,
      })
      toast.success('Oportunidade marcada como ganha')
      setWinReason('')
      setWinFormOpen(false)
    } catch (err) {
      toast.error(safeErrorMessage(err as Error))
    }
  }

  async function handleConvertToJob() {
    try {
      const result = await convertMutation.mutateAsync({
        job_title: opportunity.title,
        project_type: opportunity.project_type ?? undefined,
        client_id: opportunity.client_id ?? undefined,
        agency_id: opportunity.agency_id ?? undefined,
        closed_value: opportunity.estimated_value ?? undefined,
        description: opportunity.notes ?? undefined,
        deliverable_format: opportunity.deliverable_format ?? undefined,
        campaign_period: opportunity.campaign_period ?? undefined,
      })
      toast.success(`Job "${result.data.job.title}" criado com sucesso`)
      setConvertOpen(false)
      router.push(`/jobs/${result.data.job.id}`)
    } catch (err) {
      toast.error(safeErrorMessage(err as Error))
    }
  }

  // WhatsApp link
  const contactPhone = opportunity.contacts?.phone
  const whatsappHref = contactPhone
    ? `https://wa.me/55${contactPhone.replace(/\D/g, '')}`
    : null

  // Indicador de temperatura
  const probability = opportunity.probability ?? 0
  const heat =
    probability >= 70
      ? { label: 'Quente', class: 'text-emerald-600 dark:text-emerald-400', dot: 'bg-emerald-500' }
      : probability >= 40
        ? { label: 'Morno', class: 'text-amber-600 dark:text-amber-400', dot: 'bg-amber-500' }
        : { label: 'Frio', class: 'text-blue-600 dark:text-blue-400', dot: 'bg-blue-500' }

  // Prazo de retorno
  const deadlineOverdue = isOverdue(opportunity.response_deadline)
  const deadlineDays = daysUntil(opportunity.response_deadline)

  const allActivities = activities ?? opportunity.recent_activities ?? []

  return (
    <>
      {/* Titulo da oportunidade */}
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-semibold leading-snug">{opportunity.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge className={cn('text-xs', config.badgeClass)}>{config.label}</Badge>
            <span className={cn('inline-flex items-center gap-1 text-sm font-medium', heat.class)}>
              <span className={cn('inline-block size-2 rounded-full', heat.dot)} />
              {heat.label}
            </span>
            {opportunity.probability != null && (
              <span className="text-sm text-muted-foreground">
                {opportunity.probability}% probabilidade
              </span>
            )}
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 shrink-0"
          onClick={() => setEditOpen(true)}
        >
          <Pencil className="size-3.5" />
          Editar
        </Button>
      </div>

      {/* Job vinculado */}
      {opportunity.jobs && (
        <div className="flex items-center gap-2 rounded-lg border bg-emerald-500/5 px-3 py-2 text-sm">
          <Briefcase className="size-4 text-emerald-600 shrink-0" />
          <span className="text-muted-foreground">Job criado:</span>
          <button
            onClick={() => router.push(`/jobs/${opportunity.jobs!.id}`)}
            className="font-medium text-emerald-700 hover:underline dark:text-emerald-400 flex items-center gap-1"
          >
            {opportunity.jobs.title}
            {opportunity.jobs.code && (
              <span className="text-xs text-muted-foreground font-mono">
                ({opportunity.jobs.code})
              </span>
            )}
            <ExternalLink className="size-3" />
          </button>
        </div>
      )}

      {/* Analise de perda */}
      {opportunity.stage === 'perdido' && (opportunity.loss_category || opportunity.loss_reason) && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 space-y-2">
          <p className="text-xs font-semibold text-destructive uppercase tracking-wide">Analise da perda</p>
          <div className="flex flex-wrap gap-2 items-start">
            {opportunity.loss_category && (
              <span className="inline-flex items-center rounded-full bg-destructive/15 px-2.5 py-0.5 text-xs font-semibold text-destructive capitalize">
                {LOSS_CATEGORY_LABEL[opportunity.loss_category]}
              </span>
            )}
            {opportunity.winner_competitor && (
              <span className="text-xs text-muted-foreground">
                Concorrente: <span className="font-medium text-foreground">{opportunity.winner_competitor}</span>
              </span>
            )}
            {opportunity.winner_value != null && (
              <span className="text-xs text-muted-foreground">
                Valor concorrente: <span className="font-medium text-foreground tabular-nums">{formatCurrency(opportunity.winner_value)}</span>
              </span>
            )}
          </div>
          {opportunity.loss_reason && (
            <p className="text-sm text-destructive/80">{opportunity.loss_reason}</p>
          )}
        </div>
      )}

      {/* Analise de ganho */}
      {opportunity.stage === 'ganho' && opportunity.win_reason && (
        <div className="rounded-lg border border-emerald-300/50 bg-emerald-500/5 p-3 space-y-1">
          <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">Por que ganhamos</p>
          <p className="text-sm text-emerald-800 dark:text-emerald-300">{opportunity.win_reason}</p>
        </div>
      )}

      {/* Layout 3 colunas */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* ================================================================
            COLUNA ESQUERDA — Info
            ================================================================ */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Informacoes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Agencia */}
              {opportunity.agencies?.name && (
                <InfoRow
                  icon={<Building2 className="size-4 text-muted-foreground" />}
                  label="Agencia"
                  value={opportunity.agencies.name}
                />
              )}

              {/* Cliente */}
              {opportunity.clients?.name && (
                <InfoRow
                  label="Cliente"
                  value={opportunity.clients.name}
                />
              )}

              {/* Contato */}
              {opportunity.contacts?.full_name && (
                <>
                  <InfoRow
                    icon={<User className="size-4 text-muted-foreground" />}
                    label="Contato"
                    value={opportunity.contacts.full_name}
                  />
                  {opportunity.contacts.phone && (
                    <InfoRow
                      icon={<Phone className="size-4 text-muted-foreground" />}
                      label="Telefone"
                      value={opportunity.contacts.phone}
                    />
                  )}
                  {opportunity.contacts.email && (
                    <InfoRow
                      icon={<Mail className="size-4 text-muted-foreground" />}
                      label="E-mail"
                      value={opportunity.contacts.email}
                    />
                  )}
                </>
              )}

              <Separator />

              {/* Tipo de producao */}
              {opportunity.project_type && (
                <InfoRow
                  icon={<Tag className="size-4 text-muted-foreground" />}
                  label="Tipo de producao"
                  value={opportunity.project_type}
                />
              )}

              {/* Formato entregavel */}
              {opportunity.deliverable_format && (
                <InfoRow
                  label="Formato entregavel"
                  value={opportunity.deliverable_format}
                />
              )}

              {/* Periodo da campanha */}
              {opportunity.campaign_period && (
                <InfoRow
                  icon={<Calendar className="size-4 text-muted-foreground" />}
                  label="Periodo da campanha"
                  value={opportunity.campaign_period}
                />
              )}

              <Separator />

              {/* Valor estimado */}
              {opportunity.estimated_value != null && (
                <InfoRow
                  icon={<DollarSign className="size-4 text-emerald-500" />}
                  label="Valor estimado"
                  value={formatCurrency(opportunity.estimated_value)}
                  valueClass="font-semibold tabular-nums"
                />
              )}

              {/* Budget do cliente */}
              {opportunity.client_budget != null && (
                <InfoRow
                  icon={<DollarSign className="size-4 text-muted-foreground" />}
                  label="Budget cliente"
                  value={formatCurrency(opportunity.client_budget)}
                  valueClass="tabular-nums"
                />
              )}

              <Separator />

              {/* Prazo de retorno */}
              {opportunity.response_deadline && (
                <InfoRow
                  icon={<Calendar className="size-4 text-amber-500" />}
                  label="Prazo de retorno"
                  value={formatDate(opportunity.response_deadline)}
                  valueClass={cn(
                    deadlineOverdue
                      ? 'text-destructive font-medium'
                      : deadlineDays !== null && deadlineDays <= 3
                        ? 'text-amber-600 dark:text-amber-400 font-medium'
                        : '',
                  )}
                  suffix={
                    deadlineOverdue
                      ? 'vencido'
                      : deadlineDays !== null && deadlineDays >= 0 && deadlineDays <= 3
                        ? `em ${deadlineDays === 0 ? 'hoje' : `${deadlineDays}d`}`
                        : undefined
                  }
                />
              )}

              {/* Data prevista de fechamento */}
              {opportunity.expected_close_date && (
                <InfoRow
                  icon={<Calendar className="size-4 text-blue-500" />}
                  label="Fechamento previsto"
                  value={formatDate(opportunity.expected_close_date)}
                />
              )}

              <Separator />

              {/* PE Responsavel */}
              {opportunity.assigned_profile?.full_name && (
                <InfoRow
                  icon={<User className="size-4 text-muted-foreground" />}
                  label="PE Responsavel"
                  value={opportunity.assigned_profile.full_name}
                />
              )}

              {/* Origem */}
              {opportunity.source && (
                <InfoRow
                  label="Origem"
                  value={opportunity.source.replace(/_/g, ' ')}
                  valueClass="capitalize"
                />
              )}
            </CardContent>
          </Card>

          {/* Notas */}
          {opportunity.notes && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Notas</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {opportunity.notes}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* ================================================================
            COLUNA CENTRAL — Propostas + Timeline
            ================================================================ */}
        <div className="space-y-6">
          {/* Propostas */}
          <Card>
            <CardContent className="pt-5">
              <ProposalSection
                opportunityId={opportunity.id}
                proposals={opportunity.proposals}
                jobId={opportunity.job_id}
              />
            </CardContent>
          </Card>

          {/* Timeline de atividades */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Atividades</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Formulario de adicao */}
              <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
                <div className="flex gap-2">
                  <Select
                    value={activityType}
                    onValueChange={(v) => setActivityType(v as AddActivityPayload['activity_type'])}
                  >
                    <SelectTrigger className="h-8 w-36 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ACTIVITY_TYPE_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value} className="text-xs">
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <div className="flex flex-1 gap-2">
                    <Textarea
                      rows={1}
                      className="min-h-8 resize-none text-xs"
                      placeholder="Registrar atividade..."
                      value={activityText}
                      onChange={(e) => setActivityText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          handleAddActivity()
                        }
                      }}
                    />
                    <Button
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={handleAddActivity}
                      disabled={addActivityMutation.isPending || !activityText.trim()}
                    >
                      {addActivityMutation.isPending ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Plus className="size-3.5" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Lista completa sem limite de altura */}
              <div className="space-y-2">
                {allActivities.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Nenhuma atividade registrada.
                  </p>
                ) : (
                  allActivities.map((activity) => (
                    <ActivityItem key={activity.id} activity={activity} />
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ================================================================
            COLUNA DIREITA — Historico agencia + Accoes
            ================================================================ */}
        <div className="space-y-4">
          {/* Historico da agencia */}
          <AgencyHistoryPanel
            agencyId={opportunity.agency_id}
            agencyName={opportunity.agencies?.name}
          />

          {/* Concorrencia */}
          {opportunity.is_competitive_bid && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold text-amber-600 dark:text-amber-400">
                  <Shield className="size-4" />
                  Concorrencia
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {opportunity.competitor_count && opportunity.competitor_count > 0
                    ? `Concorrencia entre ${opportunity.competitor_count} produtoras`
                    : 'Licitacao concorrente'}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Acoes */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Acoes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {/* WhatsApp */}
              {whatsappHref && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-2 text-emerald-600 border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 dark:border-emerald-800 dark:hover:bg-emerald-950"
                  asChild
                >
                  <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
                    <MessageCircle className="size-4" />
                    Abrir WhatsApp
                  </a>
                </Button>
              )}

              {/* Mover para proximo stage */}
              {isActive && nextStage && (
                <Button
                  size="sm"
                  className="w-full gap-1.5"
                  onClick={handleMoveStage}
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <ChevronRight className="size-3.5" />
                  )}
                  Mover para {STAGE_CONFIG[nextStage].label}
                </Button>
              )}

              {/* Converter em Job */}
              {canConvert &&
                opportunity.stage !== 'perdido' &&
                opportunity.stage !== 'ganho' &&
                !opportunity.job_id && (
                  <Button
                    size="sm"
                    variant="default"
                    className="w-full gap-1.5 bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => setConvertOpen(true)}
                  >
                    <Briefcase className="size-3.5" />
                    Converter em Job
                  </Button>
                )}

              {/* Pausar */}
              {isActive && (
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full gap-1.5"
                  onClick={handlePause}
                  disabled={updateMutation.isPending}
                >
                  <Pause className="size-3.5" />
                  Pausar
                </Button>
              )}

              {/* Marcar como ganho com motivo (apenas concorrencia) */}
              {opportunity.stage === 'fechamento' && opportunity.is_competitive_bid && !opportunity.job_id && (
                <div className="space-y-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="w-full gap-1.5 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950"
                    onClick={() => setWinFormOpen((v) => !v)}
                  >
                    <ChevronDown
                      className={cn('size-3.5 transition-transform', winFormOpen && 'rotate-180')}
                    />
                    Registrar vitoria
                  </Button>

                  {winFormOpen && (
                    <div className="space-y-2 rounded-lg border border-emerald-300/50 bg-emerald-500/5 p-3">
                      <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                        O que fez a diferenca?
                      </p>
                      <Input
                        placeholder="Ex: Preco, relacionamento, diretor..."
                        className="h-8 text-xs"
                        value={winReason}
                        onChange={(e) => setWinReason(e.target.value)}
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="flex-1 h-7 text-xs bg-emerald-600 hover:bg-emerald-700"
                          onClick={handleMarkWon}
                          disabled={updateMutation.isPending}
                        >
                          Confirmar vitoria
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs"
                          onClick={() => setWinFormOpen(false)}
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Perdemos (dropdown para confirmar com motivo expandido) */}
              {opportunity.stage !== 'perdido' && opportunity.stage !== 'ganho' && (
                <div className="space-y-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="w-full gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => setLossOpen((v) => !v)}
                  >
                    <ChevronDown
                      className={cn('size-3.5 transition-transform', lossOpen && 'rotate-180')}
                    />
                    Perdemos
                  </Button>

                  {lossOpen && (
                    <div className="space-y-2.5 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                      <p className="text-xs text-destructive font-medium">Analise da perda:</p>

                      <div className="space-y-1.5">
                        <label className="text-[11px] text-muted-foreground">Motivo principal *</label>
                        <Select
                          value={lossCategory}
                          onValueChange={(v) => setLossCategory(v as typeof lossCategory)}
                        >
                          <SelectTrigger className="h-8 text-xs border-destructive/30">
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                          <SelectContent>
                            {LOSS_CATEGORY_OPTIONS.map((o) => (
                              <SelectItem key={o.value} value={o.value} className="text-xs">
                                {o.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[11px] text-muted-foreground">Concorrente vencedor</label>
                        <Input
                          placeholder="Ex: Paranoid, O2 Filmes"
                          className="h-8 text-xs border-destructive/30"
                          value={winnerCompetitor}
                          onChange={(e) => setWinnerCompetitor(e.target.value)}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[11px] text-muted-foreground">Valor do concorrente</label>
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-muted-foreground px-2 h-8 flex items-center border border-r-0 rounded-l-md bg-muted/50 border-destructive/30">R$</span>
                          <Input
                            type="number"
                            min={0}
                            step={0.01}
                            placeholder="0,00"
                            className="h-8 text-xs border-destructive/30 rounded-l-none"
                            value={winnerValue}
                            onChange={(e) => setWinnerValue(e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[11px] text-muted-foreground">Detalhes</label>
                        <Textarea
                          rows={2}
                          className="text-xs resize-none border-destructive/30"
                          placeholder="Conte o que aconteceu..."
                          value={lossReason}
                          onChange={(e) => setLossReason(e.target.value)}
                        />
                      </div>

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="destructive"
                          className="flex-1 h-7 text-xs"
                          onClick={handleMarkLost}
                          disabled={updateMutation.isPending || !lossCategory}
                        >
                          Confirmar perda
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs"
                          onClick={() => setLossOpen(false)}
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dialog de edicao */}
      <OpportunityDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        mode="edit"
        opportunity={opportunity}
      />

      {/* Confirmacao de conversao em job */}
      <ConfirmDialog
        open={convertOpen}
        onOpenChange={setConvertOpen}
        title="Converter em Job"
        description={`Criar job "${opportunity.title}" a partir desta oportunidade?\n\nSerao copiados: titulo, cliente/agencia, tipo de projeto${opportunity.estimated_value ? `, valor estimado (${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(opportunity.estimated_value)})` : ''}, observacoes e formato de entrega.\n\nA oportunidade sera marcada como "ganho".`}
        confirmLabel="Criar Job"
        onConfirm={handleConvertToJob}
        isPending={convertMutation.isPending}
      />
    </>
  )
}

// ---------------------------------------------------------------------------
// Sub-componentes
// ---------------------------------------------------------------------------

function InfoRow({
  icon,
  label,
  value,
  valueClass,
  suffix,
}: {
  icon?: React.ReactNode
  label: string
  value: string
  valueClass?: string
  suffix?: string
}) {
  return (
    <div className="flex items-start gap-2">
      {icon && <div className="mt-0.5 shrink-0">{icon}</div>}
      <div className={cn('flex-1 min-w-0', !icon && 'pl-6')}>
        <p className="text-[11px] text-muted-foreground uppercase tracking-wide">{label}</p>
        <p className={cn('text-sm mt-0.5', valueClass)}>
          {value}
          {suffix && (
            <span className="ml-1.5 text-xs font-medium opacity-80">{suffix}</span>
          )}
        </p>
      </div>
    </div>
  )
}

function ActivityItem({ activity }: { activity: OpportunityActivity }) {
  function formatActivityDate(dateStr: string) {
    try {
      return new Date(dateStr).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return dateStr
    }
  }

  const icon = ACTIVITY_TYPE_ICON[activity.activity_type]

  return (
    <div className="flex gap-2.5">
      <div className="flex-none pt-0.5 text-muted-foreground">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-xs leading-snug">{activity.description}</p>
        <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
          {activity.created_by_profile?.full_name && (
            <span>{activity.created_by_profile.full_name}</span>
          )}
          {activity.created_by_profile?.full_name && <span>·</span>}
          <span>{formatActivityDate(activity.created_at)}</span>
        </div>
      </div>
    </div>
  )
}
