'use client'

import { useState } from 'react'
import { Flag, Plus, Pencil, ChevronDown, ChevronUp, AlertTriangle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyTabState } from '@/components/shared/EmptyTabState'
import {
  useClientMilestones,
  useCreateMilestone,
  useUpdateMilestone,
} from '@/hooks/useAttendance'
import { ApiRequestError } from '@/lib/api'
import { formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import type {
  ClientMilestone,
  MilestoneStatus,
  CreateMilestonePayload,
  UpdateMilestonePayload,
} from '@/types/attendance'
import { MILESTONE_STATUS_LABELS } from '@/types/attendance'

// ============ Helpers ============

const TODAY = new Date()
TODAY.setHours(0, 0, 0, 0)

function isOverdueMilestone(milestone: ClientMilestone): boolean {
  if (milestone.status === 'concluido' || milestone.status === 'cancelado') return false
  const due = new Date(milestone.due_date)
  due.setHours(0, 0, 0, 0)
  return due < TODAY
}

// ============ Status badge ============

const STATUS_CLASS: Record<MilestoneStatus, string> = {
  pendente: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-0',
  concluido: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-0',
  atrasado: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-0',
  cancelado: 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400 border-0',
}

function StatusBadge({ status }: { status: MilestoneStatus }) {
  return (
    <Badge className={cn('text-xs shrink-0', STATUS_CLASS[status])}>
      {MILESTONE_STATUS_LABELS[status]}
    </Badge>
  )
}

// ============ Skeleton ============

function MilestonesSkeleton() {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-44" />
        <Skeleton className="h-9 w-28" />
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-20 w-full rounded-lg" />
      ))}
    </div>
  )
}

// ============ Milestone row ============

interface MilestoneRowProps {
  milestone: ClientMilestone
  onEdit: (milestone: ClientMilestone) => void
}

function MilestoneRow({ milestone, onEdit }: MilestoneRowProps) {
  const [notesOpen, setNotesOpen] = useState(false)
  const overdue = isOverdueMilestone(milestone)

  return (
    <div
      className={cn(
        'rounded-lg border bg-card transition-colors',
        overdue
          ? 'border-l-4 border-l-red-400 border-t-border border-r-border border-b-border bg-red-50/40 dark:bg-red-950/10'
          : 'border-border',
      )}
    >
      <div className="flex items-start gap-3 p-4">
        {/* Due date block */}
        <div
          className={cn(
            'flex flex-col items-center justify-center rounded-md px-3 py-2 min-w-[56px] text-center shrink-0',
            overdue
              ? 'bg-red-100 dark:bg-red-900/30'
              : 'bg-muted',
          )}
        >
          <span
            className={cn(
              'text-[11px] font-medium leading-tight',
              overdue ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground',
            )}
          >
            {formatDate(milestone.due_date)}
          </span>
          {overdue && (
            <span className="text-[10px] text-red-500 dark:text-red-400 font-medium mt-0.5">
              atrasado
            </span>
          )}
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-medium leading-snug">{milestone.description}</p>
            <StatusBadge status={milestone.status} />
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5">
            {milestone.responsible_name && (
              <span className="text-xs text-muted-foreground">
                Responsavel: {milestone.responsible_name}
              </span>
            )}
            {milestone.status === 'concluido' && milestone.completed_at && (
              <span className="text-xs text-green-600 dark:text-green-400">
                Concluido em {formatDate(milestone.completed_at)}
              </span>
            )}
          </div>

          {/* Notes toggle */}
          {milestone.notes && (
            <button
              type="button"
              onClick={() => setNotesOpen((v) => !v)}
              className="mt-2 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {notesOpen ? (
                <ChevronUp className="size-3" />
              ) : (
                <ChevronDown className="size-3" />
              )}
              {notesOpen ? 'Ocultar observacoes' : 'Ver observacoes'}
            </button>
          )}
          {notesOpen && milestone.notes && (
            <p className="mt-2 text-xs text-muted-foreground leading-relaxed border-t border-border pt-2">
              {milestone.notes}
            </p>
          )}
        </div>

        {/* Edit button */}
        <Button
          variant="ghost"
          size="icon"
          className="size-8 shrink-0 text-muted-foreground hover:text-foreground"
          onClick={() => onEdit(milestone)}
          title="Editar marco"
        >
          <Pencil className="size-3.5" />
        </Button>
      </div>
    </div>
  )
}

// ============ Dialog form state ============

interface DialogState {
  description: string
  due_date: string
  responsible_name: string
  notes: string
  status: MilestoneStatus
}

const EMPTY_FORM: DialogState = {
  description: '',
  due_date: '',
  responsible_name: '',
  notes: '',
  status: 'pendente',
}

// ============ Main section ============

interface ClientMilestonesSectionProps {
  jobId: string
}

