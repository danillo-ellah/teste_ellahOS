'use client'

import { useState, useEffect, useMemo } from 'react'
import { toast } from 'sonner'
import { format, startOfMonth, addMonths, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  Building2,
  Plus,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Trash2,
  Search,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { useCostItems, useCreateCostItem, useUpdateCostItem, useDeleteCostItem } from '@/hooks/useCostItems'
import { formatCurrency, formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import {
  ITEM_STATUS_LABELS,
  type CostItem,
  type CostItemFilters,
  type ItemStatus,
} from '@/types/cost-management'
import { OverheadItemDialog } from './_components/OverheadItemDialog'

// --- Status badge ---

const STATUS_COLORS: Record<string, string> = {
  orcado: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400',
  aguardando_nf: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
  nf_pedida: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400',
  nf_recebida: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-400',
  nf_aprovada: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-400',
  pago: 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400',
  cancelado: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500',
}

function StatusBadge({ status }: { status: string }) {
  const label = ITEM_STATUS_LABELS[status as ItemStatus] ?? status
  const color = STATUS_COLORS[status] ?? STATUS_COLORS.orcado
  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', color)}>
      {label}
    </span>
  )
}

// --- Main page ---

export default function CustosFixosPage() {
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()))
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<CostItem | null>(null)
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)

  // Formato YYYY-MM para filtro
  const periodMonth = format(currentMonth, 'yyyy-MM')

  // Debounce search
  const [debouncedSearch, setDebouncedSearch] = useState('')
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => clearTimeout(t)
  }, [search])

  const filters: CostItemFilters = useMemo(() => ({
    period_month_from: periodMonth,
    period_month_to: periodMonth,
    search: debouncedSearch || undefined,
    item_status: statusFilter !== 'all' ? (statusFilter as ItemStatus) : undefined,
    per_page: 200,
    sort_by: 'item_number',
    sort_order: 'asc',
  }), [periodMonth, debouncedSearch, statusFilter])

  const { data: items, meta, isLoading } = useCostItems(filters)
  const _createItem = useCreateCostItem()
  const _updateItem = useUpdateCostItem()
  const deleteItem = useDeleteCostItem()

  const costItems = items ?? []

  // Totais
  const totalBudgeted = meta?.total_budgeted ?? costItems.reduce((s, i) => s + (i.total_with_overtime ?? 0), 0)
  const totalPaid = meta?.total_paid ?? 0

  function prevMonth() { setCurrentMonth(m => subMonths(m, 1)) }
  function nextMonth() { setCurrentMonth(m => addMonths(m, 1)) }

  function openCreate() {
    setEditingItem(null)
    setDialogOpen(true)
  }

  function openEdit(item: CostItem) {
    setEditingItem(item)
    setDialogOpen(true)
  }

  async function handleDelete() {
    if (!deleteTargetId) return
    try {
      await deleteItem.mutateAsync(deleteTargetId)
      toast.success('Custo fixo removido')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao remover')
    } finally {
      setDeleteTargetId(null)
    }
  }

  const monthLabel = format(currentMonth, "MMMM 'de' yyyy", { locale: ptBR })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Building2 className="size-6 text-primary" />
          <div>
            <h1 className="text-xl font-semibold">Custos Fixos</h1>
            <p className="text-sm text-muted-foreground">
              Despesas recorrentes nao vinculadas a jobs (aluguel, software, salarios, etc)
            </p>
          </div>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="size-3.5 mr-1.5" />
          Novo Custo Fixo
        </Button>
      </div>

      {/* Month navigator + filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Month selector */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="size-8" onClick={prevMonth}>
            <ChevronLeft className="size-4" />
          </Button>
          <span className="min-w-[160px] text-center text-sm font-medium capitalize">
            {monthLabel}
          </span>
          <Button variant="outline" size="icon" className="size-8" onClick={nextMonth}>
            <ChevronRight className="size-4" />
          </Button>
        </div>

        {/* Search + status filter */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 w-48"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-8 w-36">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {Object.entries(ITEM_STATUS_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="rounded-lg border border-border p-3">
          <p className="text-xs font-medium text-muted-foreground">Total Orcado</p>
          <p className="text-lg font-bold tracking-tight">{formatCurrency(totalBudgeted)}</p>
        </div>
        <div className="rounded-lg border border-border p-3">
          <p className="text-xs font-medium text-muted-foreground">Total Pago</p>
          <p className="text-lg font-bold tracking-tight text-green-600 dark:text-green-400">
            {formatCurrency(totalPaid)}
          </p>
        </div>
        <div className="rounded-lg border border-border p-3">
          <p className="text-xs font-medium text-muted-foreground">Itens</p>
          <p className="text-lg font-bold tracking-tight">{meta?.total ?? costItems.length}</p>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded" />
          ))}
        </div>
      ) : !costItems.length ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center">
          <Building2 className="mx-auto size-8 text-muted-foreground/50" />
          <p className="mt-2 text-sm text-muted-foreground">
            Nenhum custo fixo cadastrado para {monthLabel}
          </p>
          <Button size="sm" variant="outline" onClick={openCreate} className="mt-3">
            <Plus className="size-3.5 mr-1.5" />
            Adicionar custo fixo
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">#</TableHead>
                <TableHead>Descricao</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {costItems.map((item) => (
                <TableRow
                  key={item.id}
                  className={cn(item.item_status === 'cancelado' && 'opacity-50')}
                >
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {item.item_number}.{item.sub_item_number}
                  </TableCell>
                  <TableCell className="max-w-[220px] truncate text-sm">
                    {item.service_description}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {item.vendor_name_snapshot || (item.vendors as { full_name?: string } | null)?.full_name || '-'}
                  </TableCell>
                  <TableCell className="text-right font-medium text-sm">
                    {formatCurrency(item.total_with_overtime)}
                  </TableCell>
                  <TableCell className="text-sm">
                    {formatDate(item.payment_due_date)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={item.item_status} />
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
                        disabled={item.payment_status === 'pago'}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Dialog create/edit */}
      <OverheadItemDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) setEditingItem(null)
        }}
        item={editingItem}
        periodMonth={periodMonth}
      />

      {/* Confirm delete */}
      <ConfirmDialog
        open={!!deleteTargetId}
        onOpenChange={(open) => { if (!open) setDeleteTargetId(null) }}
        title="Remover custo fixo"
        description="Tem certeza que deseja remover este custo fixo?"
        onConfirm={handleDelete}
        isPending={deleteItem.isPending}
        variant="destructive"
      />
    </div>
  )
}
