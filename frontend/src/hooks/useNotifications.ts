import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiMutate } from '@/lib/api'
import { notificationKeys } from '@/lib/query-keys'
import type { Notification, NotificationFilters, NotificationPreferences } from '@/types/notifications'
import type { PaginationMeta } from '@/types/jobs'

// Converte NotificationFilters para Record<string, string> compativel com URLSearchParams
function filtersToParams(filters: NotificationFilters): Record<string, string> {
  const params: Record<string, string> = {}

  if (filters.type) params.type = filters.type
  if (filters.unread_only) params.unread_only = 'true'
  if (filters.job_id) params.job_id = filters.job_id
  if (filters.page !== undefined) params.page = String(filters.page)
  if (filters.per_page !== undefined) params.per_page = String(filters.per_page)

  return params
}

// Lista paginada de notificacoes com filtros opcionais
export function useNotifications(filters: NotificationFilters = {}) {
  const params = filtersToParams(filters)

  const query = useQuery({
    queryKey: notificationKeys.list(filters),
    queryFn: () => apiGet<Notification[]>('notifications', params),
    staleTime: 30_000,
  })

  return {
    data: query.data?.data,
    meta: query.data?.meta as PaginationMeta | undefined,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  }
}

// Contagem de notificacoes nao lidas — poll a cada 60s como fallback ao Realtime
export function useUnreadCount() {
  const query = useQuery({
    queryKey: notificationKeys.unreadCount(),
    queryFn: () => apiGet<{ unread_count: number }>('notifications', undefined, 'unread-count'),
    staleTime: 60_000,
    refetchInterval: 60_000,
  })

  return {
    count: query.data?.data?.unread_count ?? 0,
    isLoading: query.isLoading,
  }
}

// Marcar uma notificacao como lida pelo id
export function useMarkRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (notificationId: string) =>
      apiMutate<Notification>('notifications', 'PATCH', undefined, `${notificationId}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all })
    },
  })
}

// Marcar todas as notificacoes do usuario como lidas
export function useMarkAllRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () =>
      apiMutate<{ updated_count: number }>('notifications', 'POST', undefined, 'mark-all-read'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all })
    },
  })
}

// Buscar preferencias de notificacao do usuario autenticado
export function useNotificationPreferences() {
  return useQuery({
    queryKey: notificationKeys.preferences(),
    queryFn: () => apiGet<NotificationPreferences>('notifications', undefined, 'preferences'),
    staleTime: 5 * 60_000,
  })
}

// Atualizar preferencias de notificacao (canais e tipos silenciados)
export function useUpdatePreferences() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: {
      preferences?: { in_app?: boolean; whatsapp?: boolean }
      muted_types?: string[]
    }) =>
      apiMutate<NotificationPreferences>(
        'notifications',
        'PATCH',
        data as Record<string, unknown>,
        'preferences',
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.preferences() })
    },
  })
}
