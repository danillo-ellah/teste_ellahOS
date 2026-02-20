'use client'

import Link from 'next/link'
import {
  ArrowRight,
  Plus,
  Send,
  CheckCircle2,
  DollarSign,
  FileUp,
  MessageSquare,
  Clock,
} from 'lucide-react'
import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import type { ActivityEvent } from '@/hooks/use-dashboard'

// Mapa de tipos de evento para icone e cor
const EVENT_CONFIG: Record<
  string,
  { icon: React.ElementType; color: string; bg: string }
> = {
  status_change: {
    icon: ArrowRight,
    color: '#8B5CF6',
    bg: 'rgba(139,92,246,0.2)',
  },
  job_created: {
    icon: Plus,
    color: '#E11D48',
    bg: 'rgba(225,29,72,0.2)',
  },
  approval_sent: {
    icon: Send,
    color: '#8B5CF6',
    bg: 'rgba(139,92,246,0.2)',
  },
  approval_received: {
    icon: CheckCircle2,
    color: '#22C55E',
    bg: 'rgba(34,197,94,0.2)',
  },
  budget_approved: {
    icon: DollarSign,
    color: '#F59E0B',
    bg: 'rgba(245,158,11,0.2)',
  },
  file_uploaded: {
    icon: FileUp,
    color: '#3B82F6',
    bg: 'rgba(59,130,246,0.2)',
  },
  comment: {
    icon: MessageSquare,
    color: '#71717A',
    bg: 'rgba(113,113,122,0.2)',
  },
}

function getEventConfig(eventType: string) {
  return (
    EVENT_CONFIG[eventType] ?? {
      icon: ArrowRight,
      color: '#71717A',
      bg: 'rgba(113,113,122,0.2)',
    }
  )
}

function getInitials(name: string | null): string {
  if (!name) return '?'
  const parts = name.trim().split(' ')
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

function formatRelativeTime(dateStr: string): string {
  try {
    const date = new Date(dateStr)
    return formatDistanceToNow(date, { addSuffix: true, locale: ptBR })
  } catch {
    return dateStr
  }
}

function formatTimeLabel(dateStr: string): string {
  try {
    const date = new Date(dateStr)
    return format(date, 'HH:mm')
  } catch {
    return ''
  }
}

function getDateGroup(dateStr: string): string {
  try {
    const date = new Date(dateStr)
    if (isToday(date)) return 'Hoje'
    if (isYesterday(date)) return 'Ontem'
    return format(date, "d 'de' MMMM", { locale: ptBR })
  } catch {
    return 'Data desconhecida'
  }
}

interface ActivityItemProps {
  event: ActivityEvent
}

function ActivityItem({ event }: ActivityItemProps) {
  const config = getEventConfig(event.event_type)
  const Icon = config.icon
  const hasUser = !!event.user_name

  return (
    <article
      role="article"
      className="relative flex gap-3 pb-4 pl-1"
    >
      {/* Avatar / Icone do evento */}
      <div className="relative z-10 shrink-0">
        {hasUser ? (
          <div className="flex size-6 items-center justify-center rounded-full bg-zinc-200 ring-2 ring-background dark:bg-zinc-700">
            <span className="text-[10px] font-bold text-zinc-600 dark:text-zinc-200">
              {getInitials(event.user_name)}
            </span>
          </div>
        ) : (
          <div
            className="flex size-6 items-center justify-center rounded-full ring-2 ring-background"
            style={{ backgroundColor: config.bg }}
          >
            <Icon className="size-3" style={{ color: config.color }} />
          </div>
        )}
      </div>

      {/* Hora */}
      <div className="w-10 shrink-0 pt-0.5">
        <span className="text-[11px] text-muted-foreground">
          {formatTimeLabel(event.created_at)}
        </span>
      </div>

      {/* Conteudo */}
      <div className="min-w-0 flex-1 pt-0.5">
        <p className="text-[13px] text-foreground leading-snug">
          {event.description}
        </p>

        {event.job_id && event.job_code && (
          <Link
            href={`/jobs/${event.job_id}`}
            className="mt-0.5 text-[13px] font-medium text-rose-500 hover:underline"
          >
            {event.job_code}
            {event.job_title ? ` — ${event.job_title}` : ''}
          </Link>
        )}

        <p className="mt-0.5 text-[11px] text-muted-foreground">
          {formatRelativeTime(event.created_at)}
          {event.user_name && ` · ${event.user_name}`}
        </p>
      </div>
    </article>
  )
}

function TimelineSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <Skeleton className="h-5 w-36" />
      </div>
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-3 pl-1">
            <Skeleton className="size-6 rounded-full shrink-0" />
            <Skeleton className="h-3 w-10 mt-1.5 shrink-0" />
            <div className="flex-1 space-y-1.5 pt-0.5">
              <Skeleton className="h-3.5 w-full" />
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

interface ActivityTimelineProps {
  data: ActivityEvent[] | undefined
  isLoading: boolean
}

const MAX_VISIBLE = 10

export function ActivityTimeline({ data, isLoading }: ActivityTimelineProps) {
  if (isLoading) {
    return <TimelineSkeleton />
  }

  const events = data ?? []
  const visibleEvents = events.slice(0, MAX_VISIBLE)
  const hiddenCount = events.length - MAX_VISIBLE

  // Agrupar eventos por data
  const grouped: { dateLabel: string; events: ActivityEvent[] }[] = []
  let currentGroup: string | null = null

  for (const event of visibleEvents) {
    const group = getDateGroup(event.created_at)
    if (group !== currentGroup) {
      grouped.push({ dateLabel: group, events: [event] })
      currentGroup = group
    } else {
      grouped[grouped.length - 1].events.push(event)
    }
  }

  return (
    <section
      aria-label="Atividades recentes"
      className="rounded-xl border border-border bg-card p-5 shadow-sm"
    >
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-foreground">
          Atividade Recente
        </h2>
      </div>

      {/* Conteudo com scroll */}
      <div className="max-h-[420px] overflow-y-auto pr-1">
        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Clock className="size-8 text-muted-foreground mb-3" />
            <p className="text-sm font-medium text-foreground">Nenhuma atividade recente</p>
            <p className="mt-1 text-[13px] text-muted-foreground">
              As atividades das ultimas 48h apareceram aqui
            </p>
          </div>
        ) : (
          <div
            role="feed"
            aria-label="Atividades recentes"
            className="relative"
          >
            {/* Linha vertical da timeline */}
            <div className="absolute left-[23px] top-0 bottom-0 w-px bg-border" />

            {grouped.map((group) => (
              <div key={group.dateLabel}>
                {/* Separador de data */}
                <div className="relative mb-3 pl-1">
                  <span className="relative z-10 inline-block bg-card pr-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {group.dateLabel}
                  </span>
                </div>

                {group.events.map((event) => (
                  <ActivityItem key={event.id} event={event} />
                ))}
              </div>
            ))}

            {hiddenCount > 0 && (
              <div className="mt-2 pb-2 text-center">
                <span className="text-[13px] text-muted-foreground">
                  + {hiddenCount} evento{hiddenCount !== 1 ? 's' : ''} anterior
                  {hiddenCount !== 1 ? 'es' : ''}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
