'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ReportFilters, getPresetDates } from '@/components/reports/report-filters'
import { FinancialTab } from '@/components/reports/financial-tab'
import { PerformanceTab } from '@/components/reports/performance-tab'
import { TeamTab } from '@/components/reports/team-tab'
import {
  useFinancialReport,
  usePerformanceReport,
  useTeamReport,
  useExportCsv,
} from '@/hooks/use-reports'
import type { ReportFiltersValue, PeriodPreset } from '@/components/reports/report-filters'

// Periodo padrao: ultimos 3 meses
function buildDefaultFilters(): ReportFiltersValue {
  const preset: PeriodPreset = 'last_3_months'
  const { start, end } = getPresetDates(preset)
  return {
    preset,
    startDate: start,
    endDate: end,
    groupBy: 'director',
  }
}

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<'financial' | 'performance' | 'team'>('financial')
  const [filters, setFilters] = useState<ReportFiltersValue>(buildDefaultFilters)

  // Hooks de dados — cada um so e ativo quando tem datas validas
  const financial = useFinancialReport(filters.startDate, filters.endDate)
  const performance = usePerformanceReport(filters.groupBy, filters.startDate, filters.endDate)
  const team = useTeamReport(filters.startDate, filters.endDate)
  const exportCsv = useExportCsv()

  // Mapeia a aba ativa para o report_type do endpoint de export
  const exportReportType = activeTab as 'financial' | 'performance' | 'team'

  function handleExport() {
    exportCsv.mutate({
      report_type: exportReportType,
      parameters: {
        start_date: filters.startDate,
        end_date: filters.endDate,
        ...(activeTab === 'performance' ? { group_by: filters.groupBy } : {}),
      },
    })
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header da pagina */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Relatorios</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Analise financeira, performance e utilizacao da equipe por periodo.
        </p>
      </div>

      {/* Abas + Filtros */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as typeof activeTab)}
        className="space-y-5"
      >
        {/* Barra superior: Tabs + Filtros + Exportar */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          {/* Tabs de navegacao */}
          <TabsList className="h-9 shrink-0">
            <TabsTrigger value="financial" className="text-sm">
              Financeiro
            </TabsTrigger>
            <TabsTrigger value="performance" className="text-sm">
              Performance
            </TabsTrigger>
            <TabsTrigger value="team" className="text-sm">
              Equipe
            </TabsTrigger>
          </TabsList>

          {/* Filtros de periodo + botao export */}
          <ReportFilters
            filters={filters}
            onChange={setFilters}
            showGroupBy={activeTab === 'performance'}
            onExport={handleExport}
            isExporting={exportCsv.isPending}
            className="lg:flex-1 lg:justify-end"
          />
        </div>

        {/* Conteudo Financeiro */}
        <TabsContent value="financial" className="mt-0">
          <FinancialTab
            data={financial.data}
            isLoading={financial.isLoading}
            isError={financial.isError}
            onRetry={financial.refetch}
          />
        </TabsContent>

        {/* Conteudo Performance */}
        <TabsContent value="performance" className="mt-0">
          <PerformanceTab
            data={performance.data}
            isLoading={performance.isLoading}
            isError={performance.isError}
            onRetry={performance.refetch}
          />
        </TabsContent>

        {/* Conteudo Equipe */}
        <TabsContent value="team" className="mt-0">
          <TeamTab
            data={team.data}
            isLoading={team.isLoading}
            isError={team.isError}
            onRetry={team.refetch}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
