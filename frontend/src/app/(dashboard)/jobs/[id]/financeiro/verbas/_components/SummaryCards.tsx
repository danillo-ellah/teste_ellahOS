'use client'

import { AlertTriangle, TrendingDown, Wallet } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { CashAdvancesSummary } from '@/types/cost-management'

// ============ KPI Card ============

interface KpiCardProps {
  label: string
  value: number
  variant?: 'default' | 'success' | 'danger' | 'warning' | 'muted'
  hint?: string
}

function KpiCard({ label, value, variant = 'default', hint }: KpiCardProps) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border bg-card p-4">
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {label}
      </span>
      <span
        className={cn(
          'text-2xl font-bold tabular-nums',
          variant === 'success' && 'text-green-600',
          variant === 'danger' && 'text-red-600',
          variant === 'warning' && 'text-amber-600',
          variant === 'muted' && 'text-muted-foreground',
        )}
      >
        {formatCurrency(value)}
      </span>
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </div>
  )
}

// ============ Skeleton ============

export function SummaryCardsSkeleton() {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border bg-card p-4 space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-7 w-28" />
          </div>
        ))}
      </div>
    </div>
  )
}

// ============ SummaryCards ============

interface SummaryCardsProps {
  summary: CashAdvancesSummary
}

export function SummaryCards({ summary }: SummaryCardsProps) {
  // Variante do saldo: positivo = verde, negativo = vermelho, zero = muted
  const balanceVariant =
    summary.total_balance > 0 ? 'success' : summary.total_balance < 0 ? 'danger' : 'muted'

  // Hint do saldo
  const balanceHint =
    summary.total_balance > 0
      ? 'A comprovar'
      : summary.total_balance < 0
        ? 'Saldo negativo'
        : 'Saldo zerado'

  // Percentual do orcamento comprometido
  const pctHint =
    summary.pct_of_budget !== null
      ? `${summary.pct_of_budget.toFixed(1)}% do orcamento`
      : undefined

  return (
    <div className="space-y-3">
      {/* Cards KPI */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard
          label="Total Depositado"
          value={summary.total_deposited}
          hint={pctHint}
        />
        <KpiCard
          label="Total Comprovado"
          value={summary.total_documented}
          variant="success"
        />
        <KpiCard
          label="Saldo Disponivel"
          value={summary.total_balance}
          variant={balanceVariant}
          hint={balanceHint}
        />
        <KpiCard
          label="Total Autorizado"
          value={summary.total_authorized}
          variant="muted"
          hint={`${summary.total_advances} adiantamento${summary.total_advances !== 1 ? 's' : ''}`}
        />
      </div>

      {/* Alerta de saldo negativo */}
      {summary.has_negative_balance && (
        <Alert variant="destructive" className="py-3">
          <TrendingDown className="h-4 w-4" />
          <AlertDescription>
            <strong>Saldo negativo:</strong> Os comprovantes aprovados (
            {formatCurrency(summary.total_documented)}) excedem o total depositado (
            {formatCurrency(summary.total_deposited)}). Verifique os lancamentos.
          </AlertDescription>
        </Alert>
      )}

      {/* Alerta de adiantamentos acima do threshold */}
      {summary.advances_over_threshold > 0 && (
        <Alert className="border-amber-200 bg-amber-50 text-amber-800 py-3 [&>svg]:text-amber-600">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>
              {summary.advances_over_threshold} adiantamento
              {summary.advances_over_threshold !== 1 ? 's' : ''} acima do limite de 10% do
              orcamento
            </strong>
            {summary.threshold_value !== null && (
              <> (limite automatico: {formatCurrency(summary.threshold_value)})</>
            )}
            . Aprovacao de CEO/CFO necessaria.
          </AlertDescription>
        </Alert>
      )}

      {/* Info do orcamento quando threshold existe */}
      {summary.threshold_value !== null && summary.advances_over_threshold === 0 && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Wallet className="h-3.5 w-3.5 shrink-0" />
          <span>
            Limite automatico por adiantamento: {formatCurrency(summary.threshold_value)} (10% de{' '}
            {formatCurrency(summary.budget_value!)})
          </span>
        </div>
      )}
    </div>
  )
}
