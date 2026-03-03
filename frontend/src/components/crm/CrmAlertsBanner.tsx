'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertTriangle,
  Clock,
  UserX,
  Zap,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { formatCurrency, formatDate } from '@/lib/format'
import { useFollowUpAlerts, type CrmAlert, type CrmAlertType } from '@/hooks/useCrm'

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const ALERT_CONFIG: Record<
  CrmAlertType,
  { label: string; icon: React.ReactNode; class: string }
> = {
  deadline_overdue: {
    label: 'Vencido',
    icon: <AlertTriangle className="size-3" />,
    class: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  },
  deadline_urgent: {
    label: 'Urgente',
    icon: <Zap className="size-3" />,
    class: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  },
  inactive: {
    label: 'Inativo',
    icon: <Clock className="size-3" />,
    class: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  },
  unassigned: {
    label: 'Sem PE',
    icon: <UserX className="size-3" />,
    class: 'bg-slate-100 text-slate-600 dark:bg-slate-800/40 dark:text-slate-400',
  },
}

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

export function CrmAlertsBanner() {
  const { data, isLoading } = useFollowUpAlerts()
  const [expanded, setExpanded] = useState(false)
  const router = useRouter()

  if (isLoading || !data || data.total_alerts === 0) return null

  const preview = data.alerts.slice(0, 3)
  const remaining = data.total_alerts - preview.length
  const shown = expanded ? data.alerts : preview

  return (
    <div className="rounded-lg border border-amber-300/50 bg-amber-500/5 dark:border-amber-700/50 dark:bg-amber-900/10">
      {/* Header */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-left"
      >
        <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400 shrink-0" />
        <span className="text-sm font-medium text-amber-700 dark:text-amber-300">
          {data.total_alerts} alerta{data.total_alerts !== 1 ? 's' : ''} de follow-up
        </span>
        <span className="ml-auto shrink-0 text-muted-foreground">
          {expanded ? (
            <ChevronUp className="size-4" />
          ) : (
            <ChevronDown className="size-4" />
          )}
        </span>
      </button>

      {/* Lista */}
      <div className="divide-y divide-amber-200/50 dark:divide-amber-800/30">
        {shown.map((alert) => (
          <AlertRow key={alert.opportunity_id} alert={alert} router={router} />
        ))}
      </div>

      {/* Rodape */}
      {!expanded && remaining > 0 && (
        <button
          onClick={() => setExpanded(true)}
          className="w-full px-4 py-1.5 text-center text-xs text-amber-600 dark:text-amber-400 hover:underline"
        >
          + {remaining} alerta{remaining !== 1 ? 's' : ''}
        </button>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// AlertRow
// ---------------------------------------------------------------------------

function AlertRow({
  alert,
  router,
}: {
  alert: CrmAlert
  router: ReturnType<typeof useRouter>
}) {
  return (
    <div
      className="flex items-center gap-3 px-4 py-2 cursor-pointer hover:bg-amber-500/5 transition-colors"
      onClick={() => router.push(`/crm/${alert.opportunity_id}`)}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{alert.title}</p>
        <div className="flex items-center gap-1.5 mt-0.5">
          {alert.agency_name && (
            <span className="text-xs text-muted-foreground truncate max-w-[120px]">
              {alert.agency_name}
            </span>
          )}
          {alert.agency_name && alert.assigned_name && (
            <span className="text-xs text-muted-foreground">·</span>
          )}
          {alert.assigned_name && (
            <span className="text-xs text-muted-foreground truncate max-w-[100px]">
              {alert.assigned_name}
            </span>
          )}
          {alert.response_deadline && (
            <>
              <span className="text-xs text-muted-foreground">·</span>
              <span className="text-xs text-muted-foreground">
                Retorno: {formatDate(alert.response_deadline)}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Badges de alerta */}
      <div className="flex items-center gap-1 shrink-0">
        {alert.alert_types.map((type) => {
          const cfg = ALERT_CONFIG[type]
          return (
            <Badge
              key={type}
              variant="secondary"
              className={cn('text-[10px] gap-0.5 px-1.5 py-0', cfg.class)}
            >
              {cfg.icon}
              {cfg.label}
            </Badge>
          )
        })}
      </div>

      {/* Valor */}
      {alert.estimated_value != null && (
        <span className="text-xs font-medium tabular-nums text-muted-foreground shrink-0">
          {formatCurrency(alert.estimated_value)}
        </span>
      )}

      <ExternalLink className="size-3.5 text-muted-foreground/50 shrink-0" />
    </div>
  )
}
