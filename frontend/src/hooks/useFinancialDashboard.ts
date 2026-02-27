import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/lib/api'
import { finDashboardKeys } from '@/lib/query-keys'
import type { JobFinancialDashboard, TenantFinancialDashboard } from '@/types/cost-management'

export function useJobFinancialDashboard(jobId: string) {
  return useQuery({
    queryKey: finDashboardKeys.job(jobId),
    queryFn: () => apiGet<JobFinancialDashboard>('financial-dashboard', undefined, `job/${jobId}`),
    enabled: !!jobId,
    staleTime: 5 * 60_000, // 5 minutos (acompanhando cache do backend)
  })
}

export function useTenantFinancialDashboard() {
  return useQuery({
    queryKey: finDashboardKeys.tenant(),
    queryFn: () => apiGet<TenantFinancialDashboard>('financial-dashboard', undefined, 'tenant'),
    staleTime: 5 * 60_000,
  })
}
