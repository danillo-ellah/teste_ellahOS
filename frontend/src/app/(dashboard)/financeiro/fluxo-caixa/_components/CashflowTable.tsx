'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { formatCurrency, formatDate } from '@/lib/format'
import type { CashflowEntry, CashflowDetail } from '@/types/cashflow'

// ---------------------------------------------------------------------------
// Mapa de status para badge
// ---------------------------------------------------------------------------

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pendente',
  paid: 'Pago',
  received: 'Recebido',
  overdue: 'Vencido',
  cancelled: 'Cancelado',
  pendente: 'Pendente',
  pago: 'Pago',
  recebido: 'Recebido',
  vencido: 'Vencido',
}

function statusLabel(status: string): string {
  return STATUS_LABEL[status] ?? status
}

function statusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (status === 'paid' || status === 'received' || status === 'pago' || status === 'recebido') {
    return 'secondary'
  }
  if (status === 'overdue' || status === 'vencido') return 'destructive'
  return 'outline'
}

// ---------------------------------------------------------------------------
// Linha de detalhe (inflow ou outflow individual)
// ---------------------------------------------------------------------------

interface DetailRowProps {
  detail: CashflowDetail
  type: 'inflow' | 'outflow'
}

function DetailRow({ detail, type }: DetailRowProps) {
  return (
    <tr className="border-t border-border/30 text-xs">
      <td className="py-1.5 pl-8 pr-2 text-muted-foreground font-mono">
        {detail.job_code ?? '—'}
      </td>
      <td className="py-1.5 px-2 text-muted-foreground max-w-[200px] truncate">
        {detail.description}
        {detail.installment_number != null && (
          <span className="ml-1 text-muted-foreground/60">#{detail.installment_number}</span>
        )}
      </td>
      <td className={cn(
        'py-1.5 px-2 text-right tabular-nums font-medium',
        type === 'inflow' ? 'text-emerald-600' : 'text-red-600',
      )}>
        {formatCurrency(detail.amount)}
      </td>
      <td className="py-1.5 px-2 text-right text-muted-foreground">
        {formatDate(detail.due_date)}
      </td>
      <td className="py-1.5 pl-2 pr-3 text-right">
        <Badge variant={statusVariant(detail.status)} className="text-[10px] px-1.5 py-0">
          {statusLabel(detail.status)}
        </Badge>
      </td>
    </tr>
  )
}

// ---------------------------------------------------------------------------
// Linha de periodo (colapsavel)
// ---------------------------------------------------------------------------

interface PeriodRowProps {
  entry: CashflowEntry
  isExpanded: boolean
  onToggle: () => void
}

function PeriodRow({ entry, isExpanded, onToggle }: PeriodRowProps) {
  const netPositive = entry.net >= 0
  const balancePositive = entry.cumulative_balance >= 0
  const hasDetails = entry.inflow_details.length > 0 || entry.outflow_details.length > 0

  return (
    <>
      {/* Linha do periodo */}
      <tr
        className={cn(
          'border-t border-border transition-colors',
          hasDetails && 'cursor-pointer hover:bg-muted/40',
        )}
        onClick={hasDetails ? onToggle : undefined}
        aria-expanded={hasDetails ? isExpanded : undefined}
      >
        {/* Icone de expansao */}
        <td className="py-3 pl-3 pr-2 w-7">
          {hasDetails ? (
            isExpanded
              ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <span className="inline-block w-3.5" />
          )}
        </td>

        {/* Periodo */}
        <td className="py-3 pr-3 text-sm font-medium text-foreground">
          {entry.period_label}
        </td>

        {/* Entradas */}
        <td className="py-3 px-3 text-right text-sm tabular-nums text-emerald-600 font-medium">
          {formatCurrency(entry.inflows)}
        </td>

        {/* Saidas */}
        <td className="py-3 px-3 text-right text-sm tabular-nums text-red-600 font-medium">
          {formatCurrency(entry.outflows)}
        </td>

        {/* Liquido */}
        <td className={cn(
          'py-3 px-3 text-right text-sm tabular-nums font-semibold',
          netPositive ? 'text-emerald-600' : 'text-red-600',
        )}>
          {formatCurrency(entry.net)}
        </td>

        {/* Saldo Acumulado */}
        <td className={cn(
          'py-3 pl-3 pr-4 text-right text-sm tabular-nums font-bold',
          balancePositive ? 'text-blue-600' : 'text-red-600',
        )}>
          {formatCurrency(entry.cumulative_balance)}
        </td>
      </tr>

      {/* Linhas de detalhes (colapsaveis) */}
      {isExpanded && (
        <>
          {/* Cabecalho dos detalhes */}
          <tr className="bg-muted/30">
            <td colSpan={6} className="py-1 pl-8 pr-3">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Detalhes do periodo
              </span>
            </td>
          </tr>

          {/* Header das colunas de detalhe */}
          {hasDetails && (
            <tr className="bg-muted/20">
              <td colSpan={2} className="py-1 pl-8 pr-2 text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                Job / Descricao
              </td>
              <td className="py-1 px-2 text-right text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                Valor
              </td>
              <td className="py-1 px-2 text-right text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                Vencimento
              </td>
              <td className="py-1 pl-2 pr-3 text-right text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                Status
              </td>
            </tr>
          )}

          {/* Entradas */}
          {entry.inflow_details.length > 0 && (
            <tr className="bg-emerald-50/40 dark:bg-emerald-950/20">
              <td colSpan={6} className="py-1 pl-8 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">
                Entradas ({entry.inflow_details.length})
              </td>
            </tr>
          )}
          {entry.inflow_details.map(detail => (
            <DetailRow key={detail.id} detail={detail} type="inflow" />
          ))}

          {/* Saidas */}
          {entry.outflow_details.length > 0 && (
            <tr className="bg-red-50/40 dark:bg-red-950/20">
              <td colSpan={6} className="py-1 pl-8 text-[10px] font-semibold text-red-700 dark:text-red-400 uppercase tracking-wide">
                Saidas ({entry.outflow_details.length})
              </td>
            </tr>
          )}
          {entry.outflow_details.map(detail => (
            <DetailRow key={detail.id} detail={detail} type="outflow" />
          ))}

          {/* Linha separadora apos detalhes */}
          <tr>
            <td colSpan={6} className="h-1 bg-muted/20" />
          </tr>
        </>
      )}
    </>
  )
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

interface Props {
  entries: CashflowEntry[]
}

export function CashflowTable({ entries }: Props) {
  const [expandedPeriods, setExpandedPeriods] = useState<Set<string>>(new Set())

  function togglePeriod(key: string) {
    setExpandedPeriods(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  if (entries.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-sm text-muted-foreground">Nenhum periodo para exibir.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="overflow-hidden py-0">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              {/* Coluna de expansao */}
              <th className="py-3 pl-3 pr-2 w-7" />
              <th className="py-3 pr-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide min-w-[120px]">
                Periodo
              </th>
              <th className="py-3 px-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide min-w-[120px]">
                Entradas
              </th>
              <th className="py-3 px-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide min-w-[120px]">
                Saidas
              </th>
              <th className="py-3 px-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide min-w-[120px]">
                Liquido
              </th>
              <th className="py-3 pl-3 pr-4 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide min-w-[130px]">
                Saldo Acumulado
              </th>
            </tr>
          </thead>
          <tbody>
            {entries.map(entry => {
              const key = entry.period_start
              return (
                <PeriodRow
                  key={key}
                  entry={entry}
                  isExpanded={expandedPeriods.has(key)}
                  onToggle={() => togglePeriod(key)}
                />
              )
            })}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
