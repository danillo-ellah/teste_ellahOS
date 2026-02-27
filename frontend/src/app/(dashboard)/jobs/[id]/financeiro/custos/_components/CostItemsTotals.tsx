'use client'

import { formatCurrency } from '@/lib/format'
import type { CostItemListMeta } from '@/types/cost-management'

interface CostItemsTotalsProps {
  meta: CostItemListMeta | undefined
  totalWithOvertime: number
}

export function CostItemsTotals({ meta, totalWithOvertime }: CostItemsTotalsProps) {
  const totalBudgeted = meta?.total_budgeted ?? 0
  const totalPaid = meta?.total_paid ?? 0
  const totalPending = totalBudgeted - totalPaid
  const itemsCount = meta?.total ?? 0

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-md border border-border bg-muted/40 px-4 py-3 text-sm">
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">Total Orcado:</span>
        <span className="font-semibold tabular-nums">{formatCurrency(totalBudgeted)}</span>
      </div>
      <div className="h-4 w-px bg-border hidden sm:block" />
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">Com HE:</span>
        <span className="font-semibold tabular-nums">{formatCurrency(totalWithOvertime)}</span>
      </div>
      <div className="h-4 w-px bg-border hidden sm:block" />
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">Total Pago:</span>
        <span className="font-semibold tabular-nums text-green-700">{formatCurrency(totalPaid)}</span>
      </div>
      <div className="h-4 w-px bg-border hidden sm:block" />
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">Pendente:</span>
        <span className="font-semibold tabular-nums text-amber-700">{formatCurrency(totalPending)}</span>
      </div>
      <div className="h-4 w-px bg-border hidden sm:block" />
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">Itens:</span>
        <span className="font-semibold tabular-nums">{itemsCount}</span>
      </div>
    </div>
  )
}
