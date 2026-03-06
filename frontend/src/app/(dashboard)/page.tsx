'use client'

import { useEffect, useMemo, useState } from 'react'
import { startOfDay, addDays, format } from 'date-fns'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { KpiCards } from '@/components/dashboard/kpi-cards'
import { PipelineChart } from '@/components/dashboard/pipeline-chart'
import { AlertsPanel } from '@/components/dashboard/alerts-panel'
import { ActivityTimeline } from '@/components/dashboard/activity-timeline'
import { StatusDonut } from '@/components/dashboard/status-donut'
import { RevenueChart } from '@/components/dashboard/revenue-chart'
import { CashflowStrip } from '@/components/dashboard/cashflow-strip'
import { CommercialSnapshot } from '@/components/dashboard/commercial-snapshot'
import {
  useDashboardKpis,
  useDashboardPipeline,
  useDashboardAlerts,
  useDashboardActivity,
  useDashboardRevenue,
} from '@/hooks/use-dashboard'
import { useCashflowProjection } from '@/hooks/useCashflowProjection'
import { useTenantFinancialDashboard } from '@/hooks/useFinancialDashboard'
import { useCrmDashboard } from '@/hooks/useCrm'
import { CeoPendingExtras } from '@/components/dashboard/CeoPendingExtras'

// Saudacao baseada na hora do dia
function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Bom dia'
  if (hour < 18) return 'Boa tarde'
  return 'Boa noite'
}

export default function DashboardPage() {
  const [userName, setUserName] = useState<string | null>(null)

  // Obter nome do usuario logado
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        const fullName =
          user.user_metadata?.full_name ??
          user.user_metadata?.name ??
          user.email?.split('@')[0] ??
          null
        if (fullName) {
          setUserName(fullName.split(' ')[0])
        }
      }
    })
  }, [])

  // Hooks existentes
  const kpis = useDashboardKpis()
  const pipeline = useDashboardPipeline()
  const alerts = useDashboardAlerts(20)
  const activity = useDashboardActivity(48, 30)
  const revenue = useDashboardRevenue(12)

  // Novos hooks (Onda 0.3)
  const cashflowDates = useMemo(() => {
    const start = format(startOfDay(new Date()), 'yyyy-MM-dd')
    const end = format(addDays(new Date(), 30), 'yyyy-MM-dd')
    return { start, end }
  }, [])

  const cashflow = useCashflowProjection(
    cashflowDates.start,
    cashflowDates.end,
    'monthly',
  )
  const tenantFinancial = useTenantFinancialDashboard()
  const crmDashboard = useCrmDashboard()

  // Estado de erro global (qualquer secao com erro)
  const hasAnyError =
    kpis.isError || pipeline.isError || alerts.isError || activity.isError || revenue.isError

  // Secoes financeiras/CRM podem retornar 403 — ocultar silenciosamente
  const showCashflowStrip = !cashflow.isError && !tenantFinancial.isError
  const showCrmSnapshot = !crmDashboard.isError

  function handleRefetchAll() {
    kpis.refetch()
    pipeline.refetch()
    alerts.refetch()
    activity.refetch()
    revenue.refetch()
    cashflow.refetch()
    tenantFinancial.refetch()
    crmDashboard.refetch()
  }

  const greeting = getGreeting()

  return (
    <div className="space-y-6 pb-12">
      {/* Banner de erro global */}
      {hasAnyError && (
        <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 dark:border-red-800 dark:bg-red-950/30">
          <AlertTriangle className="size-4 shrink-0 text-red-500" />
          <p className="flex-1 text-sm text-red-700 dark:text-red-400">
            Nao foi possivel carregar todos os dados. Tente novamente.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefetchAll}
            className="shrink-0 h-8"
          >
            <RefreshCw className="size-3.5 mr-1.5" />
            Tentar novamente
          </Button>
        </div>
      )}

      {/* Header da pagina */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {greeting}
            {userName ? `, ${userName}` : ''}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Aqui esta um resumo do seu dia
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefetchAll}
          className="shrink-0"
        >
          <RefreshCw className="size-3.5 mr-1.5" />
          Atualizar
        </Button>
      </div>

      {/* KPI Cards */}
      <KpiCards data={kpis.data} isLoading={kpis.isLoading} />

      {/* S-03: Extras Pendentes CEO — auto-oculta quando vazio */}
      <CeoPendingExtras />

      {/* Faixa de Caixa + Pagamentos da Semana (v2) */}
      {showCashflowStrip && (
        <CashflowStrip
          cashflow={cashflow.data?.data}
          tenantDashboard={tenantFinancial.data?.data}
          isLoading={cashflow.isLoading || tenantFinancial.isLoading}
        />
      )}

      {/* Pipeline de Jobs */}
      <PipelineChart data={pipeline.data} isLoading={pipeline.isLoading} />

      {/* Grid principal: Alertas + Atividade (desktop 3fr+2fr, mobile 1col) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Alertas — 3 colunas */}
        <div className="lg:col-span-3">
          <AlertsPanel data={alerts.data} isLoading={alerts.isLoading} />
        </div>

        {/* Atividade Recente — 2 colunas */}
        <div className="lg:col-span-2">
          <ActivityTimeline data={activity.data} isLoading={activity.isLoading} />
        </div>
      </div>

      {/* Grid de graficos: CRM Snapshot + Revenue (desktop 2 colunas, mobile 1col) */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {showCrmSnapshot ? (
          <CommercialSnapshot data={crmDashboard.data} isLoading={crmDashboard.isLoading} />
        ) : (
          <StatusDonut data={pipeline.data} isLoading={pipeline.isLoading} />
        )}
        <RevenueChart data={revenue.data} isLoading={revenue.isLoading} />
      </div>

      {/* Donut — sempre visivel, mas movido para baixo quando CRM snapshot esta ativo */}
      {showCrmSnapshot && (
        <StatusDonut data={pipeline.data} isLoading={pipeline.isLoading} />
      )}
    </div>
  )
}
