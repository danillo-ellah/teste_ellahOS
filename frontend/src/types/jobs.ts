// Types do modulo Jobs - refletem o contrato da API (nomes da spec)
// A Edge Function faz a traducao spec -> banco via column-map.ts

// --- Enums ---

export const JOB_STATUSES = [
  'briefing_recebido',
  'orcamento_elaboracao',
  'orcamento_enviado',
  'aguardando_aprovacao',
  'aprovado_selecao_diretor',
  'cronograma_planejamento',
  'pre_producao',
  'producao_filmagem',
  'pos_producao',
  'aguardando_aprovacao_final',
  'entregue',
  'finalizado',
  'cancelado',
  'pausado',
] as const

export type JobStatus = (typeof JOB_STATUSES)[number]

export const PROJECT_TYPES = [
  'filme_publicitario',
  'branded_content',
  'videoclipe',
  'documentario',
  'conteudo_digital',
  'evento_livestream',
  'institucional',
  'motion_graphics',
  'fotografia',
  'outro',
] as const

export type ProjectType = (typeof PROJECT_TYPES)[number]

export const PRIORITY_LEVELS = ['alta', 'media', 'baixa'] as const
export type PriorityLevel = (typeof PRIORITY_LEVELS)[number]

export const TEAM_ROLES = [
  'diretor',
  'produtor_executivo',
  'coordenador_producao',
  'dop',
  'primeiro_assistente',
  'editor',
  'colorista',
  'motion_designer',
  'diretor_arte',
  'figurinista',
  'produtor_casting',
  'produtor_locacao',
  'gaffer',
  'som_direto',
  'maquiador',
  'outro',
] as const

export type TeamRole = (typeof TEAM_ROLES)[number]

export const HIRING_STATUSES = [
  'orcado',
  'proposta_enviada',
  'confirmado',
  'cancelado',
] as const

export type HiringStatus = (typeof HIRING_STATUSES)[number]

export const DELIVERABLE_STATUSES = [
  'pendente',
  'em_producao',
  'aguardando_aprovacao',
  'aprovado',
  'entregue',
] as const

export type DeliverableStatus = (typeof DELIVERABLE_STATUSES)[number]

export const POS_SUB_STATUSES = [
  'edicao',
  'cor',
  'vfx',
  'finalizacao',
  'audio',
  'revisao',
] as const

export type PosSubStatus = (typeof POS_SUB_STATUSES)[number]

// --- Interfaces ---

export interface Job {
  id: string
  index_number: number
  job_code: string // API: "job_code" -> banco: "code" + "job_aba"
  title: string
  description: string | null
  client_id: string
  agency_id: string | null
  contact_id: string | null
  brand: string | null
  job_type: ProjectType // API: "job_type" -> banco: "project_type"
  segment_type: string | null // API: "segment_type" -> banco: "client_segment"
  status: JobStatus
  sub_status: PosSubStatus | null // API: "sub_status" -> banco: "pos_sub_status"
  priority: PriorityLevel // API: "priority" -> banco: "priority_level"
  health_score: number | null

  // Datas
  expected_start_date: string | null
  expected_delivery_date: string | null
  actual_start_date: string | null
  actual_delivery_date: string | null

  // Briefing e notas
  briefing: string | null
  internal_notes: string | null

  // Financeiro
  closed_value: number | null
  production_cost: number | null
  other_costs: number | null
  budget_estimated: number | null
  budget_approved: number | null
  cost_actual: number | null
  tax_percentage: number | null
  tax_value: number | null // generated
  gross_profit: number | null // generated
  margin_percentage: number | null // generated
  agency_commission_percentage: number | null

  // Integracao
  drive_folder_url: string | null

  // Aprovacao (API retorna 'internal'/'external', column-map traduz de/para banco)
  approval_type: 'internal' | 'external' | null
  approved_at: string | null
  approved_by: string | null
  approved_by_name: string | null

  // Cancelamento
  cancellation_reason: string | null
  cancelled_at: string | null
  cancelled_by: string | null

