'use client'

import { useState, useMemo, useCallback } from 'react'
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
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
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
import { useWorkflowSteps, useInitializeWorkflow, useUpdateWorkflowStep } from '@/hooks/useWorkflow'
import { useUserRole } from '@/hooks/useUserRole'
import {
  WORKFLOW_STATUS_LABELS,
  WORKFLOW_STATUS_COLORS,
  WORKFLOW_CATEGORY_LABELS,
  WORKFLOW_CATEGORY_COLORS,
  type WorkflowStep,
  type WorkflowStatus,
  type WorkflowCategory,
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
        <h2 className="text-lg font-semibold">Workflow nao inicializado</h2>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          Inicialize o workflow de 16 fases para controlar solicitacoes, aprovacoes e conferencias deste job.
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
  const [showActions, setShowActions] = useState(false)
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const { mutateAsync: updateStep, isPending } = useUpdateWorkflowStep(jobId)

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
        {canManage && (
          <div className="flex items-center gap-1 shrink-0">
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
          </div>
        )}
      </div>

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
