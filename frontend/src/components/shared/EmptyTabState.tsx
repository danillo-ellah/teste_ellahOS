import type { LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface EmptyTabStateProps {
  icon: LucideIcon
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
}

export function EmptyTabState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyTabStateProps) {
  return (
    <div className="rounded-lg border border-border py-16 flex flex-col items-center justify-center text-center gap-3">
      <div className="size-12 rounded-full bg-muted flex items-center justify-center">
        <Icon className="size-6 text-muted-foreground" />
      </div>
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-[300px]">
        {description}
      </p>
      {actionLabel && onAction && (
        <Button variant="outline" size="sm" onClick={onAction} className="mt-2">
          {actionLabel}
        </Button>
      )}
    </div>
  )
}
