'use client'

import { useState, useCallback, useMemo, useRef, useEffect, memo, createContext, useContext } from 'react'
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
import { Plus, Target } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Opportunity, OpportunityStage, PipelineData } from '@/hooks/useCrm'
import { useUpdateOpportunity } from '@/hooks/useCrm'
import { OpportunityCard } from './OpportunityCard'
import { OpportunityDialog } from './OpportunityDialog'

// ---------------------------------------------------------------------------
// Configuracao visual de cada stage
// ---------------------------------------------------------------------------

export const STAGE_CONFIG: Record<
  OpportunityStage,
  { label: string; color: string; badgeClass: string; headerClass: string }
> = {
  lead: {
    label: 'Consulta',
    color: 'bg-slate-500',
    badgeClass: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    headerClass: 'border-l-4 border-l-slate-400',
  },
  qualificado: {
    label: 'Em Analise',
    color: 'bg-blue-500',
    badgeClass: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
    headerClass: 'border-l-4 border-l-blue-400',
  },
  proposta: {
    label: 'Orc. Enviado',
    color: 'bg-violet-500',
    badgeClass: 'bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300',
    headerClass: 'border-l-4 border-l-violet-400',
  },
  negociacao: {
    label: 'Negociacao',
    color: 'bg-amber-500',
    badgeClass: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
    headerClass: 'border-l-4 border-l-amber-400',
  },
  fechamento: {
    label: 'Aprovacao',
    color: 'bg-orange-500',
    badgeClass: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
    headerClass: 'border-l-4 border-l-orange-400',
  },
  ganho: {
    label: 'Fechado',
    color: 'bg-emerald-500',
    badgeClass: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300',
    headerClass: 'border-l-4 border-l-emerald-400',
  },
  perdido: {
    label: 'Perdido',
    color: 'bg-red-500',
    badgeClass: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
    headerClass: 'border-l-4 border-l-red-400',
  },
  pausado: {
    label: 'Pausado',
    color: 'bg-slate-400',
    badgeClass: 'bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-400',
    headerClass: 'border-l-4 border-l-slate-400',
  },
}

// Stages mostrados no kanban ativo
const ACTIVE_STAGES: OpportunityStage[] = [
  'lead',
  'qualificado',
  'proposta',
  'negociacao',
  'fechamento',
]

const ALL_STAGES: OpportunityStage[] = [
  'lead',
  'qualificado',
  'proposta',
  'negociacao',
  'fechamento',
  'ganho',
  'perdido',
  'pausado',
]

// Stages para os quais nao e permitido drop via DnD (requerem fluxo de detalhe)
const DND_BLOCKED_TARGETS = new Set<OpportunityStage>(['ganho', 'perdido'])

// ---------------------------------------------------------------------------
// Validacao de transicao de stage via DnD
// ---------------------------------------------------------------------------

function validateTransition(
  from: OpportunityStage,
  to: OpportunityStage,
): { allowed: boolean; reason?: string } {
  if (from === to) return { allowed: false }

  // ganho e terminal — nao pode sair via DnD
  if (from === 'ganho') {
    return {
      allowed: false,
      reason: 'Oportunidades ganhas nao podem ser movidas via drag. Use o detalhe para alterar.',
    }
  }

  // perdido so pode voltar para lead
  if (from === 'perdido' && to !== 'lead') {
    return {
      allowed: false,
      reason: 'Oportunidades perdidas so podem ser reativadas para Consulta (lead).',
    }
  }

  // Nao permite drop em ganho/perdido via DnD
  if (DND_BLOCKED_TARGETS.has(to)) {
    return {
      allowed: false,
      reason: 'Use o detalhe da oportunidade para marcar como ganho ou perdido.',
    }
  }

  return { allowed: true }
}

// ---------------------------------------------------------------------------
// Contexto de registry de mutations
//
// Como useUpdateOpportunity precisa de um id fixo no momento da chamada do hook,
// cada DraggableCard se registra com seu proprio mutateAsync.
// O onDragEnd do DndContext chama o execute() pelo id do card arrastado.
// ---------------------------------------------------------------------------

type MutateFn = (payload: { stage: OpportunityStage }) => Promise<unknown>

interface MutationRegistryValue {
  register: (id: string, fn: MutateFn) => void
  execute: (id: string, stage: OpportunityStage) => Promise<void>
}

const MutationRegistryContext = createContext<MutationRegistryValue | null>(null)

function useMutationRegistry() {
  const ctx = useContext(MutationRegistryContext)
  if (!ctx) throw new Error('useMutationRegistry precisa estar dentro de MutationRegistryProvider')
  return ctx
}

interface MutationRegistryProviderProps {
  children: React.ReactNode
}

