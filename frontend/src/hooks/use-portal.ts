'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiMutate, ApiRequestError } from '@/lib/api'
import { portalKeys } from '@/lib/query-keys'
import type {
  PortalSession,
  PortalPublicData,
  PortalMessage,
  CreateSessionPayload,
  UpdateSessionPayload,
  SendPortalMessagePayload,
  ReplySessionMessagePayload,
} from '@/types/portal'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!

// --- Hooks autenticados (dashboard interno) ---

/** Lista sessoes do portal, opcionalmente filtradas por job */
export function usePortalSessions(jobId?: string) {
  const query = useQuery({
    queryKey: jobId ? portalKeys.sessionsByJob(jobId) : portalKeys.sessions(),
    queryFn: async () => {
      const params = jobId ? { job_id: jobId } : undefined
      const res = await apiGet<PortalSession[]>('client-portal', params, 'sessions')
      return res.data ?? []
    },
    staleTime: 30_000,
  })

  return {
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  }
}

/** Cria uma nova sessao de portal */
export function useCreateSession() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: CreateSessionPayload) => {
      const res = await apiMutate<PortalSession & { portal_url: string }>(
        'client-portal',
        'POST',
        payload as unknown as Record<string, unknown>,
        'sessions',
      )
      return res.data!
    },
    onSuccess: (data) => {
      // Invalida listas gerais e por job
      queryClient.invalidateQueries({ queryKey: portalKeys.sessions() })
      if (data.job_id) {
        queryClient.invalidateQueries({
          queryKey: portalKeys.sessionsByJob(data.job_id),
        })
      }
    },
  })
}

/** Atualiza uma sessao existente (ativar/desativar, label, permissoes) */
export function useUpdateSession() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: string
      payload: UpdateSessionPayload
    }) => {
      const res = await apiMutate<PortalSession>(
        'client-portal',
        'PATCH',
        payload as unknown as Record<string, unknown>,
        `sessions/${id}`,
      )
      return res.data!
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: portalKeys.sessions() })
    },
  })
}

/** Remove uma sessao do portal */
export function useDeleteSession() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiMutate<{ id: string; deleted: boolean }>(
        'client-portal',
        'DELETE',
        undefined,
        `sessions/${id}`,
      )
      return res.data!
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: portalKeys.sessions() })
    },
  })
}

/** Lista mensagens de uma sessao especifica (atualiza a cada 15s) */
export function useSessionMessages(sessionId: string) {
  const query = useQuery({
    queryKey: portalKeys.sessionMessages(sessionId),
    queryFn: async () => {
      const res = await apiGet<{ messages: PortalMessage[]; session_id: string; job_id: string }>(
        'client-portal',
        { limit: '50' },
        `sessions/${sessionId}/messages`,
      )
      return res.data?.messages ?? []
    },
    enabled: !!sessionId,
    staleTime: 15_000,
    refetchInterval: 15_000,
  })

  return {
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  }
}

/** Envia resposta de mensagem pela producao para uma sessao */
export function useReplyMessage(sessionId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: ReplySessionMessagePayload) => {
      const res = await apiMutate<PortalMessage>(
        'client-portal',
        'POST',
        payload as unknown as Record<string, unknown>,
        `sessions/${sessionId}/messages`,
      )
      return res.data!
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: portalKeys.sessionMessages(sessionId),
      })
    },
  })
}

// --- Estado da pagina publica (sem TanStack Query, sem auth) ---

type PortalPublicStatus = 'idle' | 'loading' | 'success' | 'not_found' | 'expired' | 'error'

export interface PortalPublicState {
  status: PortalPublicStatus
  data: PortalPublicData | null
  errorCode?: number
}

/** Hook simples (useState/useEffect) para buscar dados publicos do portal sem auth */
export function usePortalPublic(token: string): PortalPublicState {
  const [state, setState] = useState<PortalPublicState>({
    status: 'idle',
    data: null,
  })

  useEffect(() => {
    if (!token) return

    setState({ status: 'loading', data: null })

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30_000)

    fetch(`${SUPABASE_URL}/functions/v1/client-portal/public/${token}`, {
      method: 'GET',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
    })
      .then(async (res) => {
        clearTimeout(timeoutId)
        const json = await res.json()

        if (res.status === 404) {
          setState({ status: 'not_found', data: null, errorCode: 404 })
          return
        }
        if (res.status === 410) {
          setState({ status: 'expired', data: null, errorCode: 410 })
          return
        }
        if (!res.ok || json?.error) {
          setState({ status: 'error', data: null, errorCode: res.status })
          return
        }

        setState({ status: 'success', data: json.data as PortalPublicData })
      })
      .catch((err) => {
        clearTimeout(timeoutId)
        if (err instanceof DOMException && err.name === 'AbortError') return
        setState({ status: 'error', data: null })
      })

    return () => {
      controller.abort()
      clearTimeout(timeoutId)
    }
  }, [token])

  return state
}

/** Envia mensagem publica para o portal (sem auth) */
export async function sendPublicMessage(
  token: string,
  payload: SendPortalMessagePayload,
): Promise<PortalMessage> {
  const res = await fetch(
    `${SUPABASE_URL}/functions/v1/client-portal/public/${token}/message`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
  )

  const json = await res.json()

  if (!res.ok || json?.error) {
    const err = json?.error || {}
    throw new ApiRequestError(
      err.code || 'UNKNOWN_ERROR',
      err.message || 'Erro ao enviar mensagem',
      res.status || 500,
    )
  }

  return json.data as PortalMessage
}
