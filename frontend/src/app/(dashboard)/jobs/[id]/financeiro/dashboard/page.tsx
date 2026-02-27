'use client'

import { use } from 'react'
import { AlertTriangle, TrendingUp, TrendingDown, DollarSign, CalendarClock } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { JobFinancialTabs } from '../_components/JobFinancialTabs'
import { useJobFinancialDashboard } from '@/hooks/useFinancialDashboard'
import { formatCurrency, formatPercentage, formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { FinancialDashboardAlert, CostCategorySummary, PaymentCalendarEntry } from '@/types/cost-management'

interface PageProps {
  params: Promise<{ id: string }>
}

// ============ KPI Card ============

interface KPICardProps {
  label: string
  value: string
  subtitle?: string
  variant?: 'default' | 'success' | 'danger'
  icon?: React.ReactNode
}

function KPICard({ label, value, subtitle, variant = 'default', icon }: KPICardProps) {
  return (
    <Card className="p-4 flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
        {icon && <span className="text-muted-foreground">{icon}</span>}
      </div>
      <p
        className={cn(
          'text-2xl font-bold',
          variant === 'success' && 'text-green-600',
          variant === 'danger' && 'text-red-600',
        )}
      >
        {value}
      </p>
      {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
    </Card>
  )
}

// ============ Margin Progress Bar ============

function MarginProgressCard({ pct }: { pct: number }) {
  const clamped = Math.min(100, Math.max(0, pct))
  const variant = pct >= 30 ? 'success' : pct >= 10 ? 'default' : 'danger'

  return (
    <Card className="p-4 flex flex-col gap-1">
      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Margem %</p>
      <p
        className={cn(
          'text-2xl font-bold',
          variant === 'success' && 'text-green-600',
          variant === 'danger' && 'text-red-600',
        )}
      >
        {formatPercentage(pct)}
      </p>
      <div className="mt-1 h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all',
            variant === 'success' && 'bg-green-500',
            variant === 'default' && 'bg-yellow-500',
            variant === 'danger' && 'bg-red-500',
          )}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </Card>
  )
}

// ============ Alert Card ============

function AlertCard({ alert }: { alert: FinancialDashboardAlert }) {
  const severity = alert.severity ?? 'low'
  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-md border px-4 py-3 text-sm',
        severity === 'high' && 'border-red-200 bg-red-50 text-red-800',
        severity === 'medium' && 'border-yellow-200 bg-yellow-50 text-yellow-800',
        severity === 'low' && 'border-blue-200 bg-blue-50 text-blue-800',
      )}
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <div>
        <span className="font-medium capitalize">{alert.type.replace(/_/g, ' ')}</span>
        {' — '}
        {alert.message}
      </div>
    </div>
  )
}

// ============ Category Table ============

