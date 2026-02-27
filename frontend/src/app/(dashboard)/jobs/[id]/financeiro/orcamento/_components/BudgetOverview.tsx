'use client'

import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { formatCurrency, formatPercentage } from '@/lib/format'
import { TrendingUp, TrendingDown } from 'lucide-react'
import type { BudgetSummary } from '@/types/cost-management'

interface BudgetOverviewProps {
  summary: BudgetSummary
}

interface KPICardProps {
  label: string
  value: string
  subtitle?: string
  variant?: 'default' | 'success' | 'warning' | 'danger'
  icon?: React.ReactNode
}

function KPICard({ label, value, subtitle, variant = 'default', icon }: KPICardProps) {
  return (
    <Card className="p-4 flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
        {icon && <span className="text-muted-foreground">{icon}</span>}
      </div>
      <p
        className={cn(
          'text-2xl font-bold tabular-nums',
          variant === 'success' && 'text-green-600',
          variant === 'warning' && 'text-yellow-600',
          variant === 'danger' && 'text-red-600',
        )}
      >
        {value}
      </p>
      {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
    </Card>
  )
}

function marginVariant(pct: number): 'success' | 'warning' | 'danger' {
  if (pct >= 30) return 'success'
  if (pct >= 10) return 'warning'
  return 'danger'
}

function marginBarColor(pct: number): string {
  if (pct >= 30) return 'bg-green-500'
  if (pct >= 10) return 'bg-yellow-500'
  return 'bg-red-500'
}

export function BudgetOverview({ summary }: BudgetOverviewProps) {
  const {
    budget_mode,
    budget_value,
    total_estimated,
    total_paid,
    balance,
    margin_gross,
    margin_pct,
  } = summary

  const executionPct =
    total_estimated > 0 ? Math.min(100, (total_paid / total_estimated) * 100) : 0

  const marginColor = marginBarColor(margin_pct)
  const mVariant = marginVariant(margin_pct)

  return (
    <div className="space-y-4">
      {budget_mode === 'bottom_up' ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <KPICard
            label="Total Estimado"
            value={formatCurrency(total_estimated)}
            subtitle="Soma dos itens orcados"
          />
          <KPICard
            label="Total Pago"
            value={formatCurrency(total_paid)}
            variant="success"
            subtitle="Itens com pagamento confirmado"
          />
          <KPICard
            label="Saldo Restante"
            value={formatCurrency(balance)}
            variant={balance >= 0 ? 'success' : 'danger'}
            icon={
              balance >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500" />
              )
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <KPICard
            label="Teto (OC / Faturamento)"
            value={formatCurrency(budget_value)}
            subtitle="Valor fechado com o cliente"
          />
          <KPICard
            label="Total Estimado"
            value={formatCurrency(total_estimated)}
            subtitle="Soma dos itens de custo"
          />
          <KPICard
            label="Margem Bruta"
            value={formatCurrency(margin_gross)}
            variant={margin_gross >= 0 ? 'success' : 'danger'}
            icon={
              margin_gross >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500" />
              )
            }
          />
          <Card className="p-4 flex flex-col gap-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Margem %
            </p>
            <p
              className={cn(
                'text-2xl font-bold tabular-nums',
                mVariant === 'success' && 'text-green-600',
                mVariant === 'warning' && 'text-yellow-600',
                mVariant === 'danger' && 'text-red-600',
              )}
            >
              {formatPercentage(margin_pct)}
            </p>
            <div className="mt-1 h-1.5 w-full rounded-full bg-muted overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all', marginColor)}
                style={{ width: `${Math.min(100, Math.max(0, margin_pct))}%` }}
              />
            </div>
          </Card>
        </div>
      )}

      {/* Barra de execucao */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Execucao Financeira
          </p>
          <span className="text-sm font-semibold tabular-nums">
            {formatCurrency(total_paid)} / {formatCurrency(total_estimated)}
          </span>
        </div>
        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all',
              executionPct >= 80 ? 'bg-green-500' : executionPct > 0 ? 'bg-blue-500' : 'bg-muted',
            )}
            style={{ width: `${executionPct}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-1.5">
          {formatPercentage(executionPct)} do estimado ja pago
        </p>
      </Card>
    </div>
  )
}
