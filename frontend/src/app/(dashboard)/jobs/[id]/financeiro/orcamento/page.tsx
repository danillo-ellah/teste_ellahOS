'use client'

import { use } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { JobFinancialTabs } from '../_components/JobFinancialTabs'
import { BudgetModeToggle } from './_components/BudgetModeToggle'
import { BudgetOverview } from './_components/BudgetOverview'
import { BudgetCategoryTable } from './_components/BudgetCategoryTable'
import { ApplyTemplateSection } from './_components/ApplyTemplateSection'
import { ReferenceJobsSection } from './_components/ReferenceJobsSection'
import { useBudgetSummary } from '@/hooks/useCostItems'
import type { BudgetMode } from '@/types/cost-management'

interface PageProps {
  params: Promise<{ id: string }>
}

const BUDGET_MODE_LABELS: Record<BudgetMode, string> = {
  bottom_up: 'Bottom-up',
  top_down: 'Top-down',
}

function BudgetPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-5 w-20" />
      </div>
      <Skeleton className="h-14 w-72" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="p-4 space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-8 w-24" />
          </Card>
        ))}
      </div>
      <Card className="p-4 space-y-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-2 w-full" />
      </Card>
      <Card className="p-4 space-y-3">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-40 w-full" />
      </Card>
    </div>
  )
}

export default function JobBudgetPage({ params }: PageProps) {
  const { id: jobId } = use(params)
  const { data, isLoading, isError, refetch } = useBudgetSummary(jobId)
  const budget = data?.data

  return (
    <div className="space-y-6 pb-12">
      <JobFinancialTabs jobId={jobId} />

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold">Orcamento</h2>
          {budget && (
            <Badge variant="secondary">
              {BUDGET_MODE_LABELS[budget.budget_mode]}
            </Badge>
          )}
        </div>
      </div>

      {isLoading && <BudgetPageSkeleton />}

      {isError && !isLoading && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-6 text-center">
          <p className="text-sm text-destructive">Erro ao carregar dados do orcamento.</p>
          <button
            onClick={() => refetch()}
            className="mt-2 text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {!isLoading && !isError && budget && (
        <>
          {/* Modo de orcamento */}
          <BudgetModeToggle jobId={jobId} currentMode={budget.budget_mode} />

          {/* KPIs e barra de execucao */}
          <BudgetOverview summary={budget} />

          <Separator />

          {/* Tabela de categorias */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Resumo por Categoria
            </h3>
            <BudgetCategoryTable rows={budget.by_category} />
          </div>

          <Separator />

          {/* Template e jobs de referencia */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ApplyTemplateSection jobId={jobId} onApplied={() => refetch()} />
            <ReferenceJobsSection jobId={jobId} />
          </div>
        </>
      )}
    </div>
  )
}
