'use client'

import type { DocuSealStatus } from '@/types/docuseal'
import { DOCUSEAL_STATUS_LABELS } from '@/types/docuseal'
import { cn } from '@/lib/utils'

interface ContractStatusBadgeProps {
  status: DocuSealStatus
  className?: string
}

// Mapa de classes por status DocuSeal
const STATUS_CLASS_MAP: Record<DocuSealStatus, string> = {
  pending: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
  sent: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  opened: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  partially_signed: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  signed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  declined: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  expired: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  error: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
}

export function ContractStatusBadge({ status, className }: ContractStatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
        STATUS_CLASS_MAP[status] ?? 'bg-zinc-100 text-zinc-600',
        className,
      )}
    >
      {DOCUSEAL_STATUS_LABELS[status] ?? status}
    </span>
  )
}