  // Arquivamento
  is_archived: boolean
  archived_at: string | null
  archived_by: string | null

  // Hierarquia
  is_parent_job: boolean
  parent_job_id: string | null

  // Auditoria
  created_at: string
  updated_at: string
  deleted_at: string | null
  created_by: string | null
  updated_by: string | null

  // Relacionamentos expandidos (joins)
  clients?: { id: string; name: string }
  agencies?: { id: string; name: string }
}

// Job com dados relacionados (retornado por GET /jobs/{id}?include=...)
export interface JobDetail extends Job {
  team?: JobTeamMember[]
  deliverables?: JobDeliverable[]
  shooting_dates?: JobShootingDate[]
  history?: JobHistoryEntry[]
  sub_jobs?: Array<{ id: string; job_code: string; title: string }>
}

export interface JobTeamMember {
  id: string
  job_id: string
  person_id: string
  person_name: string | null // API retorna flat (nao nested people)
  role: TeamRole
  fee: number | null // API: "fee" -> banco: "rate"
  hiring_status: HiringStatus
  is_lead_producer: boolean // API: "is_lead_producer" -> banco: "is_responsible_producer"
  notes: string | null
  created_at: string
  updated_at: string
}

export interface JobDeliverable {
  id: string
  job_id: string
  description: string
  format: string | null
  resolution: string | null
  duration_seconds: number | null
  status: DeliverableStatus
  version: number
  delivery_date: string | null
  parent_id: string | null
  link: string | null
  display_order: number
  notes: string | null
  created_at: string
  updated_at: string
}

export interface JobShootingDate {
  id: string
  job_id: string
  shooting_date: string
  description: string | null
  location: string | null
  start_time: string | null
  end_time: string | null
  created_at: string
  updated_at: string
}

export interface JobHistoryEntry {
  id: string
  job_id: string
  event_type: string
  description: string | null
  user_id: string | null
  user_name: string | null // API retorna flat (nao nested profiles)
  previous_data: Record<string, unknown> | null // API: "previous_data" -> banco: "data_before"
  new_data: Record<string, unknown> | null // API: "new_data" -> banco: "data_after"
  created_at: string
}

// --- Payloads ---

export interface CreateJobPayload {
  title: string
  client_id: string
  agency_id?: string
  job_type: ProjectType
  status?: JobStatus
  expected_delivery_date?: string
}

// Campos aceitos pela API UpdateJobSchema (validation.ts)
// Campos que NAO existem no UpdateJobSchema da API:
// expected_start_date, actual_start_date, budget_estimated, budget_approved,
// cost_actual, agency_commission_percentage, status (usa /jobs-status),
// approval_type (usa ApproveJobSchema), cancellation_reason (usa UpdateStatusSchema)
export interface UpdateJobPayload {
  title?: string
  client_id?: string
  agency_id?: string | null
  brand?: string | null
  job_type?: ProjectType
  priority?: PriorityLevel
  sub_status?: PosSubStatus | null
  briefing_text?: string | null // API usa briefing_text, nao briefing
  internal_notes?: string | null
  notes?: string | null
  expected_delivery_date?: string | null
  actual_delivery_date?: string | null
  tax_percentage?: number | null
  drive_folder_url?: string | null
  closed_value?: number | null
  production_cost?: number | null
  other_costs?: number | null
  is_archived?: boolean
}

// --- API Response ---

export interface ApiResponse<T> {
  data: T
  meta?: PaginationMeta
  warnings?: Array<{ code: string; message: string }>
}

export interface ApiError {
  error: {
    code: string
    message: string
    details?: Record<string, unknown>
  }
}

export interface PaginationMeta {
  total: number
  page: number
  per_page: number
  total_pages: number
}

// --- Filtros ---

export interface JobFilters {
  search?: string
  status?: JobStatus[]
  client_id?: string
  agency_id?: string
  job_type?: ProjectType
  date_from?: string
  date_to?: string
  is_archived?: boolean
  sort_by?: string
  sort_order?: 'asc' | 'desc'
  page?: number
  per_page?: number
}
