'use client'

import { useRouter } from 'next/navigation'
import {
  Archive,
  ExternalLink,
  MoreHorizontal,
  RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { JOB_STATUS_LABELS, JOB_STATUS_EMOJI } from '@/lib/constants'
import { JOB_STATUSES, type Job, type JobStatus } from '@/types/jobs'

interface JobActionsMenuProps {
  job: Job
  onStatusChange: (jobId: string, status: JobStatus) => void
  onArchive: (jobId: string) => void
}

export function JobActionsMenu({
  job,
  onStatusChange,
  onArchive,
}: JobActionsMenuProps) {
  const router = useRouter()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          className="h-8 w-8 data-[state=open]:bg-accent"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          aria-label="Abrir menu de acoes"
        >
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem
          onClick={(e) => {
            e.stopPropagation()
            router.push(`/jobs/${job.id}`)
          }}
        >
          <ExternalLink />
          Abrir
        </DropdownMenuItem>

        <DropdownMenuSub>
          <DropdownMenuSubTrigger
            onClick={(e) => e.stopPropagation()}
          >
            <RefreshCw />
            Mudar Status
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-64">
            {JOB_STATUSES.map((status) => {
              const isActive = status === job.status

              return (
                <DropdownMenuItem
                  key={status}
                  onClick={(e) => {
                    e.stopPropagation()
                    onStatusChange(job.id, status)
                  }}
                  className={isActive ? 'font-semibold' : undefined}
                >
                  <span className="text-[11px] select-none shrink-0" aria-hidden="true">
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
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          className="text-muted-foreground"
          onClick={(e) => {
            e.stopPropagation()
            onArchive(job.id)
          }}
        >
          <Archive />
          Arquivar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
