'use client'

import { cn } from '@/lib/utils'
import { formatCurrency, formatPercentage } from '@/lib/format'
import type { CostCategorySummary } from '@/types/cost-management'

interface BudgetCategoryTableProps {
  rows: CostCategorySummary[]
}

function execVariant(pct: number): string {
  if (pct >= 80) return 'text-green-600'
  if (pct > 0) return 'text-yellow-600'
  return 'text-muted-foreground'
}

function execBarColor(pct: number): string {
  if (pct >= 80) return 'bg-green-500'
  if (pct > 0) return 'bg-yellow-500'
  return 'bg-muted-foreground/30'
}

export function BudgetCategoryTable({ rows }: BudgetCategoryTableProps) {
  const data = rows.filter(r => r.item_number !== null)
  const total = rows.find(r => r.item_number === null)

  if (data.length === 0) {
    return (
      <div className="rounded-md border py-10 text-center">
        <p className="text-sm text-muted-foreground">
          Nenhuma categoria encontrada. Aplique um template para comecar.
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Categoria</th>
            <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Itens</th>
            <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Orcado</th>
            <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Pago</th>
            <th className="px-4 py-2.5 text-right font-medium text-muted-foreground w-32">
              % Exec
            </th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr
              key={idx}
              className="border-b last:border-0 hover:bg-muted/30 transition-colors"
            >
              <td className="px-4 py-2.5 font-medium">
                {row.item_number !== null && (
                  <span className="text-muted-foreground mr-1.5">{row.item_number}.</span>
                )}
                {row.item_name}
              </td>
              <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">
                {row.items_total}
              </td>
              <td className="px-4 py-2.5 text-right tabular-nums">
                {formatCurrency(row.total_budgeted)}
              </td>
              <td className="px-4 py-2.5 text-right tabular-nums">
                {formatCurrency(row.total_paid)}
              </td>
              <td className="px-4 py-2.5">
                <div className="flex items-center gap-2 justify-end">
                  <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all',
                        execBarColor(row.pct_paid),
                      )}
                      style={{ width: `${Math.min(100, Math.max(0, row.pct_paid))}%` }}
                    />
                  </div>
                  <span className={cn('text-xs font-medium tabular-nums w-12 text-right', execVariant(row.pct_paid))}>
                    {formatPercentage(row.pct_paid)}
                  </span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
        {total && (
          <tfoot>
            <tr className="border-t bg-muted/50 font-semibold">
              <td className="px-4 py-2.5">Total</td>
              <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">
                {total.items_total}
              </td>
              <td className="px-4 py-2.5 text-right tabular-nums">
                {formatCurrency(total.total_budgeted)}
              </td>
              <td className="px-4 py-2.5 text-right tabular-nums">
                {formatCurrency(total.total_paid)}
              </td>
              <td className="px-4 py-2.5">
                <div className="flex items-center gap-2 justify-end">
                  <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all',
                        execBarColor(total.pct_paid),
                      )}
                      style={{ width: `${Math.min(100, Math.max(0, total.pct_paid))}%` }}
                    />
                  </div>
                  <span className={cn('text-xs font-medium tabular-nums w-12 text-right', execVariant(total.pct_paid))}>
                    {formatPercentage(total.pct_paid)}
                  </span>
                </div>
              </td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  )
}
