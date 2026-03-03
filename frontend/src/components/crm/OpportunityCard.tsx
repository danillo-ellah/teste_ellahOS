'use client'

import { CalendarDays, Building2, ChevronRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { Opportunity } from '@/hooks/useCrm'
import { STAGE_CONFIG } from './CrmKanban'

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
  const config = STAGE_CONFIG[opportunity.stage]
  const formattedValue = formatCurrency(opportunity.estimated_value)
  const formattedDate = formatDate(opportunity.expected_close_date)
  const overdue = isOverdue(opportunity.expected_close_date, opportunity.stage)
  const clientName = opportunity.clients?.name
  const agencyName = opportunity.agencies?.name
  const entityName = clientName ?? agencyName
  const assignedName = opportunity.assigned_profile?.full_name

  return (
    <button
      onClick={onClick}
      className={cn(
        'group flex flex-col gap-2 rounded-md border bg-card p-3 text-left shadow-sm transition-all',
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

      {/* Cliente/Agencia */}
      {entityName && (
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Building2 className="size-3 shrink-0" />
          <span className="truncate">{entityName}</span>
        </div>
      )}

      {/* Footer: valor + data + probabilidade */}
      <div className="flex items-end justify-between gap-1 pt-0.5">
        <div className="flex flex-col gap-1">
          {formattedValue && (
            <span className="text-sm font-semibold tabular-nums">{formattedValue}</span>
          )}
          {formattedDate && (
            <div
              className={cn(
                'flex items-center gap-1 text-[11px]',
                overdue ? 'text-destructive' : 'text-muted-foreground',
              )}
            >
              <CalendarDays className="size-3 shrink-0" />
              <span>{formattedDate}</span>
              {overdue && <span className="font-medium">atrasado</span>}
            </div>
          )}
        </div>

        {/* Probabilidade */}
        <ProbabilityBadge probability={opportunity.probability} />
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

function ProbabilityBadge({ probability }: { probability: number }) {
  const color =
    probability >= 70
      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300'
      : probability >= 40
        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300'
        : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium',
        color,
      )}
    >
      {probability}%
    </span>
  )
}
