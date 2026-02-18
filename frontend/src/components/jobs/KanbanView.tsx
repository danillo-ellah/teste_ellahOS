'use client'

import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Calendar, ChevronDown } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { getFillColor, getScoreColor } from '@/components/jobs/HealthBar'
import { JobCodeBadge } from '@/components/jobs/JobCodeBadge'
import { MarginBadge } from '@/components/jobs/MarginBadge'
import { JOB_STATUS_LABELS, JOB_STATUS_COLORS, JOB_STATUS_EMOJI } from '@/lib/constants'
import { formatDate, isOverdue } from '@/lib/format'
import { cn } from '@/lib/utils'
import { JOB_STATUSES } from '@/types/jobs'
import type { Job, JobStatus } from '@/types/jobs'

interface KanbanViewProps {
  jobs: Job[]
  onStatusChange: (jobId: string, status: JobStatus) => void
}

// Card individual do kanban
function KanbanCard({
  job,
  onStatusChange,
}: {
  job: Job
  onStatusChange: (jobId: string, status: JobStatus) => void
}) {
  const router = useRouter()
  const statusColor = JOB_STATUS_COLORS[job.status]
  const overdue =
    isOverdue(job.expected_delivery_date) &&
    job.status !== 'finalizado' &&
    job.status !== 'entregue' &&
    job.status !== 'cancelado'

  return (
    <div
      className="bg-card border border-border rounded-md p-3 cursor-pointer hover:shadow-md hover:border-border/80 transition-all duration-150"
      onClick={() => router.push(`/jobs/${job.id}`)}
    >
      {/* Linha 1: code + botao status */}
      <div className="flex items-center justify-between">
        <JobCodeBadge code={job.job_code} />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="h-6 w-6 flex items-center justify-center rounded hover:bg-muted/60 transition-colors"
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              aria-label="Mudar status"
            >
              <ChevronDown className="size-3.5" style={{ color: statusColor }} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {JOB_STATUSES.map((s) => (
              <DropdownMenuItem
                key={s}
                onClick={(e) => {
                  e.stopPropagation()
                  onStatusChange(job.id, s)
                }}
                className={cn(s === job.status && 'font-semibold')}
              >
                <span className="text-[11px] select-none shrink-0" aria-hidden="true">
                  {JOB_STATUS_EMOJI[s]}
                </span>
                {JOB_STATUS_LABELS[s]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Linha 2: titulo */}
      <p className="mt-2 text-sm font-medium line-clamp-2 min-h-[40px]">
        {job.title}
      </p>

      {/* Linha 3: cliente */}
      <p className="mt-1 text-xs text-muted-foreground truncate">
        {job.clients?.name ?? '-'}
      </p>

      {/* Separador */}
      <div className="mt-3 border-t border-border/50" />

      {/* Linha 4: data + margem */}
      <div className="mt-2 flex items-center justify-between">
        <span
          className={cn(
            'flex items-center gap-1 text-[11px]',
            overdue ? 'text-red-500 dark:text-red-400' : 'text-muted-foreground',
          )}
        >
          <Calendar className="size-3" />
          {formatDate(job.expected_delivery_date)}
        </span>
        <MarginBadge value={job.margin_percentage} />
      </div>

      {/* Linha 5: health */}
      {job.health_score !== null && (
        <div className="mt-1 flex items-center gap-2">
          <span className={cn('text-[10px] font-medium', getScoreColor(job.health_score))}>
            {job.health_score}
          </span>
          <div className="flex-1 h-1.5 rounded-full bg-muted/50 overflow-hidden">
            <div
              className={cn('h-full rounded-full', getFillColor(job.health_score))}
              style={{ width: `${Math.min(100, Math.max(0, job.health_score))}%` }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

export function KanbanView({ jobs, onStatusChange }: KanbanViewProps) {
  // Agrupar jobs por status
  const jobsByStatus = useMemo(() => {
    const map = new Map<JobStatus, Job[]>()
    for (const status of JOB_STATUSES) {
      map.set(status, [])
    }
    for (const job of jobs) {
      const list = map.get(job.status)
      if (list) list.push(job)
    }
    return map
  }, [jobs])

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-4" style={{ minWidth: 'fit-content' }}>
        {JOB_STATUSES.map((status) => {
          const statusJobs = jobsByStatus.get(status) ?? []
          const color = JOB_STATUS_COLORS[status]
          const emoji = JOB_STATUS_EMOJI[status]

          return (
            <div
              key={status}
              className="w-72 min-h-[120px] bg-card border border-border rounded-lg overflow-hidden shrink-0"
            >
              {/* Header da coluna */}
              <div
                className="h-10 px-3 flex items-center justify-between border-b border-border"
                style={{ backgroundColor: `${color}14` }}
              >
                <div className="flex items-center gap-2">
                  <span className="text-[11px] select-none" aria-hidden="true">
                    {emoji}
                  </span>
                  <span className="text-[11px] font-semibold uppercase tracking-wide">
                    {JOB_STATUS_LABELS[status]}
                  </span>
                </div>
                <span
                  className="text-[11px] font-medium px-1.5 py-0.5 rounded-full"
                  style={{
                    backgroundColor: `${color}26`,
                    color,
                  }}
                >
                  {statusJobs.length}
                </span>
              </div>

              {/* Corpo */}
              <div className="p-2 flex flex-col gap-2">
                {statusJobs.length === 0 ? (
                  <div className="flex items-center justify-center h-[80px]">
                    <span className="text-xs text-muted-foreground/60">
                      Nenhum job
                    </span>
                  </div>
                ) : (
                  statusJobs.map((job) => (
                    <KanbanCard
                      key={job.id}
                      job={job}
                      onStatusChange={onStatusChange}
                    />
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
