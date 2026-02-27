'use client'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { NfRequestStatus } from '@/types/nf'

interface NfRequestStatusBadgeProps {
  status: NfRequestStatus
  className?: string
}

const STATUS_CONFIG: Record<
  NfRequestStatus,
  { label: string; className: string }
> = {
  sem_nf: {
    label: 'Sem NF',
    className:
      'text-amber-700 bg-amber-100 dark:text-amber-400 dark:bg-amber-500/10',
  },
  enviado: {
    label: 'Enviado',
    className:
      'text-blue-700 bg-blue-100 dark:text-blue-400 dark:bg-blue-500/10',
  },
  enviado_confirmado: {
    label: 'Confirmado',
    className:
      'text-green-700 bg-green-100 dark:text-green-400 dark:bg-green-500/10',
  },
}

export function NfRequestStatusBadge({
  status,
  className,
}: NfRequestStatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.sem_nf

  return (
    <Badge
      variant="outline"
      className={cn(
        'border-transparent text-xs font-medium',
        config.className,
        className,
      )}
    >
      {config.label}
    </Badge>
  )
}
