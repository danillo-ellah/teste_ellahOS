'use client'

import React, { useState } from 'react'
import {
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  MoreHorizontal,
  Pencil,
  Trash2,
  CreditCard,
} from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { useDeleteCostItem } from '@/hooks/useCostItems'
import { toast } from 'sonner'
import { formatCurrency, formatDate } from '@/lib/format'
import { PAYMENT_CONDITION_LABELS } from '@/types/cost-management'
import type { CostItem } from '@/types/cost-management'
import { CostItemStatusBadge } from './CostItemStatusBadge'
import { safeErrorMessage } from '@/lib/api'
import { cn } from '@/lib/utils'

interface CostItemsTableProps {
  items: CostItem[]
  selectedIds: Set<string>
  onToggleSelect: (id: string) => void
  onEdit: (item: CostItem) => void
  onPay: (item: CostItem) => void
  isLoading: boolean
}

function groupByCategoryNumber(items: CostItem[]): Map<number, CostItem[]> {
  const groups = new Map<number, CostItem[]>()
  for (const item of items) {
    const group = groups.get(item.item_number) ?? []
    group.push(item)
    groups.set(item.item_number, group)
  }
  return groups
}

function getCategorySubtotal(items: CostItem[]): number {
  return items.reduce((sum, item) => {
    if (item.is_category_header) return sum
    return sum + item.total_with_overtime
  }, 0)
}

// ---- DeleteConfirmDialog ----

interface DeleteConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  isPending: boolean
}

function DeleteConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  isPending,
}: DeleteConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir item de custo?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta acao nao pode ser desfeita. O item sera removido permanentemente.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isPending ? 'Excluindo...' : 'Excluir'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

// ---- VendorCell ----