function MutationRegistryProvider({ children }: MutationRegistryProviderProps) {
  // Usar ref para evitar re-renders ao registrar
  const registryRef = useRef<Map<string, MutateFn>>(new Map())

  const register = useCallback((id: string, fn: MutateFn) => {
    registryRef.current.set(id, fn)
    // Cleanup ao desmontar e feito pelo DraggableCard
  }, [])

  const execute = useCallback(async (id: string, stage: OpportunityStage) => {
    const fn = registryRef.current.get(id)
    if (!fn) {
      toast.error('Erro interno: mutacao nao encontrada.')
      return
    }
    try {
      await fn({ stage })
      toast.success(`Movido para ${STAGE_CONFIG[stage].label}`, { duration: 2500 })
    } catch {
      toast.error('Erro ao mover oportunidade. Tente novamente.', { duration: 4000 })
    }
  }, [])

  return (
    <MutationRegistryContext.Provider value={{ register, execute }}>
      {children}
    </MutationRegistryContext.Provider>
  )
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

interface CrmKanbanProps {
  pipeline: PipelineData
  includeClosed: boolean
}

export function CrmKanban({ pipeline, includeClosed }: CrmKanbanProps) {
  const router = useRouter()
  const [createInStage, setCreateInStage] = useState<OpportunityStage | null>(null)

  // Empty state global — quando nao ha nenhuma oportunidade
  if (pipeline.total_opportunities === 0) {
    return (
      <>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Target className="size-12 text-muted-foreground/30 mb-4" />
          <h2 className="text-lg font-semibold">Nenhuma oportunidade cadastrada</h2>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            Registre aqui consultas e negociacoes da produtora. Cada oportunidade representa um potencial job.
          </p>
          <Button
            size="default"
            className="mt-6 gap-2"
            onClick={() => setCreateInStage('lead')}
          >
            <Plus className="size-4" />
            Nova Oportunidade
          </Button>
        </div>
        <OpportunityDialog
          open={!!createInStage}
          onOpenChange={(open) => {
            if (!open) setCreateInStage(null)
          }}
          mode="create"
          defaultStage={createInStage ?? undefined}
        />
      </>
    )
  }

  return (
    <MutationRegistryProvider>
      <KanbanBoard
        pipeline={pipeline}
        includeClosed={includeClosed}
        onCardClick={(opp) => router.push(`/crm/${opp.id}`)}
        onAddClick={setCreateInStage}
      />

      {/* Dialog de criacao com stage pre-selecionado */}
      <OpportunityDialog
        open={!!createInStage}
        onOpenChange={(open) => {
          if (!open) setCreateInStage(null)
        }}
        mode="create"
        defaultStage={createInStage ?? undefined}
      />
    </MutationRegistryProvider>
  )
}

// ---------------------------------------------------------------------------
// Board com DndContext — precisa estar dentro do MutationRegistryProvider
// ---------------------------------------------------------------------------

interface KanbanBoardProps {
  pipeline: PipelineData
  includeClosed: boolean
  onCardClick: (opp: Opportunity) => void
  onAddClick: (stage: OpportunityStage) => void
}

function KanbanBoard({ pipeline, includeClosed, onCardClick, onAddClick }: KanbanBoardProps) {
  const { execute } = useMutationRegistry()
  const [activeCard, setActiveCard] = useState<Opportunity | null>(null)

  const stages = includeClosed ? ALL_STAGES : ACTIVE_STAGES

  // Mapa id→opportunity para lookup rapido (derivado do pipeline)
  const opportunityMap = useMemo(() => {
    const map = new Map<string, Opportunity>()
    stages.forEach((stage) => {
      const items = pipeline.stages[stage] ?? []
      items.forEach((opp) => map.set(opp.id, opp))
    })
    return map
  }, [pipeline, stages])

  // Sensor com distancia minima de 5px — preserva click normal nos cards
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
  )

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const opp = opportunityMap.get(String(event.active.id))
    if (opp) setActiveCard(opp)
  }, [])

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveCard(null)

      const { active, over } = event
      if (!over) return

      const draggedId = String(active.id)
      const targetStage = String(over.id) as OpportunityStage
      const opp = opportunityMap.get(draggedId)

      if (!opp) return
      if (opp.stage === targetStage) return

      const { allowed, reason } = validateTransition(opp.stage, targetStage)
      if (!allowed) {
        if (reason) toast.warning(reason, { duration: 4500 })
        return
      }

      // Executar mutation registrada pelo DraggableCard desse id
      void execute(draggedId, targetStage)
    },
    [execute],
  )

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      {/* Kanban horizontal com scroll */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {stages.map((stage) => {
          const config = STAGE_CONFIG[stage]
          const items = pipeline.stages[stage] ?? []
          const summary = pipeline.summary.find((s) => s.stage === stage)
          const totalValue = summary?.total_value ?? 0

          return (
            <KanbanColumn
              key={stage}
              stage={stage}
              config={config}
              items={items}
              totalValue={totalValue}
              activeCard={activeCard}
              onCardClick={onCardClick}
              onAddClick={() => onAddClick(stage)}
            />
          )
        })}
      </div>

      {/* Preview do card enquanto arrasta */}
      <DragOverlay dropAnimation={null}>
        {activeCard ? (
          <div className="w-72 rotate-1 scale-105 opacity-95 shadow-2xl pointer-events-none">
            <OpportunityCard opportunity={activeCard} onClick={() => {}} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}

// ---------------------------------------------------------------------------
// Coluna droppable
// ---------------------------------------------------------------------------

interface KanbanColumnProps {
  stage: OpportunityStage
  config: (typeof STAGE_CONFIG)[OpportunityStage]
  items: Opportunity[]
  totalValue: number
  activeCard: Opportunity | null
  onCardClick: (opp: Opportunity) => void
  onAddClick: () => void
}

const KanbanColumn = memo(function KanbanColumn({
  stage,
  config,
  items,
  totalValue,
  activeCard,
  onCardClick,
  onAddClick,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: stage })

  const isDragging = !!activeCard

  // Validar se esse stage e um drop target valido para o card atual
  const transitionValid = activeCard
    ? validateTransition(activeCard.stage, stage).allowed
    : false

  const formatValue = (v: number) => {
    if (v === 0) return null
    if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`
    if (v >= 1_000) return `R$ ${(v / 1_000).toFixed(0)}K`
    return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  const formattedValue = formatValue(totalValue)

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex w-72 shrink-0 flex-col rounded-lg border bg-muted/30 transition-all duration-150',
        config.headerClass,
        // Coluna valida com hover: borda verde + fundo sutil
        isOver && transitionValid &&
          'border-emerald-400 bg-emerald-50/40 ring-1 ring-emerald-300 dark:bg-emerald-950/20 dark:ring-emerald-700',
        // Coluna invalida com hover: borda vermelha sutil
        isOver && !transitionValid && isDragging &&
          'border-red-300/70 bg-red-50/20 dark:bg-red-950/10',
        // Colunas validas piscam levemente durante qualquer drag
        !isOver && isDragging && transitionValid &&
          'border-blue-300/50 bg-blue-50/10 dark:bg-blue-950/10',
      )}
    >
      {/* Header da coluna */}
      <div className="flex items-center justify-between px-3 py-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{config.label}</span>
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-muted px-1.5 text-xs font-medium text-muted-foreground">
            {items.length}
          </span>
          {isOver && transitionValid && (
            <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 animate-pulse">
              Soltar aqui
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {formattedValue && (
            <span className="text-xs font-medium text-muted-foreground">{formattedValue}</span>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onAddClick}
            title={`Nova oportunidade em ${config.label}`}
          >
            <Plus className="size-4" />
          </Button>
        </div>
      </div>

      <div className="h-px bg-border" />

      {/* Cards */}
      <div className="flex flex-col gap-2 p-2 overflow-y-auto max-h-[calc(100vh-320px)]">
        {items.length === 0 ? (
          <button
            onClick={onAddClick}
            className={cn(
              'flex flex-col items-center gap-1.5 rounded-md border border-dashed p-4 text-muted-foreground',
              'transition-colors hover:border-primary/40 hover:text-foreground',
              isOver && transitionValid &&
                'border-emerald-400 bg-emerald-50/60 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400',
            )}
          >
            <Plus className="size-4 opacity-50" />
            <span className="text-xs">
              {isOver && transitionValid ? 'Soltar aqui' : 'Adicionar oportunidade'}
            </span>
          </button>
        ) : (
          items.map((opp) => (
            <DraggableCard
              key={opp.id}
              opportunity={opp}
              onCardClick={onCardClick}
            />
          ))
        )}
      </div>
    </div>
  )
})

// ---------------------------------------------------------------------------
// Card draggable
// Envolve OpportunityCard sem modificar o componente original.
// Registra o mutateAsync no contexto para ser chamado pelo onDragEnd.
// ---------------------------------------------------------------------------

interface DraggableCardProps {
  opportunity: Opportunity
  onCardClick: (opp: Opportunity) => void
}

const DraggableCard = memo(function DraggableCard({ opportunity, onCardClick }: DraggableCardProps) {
  const { register } = useMutationRegistry()

  // Hook de mutacao fixo para este id
  const { mutateAsync } = useUpdateOpportunity(opportunity.id)

  // Registrar no contexto em efeito para evitar side-effect durante render
  useEffect(() => {
    register(opportunity.id, mutateAsync)
  }, [opportunity.id, mutateAsync, register])

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: opportunity.id,
    data: { stage: opportunity.stage },
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
        // Card some quando esta sendo arrastado — DragOverlay assume o papel visual
        isDragging && 'opacity-0',
      )}
    >
      <OpportunityCard
        opportunity={opportunity}
        onClick={() => onCardClick(opportunity)}
      />
    </div>
  )
})
