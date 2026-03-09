'use client'

import { Badge } from '@/components/ui/badge'
import type { DayStatus } from '@/types/production-diary'

interface DayStatusBadgeProps {
  status: DayStatus | null
  hasBulletin: boolean
  className?: string
}

const STATUS_CONFIG: Record<DayStatus, { label: string; className: string }> = {
  no_cronograma: {
    label: 'No cronograma',
    className: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20',
  },
  adiantado: {
    label: 'Adiantado',
    className: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  },
  atrasado: {
    label: 'Atrasado',
    className: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
  },
}

export function DayStatusBadge({ status, hasBulletin, className }: DayStatusBadgeProps) {
  if (status) {
    const cfg = STATUS_CONFIG[status]
    return (
      <Badge variant="outline" className={`${cfg.className} ${className ?? ''}`}>
        {cfg.label}
      </Badge>
    )
  }

  // Mostra "Boletim pendente" apenas quando nao ha status E nao ha resumo executivo.
  // Entries que nunca tiveram boletim preenchido exibem o indicador para lembrar o DP.
  if (!hasBulletin) {
    return (
      <Badge variant="outline" className={`text-muted-foreground border-dashed ${className ?? ''}`}>
        Boletim pendente
      </Badge>
    )
  }

  return null
}
