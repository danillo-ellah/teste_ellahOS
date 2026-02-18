'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Plus, MoreHorizontal, Pencil, Trash2, Package, ExternalLink } from 'lucide-react'
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
import { formatDuration } from '@/lib/format'
import type { JobDetail, JobDeliverable, DeliverableStatus } from '@/types/jobs'

interface TabEntregaveisProps {
  job: JobDetail
}

export function TabEntregaveis({ job }: TabEntregaveisProps) {
  const { data: deliverables, isLoading, isError, refetch } = useJobDeliverables(job.id)
  const { mutateAsync: addDeliverable, isPending: isAdding } = useAddDeliverable()
  const { mutateAsync: updateDeliverable, isPending: isUpdating } = useUpdateDeliverable()
  const { mutateAsync: removeDeliverable, isPending: isRemoving } = useRemoveDeliverable()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<JobDeliverable | undefined>()
  const [deleting, setDeleting] = useState<JobDeliverable | null>(null)

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
    file_url: string | null
    review_url: string | null
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

  const list = deliverables ?? []

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
              <TableHead>Formato</TableHead>
              <TableHead>Resolucao</TableHead>
              <TableHead>Duracao</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[60px]">Links</TableHead>
              <TableHead className="w-[50px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.map((d) => (
              <TableRow key={d.id}>
                <TableCell className="font-medium max-w-[200px] truncate">
                  {d.description}
                </TableCell>
                <TableCell>{d.format || '-'}</TableCell>
                <TableCell>{d.resolution || '-'}</TableCell>
                <TableCell className="tabular-nums">
                  {formatDuration(d.duration_seconds)}
                </TableCell>
                <TableCell>
                  <DeliverableStatusBadge status={d.status} />
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    {d.file_url && (
                      <a
                        href={d.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:text-primary/80"
                        title="Arquivo"
                      >
                        <ExternalLink className="size-3.5" />
                      </a>
                    )}
                    {d.review_url && (
                      <a
                        href={d.review_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-foreground"
                        title="Review"
                      >
                        <ExternalLink className="size-3.5" />
                      </a>
                    )}
                  </div>
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
            ))}
          </TableBody>
        </Table>
      </div>

      <DeliverableDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        deliverable={editing}
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
