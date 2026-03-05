// Helper para sugestao de emojis via Groq (edge function emoji-suggest).
// Usado pelo EmojiPicker no PhaseDialog do cronograma.

import { apiMutate } from '@/lib/api'

/**
 * Sugere 4 emojis para um nome de fase via Groq (Llama 3.3 70B).
 * Requer autenticacao — lanca ApiRequestError em caso de falha.
 */
export async function suggestEmojis(phaseLabel: string): Promise<string[]> {
  const res = await apiMutate<{ emojis: string[] }>('emoji-suggest', 'POST', {
    phase_label: phaseLabel,
  })

  const emojis = res.data?.emojis
  if (!Array.isArray(emojis)) return []

  return emojis
    .filter((e): e is string => typeof e === 'string' && e.trim().length > 0)
    .slice(0, 4)
}
