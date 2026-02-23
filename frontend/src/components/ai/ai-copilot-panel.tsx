'use client'

import { useState, useEffect, useRef, useCallback, KeyboardEvent } from 'react'
import { Bot, Plus, History, Send, Trash2, ChevronLeft, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

import {
  useConversations,
  useConversationMessages,
  useDeleteConversation,
  useChatStream,
} from '@/hooks/use-ai-copilot'
import type { CopilotMessage, CopilotChatContext } from '@/types/ai'

// --- Sub-componentes ---

/** Indicador de digitacao com tres pontos animados */
function TypingIndicator() {
  return (
    <div className="flex items-end gap-2">
      <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-rose-500/10 ring-1 ring-rose-500/20">
        <Bot className="size-3.5 text-rose-500" />
      </div>
      <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm bg-muted px-4 py-3">
        <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:0ms]" />
        <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:150ms]" />
        <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:300ms]" />
      </div>
    </div>
  )
}

/** Bolha de mensagem individual */
function MessageBubble({ message }: { message: CopilotMessage }) {
  const isUser = message.role === 'user'

  return (
    <div className={cn('flex items-end gap-2', isUser && 'flex-row-reverse')}>
      {/* Avatar */}
      {!isUser && (
        <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-rose-500/10 ring-1 ring-rose-500/20">
          <Bot className="size-3.5 text-rose-500" />
        </div>
      )}

      {/* Conteudo */}
      <div
        className={cn(
          'max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
          isUser
            ? 'rounded-br-sm bg-rose-600 text-white dark:bg-rose-500'
            : 'rounded-bl-sm bg-muted text-foreground',
        )}
      >
        {/* Renderiza com whitespace-pre-wrap para preservar quebras de linha */}
        <p className="whitespace-pre-wrap break-words">{message.content}</p>
      </div>
    </div>
  )
}

/** Bolha de streaming — mostra texto acumulado em tempo real */
function StreamingBubble({ text }: { text: string }) {
  return (
    <div className="flex items-end gap-2">
      <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-rose-500/10 ring-1 ring-rose-500/20">
        <Bot className="size-3.5 text-rose-500" />
      </div>
      <div className="max-w-[85%] rounded-2xl rounded-bl-sm bg-muted px-4 py-2.5 text-sm leading-relaxed text-foreground">
        <p className="whitespace-pre-wrap break-words">
          {text}
          {/* Cursor piscante ao final do texto em streaming */}
          <span className="ml-0.5 inline-block h-[1em] w-px animate-pulse bg-current align-text-bottom" />
        </p>
      </div>
    </div>
  )
}

/** Skeleton para carregamento inicial de mensagens */
function MessagesSkeleton() {
  return (
    <div className="flex flex-col gap-4 p-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className={cn('flex gap-2', i % 2 === 0 ? '' : 'flex-row-reverse')}>
          <Skeleton className="size-7 shrink-0 rounded-full" />
          <Skeleton
            className={cn(
              'h-12 rounded-2xl',
              i % 2 === 0 ? 'w-3/4' : 'w-1/2',
            )}
          />
        </div>
      ))}
    </div>
  )
}

/** Lista de conversas passadas */
interface ConversationListProps {
  onSelect: (id: string) => void
  onBack: () => void
}

