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

// ---------------------------------------------------------------------------
// NF Request (Fase 9.3) — Pedido de NF para fornecedores
// ---------------------------------------------------------------------------

export type NfRequestStatus = 'sem_nf' | 'enviado' | 'enviado_confirmado'

export type NfRequestRecordType = 'servico' | 'diaria' | 'aluguel' | 'outros'

export interface NfRequestRecord {
  id: string
  tenant_id: string
  // Fornecedor
  supplier_name: string | null
  supplier_cnpj: string | null
  supplier_email: string | null
  // Job
  job_id: string | null
  job_code: string | null
  job_title: string | null
  // Lancamento
  description: string
  amount: number
  due_date: string | null
  record_type: NfRequestRecordType | null
  // Status do pedido de NF
  nf_request_status: NfRequestStatus
  nf_request_sent_at: string | null
  // Auditoria
  created_at: string
  updated_at: string
}

export interface NfRequestStats {
  total_pending: number
  sent_today: number
  awaiting_response: number
}

export interface NfRequestFilters {
  status?: NfRequestStatus | 'all'
  job_id?: string
  supplier_name?: string
  record_type?: NfRequestRecordType | 'all'
  search?: string
  page?: number
  per_page?: number
}

// Grupo de registros agrupados por fornecedor
export interface NfRequestSupplierGroup {
  supplier_name: string
  supplier_email: string | null
  supplier_cnpj: string | null
  total_amount: number
  records: NfRequestRecord[]
}

// Payload para envio de pedido de NF
export interface SendNfRequestPayload {
  financial_record_ids: string[]
  message_template?: string
}

// Resultado do envio
export interface SendNfRequestResult {
  sent_count: number
  failed_count: number
  enqueued_events: number
}
