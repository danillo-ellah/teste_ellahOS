'use client'

import { useState, useMemo } from 'react'
import { toast } from 'sonner'
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Package,
  ExternalLink,
  CornerDownRight,
  AlertTriangle,
  Clock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { ConfirmDialog } from '@/components/jobs/ConfirmDialog'
import { EmptyTabState } from '@/components/shared/EmptyTabState'
import { DeliverableDialog } from './DeliverableDialog'
import {
  useJobDeliverables,
  useAddDeliverable,
  useUpdateDeliverable,
  useRemoveDeliverable,
} from '@/hooks/useJobDeliverables'
import { ApiRequestError } from '@/lib/api'
import { DELIVERABLE_STATUS_LABELS } from '@/lib/constants'
import { formatDate, formatIndustryDuration, daysUntil } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { JobDetail, JobDeliverable, DeliverableStatus } from '@/types/jobs'

interface TabEntregaveisProps {
  job: JobDetail
}

// Agrupar entregaveis por hierarquia: pais primeiro (ordenados por delivery_date),
// filhos logo abaixo de cada pai
function buildHierarchy(deliverables: JobDeliverable[]): JobDeliverable[] {
  const parents: JobDeliverable[] = []
  const childrenMap = new Map<string, JobDeliverable[]>()

  for (const d of deliverables) {
    if (d.parent_id) {
      const siblings = childrenMap.get(d.parent_id) ?? []
      siblings.push(d)
      childrenMap.set(d.parent_id, siblings)
    } else {
      parents.push(d)
    }
  }

  // Ordenar pais por delivery_date (mais urgente primeiro), null no final
  parents.sort((a, b) => {
    if (!a.delivery_date && !b.delivery_date) return 0
    if (!a.delivery_date) return 1
    if (!b.delivery_date) return -1
    return a.delivery_date.localeCompare(b.delivery_date)
  })

  // Montar lista plana: pai -> filhos -> pai -> filhos
  const result: JobDeliverable[] = []
  for (const parent of parents) {
    result.push(parent)
    const children = childrenMap.get(parent.id) ?? []
    children.sort((a, b) => {
      if (!a.delivery_date && !b.delivery_date) return 0
      if (!a.delivery_date) return 1
      if (!b.delivery_date) return -1
      return a.delivery_date.localeCompare(b.delivery_date)
    })
    result.push(...children)
  }

  // Orfaos (filhos cujo parent_id nao esta na lista) - nao deveria acontecer
  const resultIds = new Set(result.map((d) => d.id))
  for (const d of deliverables) {
    if (!resultIds.has(d.id)) result.push(d)
  }

  return result
}

