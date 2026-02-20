'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { MessageSquare, Send, Loader2 } from 'lucide-react'
import { format, parseISO, isToday, isYesterday, isValid } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { sendPublicMessage } from '@/hooks/use-portal'
import type { PortalMessage } from '@/types/portal'

// Chave do localStorage para salvar o nome do remetente
const SENDER_NAME_KEY = 'portal_sender_name'

function formatMsgTime(dateStr: string): string {
  try {
    const parsed = parseISO(dateStr)
    if (!isValid(parsed)) return ''
    return format(parsed, 'HH:mm')
  } catch {
    return ''
  }
}

function formatMsgDate(dateStr: string): string {
  try {
    const parsed = parseISO(dateStr)
    if (!isValid(parsed)) return ''
    if (isToday(parsed)) return 'HOJE'
    if (isYesterday(parsed)) return 'ONTEM'
    return format(parsed, 'dd/MM/yyyy', { locale: ptBR })
  } catch {
    return ''
  }
}

function getInitials(name: string): string {
  const parts = name.trim().split(' ').filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return (parts[0]![0] ?? '?').toUpperCase()
  return ((parts[0]![0] ?? '') + (parts[parts.length - 1]![0] ?? '')).toUpperCase()
}

// Agrupa mensagens por data para exibir separador
function groupMsgsByDate(messages: PortalMessage[]): Array<{
  dateLabel: string
  msgs: PortalMessage[]
}> {
  const groups: Map<string, PortalMessage[]> = new Map()
  for (const msg of messages) {
    const label = formatMsgDate(msg.created_at)
    if (!groups.has(label)) groups.set(label, [])
    groups.get(label)!.push(msg)
  }
  return Array.from(groups.entries()).map(([dateLabel, msgs]) => ({ dateLabel, msgs }))
}

interface PortalChatProps {
  messages: PortalMessage[]
  token: string
}

