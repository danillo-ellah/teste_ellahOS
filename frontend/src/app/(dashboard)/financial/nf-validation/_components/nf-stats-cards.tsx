'use client'

import { Clock, Zap, CheckCircle2, XCircle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { NfStats, NfStatus } from '@/types/nf'

interface CardConfig {
  key: keyof NfStats
  label: string
  description: string
  icon: React.ElementType
  filterStatus: NfStatus | null
  borderClass: string
  iconClass: string
  numberClass: string
}

const CARDS: CardConfig[] = [
  {
    key: 'pending_review',
    label: 'PENDENTES',
    description: 'Aguardando validacao',
    icon: Clock,
    filterStatus: 'pending_review',
    borderClass: 'border-l-amber-500',
    iconClass: 'text-amber-500 dark:text-amber-400',
    numberClass: 'text-amber-700 dark:text-amber-300',
  },
  {
    key: 'auto_matched',
    label: 'AUTO-MATCHED',
    description: 'Match automatico sugerido',
    icon: Zap,
    filterStatus: 'auto_matched',
    borderClass: 'border-l-blue-500',
    iconClass: 'text-blue-500 dark:text-blue-400',
    numberClass: 'text-blue-700 dark:text-blue-300',
  },
  {
    key: 'confirmed_month',
    label: 'CONFIRMADAS NO MES',
    description: 'Mes atual',
    icon: CheckCircle2,
    filterStatus: 'confirmed',
    borderClass: 'border-l-green-500',
    iconClass: 'text-green-500 dark:text-green-400',
    numberClass: 'text-green-700 dark:text-green-300',
  },
  {
    key: 'rejected_month',
    label: 'REJEITADAS NO MES',
    description: 'Mes atual',
    icon: XCircle,
    filterStatus: 'rejected',
    borderClass: 'border-l-red-500',
    iconClass: 'text-red-500 dark:text-red-400',
    numberClass: 'text-red-700 dark:text-red-300',
  },
]

interface NfStatsCardsProps {
  stats: NfStats | undefined
  isLoading: boolean
  activeStatus?: NfStatus | 'all'
  onStatusFilter: (status: NfStatus | null) => void
}

export function NfStatsCards({
  stats,
  isLoading,
  activeStatus,
  onStatusFilter,
}: NfStatsCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4">
        {CARDS.map((card) => (
          <Skeleton key={card.key} className="h-24 rounded-lg" />
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4">
      {CARDS.map((card) => {
        const Icon = card.icon
        const value = stats?.[card.key] ?? 0
        const isClickable = card.filterStatus !== null
        const isActive = activeStatus === card.filterStatus

        return (
          <Card
            key={card.key}
            onClick={
              isClickable
                ? () => onStatusFilter(isActive ? null : card.filterStatus)
                : undefined
            }
            className={cn(
              'border-l-[3px] p-5 transition-all duration-150',
              card.borderClass,
              isClickable && 'cursor-pointer hover:ring-2 hover:ring-offset-2',
              isActive && 'ring-2 ring-offset-2',
              card.filterStatus === 'pending_review' &&
                (isActive
                  ? 'ring-amber-300 dark:ring-amber-700'
                  : 'hover:ring-amber-300 dark:hover:ring-amber-700'),
              card.filterStatus === 'auto_matched' &&
                (isActive
                  ? 'ring-blue-300 dark:ring-blue-700'
                  : 'hover:ring-blue-300 dark:hover:ring-blue-700'),
              card.filterStatus === 'confirmed' &&
                (isActive
                  ? 'ring-green-300 dark:ring-green-700'
                  : 'hover:ring-green-300 dark:hover:ring-green-700'),
              card.filterStatus === 'rejected' &&
                (isActive
                  ? 'ring-red-300 dark:ring-red-700'
                  : 'hover:ring-red-300 dark:hover:ring-red-700'),
            )}
          >
            <CardContent className="p-0">
              <div className="flex items-start justify-between">
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                  {card.label}
                </p>
                <Icon className={cn('h-5 w-5 shrink-0', card.iconClass)} />
              </div>
              <p className={cn('mt-2 text-3xl font-bold', card.numberClass)}>
                {value}
              </p>
              <p className="mt-1 text-xs text-zinc-500">{card.description}</p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