export function TabEntregaveis({ job }: TabEntregaveisProps) {
  const { data: deliverables, isLoading, isError, refetch } = useJobDeliverables(job.id)
  const { mutateAsync: addDeliverable, isPending: isAdding } = useAddDeliverable()
  const { mutateAsync: updateDeliverable, isPending: isUpdating } = useUpdateDeliverable()
  const { mutateAsync: removeDeliverable, isPending: isRemoving } = useRemoveDeliverable()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<JobDeliverable | undefined>()
  const [deleting, setDeleting] = useState<JobDeliverable | null>(null)

  const list = deliverables ?? []
  const hierarchy = useMemo(() => buildHierarchy(list), [list])

  // Opcoes de pai para o dialog (somente entregaveis sem parent_id = raiz)
  const parentOptions = useMemo(
    () =>
      list
        .filter((d) => !d.parent_id)
        .map((d) => ({
          id: d.id,
          description: d.description,
          duration_seconds: d.duration_seconds,
        })),
    [list],
  )

  function handleOpenAdd() {
    setEditing(undefined)
    setDialogOpen(true)
  }

  function handleOpenEdit(d: JobDeliverable) {
    setEditing(d)
    setDialogOpen(true)
  }

  async function handleSubmit(data: {
    description: string
    format: string | null
    resolution: string | null
    duration_seconds: number | null
    status: string
    delivery_date: string | null
    parent_id: string | null
    link: string | null
  }) {
    try {
      if (editing) {
        await updateDeliverable({
          jobId: job.id,
          deliverableId: editing.id,
          ...data,
          status: data.status as DeliverableStatus,
        })
        toast.success('Entregavel atualizado')
      } else {
        await addDeliverable({
          jobId: job.id,
          ...data,
          status: data.status as DeliverableStatus,
        })
        toast.success('Entregavel adicionado')
      }
      setDialogOpen(false)
    } catch (err) {
      const msg = err instanceof ApiRequestError ? err.message : 'Erro ao salvar entregavel'
      toast.error(msg)
    }
  }

  async function handleDelete() {
    if (!deleting) return
    try {
      await removeDeliverable({ jobId: job.id, deliverableId: deleting.id })
      toast.success('Entregavel removido')
      setDeleting(null)
    } catch (err) {
      const msg = err instanceof ApiRequestError ? err.message : 'Erro ao remover entregavel'
      toast.error(msg)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-border py-12 flex flex-col items-center justify-center text-center gap-3">
        <p className="text-sm text-muted-foreground">Erro ao carregar entregaveis.</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>Tentar novamente</Button>
      </div>
    )
  }

  if (list.length === 0) {
    return (
      <>
        <EmptyTabState
          icon={Package}
          title="Nenhum entregavel"
          description="Adicione os entregaveis que serao produzidos neste job."
          actionLabel="Adicionar entregavel"
          onAction={handleOpenAdd}
        />
        <DeliverableDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSubmit={handleSubmit}
          isPending={isAdding}
        />
      </>
    )
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold">
          Entregaveis ({list.length})
        </h3>
        <Button size="sm" variant="outline" onClick={handleOpenAdd}>
          <Plus className="size-4" />
          Adicionar entregavel
        </Button>
      </div>

      <div className="rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Descricao</TableHead>
                <TableHead className="w-[70px]">Duracao</TableHead>
                <TableHead>Formato</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Prazo</TableHead>
                <TableHead className="w-[40px]">Link</TableHead>
                <TableHead className="w-[50px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {hierarchy.map((d) => {
                const isChild = !!d.parent_id
                return (
                  <TableRow key={d.id} className={cn(isChild && 'bg-muted/30')}>
                    <TableCell className="font-medium max-w-[240px]">
                      <div className="flex items-center gap-1.5">
                        {isChild && (
                          <CornerDownRight className="size-3.5 text-muted-foreground shrink-0" />
                        )}
                        <span className="truncate">{d.description}</span>
                      </div>
                    </TableCell>
                    <TableCell className="tabular-nums text-xs font-mono">
                      {formatIndustryDuration(d.duration_seconds)}
                    </TableCell>
                    <TableCell className="text-xs">{d.format || '-'}</TableCell>
                    <TableCell>
                      <DeliverableStatusBadge status={d.status} />
                    </TableCell>
                    <TableCell>
                      <DeliveryDateCell
                        date={d.delivery_date}
                        status={d.status}
                      />
                    </TableCell>
                    <TableCell>
                      {d.link && (
                        <a
                          href={d.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:text-primary/80"
                          title="Abrir link"
                        >
                          <ExternalLink className="size-3.5" />
                        </a>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-8" aria-label={`Acoes para ${d.description}`}>
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleOpenEdit(d)}>
                            <Pencil className="size-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setDeleting(d)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="size-4" />
                            Remover
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
      </div>

      <DeliverableDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        deliverable={editing}
        parentOptions={parentOptions}
        onSubmit={handleSubmit}
        isPending={isAdding || isUpdating}
      />

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => { if (!open) setDeleting(null) }}
        title="Remover entregavel"
        description={`Tem certeza que deseja remover "${deleting?.description}"?`}
        confirmLabel="Remover"
        cancelLabel="Cancelar"
        variant="destructive"
        isPending={isRemoving}
        onConfirm={handleDelete}
      />
    </>
  )
}

// --- Badge de urgencia do prazo ---

function DeliveryDateCell({ date, status }: { date: string | null; status: string }) {
  if (!date) return <span className="text-xs text-muted-foreground">-</span>

  // Entregue/aprovado nao mostra urgencia
  const isFinished = status === 'entregue' || status === 'aprovado'
  const days = daysUntil(date)

  if (days === null) return <span className="text-xs">{formatDate(date)}</span>

  if (isFinished) {
    return <span className="text-xs text-muted-foreground">{formatDate(date)}</span>
  }

  // Atrasado
  if (days < 0) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400">
            <AlertTriangle className="size-3" />
            {formatDate(date)}
          </span>
        </TooltipTrigger>
        <TooltipContent>
          Atrasado {Math.abs(days)} dia{Math.abs(days) !== 1 ? 's' : ''}
        </TooltipContent>
      </Tooltip>
    )
  }

  // Urgente (0-3 dias)
  if (days <= 3) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400">
            <Clock className="size-3" />
            {formatDate(date)}
          </span>
        </TooltipTrigger>
        <TooltipContent>
          {days === 0 ? 'Vence hoje!' : `Faltam ${days} dia${days !== 1 ? 's' : ''}`}
        </TooltipContent>
      </Tooltip>
    )
  }

  // Normal
  return <span className="text-xs">{formatDate(date)}</span>
}

// --- Badge de status ---

function DeliverableStatusBadge({ status }: { status: string }) {
  const colorMap: Record<string, string> = {
    pendente: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
    em_producao: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    aguardando_aprovacao: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    aprovado: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    entregue: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colorMap[status] ?? ''}`}>
      {DELIVERABLE_STATUS_LABELS[status as keyof typeof DELIVERABLE_STATUS_LABELS] ?? status}
    </span>
  )
}