export function ClientMilestonesSection({ jobId }: ClientMilestonesSectionProps) {
  const { data: res, isLoading, isError, refetch } = useClientMilestones(jobId)
  const { mutateAsync: createMilestone, isPending: isCreating } = useCreateMilestone()
  const { mutateAsync: updateMilestone, isPending: isUpdating } = useUpdateMilestone(jobId)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingMilestone, setEditingMilestone] = useState<ClientMilestone | null>(null)
  const [form, setForm] = useState<DialogState>(EMPTY_FORM)

  const milestones: ClientMilestone[] = (res?.data ?? []).slice().sort((a, b) =>
    a.due_date.localeCompare(b.due_date),
  )

  // ---- Handlers ----

  function openCreate() {
    setEditingMilestone(null)
    setForm(EMPTY_FORM)
    setDialogOpen(true)
  }

  function openEdit(milestone: ClientMilestone) {
    setEditingMilestone(milestone)
    setForm({
      description: milestone.description,
      due_date: milestone.due_date,
      responsible_name: milestone.responsible_name ?? '',
      notes: milestone.notes ?? '',
      status: milestone.status,
    })
    setDialogOpen(true)
  }

  function handleDialogClose(open: boolean) {
    setDialogOpen(open)
    if (!open) {
      setEditingMilestone(null)
      setForm(EMPTY_FORM)
    }
  }

  function setField<K extends keyof DialogState>(key: K, value: DialogState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!form.description.trim()) {
      toast.error('Descricao e obrigatoria')
      return
    }
    if (!form.due_date) {
      toast.error('Data limite e obrigatoria')
      return
    }

    try {
      if (editingMilestone) {
        const payload: UpdateMilestonePayload & { id: string } = {
          id: editingMilestone.id,
          description: form.description.trim(),
          due_date: form.due_date,
          responsible_name: form.responsible_name.trim() || null,
          notes: form.notes.trim() || null,
          status: form.status,
        }
        await updateMilestone(payload)
        toast.success('Marco atualizado')
      } else {
        const payload: CreateMilestonePayload = {
          job_id: jobId,
          description: form.description.trim(),
          due_date: form.due_date,
          responsible_name: form.responsible_name.trim() || undefined,
          notes: form.notes.trim() || undefined,
        }
        await createMilestone(payload)
        toast.success('Marco adicionado')
      }
      setDialogOpen(false)
    } catch (err) {
      const msg = err instanceof ApiRequestError ? err.message : 'Erro ao salvar marco'
      toast.error(msg)
    }
  }

  // ---- Render states ----

  if (isLoading) return <MilestonesSkeleton />

  if (isError) {
    return (
      <div className="rounded-lg border border-border py-10 flex flex-col items-center gap-3">
        <AlertTriangle className="size-6 text-amber-500" />
        <p className="text-sm text-muted-foreground">Nao foi possivel carregar os marcos.</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          Tentar novamente
        </Button>
      </div>
    )
  }

  const isSaving = isCreating || isUpdating

  return (
    <>
      {/* Section header */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">Marcos do Cliente</h3>
          {milestones.length > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-xs font-medium">
              {milestones.length}
            </span>
          )}
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="size-4" />
          <span className="hidden sm:inline">Novo marco</span>
        </Button>
      </div>

      {/* Empty state */}
      {milestones.length === 0 ? (
        <EmptyTabState
          icon={Flag}
          title="Nenhum marco registrado"
          description="Adicione marcos para acompanhar datas e prazos acordados com o cliente."
          actionLabel="Adicionar marco"
          onAction={openCreate}
        />
      ) : (
        <div className="space-y-2">
          {milestones.map((m) => (
            <MilestoneRow key={m.id} milestone={m} onEdit={openEdit} />
          ))}
        </div>
      )}

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>
              {editingMilestone ? 'Editar marco' : 'Novo marco'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="ms-description">
                Descricao <span className="text-destructive">*</span>
              </Label>
              <Input
                id="ms-description"
                placeholder="Ex: Entrega do roteiro finalizado"
                value={form.description}
                onChange={(e) => setField('description', e.target.value)}
                disabled={isSaving}
              />
            </div>

            {/* Due date */}
            <div className="space-y-1.5">
              <Label htmlFor="ms-due-date">
                Data limite <span className="text-destructive">*</span>
              </Label>
              <Input
                id="ms-due-date"
                type="date"
                value={form.due_date}
                onChange={(e) => setField('due_date', e.target.value)}
                disabled={isSaving}
              />
            </div>

            {/* Responsible */}
            <div className="space-y-1.5">
              <Label htmlFor="ms-responsible">Responsavel</Label>
              <Input
                id="ms-responsible"
                placeholder="Nome do responsavel"
                value={form.responsible_name}
                onChange={(e) => setField('responsible_name', e.target.value)}
                disabled={isSaving}
              />
            </div>

            {/* Status — only in edit mode */}
            {editingMilestone && (
              <div className="space-y-1.5">
                <Label htmlFor="ms-status">Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => setField('status', v as MilestoneStatus)}
                  disabled={isSaving}
                >
                  <SelectTrigger id="ms-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(MILESTONE_STATUS_LABELS) as MilestoneStatus[]).map((s) => (
                      <SelectItem key={s} value={s}>
                        {MILESTONE_STATUS_LABELS[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Notes */}
            <div className="space-y-1.5">
              <Label htmlFor="ms-notes">Observacoes</Label>
              <Textarea
                id="ms-notes"
                placeholder="Detalhes adicionais sobre este marco..."
                rows={3}
                value={form.notes}
                onChange={(e) => setField('notes', e.target.value)}
                disabled={isSaving}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={isSaving}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="size-4 animate-spin" />}
                {editingMilestone ? 'Salvar alteracoes' : 'Adicionar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
