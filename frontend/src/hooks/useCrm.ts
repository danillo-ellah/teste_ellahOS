'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiMutate } from '@/lib/api'
import { crmKeys } from '@/lib/query-keys'

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export type OpportunityStage =
  | 'lead'
  | 'qualificado'
  | 'proposta'
  | 'negociacao'
  | 'fechamento'
  | 'ganho'
  | 'perdido'
  | 'pausado'

export interface OpportunityClient {
  id: string
  name: string
}

export interface OpportunityAgency {
  id: string
  name: string
}

export interface AssignedProfile {
  id: string
  full_name: string
  avatar_url?: string | null
  email?: string
}

export interface Opportunity {
  id: string
  tenant_id: string
  title: string
  stage: OpportunityStage
  estimated_value: number | null
  probability: number
  expected_close_date: string | null
  actual_close_date: string | null
  loss_reason: string | null
  source: string | null
  project_type: string | null
  notes: string | null
  client_id: string | null
  agency_id: string | null
  contact_id: string | null
  assigned_to: string | null
  job_id: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  // Novos campos CRM Sprint 1
  response_deadline: string | null
  is_competitive_bid: boolean
  competitor_count: number | null
  deliverable_format: string | null
  client_budget: number | null
  campaign_period: string | null
  // Campos de analise win/loss
  loss_category: 'preco' | 'diretor' | 'prazo' | 'escopo' | 'relacionamento' | 'outro' | null
  winner_competitor: string | null
  winner_value: number | null
  win_reason: string | null
  // joins opcionais (presentes em list/detail)
  clients?: OpportunityClient | null
  agencies?: OpportunityAgency | null
  assigned_profile?: AssignedProfile | null
}

export interface OpportunityDetail extends Opportunity {
  contacts?: { id: string; full_name: string; email?: string; phone?: string } | null
  created_by_profile?: { id: string; full_name: string } | null
  jobs?: { id: string; title: string; code?: string; status: string } | null
  proposals: OpportunityProposal[]
  recent_activities: OpportunityActivity[]
}

export interface OpportunityProposal {
  id: string
  opportunity_id: string
  version: number
  title: string
  content: string | null
  value: number | null
  file_url: string | null
  storage_path: string | null
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired'
  sent_at: string | null
  responded_at: string | null
  valid_until: string | null
  created_by: string | null
  created_at: string
  created_by_profile?: { id: string; full_name: string } | null
}

export interface OpportunityActivity {
  id: string
  opportunity_id: string
  activity_type: 'note' | 'call' | 'email' | 'meeting' | 'proposal' | 'follow_up'
  description: string
  scheduled_at: string | null
  completed_at: string | null
  created_by: string | null
  created_at: string
  created_by_profile?: AssignedProfile | null
}

export interface StageSummary {
  stage: OpportunityStage
  count: number
  total_value: number
  weighted_value: number
}

export interface PipelineData {
  stages: Record<OpportunityStage, Opportunity[]>
  summary: StageSummary[]
  total_opportunities: number
}

export interface CrmStats {
  pipeline_value: number
  weighted_pipeline_value: number
  conversion_rate: number
  avg_ticket: number
  total_active: number
  total_won: number
  total_lost: number
  by_stage: Record<string, { count: number; total_value: number }>
  by_source: Record<string, number>
  period_days: number
  won_in_period: number
  closed_in_period: number
}

export interface CreateOpportunityPayload {
  title: string
  client_id?: string | null
  agency_id?: string | null
  contact_id?: string | null
  stage?: OpportunityStage
  estimated_value?: number | null
  probability?: number
  expected_close_date?: string | null
  loss_reason?: string | null
  source?: string | null
  project_type?: string | null
  notes?: string | null
  assigned_to?: string | null
  // Novos campos CRM Sprint 1
  response_deadline?: string | null
  is_competitive_bid?: boolean
  competitor_count?: number | null
  deliverable_format?: string | null
  client_budget?: number | null
  campaign_period?: string | null
}

export interface UpdateOpportunityPayload extends Partial<CreateOpportunityPayload> {
  actual_close_date?: string | null
  // Campos de analise win/loss
  loss_category?: 'preco' | 'diretor' | 'prazo' | 'escopo' | 'relacionamento' | 'outro' | null
  winner_competitor?: string | null
  winner_value?: number | null
  win_reason?: string | null
}

export interface AddProposalPayload {
  title: string
  content?: string | null
  value?: number | null
  file_url?: string | null
  storage_path?: string | null
  status?: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired'
  valid_until?: string | null
  sent_at?: string | null
}

export interface AddActivityPayload {
  activity_type: 'note' | 'call' | 'email' | 'meeting' | 'proposal' | 'follow_up'
  description: string
  scheduled_at?: string | null
  completed_at?: string | null
}

