'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiMutate } from '@/lib/api'
import { approvalKeys } from '@/lib/query-keys'
import type {
  ApprovalRequest,
  ApprovalLog,
  CreateApprovalPayload,
} from '@/types/approvals'

// Lista aprovacoes de um job
export function useJobApprovals(jobId: string) {
  return useQuery({
    queryKey: approvalKeys.listByJob(jobId),
    queryFn: async () => {
      const res = await apiGet<ApprovalRequest[]>('approvals', { job_id: jobId })
      return res.data
    },
    enabled: !!jobId,
    staleTime: 30_000,
  })
}

// Lista aprovacoes pendentes do tenant
export function usePendingApprovals() {
  return useQuery({
    queryKey: approvalKeys.pending(),
    queryFn: async () => {
      const res = await apiGet<ApprovalRequest[]>('approvals', undefined, 'pending')
      return res.data
    },
    staleTime: 30_000,
  })
}

// Logs de uma aprovacao
export function useApprovalLogs(approvalId: string) {
  return useQuery({
    queryKey: approvalKeys.logs(approvalId),
    queryFn: async () => {
      const res = await apiGet<ApprovalLog[]>('approvals', undefined, `${approvalId}/logs`)
      return res.data
    },
    enabled: !!approvalId,
    staleTime: 30_000,
  })
}

// Criar aprovacao
export function useCreateApproval() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (payload: CreateApprovalPayload) => {
      const res = await apiMutate<ApprovalRequest>('approvals', 'POST', payload as unknown as Record<string, unknown>)
      return res
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: approvalKeys.listByJob(variables.job_id) })
      qc.invalidateQueries({ queryKey: approvalKeys.pending() })
    },
  })
}

// Reenviar link de aprovacao
export function useResendApproval() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, jobId }: { id: string; jobId: string }) => {
      const res = await apiMutate<ApprovalRequest>('approvals', 'POST', undefined, `${id}/resend`)
      return { ...res, jobId }
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: approvalKeys.listByJob(variables.jobId) })
      qc.invalidateQueries({ queryKey: approvalKeys.logs(variables.id) })
    },
  })
}

// Aprovar internamente
export function useApproveInternal() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, comment }: { id: string; comment?: string }) => {
      const body = comment ? { comment } : undefined
      const res = await apiMutate<ApprovalRequest>('approvals', 'POST', body, `${id}/approve`)
      return res
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: approvalKeys.all })
    },
  })
}

// Rejeitar internamente
export function useRejectInternal() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, comment }: { id: string; comment: string }) => {
      const res = await apiMutate<ApprovalRequest>('approvals', 'POST', { comment }, `${id}/reject`)
      return res
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: approvalKeys.all })
    },
  })
}
