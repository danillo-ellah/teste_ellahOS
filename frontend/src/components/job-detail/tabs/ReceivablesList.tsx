'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import {
  Plus,
  Pencil,
  Trash2,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileText,
  Ban,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { ReceivableDialog } from './ReceivableDialog'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import {
  useReceivables,
  useReceivableSummary,
  useCreateReceivable,
  useUpdateReceivable,
  useDeleteReceivable,
} from '@/hooks/useReceivables'
import { formatCurrency, formatDate, isOverdue } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Receivable, CreateReceivablePayload, UpdateReceivablePayload } from '@/types/receivables'

// --- Status config ---

const STATUS_CONFIG: Record<string, { label: string; variant: string; icon: typeof Clock }> = {
  pendente: { label: 'Pendente', variant: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-400', icon: Clock },
  faturado: { label: 'Faturado', variant: 'bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-400', icon: FileText },
  recebido: { label: 'Recebido', variant: 'bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-400', icon: CheckCircle2 },
  atrasado: { label: 'Atrasado', variant: 'bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-400', icon: AlertTriangle },
  cancelado: { label: 'Cancelado', variant: 'bg-gray-100 text-gray-800 dark:bg-gray-500/15 dark:text-gray-400', icon: Ban },
}

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.pendente
  const Icon = config.icon
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium', config.variant)}>
      <Icon className="size-3" />
      {config.label}
    </span>
  )
}

// --- Summary strip ---

function SummaryStrip({ jobId }: { jobId: string }) {
  const summaryQuery = useReceivableSummary(jobId)

  if (summaryQuery.isLoading) {
    return <Skeleton className="h-16 w-full rounded-lg" />
  }

  const summary = summaryQuery.data?.data
  if (!summary) return null

  const items = [
    { label: 'Previsto', value: formatCurrency(summary.total_previsto), color: 'text-foreground' },
    { label: 'Recebido', value: formatCurrency(summary.total_recebido), color: 'text-green-600 dark:text-green-400' },
    { label: 'Pendente', value: formatCurrency(summary.total_pendente), color: 'text-amber-600 dark:text-amber-400' },
    { label: 'Atrasado', value: formatCurrency(summary.total_atrasado), color: 'text-red-600 dark:text-red-400' },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {items.map((item) => (
        <div key={item.label} className="rounded-lg border border-border p-3">
          <p className="text-xs font-medium text-muted-foreground">{item.label}</p>
          <p className={cn('text-lg font-bold tracking-tight', item.color)}>{item.value}</p>
        </div>
      ))}
    </div>
  )
}

// --- Main component ---

interface ReceivablesListProps {
  jobId: string
}

export function ReceivablesList({ jobId }: ReceivablesListProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Receivable | null>(null)
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)

  const { data: receivables, isLoading } = useReceivables({ job_id: jobId, per_page: 100 })
  const createReceivable = useCreateReceivable()
  const updateReceivable = useUpdateReceivable()
  const deleteReceivable = useDeleteReceivable()

  function openCreate() {
    setEditingItem(null)
    setDialogOpen(true)
  }

  function openEdit(item: Receivable) {
    setEditingItem(item)
    setDialogOpen(true)
  }

  async function handleSubmit(data: CreateReceivablePayload | UpdateReceivablePayload) {
    try {
      if (editingItem) {
        await updateReceivable.mutateAsync({
          id: editingItem.id,
          ...(data as UpdateReceivablePayload),
        })
        toast.success('Parcela atualizada')
      } else {
        await createReceivable.mutateAsync({
          ...(data as CreateReceivablePayload),
          job_id: jobId,
        })
        toast.success('Parcela criada')
      }
      setDialogOpen(false)
      setEditingItem(null)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar'
      toast.error(msg)
    }
  }

  async function handleDelete() {
    if (!deleteTargetId) return
    try {
      await deleteReceivable.mutateAsync(deleteTargetId)
      toast.success('Parcela removida')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao remover'
      toast.error(msg)
    } finally {
      setDeleteTargetId(null)
    }
  }

  return (
    <section className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <DollarSign className="size-5 text-green-500" />
          <h3 className="text-sm font-semibold">Receitas (Recebiveis)</h3>
          {receivables && (
            <Badge variant="secondary" className="text-xs">
              {receivables.length} parcela{receivables.length !== 1 ? 's' : ''}
            </Badge>
          )}
        </div>
        <Button size="sm" variant="outline" onClick={openCreate}>
          <Plus className="size-3.5 mr-1.5" />
          Nova Parcela
        </Button>
      </div>

      {/* Summary */}
      <SummaryStrip jobId={jobId} />

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded" />
          ))}
        </div>
      ) : !receivables?.length ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center">
          <DollarSign className="mx-auto size-8 text-muted-foreground/50" />
          <p className="mt-2 text-sm text-muted-foreground">
            Nenhuma parcela de receita cadastrada
          </p>
          <Button size="sm" variant="outline" onClick={openCreate} className="mt-3">
            <Plus className="size-3.5 mr-1.5" />
            Adicionar primeira parcela
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Descricao</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>NF</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {receivables.map((item) => {
                const overdue = item.status === 'pendente' && isOverdue(item.due_date)
                return (
                  <TableRow
                    key={item.id}
                    className={cn(
                      overdue && 'bg-red-50/50 dark:bg-red-500/5',
                      item.status === 'cancelado' && 'opacity-50',
                    )}
                  >
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {item.installment_number}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-sm">
                      {item.description}
                    </TableCell>
                    <TableCell className="text-right font-medium text-sm">
                      {formatCurrency(item.amount)}
                    </TableCell>
                    <TableCell className="text-sm">
                      <span className={cn(overdue && 'text-red-600 dark:text-red-400 font-medium')}>
                        {formatDate(item.due_date)}
                      </span>
                      {overdue && (
                        <span className="ml-1.5 text-xs text-red-500">Vencida</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={overdue ? 'atrasado' : item.status} />
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {item.invoice_number || '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7"
                          onClick={() => openEdit(item)}
                          title="Editar"
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 text-red-500 hover:text-red-600"
                          onClick={() => setDeleteTargetId(item.id)}
                          title="Remover"
                          disabled={item.status === 'recebido'}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Dialog create/edit */}
      <ReceivableDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) setEditingItem(null)
        }}
        receivable={editingItem}
        onSubmit={handleSubmit}
        isSubmitting={createReceivable.isPending || updateReceivable.isPending}
      />

      {/* Confirm delete */}
      <ConfirmDialog
        open={!!deleteTargetId}
        onOpenChange={(open) => { if (!open) setDeleteTargetId(null) }}
        title="Remover parcela"
        description="Tem certeza que deseja remover esta parcela de receita? Esta acao pode ser revertida apenas pelo administrador."
        onConfirm={handleDelete}
        isPending={deleteReceivable.isPending}
        variant="destructive"
      />
    </section>
  )
}