function CategoryTable({ rows }: { rows: CostCategorySummary[] }) {
  const data = rows.filter(r => r.item_number !== null)
  const total = rows.find(r => r.item_number === null)

  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="px-4 py-2 text-left font-medium text-muted-foreground">Categoria</th>
            <th className="px-4 py-2 text-right font-medium text-muted-foreground">Itens</th>
            <th className="px-4 py-2 text-right font-medium text-muted-foreground">Pago</th>
            <th className="px-4 py-2 text-right font-medium text-muted-foreground">Orcado</th>
            <th className="px-4 py-2 text-right font-medium text-muted-foreground">Pago R$</th>
            <th className="px-4 py-2 text-right font-medium text-muted-foreground">% Pago</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr key={idx} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
              <td className="px-4 py-2 font-medium">
                {row.item_number !== null && (
                  <span className="text-muted-foreground mr-2">{row.item_number}.</span>
                )}
                {row.item_name}
              </td>
              <td className="px-4 py-2 text-right tabular-nums">{row.items_total}</td>
              <td className="px-4 py-2 text-right tabular-nums">{row.items_paid}</td>
              <td className="px-4 py-2 text-right tabular-nums">{formatCurrency(row.total_budgeted)}</td>
              <td className="px-4 py-2 text-right tabular-nums">{formatCurrency(row.total_paid)}</td>
              <td className="px-4 py-2 text-right tabular-nums">
                <span
                  className={cn(
                    'font-medium',
                    row.pct_paid >= 80 && 'text-green-600',
                    row.pct_paid > 0 && row.pct_paid < 80 && 'text-yellow-600',
                  )}
                >
                  {formatPercentage(row.pct_paid)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
        {total && (
          <tfoot>
            <tr className="border-t bg-muted/50 font-semibold">
              <td className="px-4 py-2">Total</td>
              <td className="px-4 py-2 text-right tabular-nums">{total.items_total}</td>
              <td className="px-4 py-2 text-right tabular-nums">{total.items_paid}</td>
              <td className="px-4 py-2 text-right tabular-nums">{formatCurrency(total.total_budgeted)}</td>
              <td className="px-4 py-2 text-right tabular-nums">{formatCurrency(total.total_paid)}</td>
              <td className="px-4 py-2 text-right tabular-nums">{formatPercentage(total.pct_paid)}</td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  )
}

// ============ Upcoming Payments List ============

function UpcomingPaymentsList({ entries }: { entries: PaymentCalendarEntry[] }) {
  if (entries.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        Nenhum pagamento nos proximos 15 dias.
      </p>
    )
  }

  return (
    <div className="space-y-2">
      {entries.map((entry, idx) => (
        <div
          key={idx}
          className={cn(
            'flex items-center justify-between rounded-md border px-4 py-3',
            entry.is_overdue && 'border-red-200 bg-red-50',
          )}
        >
          <div className="flex items-center gap-3">
            <CalendarClock className="h-4 w-4 text-muted-foreground shrink-0" />
            <div>
              <p className="text-sm font-medium">{formatDate(entry.payment_due_date)}</p>
              <p className="text-xs text-muted-foreground">
                {entry.items_pending} item(s) pendente(s)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {entry.is_overdue && (
              <Badge variant="destructive" className="text-xs">Vencido</Badge>
            )}
            <span className="text-sm font-semibold tabular-nums">
              {formatCurrency(entry.total_pending)}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

// ============ Loading Skeleton ============

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="p-4 space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-8 w-24" />
          </Card>
        ))}
      </div>
      <Card className="p-4 space-y-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-32 w-full" />
      </Card>
    </div>
  )
}

// ============ Page ============

export default function JobFinancialDashboardPage({ params }: PageProps) {
  const { id: jobId } = use(params)
  const { data, isLoading, isError } = useJobFinancialDashboard(jobId)
  const dashboard = data?.data

  return (
    <div className="space-y-6">
      <JobFinancialTabs jobId={jobId} />

      {isLoading && <DashboardSkeleton />}

      {isError && !isLoading && (
        <div className="rounded-md border border-border py-12 text-center">
          <p className="text-sm text-muted-foreground">Erro ao carregar dashboard financeiro.</p>
        </div>
      )}

      {!isLoading && !isError && dashboard && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <KPICard
              label="OC / Faturamento"
              value={formatCurrency(dashboard.summary.budget_value)}
              icon={<DollarSign className="h-4 w-4" />}
            />
            <KPICard
              label="Total Estimado"
              value={formatCurrency(dashboard.summary.total_estimated)}
            />
            <KPICard
              label="Total Pago"
              value={formatCurrency(dashboard.summary.total_paid)}
              variant="success"
            />
            <KPICard
              label="Saldo"
              value={formatCurrency(dashboard.summary.balance)}
              variant={dashboard.summary.balance >= 0 ? 'success' : 'danger'}
              icon={
                dashboard.summary.balance >= 0 ? (
                  <TrendingUp className="h-4 w-4 text-green-600" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-600" />
                )
              }
            />
            <KPICard
              label="Margem Bruta"
              value={formatCurrency(dashboard.summary.margin_gross)}
              variant={dashboard.summary.margin_gross >= 0 ? 'success' : 'danger'}
            />
            <MarginProgressCard pct={dashboard.summary.margin_pct} />
          </div>

          {/* Alertas */}
          {dashboard.alerts.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Alertas
              </h2>
              <div className="space-y-2">
                {dashboard.alerts.map((alert, idx) => (
                  <AlertCard key={idx} alert={alert} />
                ))}
              </div>
            </div>
          )}

          {/* Resumo por Categoria */}
          {dashboard.by_category.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Resumo por Categoria
              </h2>
              <CategoryTable rows={dashboard.by_category} />
            </div>
          )}

          {/* Proximos Pagamentos */}
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Proximos Pagamentos (15 dias)
            </h2>
            <UpcomingPaymentsList
              entries={dashboard.payment_calendar.filter(e => {
                const dueDate = new Date(e.payment_due_date)
                const today = new Date()
                const in15 = new Date()
                in15.setDate(in15.getDate() + 15)
                return dueDate <= in15 && e.items_pending > 0
              })}
            />
          </div>
        </>
      )}
    </div>
  )
}
