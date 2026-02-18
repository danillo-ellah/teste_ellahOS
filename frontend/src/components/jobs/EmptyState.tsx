import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

interface EmptyStateProps {
  icon?: ReactNode
  emoji?: string
  title: string
  description: string
  action?: {
    label: string
    onClick: () => void
    variant?: 'default' | 'outline'
  }
  className?: string
}

export function EmptyState({
  icon,
  emoji,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'py-16 flex flex-col items-center justify-center text-center gap-4',
        className
      )}
    >
      {emoji ? (
        <span
          className="text-5xl select-none"
          role="img"
          aria-hidden="true"
        >
          {emoji}
        </span>
      ) : icon ? (
        <div className="text-muted-foreground/60 [&_svg]:size-12">
          {icon}
        </div>
      ) : null}
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-[300px]">
        {description}
      </p>
      {action && (
        <Button
          className="mt-6"
          variant={action.variant ?? 'default'}
          onClick={action.onClick}
        >
          {action.label}
        </Button>
      )}
    </div>
  )
}
