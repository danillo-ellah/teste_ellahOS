'use client'

import { useRouter } from 'next/navigation'
import { ChevronDown, ChevronUp, ChevronsUpDown, Clock } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { HealthBar } from '@/components/jobs/HealthBar'
import { JobActionsMenu } from '@/components/jobs/JobActionsMenu'
import { JobCodeBadge } from '@/components/jobs/JobCodeBadge'
import { MarginBadge } from '@/components/jobs/MarginBadge'
import { StatusBadge } from '@/components/jobs/StatusBadge'
import { PROJECT_TYPE_SHORT_LABELS } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { formatCurrency, formatDate, isOverdue } from '@/lib/format'
import type { Job, JobStatus } from '@/types/jobs'

interface JobsTableProps {
  jobs: Job[]
  sortBy: string
  sortOrder: 'asc' | 'desc'
  onSortChange: (column: string) => void
  selectedJobs: Set<string>
  onSelectionChange: (selected: Set<string>) => void
  onStatusChange: (jobId: string, status: JobStatus) => void
  onArchive: (jobId: string) => void
}

interface SortableColumn {
  label: string
  key: string
  sortable: boolean
  headerClassName?: string
}

// v2: 5 colunas condensadas (era 11)
const COLUMNS: SortableColumn[] = [
  { label: 'JOB', key: 'title', sortable: true, headerClassName: 'min-w-[240px]' },
  { label: 'STATUS', key: 'status', sortable: true, headerClassName: 'w-48' },
  { label: 'FINANCEIRO', key: 'closed_value', sortable: true, headerClassName: 'w-40 text-right' },
  { label: 'HLTH', key: 'health_score', sortable: false, headerClassName: 'w-20 text-center' },
]

function SortIcon({
  column,
  sortBy,
  sortOrder,
}: {
  column: string
  sortBy: string
  sortOrder: 'asc' | 'desc'
}) {
  if (sortBy !== column) {
    return <ChevronsUpDown className="ml-1 inline size-3.5 shrink-0 text-muted-foreground/60" />
  }
  if (sortOrder === 'asc') {
    return <ChevronUp className="ml-1 inline size-3.5 shrink-0 text-foreground" />
  }
  return <ChevronDown className="ml-1 inline size-3.5 shrink-0 text-foreground" />
}

// Status "ativo" (nao finalizado/entregue/cancelado) - para mostrar alerta de atraso
function isActiveStatus(status: JobStatus): boolean {
  return status !== 'finalizado' && status !== 'entregue' && status !== 'cancelado'
}

// Status de fase de orcamento - para mostrar "Em orc." quando nao tem valor
function isOrcamentoStatus(status: JobStatus): boolean {
  return ['orcamento_elaboracao', 'orcamento_enviado', 'aguardando_aprovacao'].includes(status)
}

