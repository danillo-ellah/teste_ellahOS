// Tipos para o Portal do Cliente (Sub-fase 7.7)

import type { JobStatus } from '@/types/jobs'

// --- Dados publicos do portal (sem auth) ---

export interface PortalJob {
  id: string
  code: string
  job_aba?: string | null
  title: string
  status: JobStatus
  project_type: string
  client_name: string | null
  agency_name: string | null
  updated_at: string
  delivery_date?: string | null
}

export interface PortalTimelineEvent {
  id: string
  event_type: string
  description: string | null
  created_at: string
  metadata?: Record<string, unknown> | null
}

export interface PortalDocument {
  id: string
  name: string
  file_url: string
  file_type?: string | null
  file_size?: number | null
  created_at: string
}

export interface PortalApproval {
  id: string
  title: string
  description?: string | null
  approval_type: string
  status: 'pending' | 'approved' | 'rejected' | 'expired'
  created_at: string
  updated_at: string
  file_url?: string | null
  token?: string | null
  created_by_name?: string | null
}

export interface PortalMessage {
  id: string
  direction: 'client_to_producer' | 'producer_to_client'
  sender_name: string
  content: string
  created_at: string
  attachments?: string[] | null
}

export interface PortalSession {
  id: string
  job_id: string
  contact_id: string | null
  token: string
  label: string
  permissions: PortalPermissions
  is_active: boolean
  expires_at: string | null
  created_at: string
  portal_url: string
  jobs?: {
    id: string
    code: string
    title: string
    status: JobStatus
  } | null
  contacts?: {
    id: string
    name: string
    email: string | null
    phone: string | null
  } | null
}

export interface PortalPermissions {
  timeline?: boolean
  documents?: boolean
  approvals?: boolean
  messages?: boolean
}

export interface PortalPublicData {
  session: {
    id: string
    label: string
    permissions: PortalPermissions
    expires_at: string | null
  }
  job: PortalJob
  timeline: PortalTimelineEvent[]
  documents: PortalDocument[]
  approvals: PortalApproval[]
  messages: PortalMessage[]
}

// --- Payloads de mutacoes ---

export interface CreateSessionPayload {
  job_id: string
  label: string
  contact_id?: string | null
  permissions?: PortalPermissions
  expires_at?: string | null
}

export interface UpdateSessionPayload {
  label?: string
  is_active?: boolean
  permissions?: PortalPermissions
  expires_at?: string | null
}

export interface SendPortalMessagePayload {
  sender_name: string
  content: string
  attachments?: string[]
  idempotency_key?: string
}

export interface ReplySessionMessagePayload {
  content: string
  sender_name: string
  attachments?: string[]
}
