import { Minus, TrendingDown, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MarginBadgeProps {
  value: number | null
  className?: string
}

const marginConfig = {
  good: {
    Icon: TrendingUp,
    text: 'text-green-600 dark:text-green-400',
    bg: 'bg-green-500/10',
  },
  medium: {
    Icon: Minus,
    text: 'text-yellow-600 dark:text-yellow-400',
    bg: 'bg-yellow-500/10',
  },
  bad: {
    Icon: TrendingDown,
    text: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-500/10',
  },
} as const

function getLevel(value: number) {
  if (value >= 30) return 'good'
  if (value >= 15) return 'medium'
  return 'bad'
}

export function MarginBadge({ value, className }: MarginBadgeProps) {
  if (value === null) {
    return (
      <span className={cn('text-xs text-muted-foreground', className)}>-</span>
    )
  }

  const level = getLevel(value)
  const config = marginConfig[level]
  const { Icon } = config

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-xs font-medium',
        config.bg,
        className,
      )}
    >
      <Icon className={cn('size-3 shrink-0', config.text)} aria-hidden="true" />
      <span className={config.text}>{Math.round(value)}%</span>
    </span>
  )
}
