'use client'

import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { notificationKeys } from '@/lib/query-keys'

// Subscribes ao Supabase Realtime para receber notificacoes em tempo real.
// Quando uma nova notificacao e inserida para o usuario, invalida as queries
// de contagem e listagem para refletir o novo estado sem reload manual.
export function useRealtimeNotifications(userId: string | undefined) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!userId) return

    const supabase = createClient()

    const channel = supabase
      .channel('notifications-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          // Invalida a contagem de nao lidas e todas as listas de notificacoes
          queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount() })
          queryClient.invalidateQueries({ queryKey: notificationKeys.lists() })
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, queryClient])
}
