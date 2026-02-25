'use client'

import { cn } from '@/lib/utils'
import type { NfStatus } from '@/types/nf'

const STATUS_CONFIG: Record<
  NfStatus,
  { label: string; dotClass: string; textClass: string; bgClass: string }
> = {
  pending_review: {
    label: 'Pendente',
    dotClass: 'bg-amber-500',
    textClass: 'text-amber-700 dark:text-amber-400',
    bgClass: 'bg-amber-100 dark:bg-amber-500/10',
  },
  auto_matched: {
    label: 'Auto-matched',
    dotClass: 'bg-blue-500',
    textClass: 'text-blue-700 dark:text-blue-400',
    bgClass: 'bg-blue-100 dark:bg-blue-500/10',
  },
  confirmed: {
    label: 'Confirmado',
    dotClass: 'bg-green-500',
    textClass: 'text-green-700 dark:text-green-400',
    bgClass: 'bg-green-100 dark:bg-green-500/10',
  },
  rejected: {
    label: 'Rejeitado',
    dotClass: 'bg-red-500',
    textClass: 'text-red-700 dark:text-red-400',
    bgClass: 'bg-red-100 dark:bg-red-500/10',
  },
  processing: {
    label: 'Processando',
    dotClass: 'bg-zinc-400',
    textClass: 'text-zinc-600 dark:text-zinc-400',
    bgClass: 'bg-zinc-100 dark:bg-zinc-500/10',
  },
}

interface NfStatusBadgeProps {
  status: NfStatus
  className?: string
}

export function NfStatusBadge({ status, className }: NfStatusBadgeProps) {
  const config = STATUS_CONFIG[status]

  return (
    <span
      aria-label={`Status: ${config.label}`}
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
        config.bgClass,
        config.textClass,
        className,
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', config.dotClass)} />
      {config.label}
    </span>
  )
}
