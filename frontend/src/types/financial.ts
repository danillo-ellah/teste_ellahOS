// Types do modulo Financeiro
// CRUD direto via Supabase client para operacoes basicas

// --- ENUMs ---

export const FINANCIAL_RECORD_TYPES = ['receita', 'despesa'] as const
export type FinancialRecordType = (typeof FINANCIAL_RECORD_TYPES)[number]

export const FINANCIAL_RECORD_STATUSES = ['pendente', 'pago', 'atrasado', 'cancelado'] as const
export type FinancialRecordStatus = (typeof FINANCIAL_RECORD_STATUSES)[number]

export const FINANCIAL_RECORD_CATEGORIES = [
  'cache_equipe', 'locacao', 'equipamento', 'transporte',
  'alimentacao', 'cenografia', 'figurino', 'pos_producao',
  'musica_audio', 'seguro', 'taxa_administrativa', 'imposto',
  'receita_cliente', 'adiantamento', 'reembolso', 'outro',
] as const
export type FinancialRecordCategory = (typeof FINANCIAL_RECORD_CATEGORIES)[number]

export const PAYMENT_METHODS = [
  'pix', 'transferencia', 'boleto', 'cartao_credito',
  'cartao_debito', 'dinheiro', 'cheque', 'outro',
] as const
export type PaymentMethod = (typeof PAYMENT_METHODS)[number]

export const INVOICE_TYPES = ['nf_servico', 'nf_produto', 'recibo', 'fatura'] as const
export type InvoiceType = (typeof INVOICE_TYPES)[number]

export const INVOICE_STATUSES = ['emitida', 'paga', 'vencida', 'cancelada'] as const
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number]

// --- Interfaces ---

export interface FinancialRecord {
  id: string
  tenant_id: string
  job_id: string | null
  type: FinancialRecordType
  category: FinancialRecordCategory
  description: string
  amount: number
  status: FinancialRecordStatus
  due_date: string | null
  paid_at: string | null
  payment_method: PaymentMethod | null
  person_id: string | null
  notes: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
  // Join fields
  people?: { full_name: string } | null
  jobs?: { title: string; code: string } | null
}

export interface BudgetItem {
  id: string
  tenant_id: string
  budget_id: string
  category: string
  description: string
  quantity: number
  unit_value: number
  total_value: number // GENERATED
  display_order: number
  notes: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface Invoice {
  id: string
  tenant_id: string
  job_id: string | null
  type: InvoiceType
  nf_number: string | null
  amount: number
  status: InvoiceStatus
  issued_at: string | null
  due_date: string | null
  paid_at: string | null
  pdf_url: string | null
  notes: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
  // Join fields
  jobs?: { title: string; code: string } | null
}

export interface JobBudget {
  id: string
  tenant_id: string
  job_id: string | null
  client_id: string | null
  agency_id: string | null
  version: number
  title: string
  total_value: number | null
  status: string
  content_md: string | null
  doc_url: string | null
  pdf_url: string | null
  approved_at: string | null
  approved_by: string | null
  notes: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
  // Relations
  budget_items?: BudgetItem[]
}

// --- Payloads ---

export interface CreateFinancialRecordPayload {
  job_id?: string | null
  type: FinancialRecordType
  category: FinancialRecordCategory
  description: string
  amount: number
  status?: FinancialRecordStatus
  due_date?: string | null
  payment_method?: PaymentMethod | null
  person_id?: string | null
  notes?: string | null
}

export interface UpdateFinancialRecordPayload {
  type?: FinancialRecordType
  category?: FinancialRecordCategory
  description?: string
  amount?: number
  status?: FinancialRecordStatus
  due_date?: string | null
  paid_at?: string | null
  payment_method?: PaymentMethod | null
  person_id?: string | null
  notes?: string | null
}

export interface CreateBudgetItemPayload {
  budget_id: string
  category?: string
  description: string
  quantity: number
  unit_value: number
  display_order?: number
  notes?: string | null
}

export interface UpdateBudgetItemPayload {
  category?: string
  description?: string
  quantity?: number
  unit_value?: number
  display_order?: number
  notes?: string | null
}

export interface CreateJobBudgetPayload {
  job_id?: string | null
  title: string
  status?: string
  notes?: string | null
}

export interface UpdateJobBudgetPayload {
  title?: string
  total_value?: number | null
  status?: string
  content_md?: string | null
  notes?: string | null
}

// --- Filtros ---

export interface FinancialRecordFilters {
  job_id?: string
  type?: FinancialRecordType
  status?: FinancialRecordStatus
  category?: FinancialRecordCategory
  search?: string
  sort_by?: string
  sort_order?: 'asc' | 'desc'
  page?: number
  per_page?: number
}
