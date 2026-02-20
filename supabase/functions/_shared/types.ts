// Valores dos ENUMs do banco de dados (fonte: pg_enum)

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
] as const;

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
] as const;

export const PRIORITY_LEVELS = ['alta', 'media', 'baixa'] as const;

export const CLIENT_SEGMENTS = [
  'automotivo',
  'varejo',
  'fintech',
  'alimentos_bebidas',
  'moda',
  'tecnologia',
  'saude',
  'educacao',
  'governo',
  'outro',
] as const;

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
] as const;

export const HIRING_STATUSES = [
  'orcado',
  'proposta_enviada',
  'confirmado',
  'cancelado',
] as const;

export const DELIVERABLE_STATUSES = [
  'pendente',
  'em_producao',
  'aguardando_aprovacao',
  'aprovado',
  'entregue',
] as const;

export const POS_SUB_STATUSES = [
  'edicao',
  'cor',
  'vfx',
  'finalizacao',
  'audio',
  'revisao',
] as const;

export const APPROVAL_TYPES = ['interna', 'externa_cliente'] as const;

export const HISTORY_EVENT_TYPES = [
  'status_change',
  'field_update',
  'team_change',
  'comment',
  'file_upload',
  'approval',
  'financial_update',
] as const;

// Tipos TypeScript derivados dos ENUMs
export type JobStatus = (typeof JOB_STATUSES)[number];
export type ProjectType = (typeof PROJECT_TYPES)[number];
export type PriorityLevel = (typeof PRIORITY_LEVELS)[number];
export type ClientSegment = (typeof CLIENT_SEGMENTS)[number];
export type TeamRole = (typeof TEAM_ROLES)[number];
export type HiringStatus = (typeof HIRING_STATUSES)[number];
export type DeliverableStatus = (typeof DELIVERABLE_STATUSES)[number];
export type PosSubStatus = (typeof POS_SUB_STATUSES)[number];
export type ApprovalType = (typeof APPROVAL_TYPES)[number];
export type HistoryEventType = (typeof HISTORY_EVENT_TYPES)[number];

// Interface do Job (colunas reais do banco)
export interface JobRow {
  id: string;
  tenant_id: string;
  index_number: number;
  code: string;
  job_aba: string;
  title: string;
  client_id: string;
  agency_id: string | null;
  brand: string | null;
  project_type: ProjectType;
  format: string | null;
  segment: ClientSegment | null;
  total_duration_seconds: number | null;
  tags: string[];
  status: JobStatus;
  pos_sub_status: PosSubStatus | null;
  status_updated_at: string | null;
  status_updated_by: string | null;
  priority: PriorityLevel;
  is_archived: boolean;
  cancellation_reason: string | null;
  parent_job_id: string | null;
  is_parent_job: boolean;
  display_order: number;
  briefing_date: string | null;
  budget_sent_date: string | null;
  client_approval_deadline: string | null;
  approval_date: string | null;
  kickoff_ppm_date: string | null;
  shooting_dates: string[];
  post_start_date: string | null;
  post_deadline: string | null;
  expected_delivery_date: string | null;
  actual_delivery_date: string | null;
  closed_value: number | null;
  production_cost: number | null;
  tax_percentage: number;
  tax_value: number | null;
  other_costs: number | null;
  gross_profit: number | null;
  net_profit: number | null;
  margin_percentage: number | null;
  currency: string;
  payment_terms: string | null;
  payment_date: string | null;
  approval_type: ApprovalType | null;
  approved_by_name: string | null;
  approved_by_email: string | null;
  internal_approval_doc_url: string | null;
  drive_folder_url: string | null;
  production_sheet_url: string | null;
  budget_letter_url: string | null;
  schedule_url: string | null;
  script_url: string | null;
  ppm_url: string | null;
  contracts_folder_url: string | null;
  raw_material_url: string | null;
  team_sheet_url: string | null;
  team_form_url: string | null;
  cast_sheet_url: string | null;
  pre_production_url: string | null;
  pre_art_url: string | null;
  pre_costume_url: string | null;
  closing_production_url: string | null;
  closing_art_url: string | null;
  closing_costume_url: string | null;
  final_delivery_url: string | null;
  briefing_text: string | null;
  references_text: string | null;
  notes: string | null;
  internal_notes: string | null;
  client_contact_id: string | null;
  agency_contact_id: string | null;
  po_number: string | null;
  commercial_responsible: string | null;
  proposal_validity: string | null;
  complexity_level: string | null;
  has_contracted_audio: boolean;
  has_mockup_scenography: boolean;
  has_computer_graphics: boolean;
  media_type: string | null;
  ancine_number: string | null;
  audio_company: string | null;
  risk_buffer: number | null;
  health_score: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  created_by: string | null;
  custom_fields: Record<string, unknown>;
}

