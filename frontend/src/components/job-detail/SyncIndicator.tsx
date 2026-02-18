'use client'

import { Check, AlertCircle, Loader2, Cloud } from 'lucide-react'
import { cn } from '@/lib/utils'

export type SyncState = 'idle' | 'pending' | 'saving' | 'saved' | 'error'

interface SyncIndicatorProps {
  state: SyncState
  className?: string
}

const CONFIG: Record<Exclude<SyncState, 'idle'>, {
  icon: typeof Cloud
  label: string
  className: string
  animate?: boolean
}> = {
  pending: {
    icon: Cloud,
    label: 'Alteracoes pendentes',
    className: 'text-muted-foreground',
  },
  saving: {
    icon: Loader2,
    label: 'Salvando...',
    className: 'text-muted-foreground',
    animate: true,
  },
  saved: {
    icon: Check,
    label: 'Salvo',
    className: 'text-green-500 dark:text-green-400',
  },
  error: {
    icon: AlertCircle,
    label: 'Erro ao salvar',
    className: 'text-red-500 dark:text-red-400',
  },
}

export function SyncIndicator({ state, className }: SyncIndicatorProps) {
  if (state === 'idle') return null

  const config = CONFIG[state as Exclude<SyncState, 'idle'>]
  const Icon = config.icon

  return (
    <div
      className={cn(
        'flex items-center gap-1.5 text-xs transition-opacity duration-300',
        config.className,
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <Icon className={cn('size-3.5', config.animate && 'animate-spin')} />
      <span>{config.label}</span>
    </div>
  )
}
