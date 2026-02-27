'use client'

import { Badge } from '@/components/ui/badge'
import {
  ITEM_STATUS_LABELS,
  ITEM_STATUS_COLORS,
  type ItemStatus,
} from '@/types/cost-management'
import { cn } from '@/lib/utils'

interface CostItemStatusBadgeProps {
  status: ItemStatus
}

export function CostItemStatusBadge({ status }: CostItemStatusBadgeProps) {
  return (
    <Badge
      variant="secondary"
      className={cn('text-xs font-medium', ITEM_STATUS_COLORS[status])}
    >
      {ITEM_STATUS_LABELS[status]}
    </Badge>
  )
}
