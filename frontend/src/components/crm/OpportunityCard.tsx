'use client'

import { CalendarDays, Building2, ChevronRight, Shield } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Opportunity } from '@/hooks/useCrm'

interface OpportunityCardProps {
  opportunity: Opportunity
  onClick: () => void
}

function formatCurrency(value: number | null): string | null {
  if (value == null || value === 0) return null
  if (value >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `R$ ${(value / 1_000).toFixed(0)}K`
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatDate(dateStr: string | null): string | null {
  if (!dateStr) return null
  try {
    const d = new Date(dateStr + 'T12:00:00')
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
  } catch {
    return null
  }
}

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null
  try {
    const d = new Date(dateStr + 'T23:59:59')
    const now = new Date()
    const diff = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    return diff
  } catch {
    return null
  }
}

function isOverdue(dateStr: string | null, stage: string): boolean {
  if (!dateStr || stage === 'ganho' || stage === 'perdido') return false
  try {
    const d = new Date(dateStr + 'T23:59:59')
    return d < new Date()
  } catch {
    return false
  }
}

export function OpportunityCard({ opportunity, onClick }: OpportunityCardProps) {
  const formattedValue = formatCurrency(opportunity.estimated_value)
  const clientName = opportunity.clients?.name
  const agencyName = opportunity.agencies?.name
  const assignedName = opportunity.assigned_profile?.full_name

  // Prazo de retorno (response_deadline) tem prioridade sobre expected_close_date no card
  const deadlineStr = opportunity.response_deadline ?? null
  const closeDateStr = opportunity.expected_close_date ?? null
  const deadlineDays = daysUntil(deadlineStr)
  const deadlineOverdue = deadlineStr ? isOverdue(deadlineStr, opportunity.stage) : false
  const deadlineFormatted = formatDate(deadlineStr)
  const closeDateFormatted = formatDate(closeDateStr)
  const closeDateOverdue = isOverdue(closeDateStr, opportunity.stage)

  return (
    <button
      onClick={onClick}
      className={cn(
        'group flex flex-col gap-2 rounded-md border bg-card p-3.5 text-left shadow-sm transition-all',
        'hover:border-primary/40 hover:shadow-md',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
      )}
    >
      {/* Titulo */}
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-medium leading-snug line-clamp-2">
          {opportunity.title}
        </span>
        <ChevronRight className="mt-0.5 size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
      </div>

      {/* Agencia + Cliente */}
      {(agencyName || clientName) && (
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Building2 className="size-3.5 shrink-0" />
          {agencyName && clientName ? (
            <span className="truncate">
              {agencyName}
              <span className="mx-1 text-xs text-muted-foreground/60">→</span>
              {clientName}
            </span>
          ) : (
            <span className="truncate">{agencyName ?? clientName}</span>
          )}
        </div>
      )}

      {/* Concorrencia badge */}
      {opportunity.is_competitive_bid && (
        <div className="flex items-center gap-1">
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-400">
            <Shield className="size-3" />
            Concorrencia
          </span>
        </div>
      )}

      {/* Footer: valor + deadline/data */}
      <div className="flex items-end justify-between gap-1 pt-0.5">
        <div className="flex flex-col gap-1">
          {formattedValue && (
            <span className="text-sm font-semibold tabular-nums">{formattedValue}</span>
          )}

          {/* Prazo de retorno (response_deadline) */}
          {deadlineStr ? (
            <div
              className={cn(
                'flex items-center gap-1 text-[13px]',
                deadlineOverdue
                  ? 'text-destructive'
                  : deadlineDays !== null && deadlineDays <= 3
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-muted-foreground',
              )}
            >
              <CalendarDays className="size-3 shrink-0" />
              {deadlineOverdue ? (
                <span className="font-medium">vencido</span>
              ) : deadlineDays !== null && deadlineDays <= 3 && deadlineDays >= 0 ? (
                <span>
                  retorno:{' '}
                  <span className="font-medium">
                    em {deadlineDays === 0 ? 'hoje' : `${deadlineDays}d`}
                  </span>
                </span>
              ) : (
                <span>retorno: {deadlineFormatted}</span>
              )}
            </div>
          ) : closeDateFormatted ? (
            <div
              className={cn(
                'flex items-center gap-1 text-[13px]',
                closeDateOverdue ? 'text-destructive' : 'text-muted-foreground',
              )}
            >
              <CalendarDays className="size-3 shrink-0" />
              <span>{closeDateFormatted}</span>
              {closeDateOverdue && <span className="font-medium">atrasado</span>}
            </div>
          ) : null}
        </div>

        {/* Indicador de temperatura */}
        <HeatIndicator probability={opportunity.probability} />
      </div>

      {/* Assignee */}
      {assignedName && (
        <div className="flex items-center gap-1.5">
          <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
            {assignedName.charAt(0).toUpperCase()}
          </div>
          <span className="truncate text-[11px] text-muted-foreground">{assignedName}</span>
        </div>
      )}
    </button>
  )
}

function HeatIndicator({ probability }: { probability: number }) {
  if (probability >= 70) {
    return (
      <span className="inline-flex items-center gap-1 text-[13px] font-medium text-emerald-600 dark:text-emerald-400">
        <span className="inline-block size-2 rounded-full bg-emerald-500" />
        Quente
      </span>
    )
  }
  if (probability >= 40) {
    return (
      <span className="inline-flex items-center gap-1 text-[13px] font-medium text-amber-600 dark:text-amber-400">
        <span className="inline-block size-2 rounded-full bg-amber-500" />
        Morno
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-[13px] font-medium text-blue-600 dark:text-blue-400">
      <span className="inline-block size-2 rounded-full bg-blue-500" />
      Frio
    </span>
  )
}
