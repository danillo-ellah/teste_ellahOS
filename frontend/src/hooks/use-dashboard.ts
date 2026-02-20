'use client'

import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/lib/api'
import { dashboardKeys } from '@/lib/query-keys'

// --- Tipos ---

export interface DashboardKpis {
  active_jobs: number
  total_jobs_month: number
  total_revenue: number
  revenue_month: number
  avg_margin: number
  avg_health_score: number
  pending_approvals: number
  overdue_deliverables: number
  team_allocated: number
}

export interface PipelineItem {
  status: string
  count: number
  total_value: number
}

export type AlertSeverity = 'critical' | 'high' | 'medium' | 'low'
export type AlertType =
  | 'margin_alert'
  | 'overdue_deliverable'
  | 'low_health_score'
  | 'approval_expiring'
  | 'deadline_today'
  | 'deadline_tomorrow'

export interface DashboardAlert {
  alert_type: AlertType
  severity: AlertSeverity
  title: string
  description: string
  job_id: string | null
  job_code: string | null
  alert_date: string | null
  metric_value: number | null
}

export interface ActivityEvent {
  id: string
  event_type: string
  description: string
  created_at: string
  user_id: string | null
  user_name: string | null
  job_id: string | null
  job_code: string | null
  job_title: string | null
}

export interface RevenueMonth {
  month: string
  job_count: number
  revenue: number
  cost: number
  profit: number
}

// --- Hooks ---

/** KPIs gerais do dashboard. Atualiza a cada 30 segundos. */
export function useDashboardKpis() {
  const query = useQuery({
    queryKey: dashboardKeys.kpis(),
    queryFn: () => apiGet<DashboardKpis>('dashboard', undefined, 'kpis'),
    staleTime: 30_000,
    refetchInterval: 30_000,
  })

  return {
    data: query.data?.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  }
}

/** Pipeline de jobs por status. Atualiza a cada 60 segundos. */
export function useDashboardPipeline() {
  const query = useQuery({
    queryKey: dashboardKeys.pipeline(),
    queryFn: () => apiGet<PipelineItem[]>('dashboard', undefined, 'pipeline'),
    staleTime: 60_000,
    refetchInterval: 60_000,
  })

  return {
    data: query.data?.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  }
}

/** Alertas urgentes. Atualiza a cada 60 segundos. */
export function useDashboardAlerts(limit = 20) {
  const query = useQuery({
    queryKey: dashboardKeys.alerts(limit),
    queryFn: () =>
      apiGet<DashboardAlert[]>('dashboard', { limit: String(limit) }, 'alerts'),
    staleTime: 60_000,
    refetchInterval: 60_000,
  })

  return {
    data: query.data?.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  }
}

/** Atividade recente. Atualiza a cada 30 segundos. */
export function useDashboardActivity(hours = 48, limit = 30) {
  const query = useQuery({
    queryKey: dashboardKeys.activity(hours, limit),
    queryFn: () =>
      apiGet<ActivityEvent[]>(
        'dashboard',
        { hours: String(hours), limit: String(limit) },
        'activity',
      ),
    staleTime: 30_000,
    refetchInterval: 30_000,
  })

  return {
    data: query.data?.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  }
}

/** Faturamento mensal. Atualiza a cada 5 minutos. */
export function useDashboardRevenue(months = 6) {
  const query = useQuery({
    queryKey: dashboardKeys.revenue(months),
    queryFn: () =>
      apiGet<RevenueMonth[]>('dashboard', { months: String(months) }, 'revenue'),
    staleTime: 300_000,
    refetchInterval: 300_000,
  })

  return {
    data: query.data?.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  }
}
