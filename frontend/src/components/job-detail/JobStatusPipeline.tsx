'use client'

import { useMemo } from 'react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  STATUS_PIPELINE_ORDER,
  JOB_STATUS_LABELS,
  JOB_STATUS_COLORS,
} from '@/lib/constants'
import { cn } from '@/lib/utils'
import type { JobStatus } from '@/types/jobs'

interface JobStatusPipelineProps {
  currentStatus: JobStatus
  className?: string
}

export function JobStatusPipeline({
  currentStatus,
  className,
}: JobStatusPipelineProps) {
  const currentIndex = useMemo(
    () => STATUS_PIPELINE_ORDER.indexOf(currentStatus),
    [currentStatus],
  )

  // Se o status nao esta no pipeline (cancelado/pausado), mostra tudo como outlined
  const isOffPipeline = currentIndex === -1

  return (
    <TooltipProvider delayDuration={200}>
      <div className={cn('hidden md:flex items-center gap-1', className)}>
        {STATUS_PIPELINE_ORDER.map((status, index) => {
          const color = JOB_STATUS_COLORS[status]
          const isCurrent = status === currentStatus
          const isFilled = !isOffPipeline && index < currentIndex
          const isHighlighted = isCurrent

          return (
            <Tooltip key={status}>
              <TooltipTrigger asChild>
                <div
                  className="flex-1 h-2 rounded-full transition-all duration-300 cursor-default"
                  style={{
                    backgroundColor: isFilled || isHighlighted
                      ? color
                      : 'transparent',
                    border: !isFilled && !isHighlighted
                      ? `1.5px solid ${color}40`
                      : 'none',
                    outline: isHighlighted
                      ? `2px solid ${color}60`
                      : 'none',
                    outlineOffset: '2px',
                    animation: 'pipeline-segment-in 0.3s ease-out both',
                    animationDelay: `${index * 50}ms`,
                    transformOrigin: 'left center',
                  }}
                />
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                {JOB_STATUS_LABELS[status]}
                {isCurrent && ' (atual)'}
              </TooltipContent>
            </Tooltip>
          )
        })}
      </div>
    </TooltipProvider>
  )
}
