'use client'

import type { ReactNode } from 'react'
import { TrendingDown, TrendingUp, AlertTriangle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/format'
import type { PaymentCalendarKpis as KpisType } from '@/types/payment-calendar'

interface PaymentCalendarKpisProps {
  kpis: KpisType | undefined
  isLoading: boolean
}

// Skeleton de um card KPI
function KpiCardSkeleton() {
  return (
    <Card>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-8 rounded-lg" />
        </div>
        <Skeleton className="h-7 w-32 mb-1" />
        <Skeleton className="h-3 w-20" />
      </CardContent>
    </Card>
  )
}

interface KpiCardProps {
  label: string
  value: number | undefined
  subtitle?: string
  icon: ReactNode
  iconBg: string
  valueColor?: string
}

function KpiCard({ label, value, subtitle, icon, iconBg, valueColor }: KpiCardProps) {
  return (
    <Card>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide leading-tight">
            {label}
          </span>
          <div className={cn('p-1.5 rounded-lg shrink-0', iconBg)}>
            {icon}
          </div>
        </div>
        <p className={cn('text-2xl font-bold tabular-nums', valueColor)}>
          {value !== undefined ? formatCurrency(value) : '-'}
        </p>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  )
}

export function PaymentCalendarKpis({ kpis, isLoading }: PaymentCalendarKpisProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCardSkeleton />
        <KpiCardSkeleton />
        <KpiCardSkeleton />
        <KpiCardSkeleton />
      </div>
    )
  }

  // Saldo projetado: positivo = azul, negativo = vermelho
  const balancePositive = (kpis?.net_balance ?? 0) >= 0

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {/* A Pagar */}
      <KpiCard
        label="A Pagar"
        value={kpis?.total_payable}
        subtitle={kpis?.due_this_week ? `${formatCurrency(kpis.due_this_week)} esta semana` : undefined}
        icon={<TrendingDown className="h-4 w-4 text-amber-600 dark:text-amber-400" />}
        iconBg="bg-amber-100 dark:bg-amber-900/30"
        valueColor="text-amber-700 dark:text-amber-400"
      />

      {/* A Receber */}
      <KpiCard
        label="A Receber"
        value={kpis?.total_receivable}
        subtitle={kpis?.paid_in_period ? `${formatCurrency(kpis.paid_in_period)} pagos` : undefined}
        icon={<TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />}
        iconBg="bg-emerald-100 dark:bg-emerald-900/30"
        valueColor="text-emerald-700 dark:text-emerald-400"
      />

      {/* Saldo Projetado */}
      <KpiCard
        label="Saldo Projetado"
        value={kpis?.net_balance}
        icon={
          balancePositive
            ? <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            : <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
        }
        iconBg={
          balancePositive
            ? 'bg-blue-100 dark:bg-blue-900/30'
            : 'bg-red-100 dark:bg-red-900/30'
        }
        valueColor={
          balancePositive
            ? 'text-blue-700 dark:text-blue-400'
            : 'text-red-700 dark:text-red-400'
        }
      />

      {/* Atrasados */}
      <KpiCard
        label="Atrasados"
        value={kpis?.overdue_amount}
        subtitle={
          kpis?.overdue_count !== undefined && kpis.overdue_count > 0
            ? `${kpis.overdue_count} item(s) vencido(s)`
            : 'Nenhum em atraso'
        }
        icon={<AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />}
        iconBg={
          (kpis?.overdue_count ?? 0) > 0
            ? 'bg-red-100 dark:bg-red-900/30'
            : 'bg-neutral-100 dark:bg-neutral-800'
        }
        valueColor={
          (kpis?.overdue_count ?? 0) > 0
            ? 'text-red-700 dark:text-red-400'
            : 'text-muted-foreground'
        }
      />
    </div>
  )
}
