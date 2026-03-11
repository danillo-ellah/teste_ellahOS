'use client'

import { useState } from 'react'
import { Scissors, RefreshCw, LayoutGrid, List } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { usePosDashboard, useUpdatePosStageDashboard } from '@/hooks/usePosProducao'
import { PosDashboardFilters } from './_components/PosDashboardFilters'
import { PosKanbanView } from './_components/PosKanbanView'
import { PosListView } from './_components/PosListView'
import type { PosDashboardFilters as Filters } from '@/types/pos-producao'

export default function PosProducaoPage() {
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban')
  const [filters, setFilters] = useState<Filters>({})

  const { data: deliverables, isLoading, isError, refetch } = usePosDashboard(filters)
  const { mutateAsync: updateStage } = useUpdatePosStageDashboard()

  const total = deliverables?.length ?? 0

  const handleStageChange = async (deliverableId: string, newStage: string) => {
    await updateStage({ deliverableId, posStage: newStage as import('@/types/pos-producao').PosStage })
  }

  // Mobile: default para lista (kanban scrollavel nao e ideal em telas muito pequenas)
  // Kanban ainda disponivel via toggle
  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Scissors className="size-6 text-primary" />
          <div>
            <h1 className="text-xl font-semibold">Pos-Producao</h1>
            <p className="text-sm text-muted-foreground">
              Pipeline de entregaveis cross-jobs
              {!isLoading && total > 0 && (
                <span className="ml-1">
                  &middot; {total} entregavel{total !== 1 ? 'is' : ''}
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="gap-2"
          >
            <RefreshCw className="size-3.5" />
            Atualizar
          </Button>
        </div>
      </div>

      <Separator />

      {/* Filtros + toggle */}
      <div className="flex flex-wrap items-center gap-2">
        <PosDashboardFilters filters={filters} onFiltersChange={setFilters} />

        <div className="flex-1" />

        {/* Toggle Kanban / Lista */}
        <div className="flex items-center rounded-lg border p-0.5">
          <button
            onClick={() => setViewMode('kanban')}
            className={`hidden md:flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
              viewMode === 'kanban'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <LayoutGrid className="size-3.5" />
            Kanban
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
              viewMode === 'list'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <List className="size-3.5" />
            Lista
          </button>
        </div>
      </div>

      {/* Estado de erro */}
      {isError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center text-sm text-destructive">
          Erro ao carregar entregaveis. Tente novamente.
        </div>
      )}

      {/* Skeleton de carregamento */}
      {isLoading && (
        <div className="space-y-4">
          {viewMode === 'list' || typeof window !== 'undefined' && window.innerWidth < 768 ? (
            Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-lg" />
            ))
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="w-56 shrink-0 space-y-2">
                  <Skeleton className="h-8 rounded-md" />
                  <Skeleton className="h-24 rounded-lg" />
                  <Skeleton className="h-20 rounded-lg" />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Conteudo */}
      {!isLoading && !isError && deliverables && (
        <>
          {/* Kanban: escondido em mobile (<md), visivel em desktop */}
          {viewMode === 'kanban' && (
            <>
              <div className="hidden md:block">
                <PosKanbanView deliverables={deliverables} onStageChange={handleStageChange} />
              </div>
              {/* Em mobile, sempre mostra lista */}
              <div className="md:hidden">
                <PosListView deliverables={deliverables} />
              </div>
            </>
          )}

          {viewMode === 'list' && (
            <PosListView deliverables={deliverables} />
          )}
        </>
      )}
    </div>
  )
}
