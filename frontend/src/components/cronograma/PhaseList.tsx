'use client'

import { useState, useEffect } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Pencil, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  formatDateBR,
  formatDateShort,
  countWorkingDays,
  computePhaseProgress,
} from '@/lib/cronograma-utils'
import { PHASE_STATUS_CONFIG } from '@/types/cronograma'
import type { JobPhase, ReorderPayload } from '@/types/cronograma'

// --- Card de fase no mobile ---

interface PhaseCardMobileProps {
  phase: JobPhase
  onEdit: (phase: JobPhase) => void
  onDelete: (phase: JobPhase) => void
}

function PhaseCardMobile({ phase, onEdit, onDelete }: PhaseCardMobileProps) {
  const workingDays = countWorkingDays(phase.start_date, phase.end_date, phase.skip_weekends)
  const progress = computePhaseProgress(phase.start_date, phase.end_date)
  const statusConfig = PHASE_STATUS_CONFIG[phase.status]

  const isToday = phase.status === 'in_progress'

  return (
    <div
      className="rounded-lg border border-border bg-card p-4 shadow-sm"
      style={{ borderLeft: `4px solid ${phase.phase_color}` }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-semibold truncate">
              {phase.phase_emoji} {phase.phase_label}
            </span>
            <Badge
              variant="outline"
              className={cn('text-[10px] shrink-0', statusConfig.className)}
            >
              {isToday && <span className="h-1.5 w-1.5 rounded-full bg-current inline-block mr-1" />}
              {statusConfig.label}
            </Badge>
          </div>
          {phase.complement && (
            <p className="text-xs text-muted-foreground italic mt-0.5 truncate">
              {phase.complement}
            </p>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            {formatDateShort(phase.start_date)} &ndash; {formatDateShort(phase.end_date)}
            {' · '}
            {workingDays} {workingDays === 1 ? 'dia' : 'dias'}
            {phase.skip_weekends ? ' uteis' : ''}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            aria-label={`Editar fase ${phase.phase_label}`}
            onClick={() => onEdit(phase)}
            className="size-7 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <Pencil className="size-3.5" />
          </button>
          <button
            type="button"
            aria-label={`Remover fase ${phase.phase_label}`}
            onClick={() => onDelete(phase)}
            className="size-7 rounded flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>

      {/* Barra de progresso */}
      <div className="mt-2 h-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${progress}%`,
            backgroundColor: phase.phase_color,
          }}
        />
      </div>
    </div>
  )
}

// --- Linha sortable no editor (desktop) ---

interface SortablePhaseRowProps {
  phase: JobPhase
  onEdit: (phase: JobPhase) => void
  onDelete: (phase: JobPhase) => void
}

function SortablePhaseRow({ phase, onEdit, onDelete }: SortablePhaseRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: phase.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const workingDays = countWorkingDays(phase.start_date, phase.end_date, phase.skip_weekends)
  const statusConfig = PHASE_STATUS_CONFIG[phase.status]

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg border border-border bg-card transition-shadow',
        isDragging && 'opacity-50 shadow-lg ring-2 ring-primary/20',
      )}
    >
      {/* Handle */}
      <button
        type="button"
        aria-label={`Reordenar fase ${phase.phase_label}`}
        className="text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing touch-none shrink-0"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" />
      </button>

      {/* Indicador de cor */}
      <div
        className="h-8 w-1 rounded-full shrink-0"
        style={{ backgroundColor: phase.phase_color }}
      />

      {/* Conteudo */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate">
            {phase.phase_emoji} {phase.phase_label}
          </span>
          <Badge
            variant="outline"
            className={cn('text-[10px] shrink-0 hidden sm:inline-flex', statusConfig.className)}
          >
            {statusConfig.label}
          </Badge>
        </div>
        {phase.complement && (
          <p className="text-xs text-muted-foreground italic truncate">{phase.complement}</p>
        )}
      </div>

      {/* Datas */}
      <div className="hidden sm:flex flex-col items-end text-xs text-muted-foreground shrink-0">
        <span>{formatDateBR(phase.start_date)}</span>
        <span>{formatDateBR(phase.end_date)}</span>
      </div>

      {/* Dias */}
      <div className="hidden md:block text-xs font-mono text-muted-foreground shrink-0 w-16 text-right">
        {workingDays}d {phase.skip_weekends ? 'uteis' : ''}
      </div>

      {/* Acoes */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          aria-label={`Editar fase ${phase.phase_label}`}
          onClick={() => onEdit(phase)}
          className="size-7 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <Pencil className="size-3.5" />
        </button>
        <button
          type="button"
          aria-label={`Remover fase ${phase.phase_label}`}
          onClick={() => onDelete(phase)}
          className="size-7 rounded flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
    </div>
  )
}

// --- Props do PhaseList ---

interface PhaseListProps {
  phases: JobPhase[]
  onEdit: (phase: JobPhase) => void
  onDelete: (phase: JobPhase) => void
  onReorder?: (payload: ReorderPayload) => void
  jobId: string
  isMobile?: boolean
}

// --- Componente principal ---

export function PhaseList({
  phases,
  onEdit,
  onDelete,
  onReorder,
  jobId,
  isMobile = false,
}: PhaseListProps) {
  const [items, setItems] = useState(() =>
    [...phases].sort((a, b) => a.sort_order - b.sort_order),
  )

  // Sincronizar itens quando phases muda externamente
  useEffect(() => {
    setItems([...phases].sort((a, b) => a.sort_order - b.sort_order))
  }, [phases])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = items.findIndex((p) => p.id === active.id)
    const newIndex = items.findIndex((p) => p.id === over.id)

    if (oldIndex === -1 || newIndex === -1) return

    const newItems = [...items]
    const [moved] = newItems.splice(oldIndex, 1)
    newItems.splice(newIndex, 0, moved)

    const reordered = newItems.map((p, i) => ({ ...p, sort_order: i }))
    setItems(reordered)

    onReorder?.({
      job_id: jobId,
      items: reordered.map((p, i) => ({ id: p.id, sort_order: i })),
    })
  }

  // Mobile: cards simples sem drag
  if (isMobile) {
    return (
      <div className="flex flex-col gap-2">
        {[...phases]
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((phase) => (
            <PhaseCardMobile
              key={phase.id}
              phase={phase}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
      </div>
    )
  }

  // Desktop: lista sortable com drag & drop
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={items.map((p) => p.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex flex-col gap-2">
          {items.map((phase) => (
            <SortablePhaseRow
              key={phase.id}
              phase={phase}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}