function VendorCell({ item }: { item: CostItem }) {
  if (!item.vendor_name_snapshot) {
    return <span className="text-muted-foreground">-</span>
  }

  const hasDetails = item.vendor_email_snapshot || item.vendor_pix_snapshot

  if (!hasDetails) {
    return <span className="truncate max-w-[120px] block">{item.vendor_name_snapshot}</span>
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="truncate max-w-[120px] block underline decoration-dotted cursor-help">
            {item.vendor_name_snapshot}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs space-y-1">
          {item.vendor_email_snapshot && (
            <p>Email: {item.vendor_email_snapshot}</p>
          )}
          {item.vendor_pix_snapshot && (
            <p>PIX: {item.vendor_pix_snapshot}</p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// ---- StatusCell ----

function StatusCell({ item }: { item: CostItem }) {
  const hasMismatch =
    item.suggested_status &&
    item.suggested_status !== item.item_status

  return (
    <div className="flex items-center gap-1">
      <CostItemStatusBadge status={item.item_status} />
      {hasMismatch && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs max-w-xs">
              Status sugerido: {item.suggested_status}
              {item.status_note && <p className="mt-1">{item.status_note}</p>}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  )
}

// ---- CategoryHeaderRow ----

interface CategoryHeaderRowProps {
  items: CostItem[]
  isExpanded: boolean
  onToggle: () => void
}

function CategoryHeaderRow({ items, isExpanded, onToggle }: CategoryHeaderRowProps) {
  const header = items.find(i => i.is_category_header)
  const label = header?.service_description ?? `Categoria ${items[0]?.item_number}`
  const subtotal = getCategorySubtotal(items)
  const nonHeaderCount = items.filter(i => !i.is_category_header).length

  return (
    <TableRow
      className="bg-muted/60 hover:bg-muted/80 cursor-pointer select-none"
      onClick={onToggle}
    >
      <TableCell className="w-8" />
      <TableCell colSpan={12}>
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="font-semibold text-sm">{label}</span>
          <span className="text-xs text-muted-foreground">({nonHeaderCount} itens)</span>
          <span className="ml-auto font-semibold text-sm tabular-nums">
            {formatCurrency(subtotal)}
          </span>
        </div>
      </TableCell>
      <TableCell />
    </TableRow>
  )
}

// ---- ItemRow ----

interface ItemRowProps {
  item: CostItem
  isSelected: boolean
  onToggleSelect: () => void
  onEdit: () => void
  onPay: () => void
  onDelete: (id: string) => void
}

function ItemRow({
  item,
  isSelected,
  onToggleSelect,
  onEdit,
  onPay,
  onDelete,
}: ItemRowProps) {
  const canSelect = !item.is_category_header && item.payment_status === 'pendente'
  const canPay = item.payment_status === 'pendente' && !item.is_category_header
  const isOverdue =
    item.payment_due_date &&
    item.payment_status === 'pendente' &&
    new Date(item.payment_due_date) < new Date()

  return (
    <TableRow
      className={cn(
        item.is_category_header && 'bg-muted/30 font-medium',
        item.payment_status === 'cancelado' && 'opacity-50',
        isSelected && 'bg-primary/5',
      )}
    >
      {/* Checkbox */}
      <TableCell className="w-8">
        {canSelect && (
          <Checkbox
            checked={isSelected}
            onCheckedChange={onToggleSelect}
            aria-label="Selecionar item"
          />
        )}
      </TableCell>

      {/* Numero */}
      <TableCell className="text-xs text-muted-foreground tabular-nums w-14">
        {item.item_number}.{item.sub_item_number}
      </TableCell>

      {/* Descricao */}
      <TableCell className="max-w-[200px]">
        <span className={cn('truncate block', item.is_category_header && 'font-semibold')}>
          {item.service_description}
        </span>
        {item.notes && (
          <span className="text-xs text-muted-foreground truncate block">{item.notes}</span>
        )}
      </TableCell>

      {/* Fornecedor */}
      <TableCell className="text-sm">
        {!item.is_category_header && <VendorCell item={item} />}
      </TableCell>

      {/* Valor Unit. */}
      <TableCell className="text-right tabular-nums text-sm">
        {!item.is_category_header && item.unit_value != null
          ? formatCurrency(item.unit_value)
          : <span className="text-muted-foreground">-</span>}
      </TableCell>

      {/* Qtd */}
      <TableCell className="text-right tabular-nums text-sm">
        {!item.is_category_header ? item.quantity : ''}
      </TableCell>

      {/* Total */}
      <TableCell className="text-right tabular-nums text-sm font-medium">
        {!item.is_category_header ? formatCurrency(item.total_value) : ''}
      </TableCell>

      {/* HE */}
      <TableCell className="text-right tabular-nums text-sm">
        {!item.is_category_header && item.overtime_value > 0
          ? formatCurrency(item.overtime_value)
          : <span className="text-muted-foreground">-</span>}
      </TableCell>

      {/* Total+HE */}
      <TableCell className="text-right tabular-nums text-sm font-semibold">
        {!item.is_category_header ? formatCurrency(item.total_with_overtime) : ''}
      </TableCell>

      {/* Cond. Pgto */}
      <TableCell className="text-xs">
        {!item.is_category_header && item.payment_condition
          ? PAYMENT_CONDITION_LABELS[item.payment_condition]
          : <span className="text-muted-foreground">-</span>}
      </TableCell>

      {/* Vencimento */}
      <TableCell className={cn('text-xs tabular-nums', isOverdue && 'text-destructive font-medium')}>
        {!item.is_category_header ? formatDate(item.payment_due_date) : ''}
      </TableCell>

      {/* Status */}
      <TableCell>
        {!item.is_category_header && <StatusCell item={item} />}
      </TableCell>

      {/* Pgto */}
      <TableCell className="text-xs">
        {!item.is_category_header && (
          <span
            className={cn(
              'capitalize',
              item.payment_status === 'pago' && 'text-green-700',
              item.payment_status === 'cancelado' && 'text-muted-foreground',
              item.payment_status === 'pendente' && 'text-amber-700',
            )}
          >
            {item.payment_status === 'pago'
              ? `Pago ${formatDate(item.payment_date)}`
              : item.payment_status === 'cancelado'
              ? 'Cancelado'
              : 'Pendente'}
          </span>
        )}
      </TableCell>

      {/* Acoes */}
      <TableCell className="w-10">
        {!item.is_category_header && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Acoes</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Pencil className="h-4 w-4 mr-2" />
                Editar
              </DropdownMenuItem>
              {canPay && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onPay}>
                    <CreditCard className="h-4 w-4 mr-2" />
                    Pagar
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => onDelete(item.id)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </TableCell>
    </TableRow>
  )
}

// ---- CostItemsTable (main) ----

export function CostItemsTable({
  items,
  selectedIds,
  onToggleSelect,
  onEdit,
  onPay,
  isLoading,
}: CostItemsTableProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(() => {
    // Todas as categorias inicialmente expandidas
    const s = new Set<number>()
    for (let i = 1; i <= 20; i++) s.add(i)
    return s
  })
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const { mutateAsync: deleteItem, isPending: isDeleting } = useDeleteCostItem()

  const grouped = groupByCategoryNumber(items)
  const sortedKeys = Array.from(grouped.keys()).sort((a, b) => a - b)

  function toggleGroup(num: number) {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(num)) {
        next.delete(num)
      } else {
        next.add(num)
      }
      return next
    })
  }

  async function handleDelete() {
    if (!deleteId) return
    try {
      await deleteItem(deleteId)
      toast.success('Item excluido com sucesso')
      setDeleteId(null)
    } catch (err) {
      toast.error(safeErrorMessage(err))
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="rounded-md border border-border py-16 flex flex-col items-center justify-center text-center gap-2">
        <p className="text-sm text-muted-foreground">Nenhum item de custo encontrado.</p>
        <p className="text-xs text-muted-foreground">
          Clique em &quot;Adicionar Item&quot; para comecar.
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="rounded-md border border-border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="text-xs">
              <TableHead className="w-8" />
              <TableHead className="w-14">#</TableHead>
              <TableHead className="min-w-[180px]">Descricao</TableHead>
              <TableHead className="min-w-[120px]">Fornecedor</TableHead>
              <TableHead className="text-right">Valor Unit.</TableHead>
              <TableHead className="text-right">Qtd</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">HE</TableHead>
              <TableHead className="text-right">Total+HE</TableHead>
              <TableHead>Cond. Pgto</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Pgto</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedKeys.map(categoryNum => {
              const categoryItems = grouped.get(categoryNum)!
              const isExpanded = expandedGroups.has(categoryNum)

              return (
                <React.Fragment key={`group-${categoryNum}`}>
                  <CategoryHeaderRow
                    items={categoryItems}
                    isExpanded={isExpanded}
                    onToggle={() => toggleGroup(categoryNum)}
                  />
                  {isExpanded &&
                    categoryItems
                      .filter(i => !i.is_category_header)
                      .sort((a, b) => a.sub_item_number - b.sub_item_number)
                      .map(item => (
                        <ItemRow
                          key={item.id}
                          item={item}
                          isSelected={selectedIds.has(item.id)}
                          onToggleSelect={() => onToggleSelect(item.id)}
                          onEdit={() => onEdit(item)}
                          onPay={() => onPay(item)}
                          onDelete={id => setDeleteId(id)}
                        />
                      ))}
                </React.Fragment>
              )
            })}
          </TableBody>
        </Table>
      </div>

      <DeleteConfirmDialog
        open={!!deleteId}
        onOpenChange={open => { if (!open) setDeleteId(null) }}
        onConfirm={handleDelete}
        isPending={isDeleting}
      />
    </>
  )
}
