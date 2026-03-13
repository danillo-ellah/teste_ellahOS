'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { Plus, BarChart3, RefreshCw, LayoutGrid, List } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useCrmPipeline } from '@/hooks/useCrm'
import { CrmKanban } from '@/components/crm/CrmKanban'
import { CrmListView } from '@/components/crm/CrmListView'
import { CrmStatsBar } from '@/components/crm/CrmStatsBar'
import { OpportunityDialog } from '@/components/crm/OpportunityDialog'
import { CrmAlertsBanner } from '@/components/crm/CrmAlertsBanner'

const CrmStatsDialog = dynamic(
  () => import('@/components/crm/CrmStatsDialog').then((m) => ({ default: m.CrmStatsDialog })),
  { ssr: false },
)

export default function CrmPage() {
  const [includeClosed, setIncludeClosed] = useState(false)
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban')
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [statsDialogOpen, setStatsDialogOpen] = useState(false)

  const {
    data: pipeline,
    isLoading: pipelineLoading,
    isError: pipelineError,
    refetch,
  } = useCrmPipeline(includeClosed)

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Comercial</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Pipeline de oportunidades
            {pipeline && (
              <span className="ml-1 text-foreground/60">&middot; {pipeline.total_opportunities} oportunidade{pipeline.total_opportunities !== 1 ? 's' : ''}</span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            className="gap-1.5 min-h-[44px] sm:min-h-0 text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className="size-3.5" />
            <span className="hidden sm:inline">Atualizar</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setStatsDialogOpen(true)}
            className="gap-1.5 min-h-[44px] sm:min-h-0"
          >
            <BarChart3 className="size-3.5" />
            Metricas
          </Button>

          <Button
            size="sm"
            onClick={() => setCreateDialogOpen(true)}
            className="gap-1.5 min-h-[44px] sm:min-h-0 shadow-sm"
          >
            <Plus className="size-3.5" />
            Nova Oportunidade
          </Button>
        </div>
      </div>

      {/* Stats bar compacta — gerencia seu proprio fetch internamente */}
      <CrmStatsBar />

      {/* Alertas de follow-up */}
      <CrmAlertsBanner />

      {/* Filtros + toggle de visualizacao */}
      <div className="flex items-center gap-2.5 flex-wrap">
        <div className="flex items-center rounded-full border border-border/60 bg-muted/30 p-0.5">
          <button
            onClick={() => setIncludeClosed(false)}
            className={`rounded-full px-4 py-2 text-xs font-medium transition-all min-h-[44px] sm:min-h-[32px] ${
              !includeClosed
                ? 'bg-card text-foreground shadow-sm border border-border/60'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Pipeline ativo
          </button>
          <button
            onClick={() => setIncludeClosed(true)}
            className={`rounded-full px-4 py-2 text-xs font-medium transition-all min-h-[44px] sm:min-h-[32px] ${
              includeClosed
                ? 'bg-card text-foreground shadow-sm border border-border/60'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Tudo
          </button>
        </div>

        <div className="flex-1" />

        {/* Toggle Kanban / Lista */}
        <div className="flex items-center rounded-full border border-border/60 bg-muted/30 p-0.5">
          <button
            onClick={() => setViewMode('kanban')}
            className={`flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-medium transition-all min-h-[44px] sm:min-h-[32px] ${
              viewMode === 'kanban'
                ? 'bg-card text-foreground shadow-sm border border-border/60'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <LayoutGrid className="size-3.5" />
            Kanban
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-medium transition-all min-h-[44px] sm:min-h-[32px] ${
              viewMode === 'list'
                ? 'bg-card text-foreground shadow-sm border border-border/60'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <List className="size-3.5" />
            Lista
          </button>
        </div>
      </div>

      {/* Kanban */}
      {pipelineError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center text-sm text-destructive">
          Erro ao carregar pipeline. Tente novamente.
        </div>
      )}

      {pipelineLoading && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-8 rounded-md" />
              <Skeleton className="h-32 rounded-lg" />
              <Skeleton className="h-24 rounded-lg" />
            </div>
          ))}
        </div>
      )}

      {!pipelineLoading && !pipelineError && pipeline && (
        viewMode === 'kanban' ? (
          <CrmKanban pipeline={pipeline} includeClosed={includeClosed} />
        ) : (
          <CrmListView pipeline={pipeline} includeClosed={includeClosed} />
        )
      )}

      {/* Dialog de criacao de oportunidade */}
      <OpportunityDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        mode="create"
      />

      {/* Dialog de metricas */}
      <CrmStatsDialog
        open={statsDialogOpen}
        onOpenChange={setStatsDialogOpen}
      />
    </div>
  )
}
