'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  AlertTriangle,
  Clock,
  User,
  Scissors,
} from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { formatDate, daysUntil } from '@/lib/format'
import { POS_STAGE_MAP, POS_BLOCK_COLORS } from '@/types/pos-producao'
import type { PosDeliverable, PosStage } from '@/types/pos-producao'

interface PosListViewProps {
  deliverables: PosDeliverable[]
}

type SortKey = 'deliverable' | 'stage' | 'assignee' | 'deadline' | 'job'
type SortOrder = 'asc' | 'desc'

const STAGE_ORDER: Record<PosStage, number> = {
  ingest: 0,
  montagem: 1,
  apresentacao_offline: 2,
  revisao_offline: 3,
  aprovado_offline: 4,
  finalizacao: 5,
  apresentacao_online: 6,
  revisao_online: 7,
  aprovado_online: 8,
  copias: 9,
  entregue: 10,
}

function SortIcon({ column, sortBy, sortOrder }: { column: string; sortBy: string; sortOrder: SortOrder }) {
  if (sortBy !== column) return <ChevronsUpDown className="ml-1 inline size-3.5 shrink-0 text-muted-foreground/60" />
  if (sortOrder === 'asc') return <ChevronUp className="ml-1 inline size-3.5 shrink-0 text-foreground" />
  return <ChevronDown className="ml-1 inline size-3.5 shrink-0 text-foreground" />
}

function StageBadge({ stage }: { stage: PosStage | null }) {
  if (!stage) return <span className="text-muted-foreground text-xs">-</span>
  const info = POS_STAGE_MAP.find((s) => s.value === stage)
  if (!info) return <span className="text-xs">{stage}</span>
  const colors = POS_BLOCK_COLORS[info.block]
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium',
        colors.bg,
        colors.text,
      )}
    >
      {info.label}
    </span>
  )
}

function DeadlineCell({ date }: { date: string | null }) {
  if (!date) return <span className="text-xs text-muted-foreground">-</span>
  const days = daysUntil(date)
  if (days === null) return <span className="text-xs">{formatDate(date)}</span>

  if (days < 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400">
        <AlertTriangle className="size-3 shrink-0" />
        {formatDate(date)}
        <span className="text-[10px]">({Math.abs(days)}d atr.)</span>
      </span>
    )
  }
  if (days <= 2) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400">
        <Clock className="size-3 shrink-0" />
        {formatDate(date)}
        <span className="text-[10px]">({days}d)</span>
      </span>
    )
  }
  return <span className="text-xs">{formatDate(date)}</span>
}

export function PosListView({ deliverables }: PosListViewProps) {
  const router = useRouter()
  const [sortBy, setSortBy] = useState<SortKey>('deadline')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')

  const sorted = useMemo(() => {
    const list = [...deliverables]
    const dir = sortOrder === 'asc' ? 1 : -1

    list.sort((a, b) => {
      switch (sortBy) {
        case 'deliverable':
          return dir * a.description.localeCompare(b.description)
        case 'stage': {
          const aOrder = a.pos_stage ? (STAGE_ORDER[a.pos_stage] ?? 99) : 99
          const bOrder = b.pos_stage ? (STAGE_ORDER[b.pos_stage] ?? 99) : 99
          return dir * (aOrder - bOrder)
        }
        case 'assignee':
          return dir * (a.assignee?.full_name ?? '').localeCompare(b.assignee?.full_name ?? '')
        case 'deadline':
          return dir * (a.delivery_date ?? '9999').localeCompare(b.delivery_date ?? '9999')
        case 'job':
          return dir * (a.job?.code ?? '').localeCompare(b.job?.code ?? '')
        default:
          return 0
      }
    })
    return list
  }, [deliverables, sortBy, sortOrder])

  function handleSort(key: SortKey) {
    if (sortBy === key) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortBy(key)
      setSortOrder('asc')
    }
  }

  if (sorted.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Scissors className="size-12 text-muted-foreground/30 mb-4" />
        <h2 className="text-lg font-semibold">Nenhum entregavel em pos-producao</h2>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          Entregaveis aparecem aqui quando uma etapa de pos-producao e atribuida na aba do job.
        </p>
      </div>
    )
  }

  const columns: Array<{ label: string; key: SortKey; className?: string }> = [
    { label: 'JOB', key: 'job', className: 'w-24' },
    { label: 'ENTREGAVEL', key: 'deliverable', className: 'min-w-[180px]' },
    { label: 'ETAPA', key: 'stage', className: 'w-44' },
    { label: 'RESPONSAVEL', key: 'assignee', className: 'w-36' },
    { label: 'PRAZO', key: 'deadline', className: 'w-40' },
  ]

  return (
    <div className="overflow-x-auto rounded-lg border dark:border-border">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {columns.map((col) => (
              <TableHead
                key={col.key}
                className={cn(
                  col.className,
                  'cursor-pointer select-none hover:text-foreground transition-colors',
                )}
                onClick={() => handleSort(col.key)}
              >
                <span className="inline-flex items-center text-xs font-medium uppercase tracking-wider">
                  {col.label}
                  <SortIcon column={col.key} sortBy={sortBy} sortOrder={sortOrder} />
                </span>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((d) => {
            const days = daysUntil(d.delivery_date)
            const isOverdue = days !== null && days < 0
            const isUrgent = days !== null && days >= 0 && days <= 2

            return (
              <TableRow
                key={d.id}
                className={cn(
                  'cursor-pointer hover:bg-muted/50 transition-colors',
                  isOverdue && 'bg-red-50/30 dark:bg-red-950/10',
                  isUrgent && !isOverdue && 'bg-amber-50/30 dark:bg-amber-950/10',
                )}
                onClick={() => router.push(`/jobs/${d.job_id}?tab=pos-producao`)}
              >
                {/* Job */}
                <TableCell>
                  {d.job ? (
                    <Badge variant="secondary" className="text-[11px] font-mono">
                      {d.job.code}
                    </Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">-</span>
                  )}
                </TableCell>

                {/* Entregavel */}
                <TableCell>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[13px] font-medium truncate max-w-[260px]" title={d.description}>
                      {d.description}
                    </span>
                    {d.job?.client?.name && (
                      <span className="text-[11px] text-muted-foreground truncate max-w-[260px]">
                        {d.job.client.name}
                      </span>
                    )}
                  </div>
                </TableCell>

                {/* Etapa */}
                <TableCell>
                  <StageBadge stage={d.pos_stage} />
                </TableCell>

                {/* Responsavel */}
                <TableCell>
                  {d.assignee ? (
                    <span className="inline-flex items-center gap-1.5 text-[13px]">
                      <User className="size-3.5 text-muted-foreground shrink-0" />
                      <span className="truncate max-w-[110px]" title={d.assignee.full_name}>
                        {d.assignee.full_name.split(' ')[0]}
                      </span>
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">-</span>
                  )}
                </TableCell>

                {/* Prazo */}
                <TableCell>
                  <DeadlineCell date={d.delivery_date} />
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
