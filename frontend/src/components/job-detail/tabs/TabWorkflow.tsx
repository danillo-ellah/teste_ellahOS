'use client'

import { useState, useMemo, useCallback, useRef } from 'react'
import {
  GitBranch,
  Play,
  CheckCircle2,
  XCircle,
  SkipForward,
  Camera,
  ShoppingCart,
  FileEdit,
  CircleDot,
  ChevronDown,
  ChevronRight,
  User,
  DollarSign,
  Paperclip,
  AlertTriangle,
  Loader2,
  Upload,
  Image,
  FileText,
  Receipt,
  File,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { useWorkflowSteps, useInitializeWorkflow, useUpdateWorkflowStep, useWorkflowEvidence, useAddWorkflowEvidence } from '@/hooks/useWorkflow'
import { useUserRole } from '@/hooks/useUserRole'
import {
  WORKFLOW_STATUS_LABELS,
  WORKFLOW_STATUS_COLORS,
  WORKFLOW_CATEGORY_LABELS,
  WORKFLOW_CATEGORY_COLORS,
  EVIDENCE_TYPE_LABELS,
  type WorkflowStep,
  type WorkflowEvidence,
  type WorkflowStatus,
  type WorkflowCategory,
  type EvidenceType,
} from '@/types/workflow'
import type { JobDetail } from '@/types/jobs'

const STEP_TYPE_ICONS = {
  geral: CircleDot,
  solicitacao: FileEdit,
  aprovacao: CheckCircle2,
  compra: ShoppingCart,
  conferencia: Camera,
}

interface TabWorkflowProps {
  job: JobDetail
}

export function TabWorkflow({ job }: TabWorkflowProps) {
  const { data: steps, isLoading, isError, refetch } = useWorkflowSteps(job.id)
  const { mutateAsync: initialize, isPending: isInitializing } = useInitializeWorkflow(job.id)
  const { role } = useUserRole()
  const canManage = ['admin', 'ceo', 'produtor_executivo', 'coordenador', 'diretor'].includes(role ?? '')

  // Steps nao inicializados ainda
  if (!isLoading && !isError && (!steps || steps.length === 0)) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <GitBranch className="size-12 text-muted-foreground/30 mb-4" />
        <h2 className="text-lg font-semibold">Workflow ainda nao iniciado</h2>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          Inicie o fluxo de aprovacoes e conferencias deste job com 16 etapas automaticas.
        </p>
        {canManage && (
          <Button
            className="mt-4"
            onClick={async () => {
              try {
                await initialize()
                toast.success('Workflow inicializado com 16 fases')
              } catch {
                toast.error('Erro ao inicializar workflow')
              }
            }}
            disabled={isInitializing}
          >
            {isInitializing ? (
              <Loader2 className="size-4 mr-2 animate-spin" />
            ) : (
              <Play className="size-4 mr-2" />
            )}
            Inicializar Workflow
          </Button>
        )}
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center text-sm text-destructive">
        Erro ao carregar workflow.{' '}
        <button onClick={() => refetch()} className="underline">Tentar novamente</button>
      </div>
    )
  }

  return <WorkflowTimeline steps={steps!} jobId={job.id} canManage={canManage} />
}

// ---------------------------------------------------------------------------
// Timeline principal — agrupa por categoria
// ---------------------------------------------------------------------------

