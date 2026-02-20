'use client'

import { useQuery, useMutation } from '@tanstack/react-query'
import { apiGet } from '@/lib/api'
import { reportKeys } from '@/lib/query-keys'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!

// --- Tipos ---

export interface FinancialByMonth {
  month: string
  revenue: number
  expenses: number
  balance: number
  job_count: number
}

export interface FinancialSummary {
  total_revenue: number
  total_expenses: number
  total_balance: number
  avg_monthly_revenue: number
  months_count: number
}

export interface FinancialReportResult {
  by_month: FinancialByMonth[]
  summary: FinancialSummary
}

export interface FinancialReportData {
  report_type: string
  parameters: { start_date: string; end_date: string }
  result: FinancialReportResult
}

export interface PerformanceItem {
  group_label: string
  job_count: number
  total_revenue: number
  avg_margin: number
  avg_health_score: number
  completed_count: number
  cancelled_count: number
}

export interface PerformanceReportData {
  report_type: string
  parameters: { start_date: string; end_date: string; group_by: string }
  result: PerformanceItem[]
}

export interface TeamMember {
  person_id: string
  full_name: string
  person_type: 'staff' | 'freelancer' | string
  job_count: number
  allocated_days: number
  utilization_pct: number
  conflict_count: number
}

export interface TeamReportData {
  report_type: string
  parameters: { start_date: string; end_date: string }
  result: TeamMember[]
}

// --- Hook: relatorio financeiro ---

/** Relatorio financeiro por periodo. staleTime de 5 minutos. */
export function useFinancialReport(startDate?: string, endDate?: string) {
  const enabled = Boolean(startDate && endDate)

  const query = useQuery({
    queryKey: reportKeys.financial(startDate, endDate),
    queryFn: () =>
      apiGet<FinancialReportData>('reports', {
        start_date: startDate!,
        end_date: endDate!,
      }, 'financial'),
    staleTime: 5 * 60_000,
    enabled,
  })

  return {
    data: query.data?.data,
    isLoading: query.isLoading && enabled,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  }
}

// --- Hook: relatorio de performance ---

/** Relatorio de performance agrupado. staleTime de 5 minutos. */
export function usePerformanceReport(
  groupBy?: string,
  startDate?: string,
  endDate?: string,
) {
  const enabled = Boolean(startDate && endDate)

  const query = useQuery({
    queryKey: reportKeys.performance(groupBy, startDate, endDate),
    queryFn: () =>
      apiGet<PerformanceReportData>(
        'reports',
        {
          group_by: groupBy ?? 'director',
          start_date: startDate!,
          end_date: endDate!,
        },
        'performance',
      ),
    staleTime: 5 * 60_000,
    enabled,
  })

  return {
    data: query.data?.data,
    isLoading: query.isLoading && enabled,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  }
}

// --- Hook: relatorio de equipe ---

/** Relatorio de utilizacao da equipe. staleTime de 5 minutos. */
export function useTeamReport(startDate?: string, endDate?: string) {
  const enabled = Boolean(startDate && endDate)

  const query = useQuery({
    queryKey: reportKeys.team(startDate, endDate),
    queryFn: () =>
      apiGet<TeamReportData>('reports', {
        start_date: startDate!,
        end_date: endDate!,
      }, 'team'),
    staleTime: 5 * 60_000,
    enabled,
  })

  return {
    data: query.data?.data,
    isLoading: query.isLoading && enabled,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  }
}

// --- Hook: exportar CSV ---

interface ExportCsvParams {
  report_type: 'financial' | 'performance' | 'team'
  parameters: {
    start_date: string
    end_date: string
    group_by?: string
  }
}

// Mapeamento de nomes amigaveis do frontend para os nomes reais da RPC no backend
const REPORT_TYPE_MAP: Record<ExportCsvParams['report_type'], string> = {
  financial: 'financial_monthly',
  performance: 'performance',
  team: 'team_utilization',
}

/** Dispara download de CSV. Cria blob URL temporario e clica automaticamente. */
export function useExportCsv() {
  return useMutation({
    mutationFn: async (params: ExportCsvParams) => {
      // Obter token de autenticacao manualmente (mesmo padrao do api.ts)
      const supabase = createClient()
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) throw new Error('Sessao expirada')

      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) throw new Error('Sessao expirada')

      const res = await fetch(`${SUPABASE_URL}/functions/v1/reports/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          ...params,
          report_type: REPORT_TYPE_MAP[params.report_type],
        }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.error?.message ?? 'Erro ao exportar CSV')
      }

      // Extrair nome do arquivo do header Content-Disposition
      const disposition = res.headers.get('Content-Disposition') ?? ''
      const filenameMatch = disposition.match(/filename="?([^";\n]+)"?/)
      const filename = filenameMatch?.[1] ?? `relatorio-${params.report_type}.csv`

      // Criar blob URL e disparar download
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)

      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = filename
      document.body.appendChild(anchor)
      anchor.click()
      document.body.removeChild(anchor)

      // Liberar memoria apos download
      setTimeout(() => URL.revokeObjectURL(url), 5000)

      return filename
    },
    onSuccess: (filename) => {
      toast.success(`CSV exportado com sucesso`, {
        description: filename,
      })
    },
    onError: (err) => {
      toast.error('Erro ao exportar CSV', {
        description: err instanceof Error ? err.message : 'Tente novamente.',
      })
    },
  })
}
