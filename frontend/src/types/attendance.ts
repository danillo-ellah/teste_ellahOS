// ============ Enums / Labels ============

export type CommunicationEntryType =
  | 'decisao'
  | 'alteracao'
  | 'informacao'
  | 'aprovacao'
  | 'satisfacao_automatica'
  | 'registro_set'
  | 'outro'

export type CommunicationChannel =
  | 'whatsapp'
  | 'email'
  | 'reuniao'
  | 'telefone'
  | 'presencial'
  | 'sistema'

export type ExtraStatus =
  | 'pendente_ceo'
  | 'aprovado_gratuito'
  | 'cobrar_aditivo'
  | 'recusado'
  | 'resolvido_atendimento'

export type LogisticsItemType =
  | 'passagem_aerea'
  | 'hospedagem'
  | 'transfer'
  | 'alimentacao'
  | 'outro'

export type LogisticsStatus = 'pendente' | 'confirmado' | 'cancelado'

export type MilestoneStatus = 'pendente' | 'concluido' | 'atrasado' | 'cancelado'

export type InternalApprovalStatus = 'rascunho' | 'aprovado'

export const ENTRY_TYPE_LABELS: Record<CommunicationEntryType, string> = {
  decisao: 'Decisao',
  alteracao: 'Alteracao',
  informacao: 'Informacao',
  aprovacao: 'Aprovacao',
  satisfacao_automatica: 'Satisfacao (auto)',
  registro_set: 'Registro de Set',
  outro: 'Outro',
}

export const CHANNEL_LABELS: Record<CommunicationChannel, string> = {
  whatsapp: 'WhatsApp',
  email: 'Email',
  reuniao: 'Reuniao',
  telefone: 'Telefone',
  presencial: 'Presencial',
  sistema: 'Sistema',
}

export const EXTRA_STATUS_LABELS: Record<ExtraStatus, string> = {
  pendente_ceo: 'Aguardando CEO',
  aprovado_gratuito: 'Aprovado (gratuito)',
  cobrar_aditivo: 'Cobrar aditivo',
  recusado: 'Recusado',
  resolvido_atendimento: 'Resolvido (Atendimento)',
}

export const LOGISTICS_TYPE_LABELS: Record<LogisticsItemType, string> = {
  passagem_aerea: 'Passagem Aerea',
  hospedagem: 'Hospedagem',
  transfer: 'Transfer',
  alimentacao: 'Alimentacao',
  outro: 'Outro',
}

export const LOGISTICS_STATUS_LABELS: Record<LogisticsStatus, string> = {
  pendente: 'Pendente',
  confirmado: 'Confirmado',
  cancelado: 'Cancelado',
}

export const MILESTONE_STATUS_LABELS: Record<MilestoneStatus, string> = {
  pendente: 'Pendente',
  concluido: 'Concluido',
  atrasado: 'Atrasado',
  cancelado: 'Cancelado',
}

// ============ Entities ============

export interface ClientCommunication {
  id: string
  tenant_id: string
  job_id: string
  entry_date: string
  entry_type: CommunicationEntryType
  channel: CommunicationChannel
  description: string
  shared_with_team: boolean
  team_note: string | null
  created_by: string
  created_by_name?: string
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface ScopeItem {
  id: string
  tenant_id: string
  job_id: string
  description: string
  is_extra: boolean
  origin_channel: CommunicationChannel | null
  requested_at: string | null
  extra_status: ExtraStatus | null
  ceo_decision_by: string | null
  ceo_decision_at: string | null
  ceo_notes: string | null
  estimated_value: number | null
  created_by: string
  created_by_name?: string
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface PendingExtra extends ScopeItem {
  job_code: string
  job_title: string
  days_pending: number
}

export interface ClientLogistics {
  id: string
  tenant_id: string
  job_id: string
  item_type: LogisticsItemType
  description: string
  scheduled_date: string | null
  responsible_name: string | null
  status: LogisticsStatus
  sent_to_client: boolean
  notes: string | null
  created_by: string
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface JobInternalApproval {
  id: string
  tenant_id: string
  job_id: string
  status: InternalApprovalStatus
  scope_description: string | null
  team_description: string | null
  shooting_dates_confirmed: boolean
  approved_budget: number | null
  deliverables_description: string | null
  notes: string | null
  approved_by: string | null
  approved_at: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export interface ClientMilestone {
  id: string
  tenant_id: string
  job_id: string
  description: string
  due_date: string
  responsible_name: string | null
  status: MilestoneStatus
  notes: string | null
  completed_at: string | null
  created_by: string
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface DashboardCounts {
  [jobId: string]: {
    pending_extras: number
    pending_logistics: number
    overdue_milestones: number
    missing_internal_approval: boolean
  }
}

// ============ Payloads ============

export interface CreateCommunicationPayload {
  job_id: string
  entry_date?: string
  entry_type: CommunicationEntryType
  channel: CommunicationChannel
  description: string
  shared_with_team?: boolean
  team_note?: string | null
}

export interface UpdateCommunicationPayload {
  entry_date?: string
  entry_type?: CommunicationEntryType
  channel?: CommunicationChannel
  description?: string
  shared_with_team?: boolean
  team_note?: string | null
}

export interface CreateScopeItemPayload {
  job_id: string
  description: string
  is_extra?: boolean
  origin_channel?: CommunicationChannel
  requested_at?: string
  estimated_value?: number | null
}

export interface DecideScopeItemPayload {
  extra_status: ExtraStatus
  ceo_notes?: string
}

export interface CreateLogisticsPayload {
  job_id: string
  item_type: LogisticsItemType
  description: string
  scheduled_date?: string
  responsible_name?: string
  notes?: string
}

export interface UpdateLogisticsPayload {
  item_type?: LogisticsItemType
  description?: string
  scheduled_date?: string | null
  responsible_name?: string | null
  status?: LogisticsStatus
  sent_to_client?: boolean
  notes?: string | null
}

export interface UpsertInternalApprovalPayload {
  job_id: string
  scope_description?: string | null
  team_description?: string | null
  shooting_dates_confirmed?: boolean
  approved_budget?: number | null
  deliverables_description?: string | null
  notes?: string | null
}

export interface CreateMilestonePayload {
  job_id: string
  description: string
  due_date: string
  responsible_name?: string
  notes?: string
}

export interface UpdateMilestonePayload {
  description?: string
  due_date?: string
  responsible_name?: string | null
  status?: MilestoneStatus
  notes?: string | null
}
