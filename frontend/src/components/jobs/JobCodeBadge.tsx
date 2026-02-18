import { cn } from '@/lib/utils'

interface JobCodeBadgeProps {
  code: string
  className?: string
}

export function JobCodeBadge({ code, className }: JobCodeBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center h-5 px-1.5 py-0.5 rounded',
        'font-mono text-[10px] font-medium',
        'bg-zinc-100 dark:bg-zinc-800',
        'text-zinc-700 dark:text-zinc-300',
        className
      )}
    >
      {code}
    </span>
  )
}
