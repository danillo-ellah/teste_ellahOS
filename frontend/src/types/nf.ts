// Types do modulo NF (Nota Fiscal) - Fase 9.2
// Refletem o contrato da Edge Function nf-processor

// --- Enums ---

export const NF_STATUSES = [
  'pending_review',
  'auto_matched',
  'confirmed',
  'rejected',
  'processing',
] as const

export type NfStatus = (typeof NF_STATUSES)[number]

// --- Interfaces ---

export interface NfDocument {
  id: string
  tenant_id: string
  // Arquivo
  file_name: string
  file_url: string | null
  drive_file_id: string | null
  drive_url: string | null
  file_hash: string | null
  // Dados extraidos por OCR
  extracted_issuer_name: string | null
  extracted_issuer_cnpj: string | null
  extracted_nf_number: string | null
  extracted_value: number | null
  extracted_issue_date: string | null
  extracted_competencia: string | null
  extraction_confidence: number | null
  // Dados confirmados pelo usuario
  nf_issuer_name: string | null
  nf_issuer_cnpj: string | null
  nf_number: string | null
  nf_value: number | null
  nf_issue_date: string | null
  // Match com lancamento financeiro
  matched_financial_record_id: string | null
  matched_job_id: string | null
  matched_job_code: string | null
  matched_job_type: string | null
  matched_record_description: string | null
  matched_record_amount: number | null
  matched_record_date: string | null
  // Status e auditoria
  status: NfStatus
  rejection_reason: string | null
  validated_by: string | null
  validated_at: string | null
  email_received_at: string | null
  email_subject: string | null
  email_from: string | null
  created_at: string
  updated_at: string
}

export interface NfStats {
  pending_review: number
  auto_matched: number
  confirmed: number
  rejected: number
  processing: number
  confirmed_month: number
  rejected_month: number
  total: number
}

// --- Filtros ---

export interface NfFilters {
  status?: NfStatus | 'all'
  job_id?: string
  search?: string
  period?: 'all' | 'today' | 'week' | 'month' | 'last_month' | 'custom'
  date_from?: string
  date_to?: string
  sort_by?: 'created_at' | 'nf_value' | 'extracted_value' | 'email_received_at'
  sort_order?: 'asc' | 'desc'
  page?: number
  per_page?: number
}

// --- Payloads ---

export interface ValidateNfPayload {
  nf_document_id: string
  financial_record_id?: string
  nf_number?: string
  nf_value?: number
  nf_issuer_cnpj?: string
  nf_issuer_name?: string
  nf_issue_date?: string
}

export interface RejectNfPayload {
  nf_document_id: string
  rejection_reason: string
}

export interface ReassignNfPayload {
  nf_document_id: string
  financial_record_id: string
  job_id?: string
}

// --- Resultados de mutacao ---

export interface ValidateNfResult {
  nf_document_id: string
  status: 'confirmed'
  invoice_id: string | null
  financial_record_updated: boolean
}

export interface RejectNfResult {
  nf_document_id: string
  status: 'rejected'
}

export interface ReassignNfResult {
  nf_document_id: string
  matched_financial_record_id: string
  job_id: string | null
  status: NfStatus
}

// --- Financial record para busca no modal de reclassificacao ---

export interface FinancialRecordMatch {
  id: string
  description: string
  amount: number
  job_id: string | null
  job_code: string | null
  job_title: string | null
  due_date: string | null
  nf_status: 'sem_nf' | 'enviado' | 'confirmado'
}