function WorkflowTimeline({
  steps,
  jobId,
  canManage,
}: {
  steps: WorkflowStep[]
  jobId: string
  canManage: boolean
}) {
  // Agrupar steps por categoria mantendo ordem
  const grouped = useMemo(() => {
    const groups: Array<{ category: WorkflowCategory; steps: WorkflowStep[] }> = []
    let currentCat: WorkflowCategory | null = null

    for (const step of steps) {
      if (step.category !== currentCat) {
        currentCat = step.category
        groups.push({ category: currentCat, steps: [] })
      }
      groups[groups.length - 1].steps.push(step)
    }
    return groups
  }, [steps])

  // Stats gerais
  const completed = steps.filter((s) => s.status === 'completed').length
  const total = steps.length
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0

  return (
    <div className="space-y-6">
      {/* Barra de progresso geral */}
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium">Progresso do Workflow</span>
            <span className="text-sm text-muted-foreground">{completed}/{total} fases</span>
          </div>
          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        <span className="text-lg font-bold text-primary">{progress}%</span>
      </div>

      {/* Grupos por categoria */}
      {grouped.map(({ category, steps: catSteps }) => (
        <CategoryGroup
          key={category}
          category={category}
          steps={catSteps}
          jobId={jobId}
          canManage={canManage}
        />
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Grupo por categoria (colapsavel)
// ---------------------------------------------------------------------------

function CategoryGroup({
  category,
  steps,
  jobId,
  canManage,
}: {
  category: WorkflowCategory
  steps: WorkflowStep[]
  jobId: string
  canManage: boolean
}) {
  const [expanded, setExpanded] = useState(true)
  const colors = WORKFLOW_CATEGORY_COLORS[category]
  const completed = steps.filter((s) => s.status === 'completed' || s.status === 'skipped').length
  const hasActive = steps.some((s) => s.status === 'in_progress')
  const hasRejected = steps.some((s) => s.status === 'rejected')

  return (
    <div className={cn('rounded-lg border', colors.border)}>
      {/* Header da categoria */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className={cn(
          'flex w-full items-center justify-between rounded-t-lg px-4 py-3 transition-colors',
          colors.bg,
        )}
      >
        <div className="flex items-center gap-2">
          {expanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
          <span className={cn('text-sm font-semibold', colors.text)}>
            {WORKFLOW_CATEGORY_LABELS[category]}
          </span>
          <span className={cn('text-xs', colors.text)}>
            ({completed}/{steps.length})
          </span>
          {hasActive && (
            <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
          )}
          {hasRejected && (
            <AlertTriangle className="size-3.5 text-red-500" />
          )}
        </div>
      </button>

      {/* Steps */}
      {expanded && (
        <div className="divide-y divide-border">
          {steps.map((step, idx) => (
            <StepRow
              key={step.id}
              step={step}
              jobId={jobId}
              canManage={canManage}
              isFirst={idx === 0}
              isLast={idx === steps.length - 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Linha de cada step
// ---------------------------------------------------------------------------

function StepRow({
  step,
  jobId,
  canManage,
  isLast,
}: {
  step: WorkflowStep
  jobId: string
  canManage: boolean
  isFirst: boolean
  isLast: boolean
}) {
  const [showEvidence, setShowEvidence] = useState(false)
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const { mutateAsync: updateStep, isPending } = useUpdateWorkflowStep(jobId)
  const hasEvidencePanel = step.step_type === 'conferencia' || step.step_type === 'compra'

  const statusColors = WORKFLOW_STATUS_COLORS[step.status]
  const StepIcon = STEP_TYPE_ICONS[step.step_type] ?? CircleDot

  const handleStatusChange = useCallback(async (newStatus: WorkflowStatus, reason?: string) => {
    try {
      await updateStep({
        stepId: step.id,
        status: newStatus,
        ...(reason ? { rejection_reason: reason } : {}),
      })
      toast.success(`"${step.step_label}" → ${WORKFLOW_STATUS_LABELS[newStatus]}`)
      setShowRejectDialog(false)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao atualizar'
      toast.error(msg)
    }
  }, [step.id, step.step_label, updateStep])

  return (
    <>
      <div
        className={cn(
          'flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/30',
          isLast && 'rounded-b-lg',
        )}
      >
        {/* Dot/icone de status */}
        <div className="flex flex-col items-center">
          <span className={cn('flex h-8 w-8 items-center justify-center rounded-full', statusColors.bg)}>
            <StepIcon className={cn('size-4', statusColors.text)} />
          </span>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium truncate">{step.step_label}</span>
            <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', statusColors.bg, statusColors.text)}>
              {WORKFLOW_STATUS_LABELS[step.status]}
            </Badge>
          </div>

          {/* Meta info */}
          <div className="flex flex-wrap items-center gap-3 mt-1 text-[11px] text-muted-foreground">
            {step.assigned_profile && (
              <span className="flex items-center gap-1">
                <User className="size-3" />
                {step.assigned_profile.full_name.split(' ')[0]}
              </span>
            )}
            {step.estimated_value != null && (
              <span className="flex items-center gap-1">
                <DollarSign className="size-3" />
                Est: R$ {step.estimated_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            )}
            {step.actual_value != null && (
              <span className="flex items-center gap-1 font-medium text-foreground">
                <DollarSign className="size-3" />
                Real: R$ {step.actual_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            )}
            {step.step_type === 'conferencia' && (
              <span className="flex items-center gap-1">
                <Paperclip className="size-3" />
                {step.evidence_count ?? 0} evidencia{(step.evidence_count ?? 0) !== 1 ? 's' : ''}
              </span>
            )}
            {step.approved_profile && (
              <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                <CheckCircle2 className="size-3" />
                Aprovado por {step.approved_profile.full_name.split(' ')[0]}
              </span>
            )}
            {step.rejection_reason && (
              <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
                <XCircle className="size-3" />
                {step.rejection_reason}
              </span>
            )}
          </div>

          {step.notes && (
            <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{step.notes}</p>
          )}
        </div>

        {/* Acoes */}
        <div className="flex items-center gap-1 shrink-0">
          {hasEvidencePanel && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={() => setShowEvidence(!showEvidence)}
            >
              <Paperclip className="size-3" />
              {step.evidence_count ?? 0}
            </Button>
          )}

          {canManage && (
            <>
              {step.status === 'pending' && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  disabled={isPending}
                  onClick={() => handleStatusChange('in_progress')}
                >
                  <Play className="size-3" /> Iniciar
                </Button>
              )}

              {step.status === 'in_progress' && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1 text-green-600 hover:text-green-700"
                    disabled={isPending}
                    onClick={() => handleStatusChange('completed')}
                  >
                    <CheckCircle2 className="size-3" /> Concluir
                  </Button>
                  {step.step_type === 'aprovacao' && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs gap-1 text-red-600 hover:text-red-700"
                      disabled={isPending}
                      onClick={() => setShowRejectDialog(true)}
                    >
                      <XCircle className="size-3" /> Rejeitar
                    </Button>
                  )}
                </>
              )}

              {step.status === 'rejected' && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  disabled={isPending}
                  onClick={() => handleStatusChange('in_progress')}
                >
                  <Play className="size-3" /> Reiniciar
                </Button>
              )}

              {step.status === 'blocked' && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1 text-amber-600 hover:text-amber-700"
                  disabled={isPending}
                  onClick={() => handleStatusChange('pending')}
                >
                  <Play className="size-3" /> Desbloquear
                </Button>
              )}

              {(step.status === 'pending' || step.status === 'in_progress') && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs gap-1 text-muted-foreground"
                  disabled={isPending}
                  onClick={() => handleStatusChange('skipped')}
                >
                  <SkipForward className="size-3" /> Pular
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Painel de evidencias expandivel */}
      {showEvidence && hasEvidencePanel && (
        <EvidenceUploadPanel stepId={step.id} jobId={jobId} canManage={canManage} />
      )}

      {/* Dialog de rejeicao */}
      {showRejectDialog && (
        <RejectDialog
          stepLabel={step.step_label}
          onConfirm={(reason) => handleStatusChange('rejected', reason)}
          onCancel={() => setShowRejectDialog(false)}
          isPending={isPending}
        />
      )}
    </>
  )
}

// ---------------------------------------------------------------------------
// Painel de evidencias (upload + listagem)
// ---------------------------------------------------------------------------

const EVIDENCE_TYPE_ICONS: Record<EvidenceType, typeof Image> = {
  foto: Image,
  nota_fiscal: FileText,
  recibo: Receipt,
  outro: File,
}

// Tipos e tamanhos permitidos para upload
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

function EvidenceUploadPanel({
  stepId,
  jobId,
  canManage,
}: {
  stepId: string
  jobId: string
  canManage: boolean
}) {
  const { data: evidences, isLoading } = useWorkflowEvidence(stepId)
  const { mutateAsync: addEvidence, isPending: isAdding } = useAddWorkflowEvidence(jobId, stepId)
  const [evidenceType, setEvidenceType] = useState<EvidenceType>('foto')
  const [notes, setNotes] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleUpload = useCallback(async (file: globalThis.File) => {
    // S4: Validar tipo e tamanho ANTES do upload
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      toast.error('Tipo nao permitido. Use JPEG, PNG, WebP ou PDF.')
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }
    if (file.size === 0 || file.size > MAX_FILE_SIZE) {
      toast.error('Arquivo invalido. Tamanho maximo: 10MB.')
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    setIsUploading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Nao autenticado')

      // Buscar tenant_id do profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single()

      // S4: Sem fallback 'default' — erro se tenant nao identificado
      if (!profile?.tenant_id) {
        throw new Error('Erro ao identificar tenant. Recarregue a pagina.')
      }

      const tenantId = profile.tenant_id
      const ext = file.name.split('.').pop() ?? 'bin'
      const storagePath = `${tenantId}/${jobId}/${stepId}/${Date.now()}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('workflow-evidence')
        .upload(storagePath, file, { contentType: file.type })

      if (uploadError) throw uploadError

      // S2: Armazena o PATH relativo (nao URL publica) — backend gera signed URLs
      await addEvidence({
        evidence_type: evidenceType,
        file_url: storagePath,
        file_name: file.name,
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      })

      toast.success(`Evidencia "${file.name}" enviada`)
      setNotes('')
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao enviar arquivo'
      toast.error(msg)
    } finally {
      setIsUploading(false)
    }
  }, [jobId, stepId, evidenceType, notes, addEvidence])

  const busy = isUploading || isAdding

  return (
    <div className="border-t bg-muted/20 px-4 py-3 space-y-3">
      {/* Upload form */}
      {canManage && (
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex-1 min-w-[180px]">
            <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Arquivo (JPEG, PNG, PDF, max 10MB)</label>
            <Input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              disabled={busy}
              className="h-8 text-xs"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleUpload(file)
              }}
            />
          </div>
          <div className="w-[130px]">
            <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Tipo</label>
            <Select value={evidenceType} onValueChange={(v) => setEvidenceType(v as EvidenceType)}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(['foto', 'nota_fiscal', 'recibo', 'outro'] as EvidenceType[]).map((t) => (
                  <SelectItem key={t} value={t} className="text-xs">
                    {EVIDENCE_TYPE_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 min-w-[140px]">
            <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Obs (opcional)</label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observacao..."
              disabled={busy}
              className="h-8 text-xs"
            />
          </div>
          {busy && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
        </div>
      )}

      {/* Lista de evidencias */}
      {isLoading ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="size-3 animate-spin" /> Carregando evidencias...
        </div>
      ) : evidences && evidences.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {evidences.map((ev) => (
            <EvidenceCard key={ev.id} evidence={ev} />
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground text-center py-2">
          Nenhuma evidencia enviada ainda.
        </p>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Card de evidencia individual (usa signed_url do backend)
// ---------------------------------------------------------------------------

function EvidenceCard({ evidence }: { evidence: WorkflowEvidence }) {
  const Icon = EVIDENCE_TYPE_ICONS[evidence.evidence_type] ?? File
  const isImage = evidence.evidence_type === 'foto' ||
    /\.(jpg|jpeg|png|webp|gif)$/i.test(evidence.file_name)
  // Backend retorna signed_url (URL temporaria autenticada)
  const displayUrl = (evidence as WorkflowEvidence & { signed_url?: string }).signed_url ?? evidence.file_url

  return (
    <a
      href={displayUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="group rounded-lg border bg-background p-2 hover:border-primary/50 transition-colors"
    >
      {isImage ? (
        <div className="aspect-square rounded bg-muted overflow-hidden mb-1.5">
          <img
            src={displayUrl}
            alt={evidence.file_name}
            className="h-full w-full object-cover group-hover:scale-105 transition-transform"
          />
        </div>
      ) : (
        <div className="aspect-square rounded bg-muted flex items-center justify-center mb-1.5">
          <Icon className="size-8 text-muted-foreground" />
        </div>
      )}
      <div className="space-y-0.5">
        <p className="text-[11px] font-medium truncate">{evidence.file_name}</p>
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">
            {EVIDENCE_TYPE_LABELS[evidence.evidence_type]}
          </Badge>
          {evidence.uploader && (
            <span className="truncate">{evidence.uploader.full_name.split(' ')[0]}</span>
          )}
        </div>
        {evidence.notes && (
          <p className="text-[10px] text-muted-foreground truncate">{evidence.notes}</p>
        )}
      </div>
    </a>
  )
}

// ---------------------------------------------------------------------------
// Dialog de rejeicao (motivo obrigatorio)
// ---------------------------------------------------------------------------

function RejectDialog({
  stepLabel,
  onConfirm,
  onCancel,
  isPending,
}: {
  stepLabel: string
  onConfirm: (reason: string) => void
  onCancel: () => void
  isPending: boolean
}) {
  const [reason, setReason] = useState('')

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onCancel() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Rejeitar: {stepLabel}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <p className="text-sm text-muted-foreground">
            Informe o motivo da rejeicao. A solicitacao voltara para revisao.
          </p>
          <Textarea
            placeholder="Motivo da rejeicao..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={isPending}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={() => onConfirm(reason)}
            disabled={isPending || !reason.trim()}
          >
            {isPending && <Loader2 className="size-4 mr-2 animate-spin" />}
            Rejeitar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
