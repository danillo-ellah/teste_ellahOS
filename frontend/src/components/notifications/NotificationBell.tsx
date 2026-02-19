'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, CheckCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import {
  useNotifications,
  useUnreadCount,
  useMarkRead,
  useMarkAllRead,
} from '@/hooks/useNotifications'
import { NOTIFICATION_TYPE_LABELS } from '@/lib/constants'
import { formatRelativeDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Notification, NotificationType } from '@/types/notifications'

// Estilos de cor por tipo de notificacao (texto do label do tipo)
const TYPE_STYLES: Record<NotificationType, string> = {
  job_approved: 'text-green-600 dark:text-green-400',
  status_changed: 'text-blue-600 dark:text-blue-400',
  team_added: 'text-violet-600 dark:text-violet-400',
  deadline_approaching: 'text-amber-600 dark:text-amber-400',
  margin_alert: 'text-red-600 dark:text-red-400',
  deliverable_overdue: 'text-red-600 dark:text-red-400',
  shooting_date_approaching: 'text-amber-600 dark:text-amber-400',
  integration_failed: 'text-red-600 dark:text-red-400',
}

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  const { count } = useUnreadCount()
  const { data: notifications, isLoading } = useNotifications({ per_page: 10, page: 1 })
  const markRead = useMarkRead()
  const markAllRead = useMarkAllRead()

  // Navega para o action_url da notificacao e a marca como lida
  function handleClick(notification: Notification) {
    if (!notification.read_at) {
      markRead.mutate(notification.id)
    }
    if (notification.action_url) {
      router.push(notification.action_url)
      setOpen(false)
    }
  }

  function handleMarkAllRead() {
    markAllRead.mutate()
  }

  function handleViewAll() {
    setOpen(false)
    router.push('/notifications')
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={count > 0 ? `${count} notificacoes nao lidas` : 'Notificacoes'}
        >
          <Bell className="h-5 w-5" />
          {count > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
              {count > 99 ? '99+' : count}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-80 p-0" sideOffset={8}>
        {/* Cabecalho com acao de marcar todas como lidas */}
        <div className="flex items-center justify-between px-4 py-3">
          <h3 className="text-sm font-semibold">Notificacoes</h3>
          {count > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto px-2 py-1 text-xs text-muted-foreground"
              onClick={handleMarkAllRead}
              disabled={markAllRead.isPending}
            >
              <CheckCheck className="mr-1 h-3 w-3" />
              Marcar todas como lidas
            </Button>
          )}
        </div>

        <Separator />

        {/* Lista de notificacoes com scroll */}
        <ScrollArea className="max-h-80">
          {isLoading ? (
            // Estado de carregamento com skeletons
            <div className="space-y-3 p-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : !notifications || notifications.length === 0 ? (
            // Estado vazio
            <div className="py-8 text-center text-sm text-muted-foreground">
              Nenhuma notificacao
            </div>
          ) : (
            // Lista de itens
            <div>
              {notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={cn(
                    'flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-accent',
                    !n.read_at && 'bg-accent/50',
                  )}
                >
                  {/* Ponto indicador de nao lida */}
                  <div className="mt-1.5 flex h-2 w-2 shrink-0">
                    {!n.read_at && (
                      <span className="h-2 w-2 rounded-full bg-primary" />
                    )}
                  </div>

                  <div className="flex-1 space-y-0.5 overflow-hidden">
                    <p
                      className={cn(
                        'truncate text-sm',
                        !n.read_at ? 'font-medium' : 'text-muted-foreground',
                      )}
                    >
                      {n.title}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {n.body}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className={cn('text-[10px]', TYPE_STYLES[n.type])}>
                        {NOTIFICATION_TYPE_LABELS[n.type]}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {formatRelativeDate(n.created_at)}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>

        <Separator />

        {/* Rodape com link para pagina completa */}
        <div className="p-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs"
            onClick={handleViewAll}
          >
            Ver todas as notificacoes
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
