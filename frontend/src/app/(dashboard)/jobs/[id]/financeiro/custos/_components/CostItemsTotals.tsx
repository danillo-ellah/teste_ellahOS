'use client'

import { formatCurrency } from '@/lib/format'
import type { CostItem, CostItemListMeta } from '@/types/cost-management'
import { TrendingUp } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface CostItemsTotalsProps {
  meta: CostItemListMeta | undefined
  totalWithOvertime: number
  items?: CostItem[]
}

/**
 * Calcula quantos itens pagos tem divergencia > 10% entre total_with_overtime e actual_paid_value.
 */
function countDivergentItems(items: CostItem[]): number {
  return items.filter(item => {
    if (item.is_category_header) return false
    if (item.payment_status !== 'pago') return false
    if (item.actual_paid_value == null) return false
    const budgeted = item.total_with_overtime
    if (!budgeted) return false
    const absDiff = Math.abs(((item.actual_paid_value - budgeted) / budgeted) * 100)
    return absDiff > 10
  }).length
}

export function CostItemsTotals({ meta, totalWithOvertime, items = [] }: CostItemsTotalsProps) {
  const totalBudgeted = meta?.total_budgeted ?? 0
  const totalPaid = meta?.total_paid ?? 0
  const totalPending = totalBudgeted - totalPaid
  const itemsCount = meta?.total ?? 0
  const divergentCount = countDivergentItems(items)

  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-3 rounded-lg border border-border bg-muted/40 px-5 py-3.5 text-sm">
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-muted-foreground uppercase tracking-wide">Orcado</span>
        <span className="font-semibold tabular-nums">{formatCurrency(totalBudgeted)}</span>
      </div>
      <div className="h-4 w-px bg-border hidden sm:block" aria-hidden />
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-muted-foreground uppercase tracking-wide">C/ HE</span>
        <span className="font-semibold tabular-nums">{formatCurrency(totalWithOvertime)}</span>
      </div>
      <div className="h-4 w-px bg-border hidden sm:block" aria-hidden />
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-muted-foreground uppercase tracking-wide">Pago</span>
        <span className="font-semibold tabular-nums text-green-700 dark:text-green-400">{formatCurrency(totalPaid)}</span>
      </div>
      <div className="h-4 w-px bg-border hidden sm:block" aria-hidden />
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-muted-foreground uppercase tracking-wide">Pendente</span>
        <span className="font-semibold tabular-nums text-amber-700 dark:text-amber-400">{formatCurrency(totalPending)}</span>
      </div>
      <div className="h-4 w-px bg-border hidden sm:block" aria-hidden />
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-muted-foreground uppercase tracking-wide">Itens</span>
        <span className="font-semibold tabular-nums">{itemsCount}</span>
      </div>

      {/* Indicador de divergencia — so aparece quando ha itens com divergencia > 10% */}
      {divergentCount > 0 && (
        <>
          <div className="h-4 w-px bg-border hidden sm:block" aria-hidden />
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1.5 cursor-help" role="status">
                  <TrendingUp className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                  <span className="font-semibold tabular-nums text-amber-700 dark:text-amber-400">
                    {divergentCount} {divergentCount === 1 ? 'item' : 'itens'} com divergencia
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs max-w-xs">
                {divergentCount} {divergentCount === 1 ? 'item pago tem' : 'itens pagos tem'} divergencia
                superior a 10% entre o valor orcado e o valor pago real.
                Clique em cada item para ver os detalhes.
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </>
      )}
    </div>
  )
}
