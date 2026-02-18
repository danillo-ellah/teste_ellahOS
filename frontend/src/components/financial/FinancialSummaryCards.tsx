'use client'

import { DollarSign, TrendingUp, TrendingDown, Wallet } from 'lucide-react'
import { formatCurrency } from '@/lib/format'
import { cn } from '@/lib/utils'

interface FinancialSummaryCardsProps {
  totalReceitas: number
  totalDespesas: number
  saldo: number
  isLoading?: boolean
}

export function FinancialSummaryCards({
  totalReceitas,
  totalDespesas,
  saldo,
  isLoading,
}: FinancialSummaryCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-lg border bg-muted" />
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <Card
        icon={TrendingUp}
        label="Total Receitas"
        value={formatCurrency(totalReceitas)}
        className="text-green-600 dark:text-green-400"
      />
      <Card
        icon={TrendingDown}
        label="Total Despesas"
        value={formatCurrency(totalDespesas)}
        className="text-red-600 dark:text-red-400"
      />
      <Card
        icon={Wallet}
        label="Saldo"
        value={formatCurrency(saldo)}
        className={cn(
          saldo >= 0
            ? 'text-green-600 dark:text-green-400'
            : 'text-red-600 dark:text-red-400',
        )}
      />
    </div>
  )
}

function Card({
  icon: Icon,
  label,
  value,
  className,
}: {
  icon: typeof DollarSign
  label: string
  value: string
  className?: string
}) {
  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-center gap-2 text-muted-foreground mb-2">
        <Icon className="size-4" />
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className={cn('text-xl font-semibold', className)}>{value}</p>
    </div>
  )
}
