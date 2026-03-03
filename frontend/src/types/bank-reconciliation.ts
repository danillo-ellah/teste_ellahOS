// Tipos para o modulo de Conciliacao Bancaria (T3.7)

export type TransactionType = 'credit' | 'debit' | 'transfer' | 'fee' | 'interest'
export type MatchMethod = 'manual' | 'auto_exact' | 'auto_fuzzy'

// Extrato bancario importado
export interface BankStatement {
  id: string
  tenant_id: string
  bank_name: string
  account_identifier: string | null
  import_date: string
  period_start: string
  period_end: string
  file_name: string | null
  storage_path: string | null
  total_entries: number
  reconciled_entries: number
  reconciliation_pct: number // calculado no backend
  imported_by: string | null
  profiles?: {
    id: string
    full_name: string | null
  } | null
  created_at: string
  updated_at: string
}

// Transacao individual de um extrato
export interface BankTransaction {
  id: string
  tenant_id: string
  statement_id: string
  transaction_date: string
  description: string
  amount: number                  // positivo = credito, negativo = debito
  balance: number | null
  reference_id: string | null
  transaction_type: TransactionType | null
  reconciled: boolean
  reconciled_at: string | null
  reconciled_by: string | null
  cost_item_id: string | null
  payment_proof_id: string | null
  match_confidence: number | null  // 0.00 a 1.00
  match_method: MatchMethod | null
  notes: string | null
  created_at: string
  updated_at: string

  // Joins opcionais
  cost_items?: {
    id: string
    service_description: string
    unit_value: number | null
    job_id: string | null
    jobs?: {
      id: string
      title: string
      code: string | null
      job_aba: string | null
    } | null
  } | null
  payment_proofs?: {
    id: string
    file_name: string | null
    amount: number | null
    payment_date: string
  } | null
}

// Status de conciliacao para exibicao na UI
export type ReconciliationStatus =
  | 'reconciled'    // conciliado (verde)
  | 'suggested'     // match sugerido pelo auto-reconcile (amber)
  | 'unreconciled'  // nao conciliado (vermelho)
  | 'credit'        // credito — sem necessidade de conciliar (cinza)

// Match candidato retornado pelo auto-reconcile
export interface AutoMatchCandidate {
  transaction_id: string
  cost_item_id: string | null
  payment_proof_id: string | null
  match_method: 'auto_exact' | 'auto_fuzzy'
  match_confidence: number
  cost_item?: Record<string, unknown> | null
  payment_proof?: Record<string, unknown> | null
}

// Resultado do auto-reconcile
export interface AutoReconcileResult {
  matches: AutoMatchCandidate[]
  total_transactions: number
  matches_found: number
  applied_count: number
  apply_mode: boolean
}

// Body para importar OFX
export interface ImportOFXBody {
  ofx_content: string
  bank_name?: string
  account_identifier?: string
  file_name?: string
}

// Body para conciliacao manual
export interface ReconcileBody {
  transaction_id: string
  cost_item_id?: string | null
  payment_proof_id?: string | null
  notes?: string | null
}

// Body para desfazer conciliacao
export interface UnreconcileBody {
  transaction_id: string
  unreconcile: true
}

// Filtros de listagem de transacoes
export interface TransactionFilters {
  statement_id: string
  reconciled?: boolean
  transaction_type?: TransactionType
  date_from?: string
  date_to?: string
  search?: string
  page?: number
  per_page?: number
  sort_by?: string
  sort_order?: 'asc' | 'desc'
}

// Filtros de listagem de extratos
export interface StatementFilters {
  bank_name?: string
  period_from?: string
  period_to?: string
  page?: number
  per_page?: number
  sort_by?: string
  sort_order?: 'asc' | 'desc'
}