export interface ConvertToJobPayload {
  job_title: string
  project_type?: string | null
  client_id?: string | null
  agency_id?: string | null
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export function useCrmPipeline(includeClosed = false) {
  return useQuery({
    queryKey: crmKeys.pipeline(includeClosed),
    queryFn: () =>
      apiGet<PipelineData>('crm', { include_closed: String(includeClosed) }, 'pipeline'),
    staleTime: 30_000,
    select: (res) => res.data,
  })
}

export function useOpportunities(filters: Record<string, string> = {}) {
  return useQuery({
    queryKey: crmKeys.list(filters),
    queryFn: () => apiGet<Opportunity[]>('crm/opportunities', filters),
    staleTime: 30_000,
    select: (res) => res,
  })
}

export function useOpportunity(id: string) {
  return useQuery({
    queryKey: crmKeys.detail(id),
    queryFn: () => apiGet<OpportunityDetail>('crm', undefined, `opportunities/${id}`),
    enabled: !!id,
    staleTime: 30_000,
    select: (res) => res.data,
  })
}

export function useOpportunityActivities(opportunityId: string) {
  return useQuery({
    queryKey: crmKeys.activities(opportunityId),
    queryFn: () =>
      apiGet<OpportunityActivity[]>('crm', undefined, `opportunities/${opportunityId}/activities`),
    enabled: !!opportunityId,
    staleTime: 15_000,
    select: (res) => res.data,
  })
}

export function useCrmStats(periodDays = 90) {
  return useQuery({
    queryKey: crmKeys.stats(periodDays),
    queryFn: () => apiGet<CrmStats>('crm', { period_days: String(periodDays) }, 'stats'),
    staleTime: 60_000,
    select: (res) => res.data,
  })
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export interface CrmDashboardData {
  pipeline_summary: {
    total_value: number
    total_count: number
    total_paused: number
  }
  month_summary: {
    jobs_closed: number
    revenue: number
    vs_last_month_jobs_pct: number
    vs_last_month_revenue_pct: number
  }
  alerts_count: number
  funnel: Array<{ stage: string; label: string; count: number }>
  top_agencies: Array<{ agency_id: string; name: string; total_jobs: number; total_value: number }>
  by_pe: Array<{ profile_id: string; name: string; active_count: number; active_value: number }>
  competition_stats: {
    total_bids: number
    total_won: number
    win_rate: number
    top_loss_reason: string | null
  }
  recent_closings: Array<{
    id: string
    title: string
    value: number | null
    stage: string
    assigned_name: string | null
    closed_at: string | null
  }>
}

export function useCrmDashboard() {
  return useQuery({
    queryKey: crmKeys.dashboard(),
    queryFn: () => apiGet<CrmDashboardData>('crm', undefined, 'dashboard'),
    staleTime: 60_000,
    select: (res) => res.data,
  })
}

// ---------------------------------------------------------------------------
// Alerts
// ---------------------------------------------------------------------------

export type CrmAlertType = 'deadline_urgent' | 'deadline_overdue' | 'inactive' | 'unassigned'

export interface CrmAlert {
  opportunity_id: string
  title: string
  agency_name: string | null
  client_name: string | null
  assigned_name: string | null
  stage: string
  alert_types: CrmAlertType[]
  response_deadline: string | null
  last_activity_at: string | null
  estimated_value: number | null
}

export interface CrmAlertsData {
  total_alerts: number
  alerts: CrmAlert[]
}

export function useFollowUpAlerts() {
  return useQuery({
    queryKey: crmKeys.alerts(),
    queryFn: () => apiGet<CrmAlertsData>('crm', undefined, 'alerts'),
    staleTime: 60_000,
    select: (res) => res.data,
  })
}

// ---------------------------------------------------------------------------
// Agency History (para detalhe CRM)
// ---------------------------------------------------------------------------

export interface AgencyHistory {
  agency: { id: string; name: string }
  stats: {
    total_jobs: number
    avg_ticket: number
    last_job_date: string | null
    win_rate: number
  }
  recent_jobs: Array<{
    id: string
    title: string
    code: string
    estimated_value: number | null
    status: string
    created_at: string
  }>
}

export function useAgencyHistory(agencyId: string | null) {
  return useQuery({
    queryKey: crmKeys.agencyHistory(agencyId ?? ''),
    queryFn: () => apiGet<AgencyHistory>('crm', undefined, `agency-history/${agencyId}`),
    enabled: !!agencyId,
    staleTime: 60_000,
    select: (res) => res.data,
  })
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export function useCreateOpportunity() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (payload: CreateOpportunityPayload) =>
      apiMutate<Opportunity>('crm/opportunities', 'POST', payload as unknown as Record<string, unknown>),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: crmKeys.all })
    },
  })
}

export function useUpdateOpportunity(id: string) {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (payload: UpdateOpportunityPayload) =>
      apiMutate<Opportunity>(
        'crm',
        'PATCH',
        payload as unknown as Record<string, unknown>,
        `opportunities/${id}`,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: crmKeys.all })
    },
  })
}

export function useAddProposal(opportunityId: string) {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (payload: AddProposalPayload) =>
      apiMutate<OpportunityProposal>(
        'crm',
        'POST',
        payload as unknown as Record<string, unknown>,
        `opportunities/${opportunityId}/proposals`,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: crmKeys.detail(opportunityId) })
    },
  })
}

export function useAddActivity(opportunityId: string) {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (payload: AddActivityPayload) =>
      apiMutate<OpportunityActivity>(
        'crm',
        'POST',
        payload as unknown as Record<string, unknown>,
        `opportunities/${opportunityId}/activities`,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: crmKeys.activities(opportunityId) })
      qc.invalidateQueries({ queryKey: crmKeys.detail(opportunityId) })
    },
  })
}

export function useConvertToJob(opportunityId: string) {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (payload: ConvertToJobPayload) =>
      apiMutate<{ opportunity: Opportunity; job: { id: string; title: string; code: string; status: string } }>(
        'crm',
        'POST',
        payload as unknown as Record<string, unknown>,
        `opportunities/${opportunityId}/convert-to-job`,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: crmKeys.all })
    },
  })
}

export function useGenerateBudgetLetter() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: { job_id: string; custom_instructions?: string }) =>
      apiMutate<{ content: string; version: number; job_file_id: string | null }>(
        'budget-letter',
        'POST',
        payload as unknown as Record<string, unknown>,
        'generate',
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: crmKeys.all })
    },
  })
}
