import { cn } from '@/lib/utils'

interface HealthBarProps {
  score: number | null
  className?: string
}

export function getScoreColor(score: number): string {
  if (score >= 70) return 'text-green-500 dark:text-green-400'
  if (score >= 40) return 'text-yellow-500 dark:text-yellow-400'
  return 'text-red-500 dark:text-red-400'
}

export function getFillColor(score: number): string {
  if (score >= 70) return 'bg-green-500'
  if (score >= 40) return 'bg-yellow-500'
  return 'bg-red-500'
}

export function HealthBar({ score, className }: HealthBarProps) {
  if (score === null) {
    return (
      <span className={cn('text-xs text-muted-foreground', className)}>-</span>
    )
  }

  const clampedScore = Math.min(100, Math.max(0, score))

  return (
    <div className={cn('flex flex-col items-center gap-1', className)}>
      <span className={cn('text-sm font-semibold tabular-nums', getScoreColor(clampedScore))}>
        {clampedScore}
      </span>
      <div className="w-10 h-2 rounded-full bg-muted/60 overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all', getFillColor(clampedScore))}
          style={{ width: `${clampedScore}%` }}
        />
      </div>
    </div>
  )
}
