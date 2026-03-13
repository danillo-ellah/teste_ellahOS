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
import { cn } from '@/lib/utils'
import { formatCurrency, formatDate } from '@/lib/format'
import { useFollowUpAlerts, type CrmAlert, type CrmAlertType } from '@/hooks/useCrm'

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const ALERT_CONFIG: Record<
  CrmAlertType,
  { label: string; action: string; icon: React.ReactNode; class: string }
> = {
  deadline_overdue: {
    label: 'Vencido',
    action: 'Prazo expirou — faca follow-up urgente',
    icon: <AlertTriangle className="size-3" />,
    class: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  },
  deadline_urgent: {
    label: 'Urgente',
    action: 'Prazo vence em breve — entre em contato',
    icon: <Zap className="size-3" />,
    class: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  },
  inactive: {
    label: 'Inativo',
    action: 'Sem atividade recente — faca um follow-up',
    icon: <Clock className="size-3" />,
    class: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  },
  unassigned: {
    label: 'Sem PE',
    action: 'Atribua um produtor executivo',
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
    <div className="rounded-xl border border-amber-300/50 bg-amber-500/5 dark:border-amber-700/50 dark:bg-amber-900/10">
      {/* Header */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-2 px-4 py-3 text-left min-h-[44px]"
      >
        <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400 shrink-0" />
        <span className="text-sm font-medium text-amber-700 dark:text-amber-300">
          {data.total_alerts} oportunidade{data.total_alerts !== 1 ? 's' : ''} precisa{data.total_alerts === 1 ? '' : 'm'} de atencao
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
          className="w-full px-4 py-2.5 text-center text-xs font-medium text-amber-600 dark:text-amber-400 hover:underline min-h-[44px]"
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
      className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-amber-500/5 transition-colors min-h-[44px]"
      role="button"
      tabIndex={0}
      onClick={() => router.push(`/crm/${alert.opportunity_id}`)}
      onKeyDown={(e) => e.key === 'Enter' && router.push(`/crm/${alert.opportunity_id}`)}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{alert.title}</p>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          {alert.alert_types.map((type) => {
            const cfg = ALERT_CONFIG[type]
            return (
              <Badge
                key={type}
                variant="secondary"
                className={cn('text-[10px] gap-0.5 px-1.5 py-0', cfg.class)}
                title={cfg.action}
              >
                {cfg.icon}
                {cfg.label}
              </Badge>
            )
          })}
          {alert.agency_name && (
            <span className="text-xs text-muted-foreground truncate max-w-[120px]">
              {alert.agency_name}
            </span>
          )}
          {alert.response_deadline && (
            <>
              <span className="text-xs text-muted-foreground hidden sm:inline">·</span>
              <span className="text-xs text-muted-foreground">
                Retorno: {formatDate(alert.response_deadline)}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Valor */}
      {alert.estimated_value != null && (
        <span className="text-xs font-semibold tabular-nums shrink-0 hidden sm:block">
          {formatCurrency(alert.estimated_value)}
        </span>
      )}

      <ExternalLink className="size-3.5 text-muted-foreground/40 shrink-0" />
    </div>
  )
}
