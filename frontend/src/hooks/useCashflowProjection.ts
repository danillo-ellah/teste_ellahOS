'use client'

import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/lib/api'
import { cashflowKeys } from '@/lib/query-keys'
import type { CashflowProjection, CashflowGranularity } from '@/types/cashflow'

// Dados de fluxo de caixa mudam com frequencia — stale apos 2 minutos
const STALE_TIME = 2 * 60_000

/** Retorna a projecao de fluxo de caixa para o range e granularidade informados. */
export function useCashflowProjection(
  startDate: string,
  endDate: string,
  granularity: CashflowGranularity = 'weekly',
) {
  const params: Record<string, string> = {
    start_date: startDate,
    end_date: endDate,
    granularity,
  }

  return useQuery({
    queryKey: cashflowKeys.projection(startDate, endDate, granularity),
    queryFn: () =>
      apiGet<CashflowProjection>('financial-dashboard', params, 'cashflow'),
    enabled: !!startDate && !!endDate,
    staleTime: STALE_TIME,
  })
}
