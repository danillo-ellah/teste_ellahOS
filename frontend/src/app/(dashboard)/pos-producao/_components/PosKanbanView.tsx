'use client'

import { useMemo, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { Scissors, User, Calendar, AlertTriangle, Clock } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { formatDate, daysUntil } from '@/lib/format'
import { POS_STAGE_MAP, POS_BLOCK_COLORS } from '@/types/pos-producao'
import type { PosDeliverable, PosStage, PosStageBlock } from '@/types/pos-producao'

interface PosKanbanViewProps {
  deliverables: PosDeliverable[]
  onStageChange: (deliverableId: string, newStage: PosStage) => Promise<void>
}

const BLOCK_LABELS: Record<PosStageBlock, string> = {
  pre: 'Pre',
  offline: 'Offline',
  online: 'Online',
  entrega: 'Entrega',
}

const BLOCK_GROUPS: Array<{ block: PosStageBlock; stages: PosStage[] }> = [
  { block: 'pre', stages: ['ingest'] },
  { block: 'offline', stages: ['montagem', 'apresentacao_offline', 'revisao_offline', 'aprovado_offline'] },
  { block: 'online', stages: ['finalizacao', 'apresentacao_online', 'revisao_online', 'aprovado_online'] },
  { block: 'entrega', stages: ['copias', 'entregue'] },
]

export function PosKanbanView({ deliverables, onStageChange }: PosKanbanViewProps) {
  const router = useRouter()
  const [activeCard, setActiveCard] = useState<PosDeliverable | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  )

  const byStage = useMemo(() => {
    const map = new Map<PosStage, PosDeliverable[]>()
    for (const stage of POS_STAGE_MAP) {
      map.set(stage.value, [])
    }
    for (const d of deliverables) {
      if (d.pos_stage) {
        const list = map.get(d.pos_stage) ?? []
        list.push(d)
        map.set(d.pos_stage, list)
      }
    }
    return map
  }, [deliverables])

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const id = String(event.active.id)
    const card = deliverables.find((d) => d.id === id) ?? null
    setActiveCard(card)
  }, [deliverables])

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    setActiveCard(null)

    const { active, over } = event
    if (!over) return

    const deliverableId = String(active.id)
    const targetStage = String(over.id) as PosStage
    const currentStage = active.data.current?.stage as PosStage | undefined

    if (!currentStage || currentStage === targetStage) return

    const stageInfo = POS_STAGE_MAP.find((s) => s.value === targetStage)
    try {
      await onStageChange(deliverableId, targetStage)
      toast.success(`Movido para ${stageInfo?.label ?? targetStage}`)
    } catch {
      toast.error('Erro ao mover entregavel')
    }
  }, [onStageChange])

  if (deliverables.length === 0) {
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

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-3 min-w-max">
          {BLOCK_GROUPS.map(({ block, stages }) => {
            const colors = POS_BLOCK_COLORS[block]
            return (
              <div key={block} className="flex flex-col gap-1">
                {/* Cabecalho do bloco */}
                <div
                  className={cn(
                    'mb-1 flex items-center justify-center rounded px-3 py-1 text-[10px] font-bold uppercase tracking-widest',
                    colors.bg,
                    colors.text,
                  )}
                >
                  {BLOCK_LABELS[block]}
                </div>

                {/* Colunas */}
                <div className="flex gap-3">
                  {stages.map((stageValue) => {
                    const stageInfo = POS_STAGE_MAP.find((s) => s.value === stageValue)!
                    const items = byStage.get(stageValue) ?? []

                    return (
                      <StageColumn
                        key={stageValue}
                        stage={stageValue}
                        stageInfo={stageInfo}
                        items={items}
                        colors={colors}
                        activeCard={activeCard}
                        onCardClick={(d) => router.push(`/jobs/${d.job_id}?tab=pos-producao`)}
                      />
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Ghost card durante drag */}
      <DragOverlay dropAnimation={null}>
        {activeCard ? (
          <div className="w-56 rotate-1 scale-105 opacity-90 shadow-2xl pointer-events-none">
            <CardContent deliverable={activeCard} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}

// ---------------------------------------------------------------------------
// Coluna droppable
// ---------------------------------------------------------------------------

interface StageColumnProps {
  stage: PosStage
  stageInfo: { label: string; block: PosStageBlock }
  items: PosDeliverable[]
  colors: { bg: string; text: string; border: string }
  activeCard: PosDeliverable | null
  onCardClick: (d: PosDeliverable) => void
}

function StageColumn({ stage, stageInfo, items, colors, activeCard, onCardClick }: StageColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: stage })

  const isDragging = !!activeCard
  const isSameStage = activeCard?.pos_stage === stage
  const canDrop = isDragging && !isSameStage

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex w-56 shrink-0 flex-col rounded-lg border transition-colors',
        colors.border,
        'bg-muted/20 dark:bg-muted/10',
        isOver && canDrop && 'border-emerald-400 bg-emerald-50/40 dark:bg-emerald-950/30 ring-1 ring-emerald-300',
        isOver && !canDrop && isDragging && 'border-red-300/70 bg-red-50/20 dark:bg-red-950/20',
      )}
    >
      {/* Header */}
      <div
        className={cn(
          'flex items-center justify-between rounded-t-lg border-b px-3 py-2',
          colors.border,
          colors.bg,
        )}
      >
        <span className={cn('text-xs font-semibold truncate', colors.text)}>
          {stageInfo.label}
        </span>
        <div className="flex items-center gap-1.5">
          {isOver && canDrop && (
            <span className="animate-pulse text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
              Soltar
            </span>
          )}
          <span
            className={cn(
              'flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-medium border',
              colors.bg, colors.text, colors.border,
            )}
          >
            {items.length}
          </span>
        </div>
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-2 p-2 overflow-y-auto max-h-[calc(100vh-320px)]">
        {items.length === 0 ? (
          <div className={cn(
            'flex items-center justify-center py-6 text-[11px] text-muted-foreground',
            isOver && canDrop && 'text-emerald-600 dark:text-emerald-400 font-medium',
          )}>
            {isOver && canDrop ? 'Soltar aqui' : 'Vazio'}
          </div>
        ) : (
          items.map((d) => (
            <DraggableCard
              key={d.id}
              deliverable={d}
              onClick={() => onCardClick(d)}
            />
          ))
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Card draggable
// ---------------------------------------------------------------------------

interface DraggableCardProps {
  deliverable: PosDeliverable
  onClick: () => void
}

function DraggableCard({ deliverable, onClick }: DraggableCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: deliverable.id,
    data: { stage: deliverable.pos_stage },
  })

  const style = transform
    ? { transform: CSS.Translate.toString(transform) }
    : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        'touch-none select-none cursor-grab active:cursor-grabbing',
        isDragging && 'opacity-0',
      )}
      onClick={onClick}
    >
      <CardContent deliverable={deliverable} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Conteudo visual do card (reutilizado por DraggableCard e DragOverlay)
// ---------------------------------------------------------------------------

function CardContent({ deliverable: d }: { deliverable: PosDeliverable }) {
  const days = daysUntil(d.delivery_date)
  const isOverdue = days !== null && days < 0
  const isUrgent = days !== null && days >= 0 && days <= 2

  return (
    <div
      className={cn(
        'w-full rounded-md border bg-background p-2.5 text-left transition-shadow hover:shadow-md dark:bg-card',
        'min-h-[44px]',
        isOverdue && 'border-red-400 dark:border-red-600',
        isUrgent && !isOverdue && 'border-amber-400 dark:border-amber-600',
        !isOverdue && !isUrgent && 'border-border',
      )}
    >
      {/* Nome do entregavel */}
      <p className="line-clamp-2 text-xs font-medium leading-snug text-foreground">
        {d.description}
      </p>

      {/* Badge do job */}
      {d.job && (
        <span className="mt-1.5 inline-block rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
          {d.job.code}
        </span>
      )}

      {/* Responsavel + Prazo */}
      <div className="mt-2 flex flex-col gap-1">
        {d.assignee && (
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <User className="size-3 shrink-0" />
            <span className="truncate">{d.assignee.full_name.split(' ')[0]}</span>
          </div>
        )}

        {d.delivery_date && (
          <div
            className={cn(
              'flex items-center gap-1 text-[11px]',
              isOverdue && 'text-red-600 dark:text-red-400 font-medium',
              isUrgent && !isOverdue && 'text-amber-600 dark:text-amber-400 font-medium',
              !isOverdue && !isUrgent && 'text-muted-foreground',
            )}
          >
            {isOverdue ? (
              <AlertTriangle className="size-3 shrink-0" />
            ) : isUrgent ? (
              <Clock className="size-3 shrink-0" />
            ) : (
              <Calendar className="size-3 shrink-0" />
            )}
            <span>{formatDate(d.delivery_date)}</span>
            {isOverdue && days !== null && (
              <span className="text-[10px]">({Math.abs(days)}d atr.)</span>
            )}
            {isUrgent && days !== null && (
              <span className="text-[10px]">({days}d)</span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
