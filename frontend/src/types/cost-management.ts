// ============ Vendors ============

export type EntityType = 'pf' | 'pj'
export type PixKeyType = 'cpf' | 'cnpj' | 'email' | 'telefone' | 'aleatoria'
export type AccountType = 'corrente' | 'poupanca'

export interface BankAccount {
  id: string
  tenant_id: string
  vendor_id: string
  account_holder: string | null
  bank_name: string | null
  bank_code: string | null
  agency: string | null
  account_number: string | null
  account_type: AccountType | null
  pix_key: string | null
  pix_key_type: PixKeyType | null
  is_primary: boolean
  is_active: boolean
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface Vendor {
  id: string
  tenant_id: string
  full_name: string
  normalized_name: string
  entity_type: EntityType
  cpf: string | null
  cnpj: string | null
  razao_social: string | null
  email: string | null
  phone: string | null
  notes: string | null
  is_active: boolean
  people_id: string | null
  import_source: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
  bank_accounts?: BankAccount[]
}

export interface VendorSuggestion {
  id: string
  full_name: string
  email: string | null
  entity_type: EntityType
}

export interface BrazilianBank {
  code: string
  name: string
}

export interface VendorFilters {
  search?: string
  entity_type?: EntityType
  is_active?: boolean
  page?: number
  per_page?: number
  sort_by?: string
  sort_order?: 'asc' | 'desc'
}

export interface CreateVendorPayload {
  full_name: string
  entity_type?: EntityType
  cpf?: string
  cnpj?: string
  razao_social?: string
  email?: string
  phone?: string
  notes?: string
  people_id?: string
  bank_account?: Omit<BankAccount, 'id' | 'tenant_id' | 'vendor_id' | 'is_active' | 'created_at' | 'updated_at' | 'deleted_at'>
}

export interface UpdateVendorPayload {
  full_name?: string
  entity_type?: EntityType
  cpf?: string
  cnpj?: string
  razao_social?: string
  email?: string
  phone?: string
  notes?: string
  is_active?: boolean
  people_id?: string | null
}

export interface MergeVendorsPayload {
  target_vendor_id: string
}

export interface MergeVendorsResult {
  cost_items_moved: number
  bank_accounts_moved: number
}

export interface DuplicateVendorError {
  existing_vendor: {
    id: string
    full_name: string
    email: string | null
    similarity_score: number
  }
}

// ============ Cost Items ============

export type PaymentCondition = 'a_vista' | 'cnf_30' | 'cnf_40' | 'cnf_45' | 'cnf_60' | 'cnf_90' | 'snf_30'
export type PaymentMethod = 'pix' | 'ted' | 'dinheiro' | 'debito' | 'credito' | 'outro'
export type ItemStatus = 'orcado' | 'aguardando_nf' | 'nf_pedida' | 'nf_recebida' | 'nf_aprovada' | 'pago' | 'cancelado'
export type NfRequestStatus = 'nao_aplicavel' | 'pendente' | 'pedido' | 'recebido' | 'rejeitado' | 'aprovado'
export type PaymentStatus = 'pendente' | 'pago' | 'cancelado'
export type BudgetMode = 'bottom_up' | 'top_down'

export interface CostItem {
  id: string
  tenant_id: string
  job_id: string | null
  item_number: number
  sub_item_number: number
  is_category_header: boolean
  service_description: string
  sort_order: number
  period_month: string | null
  import_source: string | null
  unit_value: number | null
  quantity: number
  total_value: number
  overtime_hours: number | null
  overtime_rate: number | null
  overtime_value: number
  total_with_overtime: number
  actual_paid_value: number | null
  notes: string | null
  payment_condition: PaymentCondition | null
  payment_due_date: string | null
  payment_method: PaymentMethod | null
  vendor_id: string | null
  vendor_name_snapshot: string | null
  vendor_email_snapshot: string | null
  vendor_pix_snapshot: string | null
  vendor_bank_snapshot: string | null
  item_status: ItemStatus
  suggested_status: string | null
  status_note: string | null
  nf_request_status: NfRequestStatus
  nf_requested_at: string | null
  nf_requested_by: string | null
  nf_document_id: string | null
  nf_drive_url: string | null
  nf_filename: string | null
  nf_extracted_value: number | null
  nf_validation_ok: boolean | null
  payment_status: PaymentStatus
  payment_date: string | null
  payment_proof_url: string | null
  payment_proof_filename: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
  created_by: string | null
  // Joins
  vendors?: Pick<Vendor, 'id' | 'full_name' | 'email' | 'phone'> & { bank_accounts?: BankAccount[] }
}

export interface CostItemFilters {
  job_id?: string
  item_status?: ItemStatus
  payment_status?: PaymentStatus
  nf_request_status?: NfRequestStatus
  vendor_id?: string
  search?: string
  payment_due_date_gte?: string
  payment_due_date_lte?: string
  page?: number
  per_page?: number
  sort_by?: string
  sort_order?: 'asc' | 'desc'
}

export interface CreateCostItemPayload {
  job_id?: string | null
  item_number: number
  sub_item_number?: number
  service_description: string
  sort_order?: number
  period_month?: string
  unit_value?: number
  quantity?: number
  overtime_hours?: number
  overtime_rate?: number
  payment_condition?: PaymentCondition
  payment_due_date?: string
  payment_method?: PaymentMethod
  vendor_id?: string
  notes?: string
}

export interface CostItemListMeta {
  total: number
  page: number
  per_page: number
  total_pages: number
  by_status?: Record<string, number>
  total_budgeted?: number
  total_paid?: number
}

export interface CostCategorySummary {
  item_number: number | null
  item_name: string
  items_total: number
  items_paid: number
  items_pending_nf: number
  items_with_nf_approved: number
  total_budgeted: number
  total_paid: number
  pct_paid: number
}

export interface BudgetSummary {
  budget_mode: BudgetMode
  budget_value: number
  total_estimated: number
  total_paid: number
  balance: number
  margin_gross: number
  margin_pct: number
  by_category: CostCategorySummary[]
}

export interface CostCategory {
  id: string
  tenant_id: string
  item_number: number
  display_name: string
  production_type: string
  description: string | null
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

// ============ Payment Manager ============

export interface PayPayload {
  cost_item_ids: string[]
  payment_date: string
  payment_method: PaymentMethod
  payment_proof_url?: string
  actual_paid_value?: number
}

export interface PayResult {
  items_paid: number
  total_paid: number
  payment_date: string
}

export interface BatchPreviewResult {
  items: CostItem[]
  total: number
  vendor_summary: Record<string, { name: string; count: number; total: number }>
  not_found_ids?: string[]
}

// ============ Financial Dashboard ============

export interface FinancialDashboardAlert {
  type: 'overdue' | 'nf_stale' | 'value_divergence' | 'negative_balance'
  message: string
  severity?: 'high' | 'medium' | 'low'
  cost_item_id?: string
  cash_advance_id?: string
}

export interface PaymentCalendarEntry {
  tenant_id: string
  payment_due_date: string
  job_id: string
  job_code: string
  job_title: string
  items_count: number
  items_paid: number
  items_pending: number
  total_budgeted: number
  total_paid: number
  total_pending: number
  is_overdue: boolean
}

export interface JobFinancialDashboard {
  summary: {
    budget_value: number
    total_estimated: number
    total_paid: number
    balance: number
    margin_gross: number
    margin_pct: number
    budget_mode: BudgetMode
  }
  by_category: CostCategorySummary[]
  payment_calendar: PaymentCalendarEntry[]
  overdue_items: CostItem[]
  pending_nf: CostItem[]
  alerts: FinancialDashboardAlert[]
}

export interface TenantFinancialDashboard {
  total_budgeted: number
  total_paid: number
  total_overdue: number
  jobs_count: number
  items_pending_next_30d: number
  upcoming_by_week: Array<{
    week_label: string
    total: number
    items_count: number
  }>
}

// ============ Cash Advances ============

export type CashAdvanceStatus = 'aberta' | 'encerrada' | 'aprovada'
export type ReceiptType = 'nf' | 'recibo' | 'ticket' | 'outros'
export type ReceiptStatus = 'pendente' | 'aprovado' | 'rejeitado'

export interface CashAdvance {
  id: string
  tenant_id: string
  job_id: string
  cost_item_id: string | null
  recipient_vendor_id: string | null
  recipient_name: string
  description: string
  amount_authorized: number
  amount_deposited: number
  amount_documented: number
  balance: number
  status: CashAdvanceStatus
  drive_folder_url: string | null
  notes: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
  created_by: string | null
  expense_receipts?: ExpenseReceipt[]
}

export interface ExpenseReceipt {
  id: string
  tenant_id: string
  cash_advance_id: string
  job_id: string
  amount: number
  description: string
  receipt_type: ReceiptType
  document_url: string | null
  document_filename: string | null
  expense_date: string | null
  status: ReceiptStatus
  reviewed_by: string | null
  reviewed_at: string | null
  review_note: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
  created_by: string | null
}

export interface CreateCashAdvancePayload {
  job_id: string
  cost_item_id?: string
  recipient_vendor_id?: string
  recipient_name: string
  description: string
  amount_authorized: number
}

export interface CreateReceiptPayload {
  amount: number
  description: string
  receipt_type?: ReceiptType
  document_url?: string
  document_filename?: string
  expense_date?: string
}

export interface ReviewReceiptPayload {
  status: 'aprovado' | 'rejeitado'
  review_note?: string
}

// ============ Status Labels e Cores ============

export const ITEM_STATUS_LABELS: Record<ItemStatus, string> = {
  orcado: 'Orçado',
  aguardando_nf: 'Aguardando NF',
  nf_pedida: 'NF Pedida',
  nf_recebida: 'NF Recebida',
  nf_aprovada: 'NF Aprovada',
  pago: 'Pago',
  cancelado: 'Cancelado',
}

export const ITEM_STATUS_COLORS: Record<ItemStatus, string> = {
  orcado: 'bg-slate-100 text-slate-700',
  aguardando_nf: 'bg-yellow-100 text-yellow-700',
  nf_pedida: 'bg-blue-100 text-blue-700',
  nf_recebida: 'bg-indigo-100 text-indigo-700',
  nf_aprovada: 'bg-emerald-100 text-emerald-700',
  pago: 'bg-green-100 text-green-700',
  cancelado: 'bg-red-100 text-red-700',
}

export const PAYMENT_CONDITION_LABELS: Record<PaymentCondition, string> = {
  a_vista: 'A Vista',
  cnf_30: 'C/NF 30 dias',
  cnf_40: 'C/NF 40 dias',
  cnf_45: 'C/NF 45 dias',
  cnf_60: 'C/NF 60 dias',
  cnf_90: 'C/NF 90 dias',
  snf_30: 'S/NF 30 dias',
}

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  pix: 'PIX',
  ted: 'TED',
  dinheiro: 'Dinheiro',
  debito: 'Debito',
  credito: 'Credito',
  outro: 'Outro',
}
