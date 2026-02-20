'use client'

import { useState } from 'react'
import { History } from 'lucide-react'
import { format, parseISO, isToday, isYesterday, isValid } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { PortalTimelineEvent } from '@/types/portal'

// Cor do dot por tipo de evento
const EVENT_TYPE_COLORS: Record<string, string> = {
  status_change: '#A855F7',
  approval_received: '#22C55E',
  approval_rejected: '#EF4444',
  file_uploaded: '#3B82F6',
  message: '#71717A',
  job_created: '#E11D48',
  shooting_date: '#F59E0B',
  deliverable: '#06B6D4',
}

function getEventColor(eventType: string): string {
  return EVENT_TYPE_COLORS[eventType] ?? '#71717A'
}

function formatEventDate(dateStr: string): string {
  try {
    const parsed = parseISO(dateStr)
    if (!isValid(parsed)) return ''
    if (isToday(parsed)) return 'HOJE'
    if (isYesterday(parsed)) return 'ONTEM'
    return format(parsed, "d 'de' MMMM", { locale: ptBR }).toUpperCase()
  } catch {
    return ''
  }
}

function formatEventTime(dateStr: string): string {
  try {
    const parsed = parseISO(dateStr)
    if (!isValid(parsed)) return ''
    return format(parsed, 'HH:mm')
  } catch {
    return ''
  }
}

// Agrupa eventos por data (dia)
function groupEventsByDate(
  events: PortalTimelineEvent[],
): Array<{ dateLabel: string; events: PortalTimelineEvent[] }> {
  const groups: Map<string, PortalTimelineEvent[]> = new Map()

  for (const event of events) {
    const label = formatEventDate(event.created_at)
    if (!groups.has(label)) {
      groups.set(label, [])
    }
    groups.get(label)!.push(event)
  }

  return Array.from(groups.entries()).map(([dateLabel, evts]) => ({
    dateLabel,
    events: evts,
  }))
}

const INITIAL_LIMIT = 10

interface PortalTimelineProps {
  events: PortalTimelineEvent[]
}

export function PortalTimeline({ events }: PortalTimelineProps) {
  const [limit, setLimit] = useState(INITIAL_LIMIT)

  if (events.length === 0) {
    return (
      <section
        className="rounded-xl border border-border bg-card p-5"
        aria-labelledby="timeline-heading"
      >
        <h2
          id="timeline-heading"
          className="flex items-center gap-2 text-base font-semibold mb-4"
        >
          <History className="h-[18px] w-[18px] text-muted-foreground" aria-hidden="true" />
          Historico do Projeto
        </h2>
        <p className="text-sm text-muted-foreground text-center py-6">
          Nenhum evento registrado ainda.
        </p>
      </section>
    )
  }

  const visible = events.slice(0, limit)
  const groups = groupEventsByDate(visible)
  const hasMore = events.length > limit

  return (
    <section
      className="rounded-xl border border-border bg-card p-5"
      aria-labelledby="timeline-heading"
    >
      <h2
        id="timeline-heading"
        className="flex items-center gap-2 text-base font-semibold mb-4"
      >
        <History className="h-[18px] w-[18px] text-muted-foreground" aria-hidden="true" />
        Historico do Projeto
      </h2>

      <div
        role="list"
        aria-label="Historico do projeto"
        className="relative pl-7"
      >
        {/* Linha vertical */}
        <div
          className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-border"
          aria-hidden="true"
        />

        {groups.map(({ dateLabel, events: dayEvents }, groupIdx) => (
          <div key={`${dateLabel}-${groupIdx}`}>
            {/* Separador de data */}
            <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground py-3 -ml-7 pl-2">
              {dateLabel}
            </div>

            {dayEvents.map((event) => {
              const color = getEventColor(event.event_type)
              const time = formatEventTime(event.created_at)

              return (
                <div
                  key={event.id}
                  role="listitem"
                  className="relative mb-4"
                >
                  {/* Dot colorido */}
                  <div
                    className="absolute -left-7 top-1 w-3.5 h-3.5 rounded-full ring-2 ring-background shrink-0"
                    style={{ backgroundColor: color }}
                    aria-hidden="true"
                  />

                  {/* Conteudo */}
                  {time && (
                    <p className="text-xs text-muted-foreground mb-0.5">{time}</p>
                  )}
                  <p className="text-sm font-medium text-foreground leading-snug">
                    {event.description || event.event_type}
                  </p>
                </div>
              )
            })}
          </div>
        ))}
      </div>

      {hasMore && (
        <div className="mt-2 text-center">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground"
            onClick={() => setLimit((prev) => prev + 10)}
          >
            Ver mais eventos
          </Button>
        </div>
      )}
    </section>
  )
}
