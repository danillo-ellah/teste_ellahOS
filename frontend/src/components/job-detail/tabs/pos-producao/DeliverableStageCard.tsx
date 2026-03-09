'use client'

import { AlertTriangle, Clock, ChevronDown } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { PosStageSelect } from './PosStageSelect'
import { PosAssigneeSelect } from './PosAssigneeSelect'
import { CutVersionHistory } from './CutVersionHistory'
import { PosBriefingPanel } from './PosBriefingPanel'
import { PosDriveLink } from './PosDriveLink'
import { POS_STAGE_MAP, POS_BLOCK_COLORS } from '@/types/pos-producao'
import type { PosStage, PosBriefing } from '@/types/pos-producao'
import { daysUntil, formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'

interface DeliverableStageCardProps {
  deliverable: {
    id: string
    job_id: string
    description: string
    format: string | null
    delivery_date: string | null
    pos_stage: PosStage | null
    pos_assignee_id: string | null
    pos_drive_url: string | null
    pos_briefing: PosBriefing | null
  }
  jobId: string
  jobDriveFolderUrl?: string | null
  defaultOpen?: boolean
}

export function DeliverableStageCard({
  deliverable,
  jobId,
  jobDriveFolderUrl,
  defaultOpen = false,
}: DeliverableStageCardProps) {
  const stageInfo = deliverable.pos_stage
    ? POS_STAGE_MAP.find((s) => s.value === deliverable.pos_stage)
    : null
  const blockColors = stageInfo ? POS_BLOCK_COLORS[stageInfo.block] : null

  // Logica de prazo
  const days = deliverable.delivery_date ? daysUntil(deliverable.delivery_date) : null
  const isOverdue = days !== null && days < 0
  const isUrgent = days !== null && days >= 0 && days <= 3

  return (
    <Collapsible defaultOpen={defaultOpen}>
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        {/* Header do card */}
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="w-full text-left px-4 py-3 hover:bg-muted/40 transition-colors flex items-start gap-3 min-h-[44px]"
          >
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-foreground truncate">
                  {deliverable.description}
                </span>
                {deliverable.format && (
                  <span className="text-xs text-muted-foreground">{deliverable.format}</span>
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Badge de etapa */}
                {stageInfo && blockColors ? (
                  <span
                    className={cn(
                      'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                      blockColors.bg,
                      blockColors.text,
                    )}
                  >
                    {stageInfo.label}
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground italic">Sem etapa</span>
                )}

                {/* Badge de prazo */}
                {deliverable.delivery_date && (
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 text-xs',
                      isOverdue
                        ? 'text-red-600 dark:text-red-400 font-medium'
                        : isUrgent
                          ? 'text-amber-600 dark:text-amber-400 font-medium'
                          : 'text-muted-foreground',
                    )}
                  >
                    {isOverdue ? (
                      <AlertTriangle className="size-3" />
                    ) : isUrgent ? (
                      <Clock className="size-3" />
                    ) : null}
                    {formatDate(deliverable.delivery_date)}
                    {isOverdue && days !== null && (
                      <span>({Math.abs(days)}d atraso)</span>
                    )}
                    {isUrgent && days !== null && !isOverdue && (
                      <span>({days === 0 ? 'hoje' : `${days}d`})</span>
                    )}
                  </span>
                )}
              </div>
            </div>

            <ChevronDown className="size-4 text-muted-foreground shrink-0 mt-0.5 transition-transform [[data-state=open]_&]:rotate-180" />
          </button>
        </CollapsibleTrigger>

        {/* Conteudo expandido */}
        <CollapsibleContent>
          <div className="border-t border-border px-4 py-4 space-y-4">
            {/* Selects de etapa e responsavel */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Etapa</span>
                <PosStageSelect
                  deliverableId={deliverable.id}
                  jobId={jobId}
                  currentStage={deliverable.pos_stage}
                />
              </div>
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Responsavel</span>
                <PosAssigneeSelect
                  deliverableId={deliverable.id}
                  jobId={jobId}
                  currentAssigneeId={deliverable.pos_assignee_id}
                />
              </div>
            </div>

            {/* Drive link */}
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">Drive</span>
              <PosDriveLink
                deliverableId={deliverable.id}
                jobId={jobId}
                currentUrl={deliverable.pos_drive_url}
                jobDriveFolderUrl={jobDriveFolderUrl}
              />
            </div>

            {/* Briefing tecnico */}
            <div className="border-t border-border pt-3">
              <PosBriefingPanel
                deliverableId={deliverable.id}
                jobId={jobId}
                briefing={deliverable.pos_briefing}
              />
            </div>

            {/* Versoes de corte */}
            <div className="border-t border-border pt-3">
              <CutVersionHistory
                deliverableId={deliverable.id}
                jobId={jobId}
              />
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}
