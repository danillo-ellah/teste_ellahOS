'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiMutate } from '@/lib/api'
import { crmKeys } from '@/lib/query-keys'

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export interface OpportunityBudgetItem {
  id: string
  version_id: string
  item_number: number
  display_name: string
  value: number
  notes: string | null
}

export interface OpportunityBudgetVersion {
  id: string
  opportunity_id: string
  orc_code: string | null
  version: number
  status: 'rascunho' | 'ativa' | 'historico'
  total_value: number
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  items?: OpportunityBudgetItem[]
  created_by_profile?: { id: string; full_name: string } | null
}

export interface UpsertBudgetVersionPayload {
  items?: Array<{
    item_number: number
    display_name: string
    value: number
    notes?: string | null
  }>
  notes?: string | null
  copy_from_active?: boolean
}

export interface LossAnalyticsFilters {
  period_days?: number
  loss_category?: string
  assigned_to?: string
  client_id?: string
}

export interface LossAnalyticsResult {
  kpis: {
    total_lost: number
    total_lost_value: number
    loss_rate: number
    top_competitor: string | null
  }
  by_category: Array<{ category: string; count: number; total_value: number }>
  recurring_clients: Array<{
    client_id: string
    client_name: string
    loss_count: number
    total_value: number
  }>
  top_competitors: Array<{
    competitor: string
    count: number
    total_value: number
  }>
  opportunities: Array<{
    id: string
    title: string
    client_name: string | null
    actual_close_date: string | null
    estimated_value: number | null
    loss_category: string | null
    loss_reason: string | null
    winner_competitor: string | null
    winner_value: number | null
    assigned_name: string | null
  }>
  filters_applied: LossAnalyticsFilters
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/** Retorna todas as versoes de orcamento de uma oportunidade, com items inclusos */
export function useOpportunityBudgetVersions(opportunityId: string) {
  return useQuery({
    queryKey: crmKeys.budgetVersions(opportunityId),
    queryFn: () =>
      apiGet<OpportunityBudgetVersion[]>(
        'crm',
        undefined,
        `opportunities/${opportunityId}/budget/versions`,
      ),
    enabled: !!opportunityId,
    staleTime: 30_000,
    select: (res) => res.data,
  })
}

/** Retorna analytics de oportunidades perdidas com filtros opcionais */
export function useLossAnalytics(filters: LossAnalyticsFilters = {}) {
  // Converte numeros para string para compatibilidade com URLSearchParams
  const params: Record<string, string> = {}
  if (filters.period_days != null) params.period_days = String(filters.period_days)
  if (filters.loss_category) params.loss_category = filters.loss_category
  if (filters.assigned_to) params.assigned_to = filters.assigned_to
  if (filters.client_id) params.client_id = filters.client_id

  return useQuery({
    queryKey: crmKeys.lossAnalytics(filters as Record<string, unknown>),
    queryFn: () =>
      apiGet<LossAnalyticsResult>(
        'crm',
        Object.keys(params).length > 0 ? params : undefined,
        'loss-analytics',
      ),
    staleTime: 60_000,
    select: (res) => res.data,
  })
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

/** Cria uma nova versao de orcamento (rascunho) para a oportunidade */
export function useCreateBudgetVersion(opportunityId: string) {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (payload: UpsertBudgetVersionPayload) =>
      apiMutate<OpportunityBudgetVersion>(
        'crm',
        'POST',
        payload as unknown as Record<string, unknown>,
        `opportunities/${opportunityId}/budget/versions`,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: crmKeys.budgetVersions(opportunityId) })
      qc.invalidateQueries({ queryKey: crmKeys.detail(opportunityId) })
      qc.invalidateQueries({ queryKey: crmKeys.pipeline() })
    },
  })
}

/** Atualiza uma versao de orcamento em rascunho (items e/ou notes) */
export function useUpdateBudgetVersion(opportunityId: string, versionId: string) {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (payload: UpsertBudgetVersionPayload) =>
      apiMutate<OpportunityBudgetVersion>(
        'crm',
        'PATCH',
        payload as unknown as Record<string, unknown>,
        `opportunities/${opportunityId}/budget/versions/${versionId}`,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: crmKeys.budgetVersions(opportunityId) })
      qc.invalidateQueries({ queryKey: crmKeys.detail(opportunityId) })
    },
  })
}

/** Ativa uma versao de orcamento, movendo a anterior para historico */
export function useActivateBudgetVersion(opportunityId: string) {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (versionId: string) =>
      apiMutate<OpportunityBudgetVersion>(
        'crm',
        'POST',
        {},
        `opportunities/${opportunityId}/budget/versions/${versionId}/activate`,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: crmKeys.budgetVersions(opportunityId) })
      qc.invalidateQueries({ queryKey: crmKeys.detail(opportunityId) })
      qc.invalidateQueries({ queryKey: crmKeys.pipeline() })
    },
  })
}
