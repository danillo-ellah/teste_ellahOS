import { ArrowUp, Minus, ArrowDown } from 'lucide-react'
import { PRIORITY_LABELS, PRIORITY_STYLE_MAP } from '@/lib/constants'
import { cn } from '@/lib/utils'
import type { PriorityLevel } from '@/types/jobs'

const PRIORITY_ICONS: Record<PriorityLevel, typeof ArrowUp> = {
  alta: ArrowUp,
  media: Minus,
  baixa: ArrowDown,
}

interface PriorityBadgeProps {
  priority: PriorityLevel
  className?: string
}

export function PriorityBadge({ priority, className }: PriorityBadgeProps) {
  const style = PRIORITY_STYLE_MAP[priority]
  const Icon = PRIORITY_ICONS[priority]

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
        style.bgClass,
        style.textClass,
        className,
      )}
    >
      <Icon className="size-3" />
      {PRIORITY_LABELS[priority]}
    </span>
  )
}
