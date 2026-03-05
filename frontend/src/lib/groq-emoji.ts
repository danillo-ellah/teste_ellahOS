// Helper para sugestao de emojis via Groq (edge function emoji-suggest).
// Usado pelo EmojiPicker no PhaseDialog do cronograma.

import { createClient } from '@/lib/supabase/client'
import { ApiRequestError } from '@/lib/api'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!

/**
 * Sugere 4 emojis para um nome de fase via Groq (Llama 3.3 70B).
 * Requer autenticacao — lanca ApiRequestError em caso de falha.
 */
export async function suggestEmojis(phaseLabel: string): Promise<string[]> {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session?.access_token) {
    throw new ApiRequestError('UNAUTHORIZED', 'Sessao expirada', 401)
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 15_000)

  let res: Response
  try {
    res = await fetch(`${SUPABASE_URL}/functions/v1/emoji-suggest`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ phase_label: phaseLabel }),
    })
  } catch (err) {
    clearTimeout(timeoutId)
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new ApiRequestError('TIMEOUT', 'Sugestao expirou. Tente novamente.', 408)
    }
    throw new ApiRequestError('NETWORK_ERROR', 'Erro de conexao.', 0)
  }
  clearTimeout(timeoutId)

  const data = await res.json()

  if (!res.ok || data?.error) {
    const errPayload = data?.error || {}
    throw new ApiRequestError(
      errPayload.code || 'UNKNOWN_ERROR',
      errPayload.message || 'Erro ao sugerir emojis',
      res.status || 500,
    )
  }

  const emojis: unknown = data?.data?.emojis
  if (!Array.isArray(emojis)) return []

  return (emojis as unknown[])
    .filter((e): e is string => typeof e === 'string' && e.trim().length > 0)
    .slice(0, 4)
}