export function JobsTable({
  jobs,
  sortBy,
  sortOrder,
  onSortChange,
  selectedJobs,
  onSelectionChange,
  onStatusChange,
  onArchive,
}: JobsTableProps) {
  const router = useRouter()

  const allSelected = jobs.length > 0 && jobs.every((j) => selectedJobs.has(j.id))
  const someSelected = jobs.some((j) => selectedJobs.has(j.id)) && !allSelected

  function handleSelectAll() {
    if (allSelected) {
      onSelectionChange(new Set())
    } else {
      onSelectionChange(new Set(jobs.map((j) => j.id)))
    }
  }

  function handleSelectOne(id: string) {
    const next = new Set(selectedJobs)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    onSelectionChange(next)
  }

  function handleHeaderSort(col: SortableColumn) {
    if (!col.sortable) return
    onSortChange(col.key)
  }

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <Table>
        <TableHeader className="bg-muted/40">
          <TableRow className="hover:bg-muted/40 border-b border-border">
            {/* Checkbox */}
            <TableHead className="w-10 px-3">
              <Checkbox
                checked={allSelected ? true : someSelected ? 'indeterminate' : false}
                onCheckedChange={handleSelectAll}
                aria-label="Selecionar todos"
                onClick={(e) => e.stopPropagation()}
              />
            </TableHead>

            {COLUMNS.map((col) => (
              <TableHead
                key={col.key}
                className={cn(
                  'h-10 text-[11px] font-medium text-muted-foreground uppercase tracking-wide',
                  col.headerClassName,
                  col.sortable && 'cursor-pointer select-none hover:bg-muted/60 hover:text-foreground transition-colors',
                )}
                onClick={() => handleHeaderSort(col)}
              >
                <span className="inline-flex items-center">
                  {col.label}
                  {col.sortable && (
                    <SortIcon column={col.key} sortBy={sortBy} sortOrder={sortOrder} />
                  )}
                </span>
              </TableHead>
            ))}

            {/* Acoes */}
            <TableHead className="w-12" />
          </TableRow>
        </TableHeader>

        <TableBody>
          {jobs.map((job) => {
            const isSelected = selectedJobs.has(job.id)
            const overdue = isOverdue(job.expected_delivery_date)
            const showOverdue = overdue && isActiveStatus(job.status)

            return (
              <TableRow
                key={job.id}
                className={cn(
                  'group h-[64px] border-b border-border transition-colors duration-100 cursor-pointer',
                  'hover:bg-muted/40',
                  isSelected
                    ? 'bg-primary/5 hover:bg-primary/5 border-l-2 border-l-primary'
                    : 'border-l-2 border-l-transparent',
                )}
                onClick={() => router.push(`/jobs/${job.id}`)}
              >
                {/* Checkbox */}
                <TableCell className="w-10 px-3">
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => handleSelectOne(job.id)}
                    aria-label={`Selecionar job ${job.title}`}
                    onClick={(e) => e.stopPropagation()}
                  />
                </TableCell>

                {/* === CELULA 1: Job + Cliente + Agencia === */}
                <TableCell className="px-3 py-2.5">
                  <div className="flex flex-col gap-0.5 min-w-0">
                    {/* Linha 1: code + titulo */}
                    <div className="flex items-center gap-2 min-w-0">
                      <JobCodeBadge code={job.job_code} />
                      <span className="text-muted-foreground/40 text-xs select-none">
                        &bull;
                      </span>
                      <span className="text-sm font-medium truncate group-hover:text-primary transition-colors duration-100">
                        {job.title}
                      </span>
                    </div>
                    {/* Linha 2: cliente / agencia */}
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-xs text-muted-foreground truncate">
                        {job.clients?.name ?? '-'}
                      </span>
                      {job.agencies && (
                        <>
                          <span className="text-xs text-muted-foreground/30 select-none">/</span>
                          <span className="text-xs text-muted-foreground/60 truncate">
                            {job.agencies.name}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </TableCell>

                {/* === CELULA 2: Status + Tipo + Entrega === */}
                <TableCell className="px-3 py-2.5 w-48">
                  <div className="flex flex-col gap-1 min-w-0">
                    {/* Linha 1: status badge */}
                    <StatusBadge status={job.status} />
                    {/* Linha 2: tipo + data */}
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-xs text-muted-foreground truncate">
                        {PROJECT_TYPE_SHORT_LABELS[job.job_type]}
                      </span>
                      {job.expected_delivery_date && (
                        <>
                          <span className="text-muted-foreground/30 text-xs select-none">
                            &middot;
                          </span>
                          <span
                            className={cn(
                              'text-xs flex items-center gap-0.5 shrink-0',
                              showOverdue
                                ? 'text-red-500 dark:text-red-400 font-medium'
                                : 'text-muted-foreground',
                            )}
                          >
                            {showOverdue && <Clock className="size-3 shrink-0" aria-hidden="true" />}
                            {formatDate(job.expected_delivery_date)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </TableCell>

                {/* === CELULA 3: Financeiro (Valor + Margem) === */}
                <TableCell className="px-3 py-2.5 w-40">
                  <div className="flex flex-col gap-1 items-end min-w-0">
                    {/* Linha 1: valor */}
                    <span
                      className={cn(
                        'text-sm font-medium tabular-nums',
                        job.closed_value ? 'text-foreground' : 'text-muted-foreground/50',
                      )}
                    >
                      {job.closed_value
                        ? formatCurrency(job.closed_value)
                        : isOrcamentoStatus(job.status)
                          ? <span className="text-xs text-amber-500 italic">Em orc.</span>
                          : '-'}
                    </span>
                    {/* Linha 2: margem badge */}
                    <MarginBadge value={job.margin_percentage} />
                  </div>
                </TableCell>

                {/* === CELULA 4: Health === */}
                <TableCell className="px-2 py-2.5 w-20 text-center">
                  <HealthBar score={job.health_score} />
                </TableCell>

                {/* === Acoes === */}
                <TableCell
                  className="w-12"
                  onClick={(e) => e.stopPropagation()}
                >
                  <JobActionsMenu
                    job={job}
                    onStatusChange={onStatusChange}
                    onArchive={onArchive}
                  />
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
