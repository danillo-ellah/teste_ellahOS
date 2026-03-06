// Tipos para integracao DocuSeal

export type DocuSealStatus =
  | 'pending'
  | 'sent'
  | 'opened'
  | 'partially_signed'
  | 'signed'
  | 'declined'
  | 'expired'
  | 'error'

export interface DocuSealSubmission {
  id: string
  tenant_id: string
  job_id: string
  person_id: string | null
  person_name: string
  person_email: string
  person_cpf: string | null
  docuseal_submission_id: number | null
  docuseal_template_id: number
  docuseal_status: DocuSealStatus
  contract_data: Record<string, unknown>
  signed_pdf_url: string | null
  sent_at: string | null
  opened_at: string | null
  signed_at: string | null
  error_message: string | null
  metadata: Record<string, unknown>
  created_by: string
  created_at: string
  updated_at: string
  // join
  jobs?: { id: string; code: string; title: string }
}

export interface DocuSealFilters {
  job_id?: string
  status?: DocuSealStatus | 'all'
}

export interface CreateDocuSealSubmitter {
  person_id?: string
  person_name: string
  person_email: string
  person_cpf?: string
  contract_data?: Record<string, unknown>
  fields?: Array<{ name: string; value: string }>
}

export interface CreateDocuSealPayload {
  job_id: string
  template_id: number
  submitters: CreateDocuSealSubmitter[]
}

// Tipos de template de contrato suportados
export type ContractTemplateType = 'elenco' | 'tecnico' | 'pj'

// Template classificado retornado por GET /docuseal-integration/templates
export interface DocuSealTemplate {
  id: number
  name: string
  type: ContractTemplateType | null
  fields: Array<{ name: string; type: string }>
}

export interface DocuSealTemplatesResponse {
  templates: DocuSealTemplate[]
  total: number
}

// Resultado de um membro no lote
export interface BatchMemberResult {
  member_id: string
  person_id: string
  person_name: string
  status: 'generated' | 'skipped'
  skip_reason?: string
  submission_id?: string
  docuseal_submission_id?: number
}

// Payload para POST /docuseal-integration/batch-generate
export interface BatchGeneratePayload {
  job_id: string
  template_type: ContractTemplateType
  member_ids: string[]
  /** Prazo de pagamento em dias corridos (ex: 30, 45, 60, 70) */
  payment_deadline_days: number
}

// Resposta de POST /docuseal-integration/batch-generate
export interface BatchGenerateResult {
  job_id: string
  job_code: string
  template_type: ContractTemplateType
  template_id: number
  generated: BatchMemberResult[]
  skipped: BatchMemberResult[]
  generated_count: number
  skipped_count: number
}

// Labels pt-BR para status DocuSeal
export const DOCUSEAL_STATUS_LABELS: Record<DocuSealStatus, string> = {
  pending: 'Pendente',
  sent: 'Enviado',
  opened: 'Aberto',
  partially_signed: 'Parcialmente Assinado',
  signed: 'Assinado',
  declined: 'Recusado',
  expired: 'Expirado',
  error: 'Erro',
}
