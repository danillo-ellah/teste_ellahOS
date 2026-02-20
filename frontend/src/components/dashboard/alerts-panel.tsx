'use client'

import Link from 'next/link'
import {
  AlertTriangle,
  TrendingDown,
  Clock,
  HeartPulse,
  FileCheck,
  CheckCircle2,
  CalendarX,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import type { DashboardAlert, AlertType, AlertSeverity } from '@/hooks/use-dashboard'

// Mapa de icones por tipo de alerta
const ALERT_ICON_MAP: Record<
  AlertType | string,
  { icon: React.ElementType; color: string }
> = {
  margin_alert: { icon: TrendingDown, color: 'text-red-500' },
  overdue_deliverable: { icon: Clock, color: 'text-red-500' },
  low_health_score: { icon: HeartPulse, color: 'text-orange-500' },
  approval_expiring: { icon: FileCheck, color: 'text-violet-500' },
  deadline_today: { icon: CalendarX, color: 'text-red-500' },
  deadline_tomorrow: { icon: CalendarX, color: 'text-amber-500' },
}

const SEVERITY_BADGE: Record<AlertSeverity, string> = {
  critical: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400',
  high: 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400',
  medium: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400',
  low: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400',
}

const SEVERITY_LABEL: Record<AlertSeverity, string> = {
  critical: 'Critico',
  high: 'Alto',
  medium: 'Medio',
  low: 'Baixo',
}

// Derivar severity a partir do alert_type (a RPC nao retorna severity)
function getAlertSeverity(type: AlertType): AlertSeverity {
  switch (type) {
    case 'margin_alert':
      return 'critical'
    case 'overdue_deliverable':
      return 'high'
    case 'low_health_score':
      return 'high'
    case 'approval_expiring':
      return 'medium'
    default:
      return 'low'
  }
}

// Derivar titulo a partir dos campos da RPC
function getAlertTitle(alert: DashboardAlert): string {
  switch (alert.alert_type) {
    case 'margin_alert':
      return `Margem baixa: ${alert.entity_code ?? ''}`
    case 'overdue_deliverable':
      return `Entregavel atrasado: ${alert.entity_code ?? ''}`
    case 'low_health_score':
      return `Health score baixo: ${alert.entity_code ?? ''}`
    case 'approval_expiring':
      return `Aprovacao expirando: ${alert.entity_code ?? ''}`
    default:
      return alert.entity_title ?? 'Alerta'
  }
}

// Derivar descricao a partir dos campos da RPC
function getAlertDescription(alert: DashboardAlert): string {
  switch (alert.alert_type) {
    case 'margin_alert':
      return `Job ${alert.entity_title ?? ''} com margem abaixo de 15%`
    case 'overdue_deliverable':
      return `Entregavel de ${alert.entity_title ?? ''} esta atrasado`
    case 'low_health_score':
      return `Job ${alert.entity_title ?? ''} com health score abaixo de 50`
    case 'approval_expiring':
      return `Aprovacao de ${alert.entity_title ?? ''} expira em breve`
    default:
      return ''
  }
}

interface AlertItemProps {
  alert: DashboardAlert
}

function AlertItem({ alert }: AlertItemProps) {
  const iconConfig =
    ALERT_ICON_MAP[alert.alert_type] ?? {
      icon: AlertTriangle,
      color: 'text-amber-500',
    }
  const Icon = iconConfig.icon

  const severity = getAlertSeverity(alert.alert_type)
  const severityClass =
    SEVERITY_BADGE[severity] ??
    'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
  const severityLabel = SEVERITY_LABEL[severity] ?? severity

  const title = getAlertTitle(alert)
  const description = getAlertDescription(alert)

  return (
    <li
      role="listitem"
      className={cn(
        'flex gap-3 items-start rounded-lg border border-transparent p-3 mb-2 transition-colors duration-150',
        'bg-neutral-50 dark:bg-neutral-800/50',
        'hover:border-border',
      )}
    >
      {/* Icone */}
      <Icon className={cn('mt-0.5 size-4 shrink-0', iconConfig.color)} />

      {/* Conteudo */}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            {alert.entity_code && (
              <span className="font-mono text-[11px] text-muted-foreground">
                {alert.entity_code}
              </span>
            )}
            <p className="truncate text-[13px] font-medium text-foreground">
              {title}
            </p>
            <p className="text-[12px] text-muted-foreground">
              {description}
            </p>
          </div>
          {/* Badge de severity */}
          <span
            className={cn(
              'shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium',
              severityClass,
            )}
          >
            {severityLabel}
          </span>
        </div>

        {/* Link para o job */}
        {alert.entity_id && (
          <Link
            href={`/jobs/${alert.entity_id}`}
            className="mt-1 text-[12px] text-rose-500 hover:underline"
          >
            Ver job
          </Link>
        )}
      </div>
    </li>
  )
}

function AlertsSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <Skeleton className="size-5 rounded" />
        <Skeleton className="h-5 w-28" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex gap-3 p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/50">
            <Skeleton className="mt-0.5 size-4 shrink-0 rounded" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-3 w-3/4" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

interface AlertsPanelProps {
  data: DashboardAlert[] | undefined
  isLoading: boolean
}

const MAX_VISIBLE = 5

export function AlertsPanel({ data, isLoading }: AlertsPanelProps) {
  if (isLoading) {
    return <AlertsSkeleton />
  }

  const alerts = data ?? []
  const visibleAlerts = alerts.slice(0, MAX_VISIBLE)
  const hiddenCount = alerts.length - MAX_VISIBLE

  return (
    <section
      aria-label="Alertas urgentes"
      className="rounded-xl border border-border bg-card p-5 shadow-sm"
    >
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="size-[18px] text-rose-500" />
          <h2 className="text-base font-semibold text-foreground">Alertas</h2>
          {alerts.length > 0 && (
            <span className="rounded-full bg-rose-500 px-2 py-0.5 text-xs font-bold text-white">
              {alerts.length}
            </span>
          )}
        </div>
      </div>

      {/* Lista de alertas */}
      {alerts.length === 0 ? (
        /* Estado vazio */
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <CheckCircle2 className="size-8 text-green-500 mb-3" />
          <p className="text-sm font-medium text-foreground">Tudo em ordem por aqui</p>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Nenhum alerta ativo no momento
          </p>
        </div>
      ) : (
        <>
          <ul
            role="list"
            aria-label="Alertas urgentes"
            aria-live="polite"
            className="space-y-0"
          >
            {visibleAlerts.map((alert, index) => (
              <AlertItem
                key={`${alert.alert_type}-${alert.entity_id}-${index}`}
                alert={alert}
              />
            ))}
          </ul>

          {hiddenCount > 0 && (
            <div className="mt-2 text-center">
              <span className="text-[13px] text-muted-foreground">
                + {hiddenCount} outro{hiddenCount !== 1 ? 's' : ''} alerta
                {hiddenCount !== 1 ? 's' : ''}
              </span>
            </div>
          )}
        </>
      )}
    </section>
  )
}
