'use client'

import { useState } from 'react'
import { MessageCircle, ChevronDown, ChevronRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { useWhatsAppMessages } from '@/hooks/useWhatsAppMessages'
import type { JobDetail } from '@/types/jobs'
import type { WhatsAppMessageStatus } from '@/types/whatsapp'

interface WhatsAppSectionProps {
  job: JobDetail
}

// Cores e labels por status
const STATUS_CONFIG: Record<
  WhatsAppMessageStatus,
  { label: string; className: string }
> = {
  pending: {
    label: 'Pendente',
    className: 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400',
  },
  sent: {
    label: 'Enviado',
    className: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  },
  delivered: {
    label: 'Entregue',
    className: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  },
  read: {
    label: 'Lido',
    className: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
  },
  failed: {
    label: 'Falhou',
    className: 'bg-red-500/10 text-red-600 dark:text-red-400',
  },
}

function formatPhone(phone: string): string {
  // Formata 5511999999999 → +55 (11) 99999-9999
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 13) {
    return `+${digits.slice(0, 2)} (${digits.slice(2, 4)}) ${digits.slice(4, 9)}-${digits.slice(9)}`
  }
  if (digits.length === 12) {
    return `+${digits.slice(0, 2)} (${digits.slice(2, 4)}) ${digits.slice(4, 8)}-${digits.slice(8)}`
  }
  return phone
}

function formatTimestamp(ts: string | null): string {
  if (!ts) return '-'
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(ts))
}

export function WhatsAppSection({ job }: WhatsAppSectionProps) {
  const [open, setOpen] = useState(false)
  const { data: messages, total, isLoading } = useWhatsAppMessages(job.id)

  return (
    <section className="rounded-lg border border-border p-6">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger className="flex items-center justify-between w-full text-left">
          <div className="flex items-center gap-2">
            {open ? (
              <ChevronDown className="size-3.5 text-muted-foreground" />
            ) : (
              <ChevronRight className="size-3.5 text-muted-foreground" />
            )}
            <MessageCircle className="size-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">WhatsApp</h3>
            {total > 0 && (
              <Badge
                variant="secondary"
                className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              >
                {total} mensagem(ns)
              </Badge>
            )}
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          {isLoading && (
            <p className="text-sm text-muted-foreground mt-3">
              Carregando mensagens...
            </p>
          )}

          {!isLoading && messages.length === 0 && (
            <div className="flex items-center gap-3 mt-3 py-4 text-sm text-muted-foreground">
              <MessageCircle className="size-8 text-muted-foreground/30 shrink-0" />
              <div>
                <p className="font-medium text-foreground/70">Nenhuma mensagem enviada</p>
                <p className="text-xs mt-0.5">
                  Mensagens WhatsApp serao enviadas automaticamente para lembretes de prazos e pagamentos.
                </p>
              </div>
            </div>
          )}

          {messages.length > 0 && (
            <div className="mt-3 space-y-2">
              {messages.map((msg) => {
                const statusCfg =
                  STATUS_CONFIG[msg.status as WhatsAppMessageStatus] ??
                  STATUS_CONFIG.pending

                return (
                  <div
                    key={msg.id}
                    className="flex items-start gap-3 rounded-md border border-border/50 p-3 text-sm"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium truncate">
                          {msg.recipient_name || formatPhone(msg.phone)}
                        </span>
                        <Badge
                          variant="secondary"
                          className={statusCfg.className}
                        >
                          {statusCfg.label}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground line-clamp-2 whitespace-pre-line">
                        {msg.message}
                      </p>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                        <span>{formatPhone(msg.phone)}</span>
                        <span>{formatTimestamp(msg.sent_at ?? msg.created_at)}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>
    </section>
  )
}
