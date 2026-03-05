'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiMutate } from '@/lib/api'
import { paymentCalendarKeys } from '@/lib/query-keys'
import type {
  PaymentCalendarEvents,
  PaymentCalendarKpis,
  PostponePayload,
  PostponeResult,
} from '@/types/payment-calendar'

// Dados de pagamento mudam com frequencia — stale apos 2 minutos
const STALE_TIME = 2 * 60_000

/**
 * Retorna todos os eventos do calendario (pagaveis + recebiveis) no range.
 * Filtragem opcional por job — se jobId omitido, retorna cross-job (tenant).
 */
export function usePaymentCalendarEvents(
  start: string,
  end: string,
  jobId?: string,
) {
  const params: Record<string, string> = {
    start_date: start,
    end_date: end,
  }
  if (jobId) params.job_id = jobId

  return useQuery({
    queryKey: paymentCalendarKeys.events(start, end, jobId),
    queryFn: () =>
      apiGet<PaymentCalendarEvents>('payment-calendar', params, 'events'),
    enabled: !!start && !!end,
    staleTime: STALE_TIME,
  })
}

/**
 * Retorna os KPIs agregados do periodo (totais, atrasados, saldo).
 * Filtragem opcional por job — se jobId omitido, agrega o tenant inteiro.
 */
export function usePaymentCalendarKpis(
  start: string,
  end: string,
  jobId?: string,
) {
  const params: Record<string, string> = {
    start_date: start,
    end_date: end,
  }
  if (jobId) params.job_id = jobId

  return useQuery({
    queryKey: paymentCalendarKeys.kpis(start, end, jobId),
    queryFn: () =>
      apiGet<PaymentCalendarKpis>('payment-calendar', params, 'kpis'),
    enabled: !!start && !!end,
    staleTime: STALE_TIME,
  })
}

/**
 * Prorrogacao em batch de vencimento de cost_items.
 * Invalida events + kpis de todas as chaves do calendario apos sucesso.
 */
export function usePostponePayment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: PostponePayload) =>
      apiMutate<PostponeResult>(
        'payment-calendar',
        'PATCH',
        payload as unknown as Record<string, unknown>,
        'postpone',
      ),
    onSuccess: () => {
      // Invalida todos os events e kpis do calendario (qualquer range/job)
      queryClient.invalidateQueries({ queryKey: paymentCalendarKeys.all })
    },
  })
}
