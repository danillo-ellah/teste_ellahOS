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
}

export interface UpdateOpportunityPayload extends Partial<CreateOpportunityPayload> {
  actual_close_date?: string | null
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
// Mutations
// ---------------------------------------------------------------------------

export function useCreateOpportunity() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (payload: CreateOpportunityPayload) =>
      apiMutate<Opportunity>('crm/opportunities', 'POST', payload as Record<string, unknown>),
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
        payload as Record<string, unknown>,
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
        payload as Record<string, unknown>,
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
        payload as Record<string, unknown>,
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
        payload as Record<string, unknown>,
        `opportunities/${opportunityId}/convert-to-job`,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: crmKeys.all })
    },
  })
}
