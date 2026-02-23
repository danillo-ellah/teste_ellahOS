'use client'

import { useState } from 'react'
import { Bot } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AiCopilotPanel } from './ai-copilot-panel'
import type { CopilotChatContext } from '@/types/ai'

interface AiCopilotTriggerProps {
  /** Contexto opcional passado para o painel (ex: job_id da pagina atual) */
  context?: CopilotChatContext
  className?: string
}

/**
 * Botao flutuante (fixed bottom-right) que abre o painel de chat da ELLA.
 * Deve ser inserido uma vez no layout do dashboard.
 */
export function AiCopilotTrigger({ context, className }: AiCopilotTriggerProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Botao flutuante */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Abrir copilot ELLA"
        className={cn(
          // Posicionamento fixo, acima do bottom nav mobile (bottom-20 em mobile, bottom-6 em desktop)
          'fixed bottom-20 right-4 z-40 md:bottom-6 md:right-6',
          // Visual
          'flex items-center gap-2 rounded-full',
          'bg-rose-600 px-4 py-2.5 shadow-lg shadow-rose-900/20',
          'dark:bg-rose-500 dark:shadow-rose-900/40',
          // Estados
          'hover:bg-rose-700 dark:hover:bg-rose-600',
          'active:scale-95',
          'transition-all duration-150',
          // Anel de foco acessivel
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          className,
        )}
      >
        <Bot className="size-4 text-white" />
        <span className="text-sm font-semibold text-white">ELLA</span>
      </button>

      {/* Painel de chat (Sheet) */}
      <AiCopilotPanel open={open} onOpenChange={setOpen} context={context} />
    </>
  )
}
