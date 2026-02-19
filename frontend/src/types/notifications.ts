// Types do modulo Notifications - refletem o contrato da API

// --- Enums ---

// Tipos de notificacao (espelham o ENUM notification_type do banco)
export type NotificationType =
  | 'job_approved'
  | 'status_changed'
  | 'team_added'
  | 'deadline_approaching'
  | 'margin_alert'
  | 'deliverable_overdue'
  | 'shooting_date_approaching'
  | 'integration_failed'

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent'

// --- Interfaces ---

// Notificacao retornada pela API
export interface Notification {
  id: string
  tenant_id: string
  user_id: string
  type: NotificationType
  priority: NotificationPriority
  title: string
  body: string
  metadata: Record<string, unknown> | null
  action_url: string | null
  job_id: string | null
  read_at: string | null
  created_at: string
}

// Preferencias de notificacao do usuario
export interface NotificationPreferences {
  id: string
  tenant_id: string
  user_id: string
  preferences: {
    in_app: boolean
    whatsapp: boolean
  }
  muted_types: string[]
  created_at: string
  updated_at: string
}

// --- Filtros ---

export interface NotificationFilters {
  type?: NotificationType
  unread_only?: boolean
  job_id?: string
  page?: number
  per_page?: number
}
