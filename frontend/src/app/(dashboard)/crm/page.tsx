'use client'

import { useState } from 'react'
import { Target, Plus, BarChart3, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { useCrmPipeline, useCrmStats } from '@/hooks/useCrm'
import { CrmKanban } from '@/components/crm/CrmKanban'
import { CrmStatsBar } from '@/components/crm/CrmStatsBar'
import { OpportunityDialog } from '@/components/crm/OpportunityDialog'
import { CrmStatsDialog } from '@/components/crm/CrmStatsDialog'

export default function CrmPage() {
  const [includeClosed, setIncludeClosed] = useState(false)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [statsDialogOpen, setStatsDialogOpen] = useState(false)

  const {
    data: pipeline,
    isLoading: pipelineLoading,
    isError: pipelineError,
    refetch,
  } = useCrmPipeline(includeClosed)

  const { data: stats, isLoading: statsLoading } = useCrmStats(90)

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Target className="size-6 text-primary" />
          <div>
            <h1 className="text-xl font-semibold">Pipeline Comercial</h1>
            <p className="text-sm text-muted-foreground">
              Gerencie oportunidades e acompanhe o funil de vendas
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

          <Button
            variant="outline"
            size="sm"
            onClick={() => setStatsDialogOpen(true)}
            className="gap-2"
          >
            <BarChart3 className="size-3.5" />
            Metricas
          </Button>

          <Button
            size="sm"
            onClick={() => setCreateDialogOpen(true)}
            className="gap-2"
          >
            <Plus className="size-3.5" />
            Nova Oportunidade
          </Button>
        </div>
      </div>

      {/* Stats bar compacta */}
      {!statsLoading && stats && (
        <CrmStatsBar stats={stats} />
      )}
      {statsLoading && (
        <div className="grid grid-cols-3 gap-3">
          <Skeleton className="h-16 rounded-lg" />
          <Skeleton className="h-16 rounded-lg" />
          <Skeleton className="h-16 rounded-lg" />
        </div>
      )}

      <Separator />

      {/* Filtro de fechadas */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Visualizar:</span>
        <button
          onClick={() => setIncludeClosed(false)}
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            !includeClosed
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
        >
          Pipeline ativo
        </button>
        <button
          onClick={() => setIncludeClosed(true)}
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            includeClosed
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
        >
          Incluir ganhos/perdidos
        </button>

        {pipeline && (
          <Badge variant="outline" className="ml-auto text-xs">
            {pipeline.total_opportunities} oportunidade{pipeline.total_opportunities !== 1 ? 's' : ''}
          </Badge>
        )}
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
        <CrmKanban pipeline={pipeline} includeClosed={includeClosed} />
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
