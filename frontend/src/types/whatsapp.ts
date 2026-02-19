// Tipos para mensagens WhatsApp
export type WhatsAppMessageStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed'

export interface WhatsAppMessageRow {
  id: string
  job_id: string | null
  phone: string
  recipient_name: string | null
  message: string
  status: WhatsAppMessageStatus
  provider: string | null
  external_message_id: string | null
  sent_at: string | null
  created_at: string
}
