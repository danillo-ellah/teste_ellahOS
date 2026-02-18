'use client'

import { useState, useRef, useEffect } from 'react'
import { toast } from 'sonner'
import Link from 'next/link'
import {
  ArrowUpCircle,
  ArrowDownCircle,
  Pencil,
  Trash2,
  Plus,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import { Pagination } from '@/components/shared/Pagination'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { FinancialRecordDialog } from '@/components/job-detail/tabs/FinancialRecordDialog'
import {
  useFinancialRecords,
  useCreateFinancialRecord,
  useUpdateFinancialRecord,
  useDeleteFinancialRecord,
} from '@/hooks/useFinancialRecords'
import { formatCurrency, formatDate } from '@/lib/format'
import {
  FINANCIAL_RECORD_TYPE_LABELS,
  FINANCIAL_RECORD_CATEGORY_LABELS,
  FINANCIAL_RECORD_STATUS_LABELS,
  FINANCIAL_STATUS_STYLE_MAP,
} from '@/lib/constants'
import {
  FINANCIAL_RECORD_TYPES,
  FINANCIAL_RECORD_STATUSES,
  FINANCIAL_RECORD_CATEGORIES,
} from '@/types/financial'
import type {
  FinancialRecord,
  FinancialRecordType,
  FinancialRecordStatus,
  FinancialRecordCategory,
  FinancialRecordFilters,
} from '@/types/financial'
import { cn } from '@/lib/utils'

export function FinancialRecordsTable() {
  const [filters, setFilters] = useState<FinancialRecordFilters>({
    page: 1,
    per_page: 20,
  })
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<FinancialRecord | null>(
    null,
  )
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)
  const [searchValue, setSearchValue] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [])

  function handleSearchChange(value: string) {
    setSearchValue(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      updateFilter({ search: value || undefined })
    }, 400)
  }

  const { data: records, meta, isLoading } = useFinancialRecords(filters)
  const createRecord = useCreateFinancialRecord()
  const updateRecord = useUpdateFinancialRecord()
  const deleteRecord = useDeleteFinancialRecord()

  function updateFilter(patch: Partial<FinancialRecordFilters>) {
    setFilters((prev) => ({ ...prev, page: 1, ...patch }))
  }

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
      if (editingRecord) {
        await updateRecord.mutateAsync({
          id: editingRecord.id,
          payload: data as Parameters<typeof updateRecord.mutateAsync>[0]['payload'],
        })
        toast.success('Lancamento atualizado')
      } else {
        await createRecord.mutateAsync(
          data as unknown as Parameters<typeof createRecord.mutateAsync>[0],
        )
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

  const list = records ?? []

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Buscar descricao..."
          value={searchValue}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="w-60"
        />
        <Select
          value={filters.type ?? '__all__'}
          onValueChange={(v) =>
            updateFilter({
              type: v === '__all__' ? undefined : (v as FinancialRecordType),
            })
          }
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todos</SelectItem>
            {FINANCIAL_RECORD_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {FINANCIAL_RECORD_TYPE_LABELS[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filters.status ?? '__all__'}
          onValueChange={(v) =>
            updateFilter({
              status:
                v === '__all__' ? undefined : (v as FinancialRecordStatus),
            })
          }
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todos</SelectItem>
            {FINANCIAL_RECORD_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {FINANCIAL_RECORD_STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filters.category ?? '__all__'}
          onValueChange={(v) =>
            updateFilter({
              category:
                v === '__all__'
                  ? undefined
                  : (v as FinancialRecordCategory),
            })
          }
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todas</SelectItem>
            {FINANCIAL_RECORD_CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {FINANCIAL_RECORD_CATEGORY_LABELS[c]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex-1" />
        <Button size="sm" onClick={openCreate}>
          <Plus className="mr-1 size-4" />
          Novo lancamento
        </Button>
      </div>

      {/* Tabela */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded bg-muted" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <div className="rounded-md border border-dashed py-16 text-center text-sm text-muted-foreground">
          Nenhum lancamento encontrado.
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                <TableHead>Descricao</TableHead>
                <TableHead>Job</TableHead>
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
                    <TableCell className="text-xs">
                      {record.jobs ? (
                        <Link
                          href={`/jobs/${record.job_id}`}
                          className="text-primary hover:underline"
                        >
                          {record.jobs.code || record.jobs.title}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">-</span>
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
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7"
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => openEdit(record)}
                          >
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

      {/* Paginacao */}
      {meta.total_pages > 1 && (
        <Pagination
          page={meta.page}
          totalPages={meta.total_pages}
          total={meta.total}
          perPage={meta.per_page}
          onPageChange={(page) => setFilters((prev) => ({ ...prev, page }))}
          onPerPageChange={(per_page) =>
            setFilters((prev) => ({ ...prev, per_page, page: 1 }))
          }
          itemLabel="lancamento"
        />
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
