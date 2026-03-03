'use client'

import { cn } from '@/lib/utils'
import type { ReconciliationStatus } from '@/types/bank-reconciliation'
import type { BankTransaction } from '@/types/bank-reconciliation'

// Determina o status de conciliacao de uma transacao para exibicao
export function getReconciliationStatus(tx: BankTransaction): ReconciliationStatus {
  if (tx.reconciled) return 'reconciled'
  if (tx.amount > 0) return 'credit'
  if (tx.match_confidence !== null && tx.match_confidence >= 0.5) return 'suggested'
  return 'unreconciled'
}

interface StatusConfig {
  label: string
  className: string
  dotColor: string
}

const STATUS_CONFIG: Record<ReconciliationStatus, StatusConfig> = {
  reconciled: {
    label: 'Conciliado',
    className: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800',
    dotColor: 'bg-green-500',
  },
  suggested: {
    label: 'Sugestao',
    className: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800',
    dotColor: 'bg-amber-500',
  },
  unreconciled: {
    label: 'Nao conciliado',
    className: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800',
    dotColor: 'bg-red-500',
  },
  credit: {
    label: 'Credito',
    className: 'bg-zinc-50 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700',
    dotColor: 'bg-zinc-400',
  },
}

interface ReconciliationStatusBadgeProps {
  status: ReconciliationStatus
  confidence?: number | null
  className?: string
}

export function ReconciliationStatusBadge({
  status,
  confidence,
  className,
}: ReconciliationStatusBadgeProps) {
  const config = STATUS_CONFIG[status]

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium',
        config.className,
        className,
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', config.dotColor)} />
      {config.label}
      {status === 'suggested' && confidence !== null && confidence !== undefined && (
        <span className="opacity-70">{Math.round(confidence * 100)}%</span>
      )}
    </span>
  )
}
