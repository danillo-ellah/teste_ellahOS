'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import {
  Plus,
  Pencil,
  Trash2,
  ArrowUpCircle,
  ArrowDownCircle,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { FinancialRecordDialog } from './FinancialRecordDialog'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import {
  useFinancialRecords,
  useCreateFinancialRecord,
  useUpdateFinancialRecord,
  useDeleteFinancialRecord,
} from '@/hooks/useFinancialRecords'
import { formatCurrency, formatDate } from '@/lib/format'
import {
  FINANCIAL_RECORD_CATEGORY_LABELS,
  FINANCIAL_RECORD_STATUS_LABELS,
  FINANCIAL_STATUS_STYLE_MAP,
  PAYMENT_METHOD_LABELS,
} from '@/lib/constants'
import { cn } from '@/lib/utils'
import type { FinancialRecord } from '@/types/financial'

interface FinancialRecordsListProps {
  jobId: string
}

export function FinancialRecordsList({ jobId }: FinancialRecordsListProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<FinancialRecord | null>(
    null,
  )
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)

  const { data: records, isLoading } = useFinancialRecords({
    job_id: jobId,
    per_page: 100,
  })
  const createRecord = useCreateFinancialRecord()
  const updateRecord = useUpdateFinancialRecord()
  const deleteRecord = useDeleteFinancialRecord()

  function openCreate() {
    setEditingRecord(null)
    setDialogOpen(true)
  }

  function openEdit(record: FinancialRecord) {
    setEditingRecord(record)
    setDialogOpen(true)
  }

  async function handleSubmit(data: unknown) {
    try {
      const payload = data as Record<string, unknown>
      if (editingRecord) {
        await updateRecord.mutateAsync({
          id: editingRecord.id,
          payload: payload as Parameters<typeof updateRecord.mutateAsync>[0]['payload'],
        })
        toast.success('Lancamento atualizado')
      } else {
        await createRecord.mutateAsync({
          ...payload,
          job_id: jobId,
        } as unknown as Parameters<typeof createRecord.mutateAsync>[0])
        toast.success('Lancamento criado')
      }
      setDialogOpen(false)
    } catch {
      toast.error('Erro ao salvar lancamento')
    }
  }

  async function handleConfirmDelete() {
    if (!deleteTargetId) return
    try {
      await deleteRecord.mutateAsync(deleteTargetId)
      toast.success('Lancamento removido')
      setDeleteTargetId(null)
    } catch {
      toast.error('Erro ao remover lancamento')
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-12 animate-pulse rounded bg-muted" />
        ))}
      </div>
    )
  }

  const list = records ?? []

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Lancamentos</h3>
        <Button size="sm" variant="outline" onClick={openCreate}>
          <Plus className="mr-1 size-4" />
          Novo lancamento
        </Button>
      </div>

      {list.length === 0 ? (
        <div className="rounded-md border border-dashed py-8 text-center text-sm text-muted-foreground">
          Nenhum lancamento financeiro registrado.
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                <TableHead>Descricao</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((record) => {
                const isReceita = record.type === 'receita'
                const statusStyle =
                  FINANCIAL_STATUS_STYLE_MAP[record.status]
                return (
                  <TableRow key={record.id}>
                    <TableCell>
                      {isReceita ? (
                        <ArrowUpCircle className="size-4 text-green-500" />
                      ) : (
                        <ArrowDownCircle className="size-4 text-red-500" />
                      )}
                    </TableCell>
                    <TableCell className="font-medium">
                      {record.description}
                      {record.people?.full_name && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          ({record.people.full_name})
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {FINANCIAL_RECORD_CATEGORY_LABELS[record.category]}
                    </TableCell>
                    <TableCell
                      className={cn(
                        'text-right font-mono text-sm',
                        isReceita
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-red-600 dark:text-red-400',
                      )}
                    >
                      {isReceita ? '+' : '-'}
                      {formatCurrency(record.amount)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={cn(
                          'text-[10px]',
                          statusStyle?.bgClass,
                          statusStyle?.textClass,
                        )}
                      >
                        {FINANCIAL_RECORD_STATUS_LABELS[record.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDate(record.due_date)}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-7">
                            <Pencil className="size-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(record)}>
                            <Pencil className="mr-2 size-3.5" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setDeleteTargetId(record.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="mr-2 size-3.5" />
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
      )}

      <FinancialRecordDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        record={editingRecord}
        onSubmit={handleSubmit}
        isPending={createRecord.isPending || updateRecord.isPending}
      />

      <ConfirmDialog
        open={!!deleteTargetId}
        onOpenChange={(open) => { if (!open) setDeleteTargetId(null) }}
        title="Remover lancamento"
        description="Tem certeza que deseja remover este lancamento financeiro?"
        confirmLabel="Remover"
        onConfirm={handleConfirmDelete}
        isPending={deleteRecord.isPending}
      />
    </div>
  )
}