// Interface do membro da equipe (colunas reais do banco)
export interface TeamMemberRow {
  id: string;
  tenant_id: string;
  job_id: string;
  person_id: string;
  role: TeamRole;
  rate: number | null;
  hiring_status: HiringStatus;
  is_responsible_producer: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

// Interface do entregavel (colunas reais do banco)
export interface DeliverableRow {
  id: string;
  tenant_id: string;
  job_id: string;
  description: string;
  format: string | null;
  resolution: string | null;
  duration_seconds: number | null;
  status: DeliverableStatus;
  version: number;
  delivery_date: string | null;
  file_url: string | null;
  review_url: string | null;
  display_order: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

// Interface da data de filmagem (colunas reais do banco)
export interface ShootingDateRow {
  id: string;
  tenant_id: string;
  job_id: string;
  shooting_date: string;
  description: string | null;
  location: string | null;
  start_time: string | null;
  end_time: string | null;
  display_order: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

// Interface do historico (colunas reais do banco)
export interface HistoryRow {
  id: string;
  tenant_id: string;
  job_id: string;
  event_type: HistoryEventType;
  user_id: string | null;
  data_before: Record<string, unknown> | null;
  data_after: Record<string, unknown> | null;
  description: string;
  created_at: string;
}

// === Fase 5: Integracoes Core ===

// Notificacao (tabela notifications)
export interface NotificationRow {
  id: string;
  tenant_id: string;
  user_id: string;
  type: string;
  priority: string;
  title: string;
  body: string;
  metadata: Record<string, unknown> | null;
  action_url: string | null;
  job_id: string | null;
  read_at: string | null;
  created_at: string;
}

// Preferencias de notificacao (tabela notification_preferences)
export interface NotificationPreferencesRow {
  id: string;
  tenant_id: string;
  user_id: string;
  preferences: { in_app: boolean; whatsapp: boolean; email?: boolean };
  muted_types: string[];
  created_at: string;
  updated_at: string;
}

// Pasta do Drive (tabela drive_folders)
export interface DriveFolderRow {
  id: string;
  tenant_id: string;
  job_id: string;
  folder_key: string;
  google_drive_id: string | null;
  url: string | null;
  parent_folder_id: string | null;
  created_by: string | null;
  created_at: string;
}

// Mensagem WhatsApp (tabela whatsapp_messages)
export interface WhatsAppMessageRow {
  id: string;
  tenant_id: string;
  job_id: string | null;
  phone: string;
  recipient_name: string | null;
  message: string;
  status: string;
  provider: string | null;
  external_message_id: string | null;
  sent_at: string | null;
  created_at: string;
}

// Evento de integracao (tabela integration_events)
export interface IntegrationEventRow {
  id: string;
  tenant_id: string;
  event_type: string;
  payload: Record<string, unknown>;
  status: string;
  attempts: number;
  locked_at: string | null;
  started_at: string | null;
  processed_at: string | null;
  error_message: string | null;
  next_retry_at: string | null;
  result: Record<string, unknown> | null;
  idempotency_key: string | null;
  created_at: string;
}

// Constantes de tipos de notificacao
export const NOTIFICATION_TYPES = [
  'job_approved',
  'status_changed',
  'team_added',
  'deadline_approaching',
  'margin_alert',
  'deliverable_overdue',
  'shooting_date_approaching',
  'integration_failed',
  'portal_message_received',
  'approval_responded',
  'approval_requested',
] as const;

export const NOTIFICATION_PRIORITIES = ['low', 'normal', 'high', 'urgent'] as const;

// Constantes de eventos de integracao
export const INTEGRATION_EVENT_TYPES = [
  'drive_create_structure',
  'whatsapp_send',
  'n8n_webhook',
  'nf_request_sent',
  'nf_received',
  'nf_validated',
  'docuseal_submission_created',
  'docuseal_submission_signed',
  'docuseal_submission_failed',
] as const;

export const INTEGRATION_EVENT_STATUSES = [
  'pending',
  'processing',
  'completed',
  'failed',
  'stalled',
] as const;

// Tipos derivados das constantes da Fase 5
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];
export type NotificationPriority = (typeof NOTIFICATION_PRIORITIES)[number];
export type IntegrationEventType = (typeof INTEGRATION_EVENT_TYPES)[number];
export type IntegrationEventStatus = (typeof INTEGRATION_EVENT_STATUSES)[number];

// Drive folder keys padrao (26 pastas reais da Ellah Filmes)
// folder_key e TEXT (nao ENUM) para flexibilidade sem migrations
export const DEFAULT_FOLDER_KEYS = [
  'root',
  'documentos',
  'financeiro',
  'fin_carta_orcamento',
  'fin_decupado',
  'fin_gastos_gerais',
  'fin_nf_recebimento',
  'fin_comprovantes_pg',
  'fin_notinhas_producao',
  'fin_nf_final',
  'fin_fechamento',
  'monstro_pesquisa',
  'cronograma',
  'contratos',
  'fornecedores',
  'clientes',
  'pos_producao',
  'pos_material_bruto',
  'pos_material_limpo',
  'pos_pesquisa',
  'pos_storyboard',
  'pos_montagem',
  'pos_color',
  'pos_finalizacao',
  'pos_copias',
  'atendimento',
  'vendas',
] as const;

export type DefaultFolderKey = (typeof DEFAULT_FOLDER_KEYS)[number];

// BankInfo — estrutura do campo JSONB people.bank_info
export interface BankInfo {
  bank_name: string | null;
  bank_code: string | null;
  agency: string | null;
  account: string | null;
  account_type: 'corrente' | 'poupanca' | null;
  pix_key: string | null;
  pix_key_type: 'cpf' | 'email' | 'telefone' | 'aleatoria' | null;
  holder_name: string | null;
  holder_document: string | null;
}
