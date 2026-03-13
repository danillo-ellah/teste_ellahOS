'use client'

import { memo } from 'react'
import { CalendarDays, Building2, Shield, AlertTriangle, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Opportunity } from '@/hooks/useCrm'

interface OpportunityCardProps {
  opportunity: Opportunity
  onClick: () => void
  onDelete?: () => void
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

export const OpportunityCard = memo(function OpportunityCard({ opportunity, onClick, onDelete }: OpportunityCardProps) {
  const formattedValue = formatCurrency(opportunity.estimated_value)
  const clientName = opportunity.clients?.name
  const agencyName = opportunity.agencies?.name
  const assignedName = opportunity.assigned_profile?.full_name

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
      aria-label={`Ver detalhes: ${opportunity.title}`}
      className={cn(
        'group relative flex flex-col gap-3 rounded-xl border bg-card p-4 text-left transition-all duration-200',
        'shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]',
        'hover:border-primary/30 active:scale-[0.98]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
        'dark:shadow-[0_1px_3px_rgba(0,0,0,0.2)] dark:hover:shadow-[0_4px_12px_rgba(0,0,0,0.3)]',
      )}
    >
      {/* Titulo + lixeira */}
      <div className="flex items-start gap-1 min-w-0">
        <div className="flex-1 min-w-0">
          <span className="text-[13px] font-semibold leading-snug line-clamp-2 text-foreground">
            {opportunity.title}
          </span>
          {opportunity.orc_code && (
            <span className="block text-[10px] font-mono text-muted-foreground/70 leading-tight mt-0.5">
              {opportunity.orc_code}
            </span>
          )}
        </div>
        {onDelete && !opportunity.job_id && (
          <span
            role="button"
            tabIndex={0}
            title="Excluir"
            onClick={(e) => { e.stopPropagation(); onDelete() }}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); onDelete() } }}
            className="shrink-0 p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground/50 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50"
          >
            <Trash2 className="size-3.5" />
          </span>
        )}
      </div>

      {/* Agencia + Cliente */}
      {(agencyName || clientName) && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Building2 className="size-3 shrink-0 opacity-60" />
          {agencyName && clientName ? (
            <span className="truncate">
              {agencyName}
              <span className="mx-1 opacity-40">/</span>
              {clientName}
            </span>
          ) : (
            <span className="truncate">{agencyName ?? clientName}</span>
          )}
        </div>
      )}

      {/* Concorrencia badge */}
      {opportunity.is_competitive_bid && (
        <span className="inline-flex items-center gap-1 self-start rounded-full border border-amber-200/80 bg-amber-50/80 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:border-amber-700/50 dark:bg-amber-950/50 dark:text-amber-400">
          <Shield className="size-2.5" />
          Concorrencia
        </span>
      )}

      {/* Valor em destaque */}
      {formattedValue && (
        <span className="text-base font-bold tabular-nums tracking-tight text-foreground">
          {formattedValue}
        </span>
      )}

      {/* Prazo de retorno */}
      {deadlineStr ? (
        <div
          className={cn(
            'flex items-center gap-1.5 text-xs',
            deadlineOverdue
              ? 'text-red-600 dark:text-red-400'
              : deadlineDays !== null && deadlineDays <= 3
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-muted-foreground',
          )}
        >
          <CalendarDays className="size-3 shrink-0" />
          {deadlineOverdue ? (
            <span className="inline-flex items-center gap-1 font-semibold">
              <AlertTriangle className="size-3" />
              Prazo vencido
            </span>
          ) : deadlineDays !== null && deadlineDays <= 3 && deadlineDays >= 0 ? (
            <span>
              Retorno{' '}
              <span className="font-semibold">
                {deadlineDays === 0 ? 'hoje' : `em ${deadlineDays}d`}
              </span>
            </span>
          ) : (
            <span>Retorno: {deadlineFormatted}</span>
          )}
        </div>
      ) : closeDateFormatted ? (
        <div
          className={cn(
            'flex items-center gap-1.5 text-xs',
            closeDateOverdue ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground',
          )}
        >
          <CalendarDays className="size-3 shrink-0" />
          <span>{closeDateFormatted}</span>
          {closeDateOverdue && (
            <span className="inline-flex items-center gap-0.5 font-semibold">
              <AlertTriangle className="size-3" />
              atrasado
            </span>
          )}
        </div>
      ) : null}

      {/* Footer: assignee + temperatura */}
      <div className="flex items-center justify-between gap-2 pt-0.5 border-t border-border/50">
        {assignedName ? (
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
              {assignedName.charAt(0).toUpperCase()}
            </div>
            <span className="truncate text-xs text-muted-foreground">{assignedName.split(' ')[0]}</span>
          </div>
        ) : (
          <div />
        )}
        <HeatIndicator probability={opportunity.probability} />
      </div>
    </button>
  )
})

function HeatIndicator({ probability }: { probability: number }) {
  const heat =
    probability >= 70
      ? { label: 'Quente', dotClass: 'bg-emerald-500', textClass: 'text-emerald-600 dark:text-emerald-400' }
      : probability >= 40
        ? { label: 'Morno', dotClass: 'bg-amber-500', textClass: 'text-amber-600 dark:text-amber-400' }
        : { label: 'Frio', dotClass: 'bg-blue-500', textClass: 'text-blue-600 dark:text-blue-400' }

  return (
    <span
      className={cn('inline-flex items-center gap-1.5 text-[11px] font-semibold', heat.textClass)}
      title={`${probability}% de probabilidade`}
    >
      <span className={cn('inline-block size-1.5 rounded-full', heat.dotClass)} />
      {heat.label}
    </span>
  )
}
