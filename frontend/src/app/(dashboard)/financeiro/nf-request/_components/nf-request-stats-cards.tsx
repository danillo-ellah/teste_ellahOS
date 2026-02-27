'use client'

import { InboxIcon, SendHorizonal, Clock } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { NfRequestStats } from '@/types/nf'

interface CardConfig {
  key: keyof NfRequestStats
  label: string
  description: string
  icon: React.ElementType
  borderClass: string
  iconClass: string
  numberClass: string
}

const CARDS: CardConfig[] = [
  {
    key: 'total_pending',
    label: 'TOTAL PENDENTES',
    description: 'Lancamentos sem NF',
    icon: InboxIcon,
    borderClass: 'border-l-amber-500',
    iconClass: 'text-amber-500 dark:text-amber-400',
    numberClass: 'text-amber-700 dark:text-amber-300',
  },
  {
    key: 'sent_today',
    label: 'ENVIADOS HOJE',
    description: 'Pedidos enviados no dia',
    icon: SendHorizonal,
    borderClass: 'border-l-blue-500',
    iconClass: 'text-blue-500 dark:text-blue-400',
    numberClass: 'text-blue-700 dark:text-blue-300',
  },
  {
    key: 'awaiting_response',
    label: 'AGUARDANDO RESPOSTA',
    description: 'Pedidos sem retorno',
    icon: Clock,
    borderClass: 'border-l-zinc-400',
    iconClass: 'text-zinc-500 dark:text-zinc-400',
    numberClass: 'text-zinc-700 dark:text-zinc-300',
  },
]

interface NfRequestStatsCardsProps {
  stats: NfRequestStats | undefined
  isLoading: boolean
}

export function NfRequestStatsCards({
  stats,
  isLoading,
}: NfRequestStatsCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:gap-4">
        {CARDS.map((card) => (
          <Skeleton key={card.key} className="h-24 rounded-lg" />
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:gap-4">
      {CARDS.map((card) => {
        const Icon = card.icon
        const value = stats?.[card.key] ?? 0

        return (
          <Card
            key={card.key}
            className={cn('border-l-[3px] p-5', card.borderClass)}
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