export function PortalChat({ messages: initialMessages, token }: PortalChatProps) {
  const [messages, setMessages] = useState<PortalMessage[]>(initialMessages)
  const [senderName, setSenderName] = useState(() => {
    if (typeof window === 'undefined') return ''
    return localStorage.getItem(SENDER_NAME_KEY) ?? ''
  })
  const [showNameInput, setShowNameInput] = useState(false)
  const [content, setContent] = useState('')
  const [isSending, setIsSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Scroll automatico para ultima mensagem
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  async function handleSend() {
    const trimmedContent = content.trim()
    const trimmedName = senderName.trim()

    if (!trimmedContent) return

    // Pede nome se nao preenchido
    if (!trimmedName) {
      setShowNameInput(true)
      return
    }

    // Salva nome no localStorage
    localStorage.setItem(SENDER_NAME_KEY, trimmedName)

    // Mensagem otimista (aparece imediatamente)
    const optimisticMsg: PortalMessage = {
      id: `optimistic-${Date.now()}`,
      direction: 'client_to_producer',
      sender_name: trimmedName,
      content: trimmedContent,
      created_at: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, optimisticMsg])
    setContent('')

    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }

    setIsSending(true)
    try {
      const sent = await sendPublicMessage(token, {
        sender_name: trimmedName,
        content: trimmedContent,
        idempotency_key: optimisticMsg.id,
      })

      // Substituir mensagem otimista pela confirmada
      setMessages((prev) =>
        prev.map((m) => (m.id === optimisticMsg.id ? sent : m)),
      )
    } catch (err) {
      // Remover mensagem otimista em caso de erro
      setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id))
      const msg = err instanceof Error ? err.message : 'Erro ao enviar mensagem'
      toast.error(msg)
      setContent(trimmedContent) // Restaura o texto
    } finally {
      setIsSending(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  function handleTextareaChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setContent(e.target.value)
    // Auto-resize
    const el = e.target
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`
  }

  const groups = groupMsgsByDate(messages)

  return (
    <section
      className="rounded-xl border border-border bg-card overflow-hidden"
      aria-labelledby="chat-heading"
    >
      {/* Header do chat */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
        <MessageSquare
          className="h-[18px] w-[18px] text-muted-foreground"
          aria-hidden="true"
        />
        <h2 id="chat-heading" className="text-base font-semibold flex-1">
          Mensagens com a Producao
        </h2>
        {/* Indicador online (visual) */}
        <div className="flex items-center gap-1.5">
          <span
            className="h-2 w-2 rounded-full bg-green-500"
            aria-hidden="true"
            style={{ animation: 'pulse 2s ease-in-out infinite' }}
          />
          <span className="text-xs text-green-500">Online</span>
        </div>
      </div>

      {/* Area de mensagens */}
      <div
        className="h-64 sm:h-80 lg:h-96 overflow-y-auto p-4 space-y-1 scroll-smooth"
        aria-label="Area de mensagens"
        aria-live="polite"
        role="log"
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <MessageSquare className="h-8 w-8 text-muted-foreground mb-2" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">
              Nenhuma mensagem ainda. Envie a primeira!
            </p>
          </div>
        ) : (
          groups.map(({ dateLabel, msgs }) => (
            <div key={dateLabel}>
              {/* Separador de data */}
              <div className="flex items-center gap-2 my-3" aria-label={dateLabel}>
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground select-none">{dateLabel}</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              {msgs.map((msg) => {
                const isOutbound = msg.direction === 'producer_to_client'
                const time = formatMsgTime(msg.created_at)

                return (
                  <div
                    key={msg.id}
                    className={cn(
                      'flex items-end gap-3 mb-4',
                      isOutbound ? 'justify-end flex-row-reverse' : 'justify-start',
                    )}
                  >
                    {/* Avatar */}
                    <div
                      className={cn(
                        'h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0',
                        isOutbound
                          ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400'
                          : 'bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200',
                      )}
                      aria-hidden="true"
                    >
                      {getInitials(msg.sender_name || (isOutbound ? 'EF' : 'VC'))}
                    </div>

                    {/* Balao da mensagem */}
                    <div
                      className={cn(
                        'max-w-[70%]',
                        isOutbound ? 'items-end' : 'items-start',
                        'flex flex-col',
                      )}
                    >
                      {/* Nome + hora */}
                      <span
                        className={cn(
                          'text-xs text-muted-foreground mb-1',
                          isOutbound ? 'text-right' : 'text-left',
                        )}
                      >
                        {msg.sender_name}
                        {time && ` · ${time}`}
                      </span>

                      {/* Conteudo */}
                      <div
                        className={cn(
                          'px-3 py-2 rounded-lg text-sm leading-relaxed',
                          isOutbound
                            ? 'bg-muted text-foreground rounded-tl-sm'
                            : 'bg-rose-50 text-rose-900 dark:bg-rose-500/10 dark:text-rose-100 rounded-tr-sm',
                        )}
                      >
                        {msg.content}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ))
        )}
        {/* Ancora para scroll */}
        <div ref={messagesEndRef} />
      </div>

      {/* Campo de nome (aparece se nao preenchido) */}
      {showNameInput && !senderName.trim() && (
        <div className="border-t border-border p-3 bg-muted/30">
          <label htmlFor="sender-name" className="text-xs text-muted-foreground block mb-1">
            Seu nome (para identificar sua mensagem):
          </label>
          <input
            id="sender-name"
            type="text"
            value={senderName}
            onChange={(e) => setSenderName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && senderName.trim()) {
                setShowNameInput(false)
                handleSend()
              }
            }}
            placeholder="Ex: Maria Costa"
            className={cn(
              'w-full h-9 px-3 text-sm rounded-md border border-input bg-background',
              'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0',
            )}
            autoFocus
          />
        </div>
      )}

      {/* Input de mensagem */}
      <div className="border-t border-border p-3 flex gap-2 items-end">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleTextareaChange}
          onKeyDown={handleKeyDown}
          placeholder="Escreva sua mensagem..."
          rows={1}
          disabled={isSending}
          aria-label="Escreva sua mensagem"
          className={cn(
            'flex-1 resize-none rounded-lg border border-border bg-muted/50 px-3 py-2',
            'text-sm placeholder:text-muted-foreground',
            'focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500/50',
            'min-h-10 max-h-[120px] disabled:opacity-50',
          )}
          style={{ height: '40px' }}
        />

        <Button
          size="icon"
          className="h-10 w-10 shrink-0"
          disabled={!content.trim() || isSending}
          onClick={handleSend}
          aria-label="Enviar mensagem"
        >
          {isSending ? (
            <Loader2 className="h-[18px] w-[18px] animate-spin" />
          ) : (
            <Send className="h-[18px] w-[18px]" aria-hidden="true" />
          )}
        </Button>
      </div>
    </section>
  )
}
