'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  DndContext,
  DragOverlay,
  pointerWithin,
  useDraggable,
  useDroppable,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
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
  onCancelRequest?: (jobId: string) => void
}

// --- Card visual (reutilizado pelo DragOverlay) ---

function KanbanCard({
  job,
  onStatusChange,
  isOverlay,
}: {
  job: Job
  onStatusChange: (jobId: string, status: JobStatus) => void
  isOverlay?: boolean
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
      className={cn(
        'bg-card border border-border rounded-md p-3 transition-all duration-150',
        isOverlay
          ? 'shadow-xl rotate-2 scale-105 cursor-grabbing'
          : 'cursor-pointer hover:shadow-md hover:border-border/80',
      )}
      onClick={isOverlay ? undefined : () => router.push(`/jobs/${job.id}`)}
    >
      {/* Linha 1: code + botao status */}
      <div className="flex items-center justify-between">
        <JobCodeBadge code={job.job_code} />
        {!isOverlay && (
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
        )}
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

// --- Card arrastavel ---

function DraggableCard({
  job,
  onStatusChange,
}: {
  job: Job
  onStatusChange: (jobId: string, status: JobStatus) => void
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: job.id,
    data: { job },
  })

  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)` }
    : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        'touch-none',
        isDragging && 'opacity-30',
      )}
    >
      <KanbanCard job={job} onStatusChange={onStatusChange} />
    </div>
  )
}

// --- Coluna droppable ---

function KanbanColumn({
  status,
  jobs: statusJobs,
  onStatusChange,
}: {
  status: JobStatus
  jobs: Job[]
  onStatusChange: (jobId: string, status: JobStatus) => void
}) {
  const { isOver, setNodeRef } = useDroppable({ id: status })
  const color = JOB_STATUS_COLORS[status]
  const emoji = JOB_STATUS_EMOJI[status]

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'w-72 min-h-[120px] bg-card rounded-lg overflow-hidden shrink-0 transition-all duration-150',
        isOver
          ? 'ring-2 ring-offset-1 ring-offset-background'
          : 'border border-border',
      )}
      style={isOver ? {
        backgroundColor: `${color}1A`,
        // @ts-expect-error CSS custom property for ring color
        '--tw-ring-color': color,
      } : undefined}
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
      <div className={cn(
        'p-2 flex flex-col gap-2 min-h-[80px]',
        isOver && statusJobs.length === 0 && 'ring-1 ring-inset rounded-b-lg',
      )}
        style={isOver && statusJobs.length === 0 ? {
          // @ts-expect-error CSS custom property for ring color
          '--tw-ring-color': `${color}40`,
        } : undefined}
      >
        {statusJobs.length === 0 ? (
          <div className="flex items-center justify-center h-[80px]">
            <span className={cn(
              'text-xs',
              isOver ? 'text-foreground/60 font-medium' : 'text-muted-foreground/60',
            )}>
              {isOver ? 'Soltar aqui' : 'Nenhum job'}
            </span>
          </div>
        ) : (
          statusJobs.map((job) => (
            <DraggableCard
              key={job.id}
              job={job}
              onStatusChange={onStatusChange}
            />
          ))
        )}
      </div>
    </div>
  )
}

// --- View principal ---

export function KanbanView({ jobs, onStatusChange, onCancelRequest }: KanbanViewProps) {
  const [activeJob, setActiveJob] = useState<Job | null>(null)

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

  function handleDragStart(event: DragStartEvent) {
    const job = event.active.data.current?.job as Job | undefined
    setActiveJob(job ?? null)
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveJob(null)
    const { active, over } = event
    if (!over) return

    const jobId = active.id as string
    const newStatus = over.id as JobStatus
    const job = jobs.find((j) => j.id === jobId)
    if (!job || job.status === newStatus) return

    // Cancelar requer motivo - delegar para o dialog
    if (newStatus === 'cancelado' && onCancelRequest) {
      onCancelRequest(jobId)
      return
    }

    onStatusChange(jobId, newStatus)
  }

  function handleDragCancel() {
    setActiveJob(null)
  }

  return (
    <DndContext
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-4" style={{ minWidth: 'fit-content' }}>
          {JOB_STATUSES.map((status) => (
            <KanbanColumn
              key={status}
              status={status}
              jobs={jobsByStatus.get(status) ?? []}
              onStatusChange={onStatusChange}
            />
          ))}
        </div>
      </div>

      {/* Card fantasma durante drag */}
      <DragOverlay dropAnimation={null}>
        {activeJob && (
          <div className="w-72">
            <KanbanCard
              job={activeJob}
              onStatusChange={() => {}}
              isOverlay
            />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}
