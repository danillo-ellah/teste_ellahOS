'use client'

import { useState } from 'react'
import {
  Clock,
  GitCommitHorizontal,
  Users,
  FileText,
  DollarSign,
  CheckCircle,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyTabState } from '@/components/shared/EmptyTabState'
import { useJobHistory } from '@/hooks/useJobHistory'
import { formatRelativeDate } from '@/lib/format'
import type { JobDetail, JobHistoryEntry } from '@/types/jobs'

interface TabHistoricoProps {
  job: JobDetail
}

export function TabHistorico({ job }: TabHistoricoProps) {
  const [page, setPage] = useState(1)
  const { data: entries, meta, isLoading, isError, refetch } = useJobHistory(job.id, { page, perPage: 20 })

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="size-8 rounded-full shrink-0" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-border py-12 flex flex-col items-center justify-center text-center gap-3">
        <p className="text-sm text-muted-foreground">Erro ao carregar historico.</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>Tentar novamente</Button>
      </div>
    )
  }

  const list = entries ?? []

  if (list.length === 0) {
    return (
      <EmptyTabState
        icon={Clock}
        title="Nenhum registro no historico"
        description="As alteracoes feitas neste job serao registradas aqui automaticamente."
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Timeline */}
      <div className="relative">
        {/* Linha vertical */}
        <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />

        <div className="space-y-0">
          {list.map((entry, index) => (
            <HistoryEntryItem
              key={entry.id}
              entry={entry}
              isLast={index === list.length - 1}
            />
          ))}
        </div>
      </div>

      {/* Paginacao */}
      {meta && meta.total_pages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Anterior
          </Button>
          <span className="text-sm text-muted-foreground">
            Pagina {page} de {meta.total_pages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= meta.total_pages}
            onClick={() => setPage((p) => p + 1)}
          >
            Proxima
          </Button>
        </div>
      )}
    </div>
  )
}

// --- Entry item ---

function HistoryEntryItem({
  entry,
  isLast,
}: {
  entry: JobHistoryEntry
  isLast: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const hasDiff = entry.previous_data || entry.new_data

  const Icon = getEventIcon(entry.event_type)

  return (
    <div className={`relative flex gap-3 pb-6 ${isLast ? 'pb-0' : ''}`}>
      {/* Circulo */}
      <div className="relative z-10 flex items-center justify-center size-8 rounded-full bg-muted border border-border shrink-0">
        <Icon className="size-3.5 text-muted-foreground" />
      </div>

      {/* Conteudo */}
      <div className="flex-1 min-w-0 pt-0.5">
        <p className="text-sm">
          {entry.description || getEventLabel(entry.event_type)}
        </p>
        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
          {entry.user_name && <span>{entry.user_name}</span>}
          {entry.user_name && <span aria-hidden="true">&middot;</span>}
          <span>{formatRelativeDate(entry.created_at)}</span>
        </div>

        {/* Diff viewer */}
        {hasDiff && (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {expanded ? (
              <ChevronDown className="size-3" />
            ) : (
              <ChevronRight className="size-3" />
            )}
            Ver alteracoes
          </button>
        )}

        {expanded && hasDiff && (
          <div className="mt-2 rounded-md border border-border bg-muted/30 p-3 text-xs font-mono overflow-x-auto">
            {entry.previous_data && (
              <div className="mb-2">
                <span className="text-red-500 dark:text-red-400 font-semibold">
                  - Antes:
                </span>
                <DiffBlock data={entry.previous_data} />
              </div>
            )}
            {entry.new_data && (
              <div>
                <span className="text-green-500 dark:text-green-400 font-semibold">
                  + Depois:
                </span>
                <DiffBlock data={entry.new_data} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// --- Helpers ---

function getEventIcon(eventType: string) {
  switch (eventType) {
    case 'status_change':
      return GitCommitHorizontal
    case 'team_change':
      return Users
    case 'field_update':
      return FileText
    case 'financial_update':
      return DollarSign
    case 'approval':
      return CheckCircle
    default:
      return Clock
  }
}

function getEventLabel(eventType: string): string {
  switch (eventType) {
    case 'status_change':
      return 'Status alterado'
    case 'team_change':
      return 'Equipe alterada'
    case 'field_update':
      return 'Campo atualizado'
    case 'financial_update':
      return 'Dados financeiros atualizados'
    case 'approval':
      return 'Aprovacao registrada'
    case 'comment':
      return 'Comentario adicionado'
    case 'file_upload':
      return 'Arquivo enviado'
    default:
      return 'Alteracao registrada'
  }
}

function DiffBlock({ data }: { data: Record<string, unknown> }) {
  return (
    <pre className="mt-1 whitespace-pre-wrap break-all text-muted-foreground">
      {Object.entries(data)
        .map(([key, value]) => `  ${key}: ${JSON.stringify(value)}`)
        .join('\n')}
    </pre>
  )
}