function ConversationList({ onSelect, onBack }: ConversationListProps) {
  const { data: conversations, isLoading } = useConversations()
  const deleteConversation = useDeleteConversation()

  async function handleDelete(e: React.MouseEvent, id: string) {
    // Impede que o click propague para o item pai (que abriria a conversa)
    e.stopPropagation()
    try {
      await deleteConversation.mutateAsync(id)
      toast.success('Conversa excluida')
    } catch {
      toast.error('Erro ao excluir conversa')
    }
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <Button variant="ghost" size="icon" className="size-8" onClick={onBack}>
          <ChevronLeft className="size-4" />
        </Button>
        <span className="text-sm font-medium">Historico de conversas</span>
      </div>

      <ScrollArea className="flex-1">
        {isLoading && (
          <div className="flex flex-col gap-2 p-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-lg" />
            ))}
          </div>
        )}

        {!isLoading && (!conversations || conversations.length === 0) && (
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <History className="size-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">Nenhuma conversa ainda</p>
          </div>
        )}

        <div className="flex flex-col gap-1 p-2">
          {conversations?.map((conv) => (
            <button
              key={conv.id}
              onClick={() => onSelect(conv.id)}
              className={cn(
                'group flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left',
                'hover:bg-muted/60 transition-colors',
              )}
            >
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <p className="truncate text-sm font-medium">
                  {conv.title || 'Conversa sem titulo'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {conv.message_count} mensagem{conv.message_count !== 1 ? 's' : ''}
                  {conv.last_message_at
                    ? ` · ${formatDistanceToNow(new Date(conv.last_message_at), { locale: ptBR, addSuffix: true })}`
                    : ''}
                </p>
              </div>

              {/* Botao deletar — visivel ao hover */}
              <Button
                variant="ghost"
                size="icon"
                className="size-7 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 hover:text-destructive"
                onClick={(e) => handleDelete(e, conv.id)}
                disabled={deleteConversation.isPending}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}

// --- Componente principal ---

interface AiCopilotPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Contexto opcional para dar mais informacoes a ELLA sobre a pagina atual */
  context?: CopilotChatContext
}

export function AiCopilotPanel({ open, onOpenChange, context }: AiCopilotPanelProps) {
  const [showHistory, setShowHistory] = useState(false)
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [localMessages, setLocalMessages] = useState<CopilotMessage[]>([])

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const { sendMessage, isStreaming, streamedText, conversationId, resetStream } = useChatStream()

  // Carrega mensagens da conversa ativa (historico)
  const { data: conversationData, isLoading: isLoadingMessages } =
    useConversationMessages(activeConversationId)

  // Sincroniza mensagens do servidor com o estado local quando a conversa muda
  useEffect(() => {
    if (conversationData?.messages) {
      setLocalMessages(conversationData.messages)
    }
  }, [conversationData])

  // Atualiza conversationId quando o stream inicia uma nova conversa
  useEffect(() => {
    if (conversationId && conversationId !== activeConversationId) {
      setActiveConversationId(conversationId)
    }
  }, [conversationId, activeConversationId])

  // Auto-scroll para a ultima mensagem
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [localMessages, streamedText, isStreaming])

  // Auto-resize do textarea conforme o usuario digita
  function handleInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value)
    const el = e.target
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 120)}px` // max 4 linhas ~120px
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    // Enter sem Shift envia a mensagem
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleSend = useCallback(async () => {
    const trimmed = input.trim()
    if (!trimmed || isStreaming) return

    // Limpa input e reseta altura do textarea imediatamente
    setInput('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }

    // Adiciona mensagem do usuario localmente para feedback imediato
    const userMsg: CopilotMessage = {
      id: `local-${Date.now()}`,
      conversation_id: activeConversationId ?? '',
      role: 'user',
      content: trimmed,
      created_at: new Date().toISOString(),
    }
    setLocalMessages((prev) => [...prev, userMsg])

    try {
      const result = await sendMessage({
        message: trimmed,
        conversationId: activeConversationId,
        context,
      })

      // Apos o stream concluir, adiciona resposta da ELLA ao estado local
      if (result?.text) {
        const ellaMsgId = `local-ella-${Date.now()}`
        const ellaMsg: CopilotMessage = {
          id: ellaMsgId,
          conversation_id: result.conversationId ?? '',
          role: 'assistant',
          content: result.text,
          created_at: new Date().toISOString(),
        }
        setLocalMessages((prev) => [...prev, ellaMsg])
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao enviar mensagem'
      toast.error('ELLA indisponivel', { description: message })
    }
  }, [input, isStreaming, activeConversationId, context, sendMessage])

  function handleNewConversation() {
    resetStream()
    setActiveConversationId(null)
    setLocalMessages([])
    setShowHistory(false)
    setInput('')
    // Foca o textarea apos nova conversa
    setTimeout(() => textareaRef.current?.focus(), 100)
  }

  function handleSelectConversation(id: string) {
    resetStream()
    setActiveConversationId(id)
    setLocalMessages([])
    setShowHistory(false)
  }

  // Mensagens exibidas: historico do servidor (ou local) + streaming em andamento
  const displayMessages = localMessages

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 sm:max-w-md"
      >
        {showHistory ? (
          // Vista de historico
          <ConversationList
            onSelect={handleSelectConversation}
            onBack={() => setShowHistory(false)}
          />
        ) : (
          // Vista de chat
          <>
            {/* Header */}
            <SheetHeader className="shrink-0 border-b px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex size-8 items-center justify-center rounded-full bg-rose-500/10 ring-1 ring-rose-500/20">
                    <Bot className="size-4 text-rose-500" />
                  </div>
                  <div className="flex flex-col">
                    <SheetTitle className="text-sm font-semibold leading-none">ELLA</SheetTitle>
                    <span className="mt-0.5 text-xs text-muted-foreground">
                      {isStreaming ? 'Digitando...' : 'Copilot de producao'}
                    </span>
                  </div>
                  <Badge
                    variant="outline"
                    className="ml-1 border-rose-200 bg-rose-50 text-rose-700 text-xs dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-400"
                  >
                    IA
                  </Badge>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    title="Historico de conversas"
                    onClick={() => setShowHistory(true)}
                  >
                    <History className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    title="Nova conversa"
                    onClick={handleNewConversation}
                  >
                    <Plus className="size-4" />
                  </Button>
                </div>
              </div>
            </SheetHeader>

            {/* Area de mensagens */}
            <ScrollArea className="flex-1">
              <div className="flex flex-col gap-3 p-4">
                {/* Estado inicial — sem conversa */}
                {!activeConversationId && displayMessages.length === 0 && !isStreaming && (
                  <div className="flex flex-col items-center gap-4 py-10 text-center">
                    <div className="flex size-14 items-center justify-center rounded-full bg-rose-500/10 ring-1 ring-rose-500/20">
                      <Bot className="size-7 text-rose-500" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <p className="font-semibold">Oi! Sou a ELLA</p>
                      <p className="text-sm text-muted-foreground max-w-[240px]">
                        Sua assistente de producao. Pergunte sobre jobs, orcamentos, prazos ou equipe.
                      </p>
                    </div>
                    <Separator className="w-16" />
                    <div className="flex flex-col gap-2 w-full max-w-xs">
                      {[
                        'Quais jobs estao atrasados?',
                        'Resuma o status do job atual',
                        'Qual e a margem media dos projetos?',
                      ].map((suggestion) => (
                        <button
                          key={suggestion}
                          onClick={() => {
                            setInput(suggestion)
                            textareaRef.current?.focus()
                          }}
                          className="rounded-lg border border-muted-foreground/20 px-3 py-2 text-left text-sm text-muted-foreground hover:border-rose-300 hover:text-foreground hover:bg-rose-50/50 dark:hover:bg-rose-950/20 transition-colors"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Carregando mensagens da conversa selecionada */}
                {isLoadingMessages && activeConversationId && <MessagesSkeleton />}

                {/* Mensagens */}
                {!isLoadingMessages &&
                  displayMessages.map((msg) => (
                    <MessageBubble key={msg.id} message={msg} />
                  ))}

                {/* Streaming em andamento */}
                {isStreaming && streamedText && <StreamingBubble text={streamedText} />}
                {isStreaming && !streamedText && <TypingIndicator />}

                {/* Ancora para auto-scroll */}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Area de input */}
            <div className="shrink-0 border-t bg-background p-3">
              <div className="flex items-end gap-2 rounded-xl border bg-muted/40 px-3 py-2 focus-within:border-rose-400 focus-within:ring-1 focus-within:ring-rose-400/30 transition-[border-color,box-shadow]">
                <Textarea
                  ref={textareaRef}
                  value={input}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Pergunte algo sobre seus jobs..."
                  className={cn(
                    'min-h-[36px] flex-1 resize-none border-0 bg-transparent p-0',
                    'text-sm shadow-none focus-visible:ring-0 focus-visible:ring-offset-0',
                    'placeholder:text-muted-foreground/60',
                  )}
                  rows={1}
                  disabled={isStreaming}
                />
                <Button
                  size="icon"
                  className={cn(
                    'size-8 shrink-0 rounded-lg bg-rose-600 hover:bg-rose-700',
                    'dark:bg-rose-500 dark:hover:bg-rose-600',
                    'disabled:opacity-40',
                  )}
                  disabled={!input.trim() || isStreaming}
                  onClick={handleSend}
                >
                  <Send className="size-3.5" />
                </Button>
              </div>
              <p className="mt-1.5 text-center text-[10px] text-muted-foreground/50">
                Enter para enviar · Shift+Enter para nova linha
              </p>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
