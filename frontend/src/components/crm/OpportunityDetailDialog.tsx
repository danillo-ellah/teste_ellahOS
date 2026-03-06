'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import Link from 'next/link'
import {
  Pencil,
  Plus,
  ChevronRight,
  Calendar,
  DollarSign,
  Loader2,
  ExternalLink,
  Briefcase,
  Maximize2,
} from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import {
  useOpportunity,
  useOpportunityActivities,
  useAddActivity,
  useUpdateOpportunity,
  useConvertToJob,
  type OpportunityActivity,
  type AddActivityPayload,
  type OpportunityStage,
} from '@/hooks/useCrm'
import { safeErrorMessage } from '@/lib/api'
import { cn } from '@/lib/utils'
import { STAGE_CONFIG } from './CrmKanban'
import { OpportunityDialog } from './OpportunityDialog'
import { ProposalSection } from './ProposalSection'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { useUserRole } from '@/hooks/useUserRole'

const ACTIVITY_TYPE_OPTIONS: { value: AddActivityPayload['activity_type']; label: string }[] = [
  { value: 'note', label: 'Anotacao' },
  { value: 'call', label: 'Ligacao' },
  { value: 'email', label: 'E-mail' },
  { value: 'meeting', label: 'Reuniao' },
  { value: 'follow_up', label: 'Follow-up' },
]

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

const ACTIVITY_TYPE_ICON: Record<string, string> = {
  note: '📝',
  call: '📞',
  email: '✉️',
  meeting: '🤝',
  proposal: '📄',
  follow_up: '🔔',
}

const NEXT_STAGE: Partial<Record<OpportunityStage, OpportunityStage>> = {
  lead: 'qualificado',
  qualificado: 'proposta',
  proposta: 'negociacao',
  negociacao: 'fechamento',
  fechamento: 'ganho',
  pausado: 'qualificado',
}

