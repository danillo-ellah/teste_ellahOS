'use client'

import { cn } from '@/lib/utils'
import { formatCurrency, formatDate } from '@/lib/format'
import { Badge } from '@/components/ui/badge'
import type { OpportunityBudgetVersion } from '@/hooks/useCrmBudget'

// ---------------------------------------------------------------------------
// Configuracao visual de status
// ---------------------------------------------------------------------------

const STATUS_CONFIG: Record<
  OpportunityBudgetVersion['status'],
  { label: string; className: string }
> = {
  rascunho: {
    label: 'Rascunho',
    className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  },
  ativa: {
    label: 'Ativa',
    className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  },
  historico: {
    label: 'Historico',
    className: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  },
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface BudgetVersionHistoryProps {
  versions: OpportunityBudgetVersion[]
  currentVersionId?: string
  onSelectVersion?: (version: OpportunityBudgetVersion) => void
  readonly?: boolean
}

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

export function BudgetVersionHistory({
  versions,
  currentVersionId,
  onSelectVersion,
  readonly = false,
}: BudgetVersionHistoryProps) {
  if (versions.length === 0) {
    return (
      <p className="text-xs text-muted-foreground py-2">
        Nenhuma versao de orcamento registrada.
      </p>
    )
  }

  return (
    <div className="space-y-1">
      {versions.map((version) => {
        const isSelected = version.id === currentVersionId
        const statusConfig = STATUS_CONFIG[version.status]
        const isClickable = !readonly && !!onSelectVersion

        return (
          <button
            key={version.id}
            type="button"
            disabled={!isClickable}
            onClick={() => onSelectVersion?.(version)}
            className={cn(
              'w-full text-left rounded-md border px-3 py-2 transition-colors',
              // Estado selecionado
              isSelected
                ? 'border-primary/40 bg-primary/5 ring-1 ring-primary/20'
                : 'border-transparent bg-muted/30 hover:bg-muted/60',
              // Cursor
              isClickable ? 'cursor-pointer' : 'cursor-default',
            )}
          >
            <div className="flex items-center justify-between gap-2 flex-wrap">
              {/* Identificacao da versao */}
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs font-semibold tabular-nums text-foreground">
                  v{version.version}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatDate(version.created_at)}
                </span>
                {version.created_by_profile?.full_name && (
                  <span className="text-xs text-muted-foreground truncate hidden sm:inline">
                    — {version.created_by_profile.full_name}
                  </span>
                )}
              </div>

              {/* Total + badge status */}
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-semibold tabular-nums text-foreground">
                  {formatCurrency(version.total_value)}
                </span>
                <Badge className={cn('text-[10px] px-1.5 py-0', statusConfig.className)}>
                  {statusConfig.label}
                </Badge>
              </div>
            </div>

            {/* Notas da versao, se existirem */}
            {version.notes && (
              <p className="mt-1 text-xs text-muted-foreground truncate">
                {version.notes}
              </p>
            )}
          </button>
        )
      })}
    </div>
  )
}
