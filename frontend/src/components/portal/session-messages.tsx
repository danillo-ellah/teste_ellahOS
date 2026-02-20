'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Loader2, MessageSquare, AlertCircle } from 'lucide-react'
import { format, parseISO, isToday, isYesterday, isValid } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { useSessionMessages, useReplyMessage } from '@/hooks/use-portal'

function getInitials(name: string): string {
  const parts = name.trim().split(' ').filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return (parts[0]![0] ?? '?').toUpperCase()
  return ((parts[0]![0] ?? '') + (parts[parts.length - 1]![0] ?? '')).toUpperCase()
}

function formatMsgTime(dateStr: string): string {
  try {
    const parsed = parseISO(dateStr)
    if (!isValid(parsed)) return ''
    return format(parsed, 'HH:mm')
  } catch {
    return ''
  }
}

function formatMsgDateLabel(dateStr: string): string {
  try {
    const parsed = parseISO(dateStr)
    if (!isValid(parsed)) return ''
    if (isToday(parsed)) return 'Hoje'
    if (isYesterday(parsed)) return 'Ontem'
    return format(parsed, 'dd/MM/yyyy', { locale: ptBR })
  } catch {
    return ''
  }
}

interface SessionMessagesProps {
  sessionId: string
  /** Nome do remetente (produtor) padrao */
  defaultSenderName?: string
}

export function SessionMessages({
  sessionId,
  defaultSenderName = 'Ellah Filmes',
}: SessionMessagesProps) {
  const { data: messages, isLoading, isError, refetch } = useSessionMessages(sessionId)
  const { mutateAsync: reply, isPending: isReplying } = useReplyMessage(sessionId)

  const [content, setContent] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    if (messages) scrollToBottom()
  }, [messages, scrollToBottom])

  async function handleSend() {
    const trimmed = content.trim()
    if (!trimmed || isReplying) return

    setContent('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }

    try {
      await reply({ content: trimmed, sender_name: defaultSenderName })
    } catch {
      toast.error('Erro ao enviar mensagem. Tente novamente.')
      setContent(trimmed)
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
    const el = e.target
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`
  }

  // Agrupa mensagens por data
  type MessageItem = NonNullable<typeof messages>[number]
  function groupByDate(msgs: MessageItem[]): Array<{ label: string; msgs: MessageItem[] }> {
    const groups = new Map<string, MessageItem[]>()
    for (const m of msgs) {
      const lbl = formatMsgDateLabel(m.created_at)
      if (!groups.has(lbl)) groups.set(lbl, [])
      groups.get(lbl)!.push(m)
    }
    return Array.from(groups.entries()).map(([label, msgs]) => ({ label, msgs }))
  }

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <Skeleton className="h-5 w-40" />
        </div>
        <div className="h-64 p-4 space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className={cn('flex gap-3', i % 2 === 1 && 'justify-end flex-row-reverse')}>
              <Skeleton className="h-8 w-8 rounded-full shrink-0" />
              <Skeleton className="h-10 w-40 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-border bg-card p-5 flex flex-col items-center gap-3">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="text-sm text-muted-foreground">Erro ao carregar mensagens.</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          Tentar novamente
        </Button>
      </div>
    )
  }

  const groups = groupByDate(messages ?? [])

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
        <MessageSquare className="h-[18px] w-[18px] text-muted-foreground" aria-hidden="true" />
        <span className="text-base font-semibold">Mensagens do Portal</span>
        <span className="ml-auto text-xs text-muted-foreground">
          Atualiza a cada 15s
        </span>
      </div>

      {/* Mensagens */}
      <div
        className="h-72 overflow-y-auto p-4 scroll-smooth"
        aria-label="Mensagens do portal"
        aria-live="polite"
        role="log"
      >
        {(!messages || messages.length === 0) ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <MessageSquare className="h-8 w-8 text-muted-foreground mb-2" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">Nenhuma mensagem ainda.</p>
          </div>
        ) : (
          groups.map(({ label, msgs }) => (
            <div key={label}>
              {/* Separador de data */}
              <div className="flex items-center gap-2 my-3">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground">{label}</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              {msgs.map((msg) => {
                // outbound = da producao (lado esquerdo no chat do produtor, eh o que eles enviaram)
                // inbound = do cliente (lado direito para o produtor — mensagens recebidas)
                const isFromClient = msg.direction === 'client_to_producer'
                const time = formatMsgTime(msg.created_at)

                return (
                  <div
                    key={msg.id}
                    className={cn(
                      'flex items-end gap-3 mb-4',
                      isFromClient ? 'justify-end flex-row-reverse' : 'justify-start',
                    )}
                  >
                    {/* Avatar */}
                    <div
                      className={cn(
                        'h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0',
                        isFromClient
                          ? 'bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200'
                          : 'bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400',
                      )}
                      aria-hidden="true"
                    >
                      {getInitials(msg.sender_name || (isFromClient ? 'CL' : 'EF'))}
                    </div>

                    {/* Balao */}
                    <div className={cn('max-w-[70%] flex flex-col', isFromClient ? 'items-end' : 'items-start')}>
                      <span className={cn('text-xs text-muted-foreground mb-1', isFromClient ? 'text-right' : 'text-left')}>
                        {msg.sender_name}{time && ` · ${time}`}
                      </span>
                      <div
                        className={cn(
                          'px-3 py-2 rounded-lg text-sm leading-relaxed',
                          isFromClient
                            ? 'bg-rose-50 text-rose-900 dark:bg-rose-500/10 dark:text-rose-100 rounded-tr-sm'
                            : 'bg-muted text-foreground rounded-tl-sm',
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
        <div ref={messagesEndRef} />
      </div>

      {/* Input de resposta */}
      <div className="border-t border-border p-3 flex gap-2 items-end">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleTextareaChange}
          onKeyDown={handleKeyDown}
          placeholder="Responder como producao... (Enter envia)"
          rows={1}
          disabled={isReplying}
          aria-label="Escreva sua resposta"
          className={cn(
            'flex-1 resize-none rounded-lg border border-border bg-muted/50 px-3 py-2',
            'text-sm placeholder:text-muted-foreground min-h-10 max-h-[120px]',
            'focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-ring/50',
            'disabled:opacity-50',
          )}
          style={{ height: '40px' }}
        />
        <Button
          size="icon"
          className="h-10 w-10 shrink-0"
          disabled={!content.trim() || isReplying}
          onClick={handleSend}
          aria-label="Enviar resposta"
        >
          {isReplying ? (
            <Loader2 className="h-[18px] w-[18px] animate-spin" />
          ) : (
            <Send className="h-[18px] w-[18px]" aria-hidden="true" />
          )}
        </Button>
      </div>
    </div>
  )
}
