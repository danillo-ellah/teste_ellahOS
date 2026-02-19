'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, CheckCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Pagination } from '@/components/shared/Pagination'
import {
  useNotifications,
  useUnreadCount,
  useMarkRead,
  useMarkAllRead,
} from '@/hooks/useNotifications'
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications'
import { createClient } from '@/lib/supabase/client'
import { NOTIFICATION_TYPE_LABELS } from '@/lib/constants'
import { formatRelativeDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { NotificationType, NotificationFilters } from '@/types/notifications'

// Estilos visuais por tipo de notificacao (badge colorida)
const TYPE_STYLES: Record<NotificationType, string> = {
  job_approved: 'text-green-600 dark:text-green-400 bg-green-500/10',
  status_changed: 'text-blue-600 dark:text-blue-400 bg-blue-500/10',
  team_added: 'text-violet-600 dark:text-violet-400 bg-violet-500/10',
  deadline_approaching: 'text-amber-600 dark:text-amber-400 bg-amber-500/10',
  margin_alert: 'text-red-600 dark:text-red-400 bg-red-500/10',
  deliverable_overdue: 'text-red-600 dark:text-red-400 bg-red-500/10',
  shooting_date_approaching: 'text-amber-600 dark:text-amber-400 bg-amber-500/10',
  integration_failed: 'text-red-600 dark:text-red-400 bg-red-500/10',
}

// Tipos disponiveis para o filtro
const NOTIFICATION_TYPES: NotificationType[] = [
  'job_approved',
  'status_changed',
  'team_added',
  'deadline_approaching',
  'margin_alert',
  'deliverable_overdue',
  'shooting_date_approaching',
  'integration_failed',
]

const DEFAULT_FILTERS: NotificationFilters = {
  page: 1,
  per_page: 20,
}

export default function NotificationsPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | undefined>()
  const [filters, setFilters] = useState<NotificationFilters>(DEFAULT_FILTERS)

  // Obter userId para a subscription Realtime
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id)
    })
  }, [])

  // Subscription Realtime — invalida queries automaticamente quando chega nova notificacao
  useRealtimeNotifications(userId)

  const { data: notifications, meta, isLoading, isError, error, refetch } = useNotifications(filters)
  const { count: unreadCount } = useUnreadCount()
  const markRead = useMarkRead()
  const markAllRead = useMarkAllRead()

  // Ao clicar: marca como lida (se necessario) e navega para action_url
  function handleClickNotification(notification: {
    id: string
    read_at: string | null
    action_url: string | null
  }) {
    if (!notification.read_at) {
      markRead.mutate(notification.id)
    }
    if (notification.action_url) {
      router.push(notification.action_url)
    }
  }

  function handleTypeFilter(value: string) {
    setFilters((prev) => ({
      ...prev,
      type: value === 'all' ? undefined : (value as NotificationType),
      page: 1,
    }))
  }

  function handleUnreadToggle(checked: boolean) {
    setFilters((prev) => ({
      ...prev,
      unread_only: checked || undefined,
      page: 1,
    }))
  }

  const hasActiveFilters = !!filters.type || !!filters.unread_only

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight shrink-0">Notificacoes</h1>
          {unreadCount > 0 && (
            <Badge
              variant="secondary"
              className="bg-primary/10 text-primary shrink-0"
              aria-live="polite"
            >
              {unreadCount} nao lida{unreadCount !== 1 ? 's' : ''}
            </Badge>
          )}
        </div>

        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="h-9 shrink-0"
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending}
          >
            <CheckCheck className="mr-2 h-4 w-4" />
            Marcar todas como lidas
          </Button>
        )}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Label htmlFor="type-filter" className="text-sm text-muted-foreground shrink-0">
            Tipo:
          </Label>
          <Select value={filters.type ?? 'all'} onValueChange={handleTypeFilter}>
            <SelectTrigger id="type-filter" className="w-[200px]">
              <SelectValue placeholder="Todos os tipos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              {NOTIFICATION_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {NOTIFICATION_TYPE_LABELS[type]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Switch
            id="unread-filter"
            checked={filters.unread_only ?? false}
            onCheckedChange={handleUnreadToggle}
          />
          <Label htmlFor="unread-filter" className="text-sm cursor-pointer">
            Apenas nao lidas
          </Label>
        </div>
      </div>

      <Separator />

      {/* Lista: skeleton de carregamento */}
      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-start gap-4 rounded-md border border-border p-4">
              <Skeleton className="mt-1.5 h-2 w-2 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-3 w-1/4" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lista: estado de erro */}
      {isError && !isLoading && (
        <div className="rounded-md border border-border py-16 flex flex-col items-center justify-center text-center gap-4">
          <p className="text-sm text-muted-foreground">
            Erro ao carregar notificacoes. Tente novamente.
          </p>
          <Button variant="outline" onClick={() => refetch()}>
            Tentar novamente
          </Button>
        </div>
      )}

      {/* Lista: estado vazio */}
      {!isLoading && !isError && (!notifications || notifications.length === 0) && (
        <div className="rounded-md border border-border py-16 flex flex-col items-center justify-center text-center gap-3">
          <Bell className="h-10 w-10 text-muted-foreground/40" aria-hidden />
          <div className="space-y-1">
            <h3 className="text-sm font-medium">Nenhuma notificacao</h3>
            <p className="text-sm text-muted-foreground">
              {hasActiveFilters
                ? 'Nenhuma notificacao corresponde aos filtros selecionados.'
                : 'Voce esta em dia! Nenhuma notificacao por aqui.'}
            </p>
          </div>
          {hasActiveFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFilters(DEFAULT_FILTERS)}
            >
              Limpar filtros
            </Button>
          )}
        </div>
      )}

      {/* Lista: notificacoes */}
      {!isLoading && !isError && notifications && notifications.length > 0 && (
        <>
          <div className="space-y-2">
            {notifications.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => handleClickNotification(n)}
                className={cn(
                  'flex w-full items-start gap-4 rounded-md border border-border p-4 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                  !n.read_at && 'border-primary/20 bg-accent/30',
                )}
              >
                {/* Indicador de nao lida */}
                <div className="mt-2 flex h-2 w-2 shrink-0 items-center justify-center">
                  {!n.read_at && (
                    <span className="h-2 w-2 rounded-full bg-primary" aria-label="Nao lida" />
                  )}
                </div>

                {/* Conteudo principal */}
                <div className="flex-1 space-y-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p
                      className={cn(
                        'text-sm leading-snug',
                        !n.read_at ? 'font-semibold text-foreground' : 'font-medium text-muted-foreground',
                      )}
                    >
                      {n.title}
                    </p>
                    <span className="shrink-0 text-xs text-muted-foreground whitespace-nowrap">
                      {formatRelativeDate(n.created_at)}
                    </span>
                  </div>

                  <p className="text-sm text-muted-foreground leading-snug">{n.body}</p>

                  {/* Badges: tipo e prioridade */}
                  <div className="flex flex-wrap items-center gap-2 pt-0.5">
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-[10px] font-medium',
                        TYPE_STYLES[n.type],
                      )}
                    >
                      {NOTIFICATION_TYPE_LABELS[n.type]}
                    </span>

                    {(n.priority === 'high' || n.priority === 'urgent') && (
                      <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-medium text-red-600 dark:text-red-400">
                        {n.priority === 'urgent' ? 'Urgente' : 'Alta prioridade'}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Paginacao */}
          {meta && meta.total > 0 && (
            <Pagination
              page={filters.page ?? 1}
              totalPages={meta.total_pages}
              total={meta.total}
              perPage={filters.per_page ?? 20}
              onPageChange={(page) => setFilters((prev) => ({ ...prev, page }))}
              onPerPageChange={(per_page) => setFilters((prev) => ({ ...prev, per_page, page: 1 }))}
              itemLabel="notificacao"
            />
          )}
        </>
      )}
    </div>
  )
}
