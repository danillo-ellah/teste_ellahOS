'use client'

import { useState } from 'react'
import { ChevronRight, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { Opportunity, OpportunityStage, PipelineData } from '@/hooks/useCrm'
import { OpportunityCard } from './OpportunityCard'
import { OpportunityDialog } from './OpportunityDialog'
import { OpportunityDetailDialog } from './OpportunityDetailDialog'

// Configuracao visual de cada stage
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

// Stages mostrados no kanban ativo (sem ganho/perdido/pausado quando includeClosed = false)
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

interface CrmKanbanProps {
  pipeline: PipelineData
  includeClosed: boolean
}

export function CrmKanban({ pipeline, includeClosed }: CrmKanbanProps) {
  const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(null)
  const [createInStage, setCreateInStage] = useState<OpportunityStage | null>(null)

  const stages = includeClosed ? ALL_STAGES : ACTIVE_STAGES

  return (
    <>
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
              onCardClick={setSelectedOpportunity}
              onAddClick={() => setCreateInStage(stage)}
            />
          )
        })}
      </div>

      {/* Dialog de detalhe */}
      {selectedOpportunity && (
        <OpportunityDetailDialog
          opportunityId={selectedOpportunity.id}
          open={!!selectedOpportunity}
          onOpenChange={(open) => {
            if (!open) setSelectedOpportunity(null)
          }}
        />
      )}

      {/* Dialog de criacao com stage pre-selecionado */}
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

// ---------------------------------------------------------------------------
// Coluna do Kanban
// ---------------------------------------------------------------------------

interface KanbanColumnProps {
  stage: OpportunityStage
  config: (typeof STAGE_CONFIG)[OpportunityStage]
  items: Opportunity[]
  totalValue: number
  onCardClick: (opp: Opportunity) => void
  onAddClick: () => void
}

function KanbanColumn({
  stage,
  config,
  items,
  totalValue,
  onCardClick,
  onAddClick,
}: KanbanColumnProps) {
  const formatValue = (v: number) => {
    if (v === 0) return null
    if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`
    if (v >= 1_000) return `R$ ${(v / 1_000).toFixed(0)}K`
    return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  const formattedValue = formatValue(totalValue)

  return (
    <div
      className={cn(
        'flex w-72 shrink-0 flex-col rounded-lg border bg-muted/30',
        config.headerClass,
      )}
    >
      {/* Header da coluna */}
      <div className="flex items-center justify-between px-3 py-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{config.label}</span>
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-muted px-1.5 text-[11px] font-medium text-muted-foreground">
            {items.length}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {formattedValue && (
            <span className="text-[11px] font-medium text-muted-foreground">{formattedValue}</span>
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
            className="flex flex-col items-center gap-1.5 rounded-md border border-dashed p-4 text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
          >
            <Plus className="size-4 opacity-50" />
            <span className="text-xs">Adicionar oportunidade</span>
          </button>
        ) : (
          items.map((opp) => (
            <OpportunityCard
              key={opp.id}
              opportunity={opp}
              onClick={() => onCardClick(opp)}
            />
          ))
        )}
      </div>
    </div>
  )
}
