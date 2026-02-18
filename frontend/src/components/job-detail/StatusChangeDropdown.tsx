'use client'

import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { ChevronDown } from 'lucide-react'
import { toast } from 'sonner'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { CancelReasonDialog } from '@/components/jobs/CancelReasonDialog'
import { StatusBadge } from '@/components/jobs/StatusBadge'
import {
  JOB_STATUS_LABELS,
  JOB_STATUS_EMOJI,
} from '@/lib/constants'
import { ApiRequestError } from '@/lib/api'
import { jobKeys } from '@/lib/query-keys'
import { cn } from '@/lib/utils'
import { useUpdateJobStatus } from '@/hooks/useUpdateJobStatus'
import { JOB_STATUSES } from '@/types/jobs'
import type { JobStatus, JobDetail } from '@/types/jobs'

interface StatusChangeDropdownProps {
  jobId: string
  currentStatus: JobStatus
  className?: string
}

export function StatusChangeDropdown({
  jobId,
  currentStatus,
  className,
}: StatusChangeDropdownProps) {
  const [cancelOpen, setCancelOpen] = useState(false)
  const [animating, setAnimating] = useState(false)
  const queryClient = useQueryClient()
  const { mutateAsync: updateStatus, isPending } = useUpdateJobStatus()

  async function handleStatusChange(newStatus: JobStatus) {
    if (newStatus === currentStatus) return

    if (newStatus === 'cancelado') {
      setCancelOpen(true)
      return
    }

    // Optimistic update
    const previousData = queryClient.getQueryData(jobKeys.detail(jobId))
    queryClient.setQueryData(
      jobKeys.detail(jobId),
      (old: { data: JobDetail } | undefined) => {
        if (!old) return old
        return { ...old, data: { ...old.data, status: newStatus } }
      },
    )

    // Animacao de pop
    setAnimating(true)
    setTimeout(() => setAnimating(false), 300)

    try {
      await updateStatus({ jobId, status: newStatus })
      toast.success(`Status atualizado para ${JOB_STATUS_LABELS[newStatus]}`)
    } catch (err) {
      // Rollback
      queryClient.setQueryData(jobKeys.detail(jobId), previousData)
      const msg = err instanceof ApiRequestError ? err.message : 'Erro ao atualizar status. Tente novamente.'
      toast.error(msg)
    }
  }

  async function handleCancelConfirm(reason: string) {
    const previousData = queryClient.getQueryData(jobKeys.detail(jobId))
    queryClient.setQueryData(
      jobKeys.detail(jobId),
      (old: { data: JobDetail } | undefined) => {
        if (!old) return old
        return {
          ...old,
          data: { ...old.data, status: 'cancelado' as JobStatus, cancellation_reason: reason },
        }
      },
    )

    try {
      await updateStatus({ jobId, status: 'cancelado', cancellation_reason: reason })
      toast.success('Job cancelado')
      setCancelOpen(false)
    } catch (err) {
      queryClient.setQueryData(jobKeys.detail(jobId), previousData)
      const msg = err instanceof ApiRequestError ? err.message : 'Erro ao cancelar job. Tente novamente.'
      toast.error(msg)
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={cn(
              'inline-flex items-center gap-1 rounded-full pr-1 hover:opacity-80 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              animating && 'animate-[status-pop_0.3s_ease-out]',
              className,
            )}
            disabled={isPending}
          >
            <StatusBadge status={currentStatus} />
            <ChevronDown className="size-3.5 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          {JOB_STATUSES.map((status) => {
            const isActive = status === currentStatus

            return (
              <DropdownMenuItem
                key={status}
                onClick={() => handleStatusChange(status)}
                className={cn(isActive && 'font-semibold')}
              >
                <span
                  className="text-[11px] select-none shrink-0"
                  aria-hidden="true"
                >
                  {JOB_STATUS_EMOJI[status]}
                </span>
                <span className="truncate">{JOB_STATUS_LABELS[status]}</span>
                {isActive && (
                  <span className="ml-auto text-xs text-muted-foreground">
                    atual
                  </span>
                )}
              </DropdownMenuItem>
            )
          })}
        </DropdownMenuContent>
      </DropdownMenu>

      <CancelReasonDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        onConfirm={handleCancelConfirm}
        isPending={isPending}
      />
    </>
  )
}