interface OpportunityDetailDialogProps {
  opportunityId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function OpportunityDetailDialog({
  opportunityId,
  open,
  onOpenChange,
}: OpportunityDetailDialogProps) {
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
  const [convertOpen, setConvertOpen] = useState(false)

  const { data: opportunity, isLoading } = useOpportunity(opportunityId)
  const { data: activities } = useOpportunityActivities(opportunityId, { enabled: !!opportunity })

  const addActivityMutation = useAddActivity(opportunityId)
  const updateMutation = useUpdateOpportunity(opportunityId)
  const convertMutation = useConvertToJob(opportunityId)

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
    if (!opportunity) return
    const nextStage = NEXT_STAGE[opportunity.stage]
    if (!nextStage) return

    try {
      await updateMutation.mutateAsync({ stage: nextStage })
      toast.success(`Movido para ${STAGE_CONFIG[nextStage].label}`)
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

  async function handleConvertToJob() {
    if (!opportunity) return
    try {
      const result = await convertMutation.mutateAsync({
        job_title: opportunity.title,
        project_type: opportunity.project_type ?? undefined,
        client_id: opportunity.client_id ?? undefined,
        agency_id: opportunity.agency_id ?? undefined,
        // Onda 1.2: copiar mais campos da oportunidade
        closed_value: opportunity.estimated_value ?? undefined,
        description: opportunity.notes ?? undefined,
        deliverable_format: opportunity.deliverable_format ?? undefined,
        campaign_period: opportunity.campaign_period ?? undefined,
      })
      toast.success(`Job "${result.data.job.title}" criado com sucesso`)
      setConvertOpen(false)
      onOpenChange(false)
      router.push(`/jobs/${result.data.job.id}`)
    } catch (err) {
      toast.error(safeErrorMessage(err as Error))
    }
  }

  if (!open) return null

  const config = opportunity ? STAGE_CONFIG[opportunity.stage] : null
  const nextStage = opportunity ? NEXT_STAGE[opportunity.stage] : null
  const isActive =
    opportunity &&
    opportunity.stage !== 'ganho' &&
    opportunity.stage !== 'perdido' &&
    opportunity.stage !== 'pausado'

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {!isLoading && opportunity && (
            <>
              <DialogHeader>
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <DialogTitle className="text-lg leading-snug">{opportunity.title}</DialogTitle>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      {config && (
                        <Badge className={cn('text-xs', config.badgeClass)}>
                          {config.label}
                        </Badge>
                      )}
                      {opportunity.probability != null && (
                        <span className="text-xs text-muted-foreground">
                          {opportunity.probability}% probabilidade
                        </span>
                      )}
                      {opportunity.source && (
                        <span className="text-xs text-muted-foreground capitalize">
                          via {opportunity.source.replace('_', ' ')}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0"
                      title="Ver pagina completa"
                      asChild
                    >
                      <Link href={`/crm/${opportunityId}`} onClick={() => onOpenChange(false)}>
                        <Maximize2 className="size-4" />
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0"
                      onClick={() => setEditOpen(true)}
                    >
                      <Pencil className="size-4" />
                    </Button>
                  </div>
                </div>
              </DialogHeader>

              {/* Info cards */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {opportunity.estimated_value != null && (
                  <InfoCard
                    icon={<DollarSign className="size-4 text-emerald-500" />}
                    label="Valor estimado"
                    value={opportunity.estimated_value.toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    })}
                  />
                )}
                {opportunity.expected_close_date && (
                  <InfoCard
                    icon={<Calendar className="size-4 text-blue-500" />}
                    label="Fechamento previsto"
                    value={new Date(opportunity.expected_close_date + 'T12:00:00').toLocaleDateString(
                      'pt-BR',
                    )}
                  />
                )}
                {opportunity.clients?.name && (
                  <InfoCard
                    label="Cliente"
                    value={opportunity.clients.name}
                  />
                )}
                {opportunity.agencies?.name && (
                  <InfoCard
                    label="Agencia"
                    value={opportunity.agencies.name}
                  />
                )}
                {opportunity.project_type && (
                  <InfoCard
                    label="Tipo"
                    value={opportunity.project_type}
                  />
                )}
                {opportunity.response_deadline && (
                  <InfoCard
                    icon={<Calendar className="size-4 text-amber-500" />}
                    label="Prazo de retorno"
                    value={new Date(opportunity.response_deadline + 'T12:00:00').toLocaleDateString(
                      'pt-BR',
                    )}
                  />
                )}
                {opportunity.is_competitive_bid && (
                  <InfoCard
                    label="Concorrencia"
                    value="Licitacao concorrente"
                  />
                )}
                {opportunity.assigned_profile?.full_name && (
                  <InfoCard
                    label="Responsavel"
                    value={opportunity.assigned_profile.full_name}
                  />
                )}
              </div>

              {/* Job vinculado */}
              {opportunity.jobs && (
                <div className="flex items-center gap-2 rounded-lg border bg-emerald-500/5 px-3 py-2 text-sm">
                  <Briefcase className="size-4 text-emerald-600" />
                  <span className="text-muted-foreground">Job criado:</span>
                  <button
                    onClick={() => {
                      onOpenChange(false)
                      router.push(`/jobs/${opportunity.jobs!.id}`)
                    }}
                    className="font-medium text-emerald-700 hover:underline dark:text-emerald-400 flex items-center gap-1"
                  >
                    {opportunity.jobs.title}
                    <ExternalLink className="size-3" />
                  </button>
                </div>
              )}

              {/* Notas */}
              {opportunity.notes && (
                <div className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
                  {opportunity.notes}
                </div>
              )}

              {/* Analise de perda */}
              {opportunity.stage === 'perdido' && (opportunity.loss_category || opportunity.loss_reason) && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 space-y-2">
                  <p className="text-xs font-semibold text-destructive uppercase tracking-wide">Analise da perda</p>
                  <div className="flex flex-wrap gap-2 items-center">
                    {opportunity.loss_category && (
                      <span className="inline-flex items-center rounded-full bg-destructive/15 px-2.5 py-0.5 text-xs font-semibold text-destructive capitalize">
                        {LOSS_CATEGORY_LABEL[opportunity.loss_category] ?? opportunity.loss_category}
                      </span>
                    )}
                    {opportunity.winner_competitor && (
                      <span className="text-xs text-muted-foreground">
                        Concorrente: <span className="font-medium text-foreground">{opportunity.winner_competitor}</span>
                      </span>
                    )}
                    {opportunity.winner_value != null && (
                      <span className="text-xs text-muted-foreground">
                        Valor: <span className="font-medium text-foreground tabular-nums">{opportunity.winner_value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
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

              <Separator />

              {/* Acoes de avanco de stage */}
              {isActive && (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {nextStage && (
                      <Button
                        size="sm"
                        onClick={handleMoveStage}
                        disabled={updateMutation.isPending}
                        className="gap-1.5"
                      >
                        <ChevronRight className="size-3.5" />
                        Mover para {STAGE_CONFIG[nextStage].label}
                      </Button>
                    )}

                    {canConvert && opportunity.stage !== 'perdido' && opportunity.stage !== 'ganho' && !opportunity.job_id && (
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => setConvertOpen(true)}
                        className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
                      >
                        <Briefcase className="size-3.5" />
                        Converter em Job
                      </Button>
                    )}
                  </div>

                  {/* Marcar como perdido — form expandido */}
                  {opportunity.stage !== 'perdido' && (
                    <div className="space-y-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive px-2"
                        onClick={() => setLossOpen((v) => !v)}
                      >
                        Perdemos
                      </Button>

                      {lossOpen && (
                        <div className="space-y-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                          <div className="space-y-1">
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

                          <Input
                            placeholder="Concorrente vencedor (opcional)"
                            className="h-8 text-xs border-destructive/30"
                            value={winnerCompetitor}
                            onChange={(e) => setWinnerCompetitor(e.target.value)}
                          />

                          <Input
                            type="number"
                            min={0}
                            placeholder="Valor do concorrente (opcional)"
                            className="h-8 text-xs border-destructive/30"
                            value={winnerValue}
                            onChange={(e) => setWinnerValue(e.target.value)}
                          />

                          <Textarea
                            rows={2}
                            className="text-xs resize-none border-destructive/30"
                            placeholder="Detalhes do que aconteceu..."
                            value={lossReason}
                            onChange={(e) => setLossReason(e.target.value)}
                          />

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
                </div>
              )}

              <Separator />

              {/* Propostas */}
              <ProposalSection
                opportunityId={opportunityId}
                proposals={opportunity.proposals}
              />

              <Separator />

              {/* Timeline de atividades */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold">Atividades</h3>

                {/* Adicionar atividade */}
                <div className="space-y-2">
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
                            {ACTIVITY_TYPE_ICON[o.value]} {o.label}
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
                        <Plus className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Lista de atividades */}
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {(activities ?? opportunity.recent_activities ?? []).map((activity) => (
                    <ActivityItem key={activity.id} activity={activity} />
                  ))}

                  {(activities ?? opportunity.recent_activities ?? []).length === 0 && (
                    <p className="text-xs text-muted-foreground">Nenhuma atividade registrada.</p>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de edicao */}
      {opportunity && (
        <OpportunityDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          mode="edit"
          opportunity={opportunity}
        />
      )}

      {/* Confirmacao de conversao em job */}
      {opportunity && (
        <ConfirmDialog
          open={convertOpen}
          onOpenChange={setConvertOpen}
          title="Converter em Job"
          description={`Criar job "${opportunity.title}" a partir desta oportunidade?\n\nSerao copiados: titulo, cliente/agencia, tipo de projeto${opportunity.estimated_value ? `, valor estimado (${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(opportunity.estimated_value)})` : ''}, observacoes e formato de entrega.\n\nA oportunidade sera marcada como "ganho".`}
          confirmLabel="Criar Job"
          onConfirm={handleConvertToJob}
          isPending={convertMutation.isPending}
        />
      )}
    </>
  )
}

function InfoCard({
  icon,
  label,
  value,
}: {
  icon?: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="rounded-lg border bg-card p-2.5 text-xs">
      <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
        {icon}
        <span>{label}</span>
      </div>
      <span className="font-medium">{value}</span>
    </div>
  )
}

function ActivityItem({ activity }: { activity: OpportunityActivity }) {
  const formatDate = (dateStr: string) => {
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

  return (
    <div className="flex gap-2.5">
      <div className="flex-none pt-0.5 text-base leading-none">
        {ACTIVITY_TYPE_ICON[activity.activity_type] ?? '•'}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs leading-snug">{activity.description}</p>
        <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
          {activity.created_by_profile?.full_name && (
            <span>{activity.created_by_profile.full_name}</span>
          )}
          {activity.created_by_profile?.full_name && <span>·</span>}
          <span>{formatDate(activity.created_at)}</span>
        </div>
      </div>
    </div>
  )
}
