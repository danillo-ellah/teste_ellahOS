'use client'

import { useState, useMemo } from 'react'
import { CalendarDays } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { PaymentDateGroup } from './_components/PaymentDateGroup'
import { PaymentDialog } from '@/components/financial/PaymentDialog'
import { useCostItems } from '@/hooks/useCostItems'
import { useTenantFinancialDashboard } from '@/hooks/useFinancialDashboard'
import { formatCurrency } from '@/lib/format'
import type { CostItem } from '@/types/cost-management'

// ============ Utilitario — agrupar por data ============

function groupByDate(items: CostItem[]): Map<string, CostItem[]> {
  const groups = new Map<string, CostItem[]>()
  for (const item of items) {
    const key = item.payment_due_date ?? 'sem_data'
    const group = groups.get(key) ?? []
    group.push(item)
    groups.set(key, group)
  }
  // Ordenar por data (sem_data fica no final)
  return new Map(
    [...groups.entries()].sort(([a], [b]) => {
      if (a === 'sem_data') return 1
      if (b === 'sem_data') return -1
      return a.localeCompare(b)
    }),
  )
}

function isOverdueDate(date: string): boolean {
  if (date === 'sem_data') return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const d = new Date(date + 'T00:00:00')
  return d < today
}

// ============ Totais toolbar ============

interface ToolbarTotalsProps {
  items: CostItem[]
  tenantTotal: number | undefined
  tenantOverdue: number | undefined
}

function ToolbarTotals({ items, tenantTotal, tenantOverdue }: ToolbarTotalsProps) {
  const pendingTotal = items.reduce((sum, item) => sum + item.total_with_overtime, 0)

  return (
    <div className="flex flex-wrap gap-4">
      <Card className="px-4 py-2 flex flex-col">
        <span className="text-xs text-muted-foreground">Total Pendente (periodo)</span>
        <span className="text-base font-semibold tabular-nums">{formatCurrency(pendingTotal)}</span>
      </Card>
      <Card className="px-4 py-2 flex flex-col">
        <span className="text-xs text-muted-foreground">Total Vencido</span>
        <span className="text-base font-semibold tabular-nums text-red-600">
          {tenantOverdue !== undefined ? formatCurrency(tenantOverdue) : '-'}
        </span>
      </Card>
      <Card className="px-4 py-2 flex flex-col">
        <span className="text-xs text-muted-foreground">Total Pago (30d)</span>
        <span className="text-base font-semibold tabular-nums text-green-600">
          {tenantTotal !== undefined ? formatCurrency(tenantTotal) : '-'}
        </span>
      </Card>
    </div>
  )
}

// ============ Batch Pay Bar ============

interface BatchPayBarProps {
  count: number
  total: number
  onPay: () => void
  onClear: () => void
}

function BatchPayBar({ count, total, onPay, onClear }: BatchPayBarProps) {
  return (
    <div className="fixed bottom-0 inset-x-0 z-50 border-t bg-background/95 backdrop-blur-sm px-4 py-3 flex items-center justify-between shadow-lg">
      <div className="text-sm">
        <span className="font-semibold">{count} item(s) selecionado(s)</span>
        <span className="text-muted-foreground ml-2">
          Total: <span className="font-semibold text-foreground">{formatCurrency(total)}</span>
        </span>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onClear}>
          Limpar selecao
        </Button>
        <Button size="sm" onClick={onPay}>
          Pagar Selecionados
        </Button>
      </div>
    </div>
  )
}

// ============ Page ============

type PeriodOption = '7' | '15' | '30' | '60'

const PERIOD_LABELS: Record<PeriodOption, string> = {
  '7': 'Proximos 7 dias',
  '15': 'Proximos 15 dias',
  '30': 'Proximos 30 dias',
  '60': 'Proximos 60 dias',
}

export default function PaymentCalendarPage() {
  const [period, setPeriod] = useState<PeriodOption>('30')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [paymentOpen, setPaymentOpen] = useState(false)

  // Calcular range de datas: 7 dias atras (vencidos) ate period dias a frente
  const today = new Date()
  const startDate = new Date(today)
  startDate.setDate(startDate.getDate() - 7)
  const endDate = new Date(today)
  endDate.setDate(endDate.getDate() + parseInt(period))

  const startISO = startDate.toISOString().split('T')[0]
  const endISO = endDate.toISOString().split('T')[0]

  const { data: items, isLoading } = useCostItems({
    payment_due_date_gte: startISO,
    payment_due_date_lte: endISO,
    payment_status: 'pendente',
    per_page: 200,
  })

  const { data: tenantDashboardData } = useTenantFinancialDashboard()
  const tenantDashboard = tenantDashboardData?.data

  const groups = useMemo(() => groupByDate(items ?? []), [items])

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const selectedItemsList = (items ?? []).filter(item => selectedIds.has(item.id))
  const selectedTotal = selectedItemsList.reduce(
    (sum, item) => sum + item.total_with_overtime,
    0,
  )

  function handlePaymentSuccess() {
    setSelectedIds(new Set())
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center gap-3">
        <CalendarDays className="h-5 w-5 text-muted-foreground" />
        <h1 className="text-xl font-semibold">Calendario de Pagamentos</h1>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <ToolbarTotals
          items={items ?? []}
          tenantTotal={tenantDashboard?.total_paid}
          tenantOverdue={tenantDashboard?.total_overdue}
        />
        <Select value={period} onValueChange={v => setPeriod(v as PeriodOption)}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.entries(PERIOD_LABELS) as [PeriodOption, string][]).map(([k, v]) => (
              <SelectItem key={k} value={k}>
                {v}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Conteudo */}
      {isLoading && (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-md border overflow-hidden">
              <div className="bg-muted/40 px-4 py-2.5 flex items-center justify-between">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-20" />
              </div>
              <div className="divide-y">
                {Array.from({ length: 2 }).map((_, j) => (
                  <div key={j} className="flex items-center gap-3 px-4 py-2.5">
                    <Skeleton className="h-4 w-4 rounded" />
                    <Skeleton className="h-4 flex-1" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {!isLoading && groups.size === 0 && (
        <div className="rounded-md border py-16 text-center">
          <CalendarDays className="mx-auto h-8 w-8 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">
            Nenhum pagamento pendente no periodo selecionado.
          </p>
        </div>
      )}

      {!isLoading && groups.size > 0 && (
        <div className="space-y-4">
          {Array.from(groups.entries()).map(([date, dateItems]) => (
            <PaymentDateGroup
              key={date}
              date={date}
              items={dateItems}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
              isOverdue={isOverdueDate(date)}
            />
          ))}
        </div>
      )}

      {/* Batch Pay Bar */}
      {selectedIds.size > 0 && (
        <BatchPayBar
          count={selectedIds.size}
          total={selectedTotal}
          onPay={() => setPaymentOpen(true)}
          onClear={() => setSelectedIds(new Set())}
        />
      )}

      {/* Payment Dialog */}
      <PaymentDialog
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        selectedItemIds={Array.from(selectedIds)}
        onSuccess={handlePaymentSuccess}
      />
    </div>
  )
}
