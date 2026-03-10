'use client'

import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/lib/api'
import type { MyWeekData } from '@/types/my-week'

export const myWeekKeys = {
  all: ['my-week'] as const,
  week: (weekStart?: string) => [...myWeekKeys.all, weekStart ?? 'current'] as const,
}

/**
 * Hook para buscar dados consolidados da semana do usuario logado.
 * Retorna jobs, deliverables, shooting_dates e pending_approvals em uma unica request.
 *
 * @param weekStart - Data no formato YYYY-MM-DD (segunda-feira). Se omitido, usa semana atual.
 */
export function useMyWeek(weekStart?: string) {
  const params: Record<string, string> = {}
  if (weekStart) {
    params.week_start = weekStart
  }

  const query = useQuery({
    queryKey: myWeekKeys.week(weekStart),
    queryFn: () => apiGet<MyWeekData>('my-week', Object.keys(params).length > 0 ? params : undefined),
    staleTime: 60_000,
    refetchInterval: 60_000,
  })

  return {
    data: query.data?.data ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  }
}
