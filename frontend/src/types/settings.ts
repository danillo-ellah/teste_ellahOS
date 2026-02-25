// Tipos de integracao
export type IntegrationName = 'google_drive' | 'whatsapp' | 'docuseal' | 'n8n'

// Template de arquivo copiado automaticamente ao criar pastas no Drive
export interface DriveTemplate {
  source_id: string
  name: string
  target_folder_key: string
}

// Configuracao do Google Drive
export interface GoogleDriveConfig {
  enabled: boolean
  configured: boolean
  drive_type: 'my_drive' | 'shared_drive' | null
  shared_drive_id: string | null
  root_folder_id: string | null
  folder_template: FolderTemplateItem[] | null
  has_service_account: boolean
  templates?: DriveTemplate[]
}

export interface FolderTemplateItem {
  name: string
  key: string
  children?: { name: string; key: string }[]
}

// Configuracao do WhatsApp
export interface WhatsAppConfig {
  enabled: boolean
  configured: boolean
  provider: 'evolution' | 'zapi' | null
  instance_url: string | null
  instance_name: string | null
  has_api_key: boolean
}

// Configuracao do DocuSeal
export interface DocuSealConfig {
  enabled: boolean
  configured: boolean
  instance_url: string | null
  has_token: boolean
  status_message?: string
  default_template_id?: number | null
}

// Configuracao do n8n
export interface N8nConfig {
  enabled: boolean
  configured: boolean
  webhooks: {
    job_approved: string | null
    margin_alert: string | null
    status_change: string | null
  }
}

// Todas integracoes juntas
export interface IntegrationsConfig {
  google_drive: GoogleDriveConfig
  whatsapp: WhatsAppConfig
  docuseal: DocuSealConfig
  n8n: N8nConfig
}

// Resultado do teste de conexao
export interface TestConnectionResult {
  success: boolean
  message: string
  state?: string
}

// Payload de update por integracao
export interface GoogleDriveUpdatePayload {
  enabled?: boolean
  drive_type?: 'my_drive' | 'shared_drive' | null
  shared_drive_id?: string | null
  root_folder_id?: string | null
  folder_template?: FolderTemplateItem[] | null
  service_account_json?: string
  templates?: DriveTemplate[]
}

export interface WhatsAppUpdatePayload {
  enabled?: boolean
  provider?: 'evolution' | 'zapi' | null
  instance_url?: string | null
  instance_name?: string | null
  api_key?: string
}

export interface DocuSealUpdatePayload {
  enabled?: boolean
  instance_url?: string | null
  auth_token?: string
}

export interface N8nUpdatePayload {
  enabled?: boolean
  webhooks?: {
    job_approved?: string | null
    margin_alert?: string | null
    status_change?: string | null
  }
}

export type IntegrationUpdatePayload =
  | GoogleDriveUpdatePayload
  | WhatsAppUpdatePayload
  | DocuSealUpdatePayload
  | N8nUpdatePayload

// Log de integracao (integration_events)
export interface IntegrationLog {
  id: string
  event_type: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  attempts: number
  payload: Record<string, unknown>
  result: Record<string, unknown> | null
  error_message: string | null
  created_at: string
  processed_at: string | null
}
