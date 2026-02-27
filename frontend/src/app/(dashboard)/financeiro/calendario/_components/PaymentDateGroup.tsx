'use client'

import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { CostItemStatusBadge } from '@/app/(dashboard)/jobs/[id]/financeiro/custos/_components/CostItemStatusBadge'
import { formatDate, formatCurrency } from '@/lib/format'
import type { CostItem } from '@/types/cost-management'

export interface PaymentDateGroupProps {
  date: string
  items: CostItem[]
  selectedIds: Set<string>
  onToggleSelect: (id: string) => void
  isOverdue: boolean
}

export function PaymentDateGroup({
  date,
  items,
  selectedIds,
  onToggleSelect,
  isOverdue,
}: PaymentDateGroupProps) {
  const groupTotal = items.reduce((sum, item) => sum + item.total_with_overtime, 0)
  const allSelected = items.length > 0 && items.every(item => selectedIds.has(item.id))
  const someSelected = items.some(item => selectedIds.has(item.id))

  function handleSelectAll(checked: boolean) {
    for (const item of items) {
      const isCurrentlySelected = selectedIds.has(item.id)
      if (checked && !isCurrentlySelected) {
        onToggleSelect(item.id)
      } else if (!checked && isCurrentlySelected) {
        onToggleSelect(item.id)
      }
    }
  }

  const displayDate = date === 'sem_data' ? 'Sem data de vencimento' : formatDate(date)

  return (
    <div className="rounded-md border overflow-hidden">
      {/* Header do grupo */}
      <div className="flex items-center justify-between gap-3 bg-muted/40 px-4 py-2.5 border-b">
        <div className="flex items-center gap-3">
          <Checkbox
            checked={allSelected}
            data-state={someSelected && !allSelected ? 'indeterminate' : undefined}
            onCheckedChange={checked => handleSelectAll(!!checked)}
            aria-label={`Selecionar todos os itens de ${displayDate}`}
          />
          <span className="text-sm font-semibold">{displayDate}</span>
          {isOverdue && (
            <Badge variant="destructive" className="text-xs">
              Vencido
            </Badge>
          )}
          <span className="text-xs text-muted-foreground">
            {items.length} item(s)
          </span>
        </div>
        <span className="text-sm font-semibold tabular-nums">{formatCurrency(groupTotal)}</span>
      </div>

      {/* Lista de itens */}
      <div className="divide-y">
        {items.map(item => (
          <div
            key={item.id}
            className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/20 transition-colors"
          >
            <Checkbox
              checked={selectedIds.has(item.id)}
              onCheckedChange={() => onToggleSelect(item.id)}
              aria-label={`Selecionar ${item.service_description}`}
            />

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{item.service_description}</p>
              {item.vendor_name_snapshot && (
                <p className="text-xs text-muted-foreground truncate">{item.vendor_name_snapshot}</p>
              )}
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <span className="text-sm font-medium tabular-nums">
                {formatCurrency(item.total_with_overtime)}
              </span>
              <CostItemStatusBadge status={item.item_status} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
