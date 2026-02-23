'use client'

import { useState, useCallback, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiMutate } from '@/lib/api'
import { copilotKeys } from '@/lib/query-keys'
import { createClient } from '@/lib/supabase/client'
import type {
  CopilotConversation,
  CopilotConversationDetail,
  CopilotChatContext,
} from '@/types/ai'

const FUNCTION_NAME = 'ai-copilot'
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!

// --- Lista de conversas ---

export function useConversations() {
  return useQuery({
    queryKey: copilotKeys.conversations(),
    queryFn: async () => {
      const res = await apiGet<CopilotConversation[]>(FUNCTION_NAME, undefined, 'conversations')
      return res.data ?? []
    },
    staleTime: 30_000,
  })
}

// --- Mensagens de uma conversa especifica ---

export function useConversationMessages(conversationId: string | null) {
  return useQuery({
    queryKey: copilotKeys.conversation(conversationId ?? ''),
    queryFn: async () => {
      const res = await apiGet<CopilotConversationDetail>(
        FUNCTION_NAME,
        undefined,
        `conversations/${conversationId}`,
      )
      return res.data ?? null
    },
    enabled: !!conversationId,
    staleTime: 10_000,
  })
}

// --- Deletar conversa ---

export function useDeleteConversation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      await apiMutate(FUNCTION_NAME, 'DELETE', undefined, `conversations/${id}`)
    },
    onSuccess: () => {
      // Invalida lista de conversas apos deletar
      queryClient.invalidateQueries({ queryKey: copilotKeys.conversations() })
    },
  })
}

// --- Streaming SSE ---

interface StreamState {
  streamedText: string
  isStreaming: boolean
  conversationId: string | null
  error: string | null
}

interface SendMessageOptions {
  message: string
  conversationId?: string | null
  context?: CopilotChatContext
}

/**
 * Hook para chat com streaming SSE.
 * Faz fetch manual com ReadableStream para ler eventos SSE do endpoint /chat.
 * Eventos suportados: start (conversation_id, message_id), delta (text), done (tokens_used).
 */
export function useChatStream() {
  const queryClient = useQueryClient()
  const abortRef = useRef<AbortController | null>(null)

  const [state, setState] = useState<StreamState>({
    streamedText: '',
    isStreaming: false,
    conversationId: null,
    error: null,
  })

  // Obtem token de autenticacao atual da sessao Supabase
  async function getToken(): Promise<string> {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) {
      throw new Error('Sessao expirada. Faca login novamente.')
    }
    return session.access_token
  }

  const sendMessage = useCallback(async (options: SendMessageOptions) => {
    const { message, conversationId, context } = options

    // Cancela stream anterior se existir
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setState({ streamedText: '', isStreaming: true, conversationId: conversationId ?? null, error: null })

    try {
      const token = await getToken()

      const body: Record<string, unknown> = { message }
      if (conversationId) body.conversation_id = conversationId
      if (context) body.context = context

      const res = await fetch(`${SUPABASE_URL}/functions/v1/${FUNCTION_NAME}/chat`, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      })

      if (!res.ok || !res.body) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData?.error?.message ?? `Erro ${res.status} ao chamar ELLA`)
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let activeConversationId: string | null = conversationId ?? null
      let accumulated = ''

      // Le o stream linha por linha (formato SSE: "data: {...}\n\n")
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })

        // Processa linhas completas do buffer
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? '' // ultima linha pode estar incompleta

        // currentEvent captura a linha `event:` que precede cada bloco `data:`
        let currentEvent = ''

        for (const line of lines) {
          const trimmed = line.trim()

          // Captura tipo do evento SSE (linha `event: start`, `event: delta`, etc.)
          if (trimmed.startsWith('event:')) {
            currentEvent = trimmed.slice(6).trim()
            continue
          }

          if (!trimmed.startsWith('data:')) continue

          const jsonStr = trimmed.slice(5).trim()
          if (!jsonStr || jsonStr === '[DONE]') {
            currentEvent = ''
            continue
          }

          let parsed: Record<string, unknown>
          try {
            parsed = JSON.parse(jsonStr)
          } catch {
            currentEvent = ''
            continue
          }

          // Usa evento da linha `event:` como tipo; `parsed.type` e fallback de compatibilidade
          const eventType = currentEvent || (parsed.type as string) || ''
          currentEvent = '' // reset apos consumir

          if (eventType === 'start') {
            // Recebe conversation_id atribuido pelo servidor
            activeConversationId = (parsed.conversation_id as string) ?? activeConversationId
            setState((prev) => ({ ...prev, conversationId: activeConversationId }))
          } else if (eventType === 'delta') {
            // Acumula fragmento de texto
            const chunk = (parsed.text as string) ?? ''
            accumulated += chunk
            setState((prev) => ({ ...prev, streamedText: prev.streamedText + chunk }))
          } else if (eventType === 'done') {
            // Stream finalizado — invalida queries para atualizar historico
            if (activeConversationId) {
              queryClient.invalidateQueries({
                queryKey: copilotKeys.conversation(activeConversationId),
              })
            }
            queryClient.invalidateQueries({ queryKey: copilotKeys.conversations() })
          }
        }
      }

      setState((prev) => ({ ...prev, isStreaming: false }))
      return { conversationId: activeConversationId, text: accumulated }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        // Cancelamento intencional — nao e um erro
        setState((prev) => ({ ...prev, isStreaming: false }))
        return null
      }
      const message = err instanceof Error ? err.message : 'Erro ao conectar com ELLA'
      setState((prev) => ({ ...prev, isStreaming: false, error: message }))
      throw err
    }
  }, [queryClient])

  const resetStream = useCallback(() => {
    abortRef.current?.abort()
    setState({ streamedText: '', isStreaming: false, conversationId: null, error: null })
  }, [])

  return {
    sendMessage,
    isStreaming: state.isStreaming,
    streamedText: state.streamedText,
    conversationId: state.conversationId,
    error: state.error,
    resetStream,
  }
}
