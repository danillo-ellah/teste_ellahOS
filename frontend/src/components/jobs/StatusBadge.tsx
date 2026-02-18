import { JOB_STATUS_COLORS, JOB_STATUS_LABELS, JOB_STATUS_EMOJI } from '@/lib/constants'
import { cn } from '@/lib/utils'
import type { JobStatus } from '@/types/jobs'

interface StatusBadgeProps {
  status: JobStatus
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const color = JOB_STATUS_COLORS[status]
  const label = JOB_STATUS_LABELS[status]
  const emoji = JOB_STATUS_EMOJI[status]

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 h-[22px] rounded-full text-xs font-medium whitespace-nowrap',
        className
      )}
      style={{
        backgroundColor: `${color}1A`,
        color,
      }}
    >
      <span
        className="text-[11px] leading-none select-none shrink-0"
        aria-hidden="true"
      >
        {emoji}
      </span>
      {label}
    </span>
  )
}
