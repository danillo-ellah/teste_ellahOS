// Tipos de Aprovacao (Fase 6)

export type ApprovalType = 'briefing' | 'orcamento_detalhado' | 'corte' | 'finalizacao' | 'entrega'
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'expired'
export type ApproverType = 'external' | 'internal'

export interface ApprovalRequest {
  id: string
  tenant_id: string
  job_id: string
  approval_type: ApprovalType
  title: string
  description: string | null
  file_url: string | null
  status: ApprovalStatus
  token: string
  expires_at: string
  approver_type: ApproverType
  approver_email: string | null
  approver_people_id: string | null
  approver_phone: string | null
  approved_at: string | null
  rejection_reason: string | null
  approved_ip: string | null
  created_by: string
  created_at: string
  updated_at: string
  // joins
  jobs?: { id: string; code: string; title: string }
  people?: { id: string; full_name: string }
  creator?: { id: string; full_name: string }
}

export interface ApprovalLog {
  id: string
  approval_request_id: string
  action: 'created' | 'sent' | 'resent' | 'approved' | 'rejected' | 'expired'
  actor_type: 'user' | 'external' | 'system'
  actor_id: string | null
  actor_ip: string | null
  comment: string | null
  metadata: Record<string, unknown> | null
  created_at: string
  // join
  actor?: { id: string; full_name: string }
}

// Dados retornados pela pagina publica (subset seguro)
export interface PublicApprovalData {
  id: string
  approval_type: ApprovalType
  title: string
  description: string | null
  file_url: string | null
  status: ApprovalStatus
  expires_at: string
  job_title: string
  // Quando ja respondido ou expirado
  message?: string
}

export interface CreateApprovalPayload {
  job_id: string
  approval_type: ApprovalType
  title: string
  description?: string
  file_url?: string
  approver_type: ApproverType
  approver_email?: string
  approver_phone?: string
  approver_people_id?: string
}

export interface RespondPayload {
  action: 'approved' | 'rejected'
  comment?: string
}

// Labels para exibicao
export const APPROVAL_TYPE_LABELS: Record<ApprovalType, string> = {
  briefing: 'Briefing',
  orcamento_detalhado: 'Orcamento Detalhado',
  corte: 'Corte',
  finalizacao: 'Finalizacao',
  entrega: 'Entrega',
}

export const APPROVAL_STATUS_LABELS: Record<ApprovalStatus, string> = {
  pending: 'Pendente',
  approved: 'Aprovado',
  rejected: 'Rejeitado',
  expired: 'Expirado',
}
