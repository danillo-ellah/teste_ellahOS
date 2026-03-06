// ============ Receivables ============

export type ReceivableStatus = 'pendente' | 'faturado' | 'recebido' | 'atrasado' | 'cancelado'

export interface Receivable {
  id: string
  tenant_id: string
  job_id: string
  description: string
  installment_number: number
  amount: number
  due_date: string | null
  received_date: string | null
  status: ReceivableStatus
  invoice_number: string | null
  invoice_url: string | null
  payment_proof_url: string | null
  notes: string | null
  created_by: string
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface CreateReceivablePayload {
  job_id: string
  description: string
  installment_number: number
  amount: number
  due_date?: string | null
  status?: ReceivableStatus
  invoice_number?: string | null
  invoice_url?: string | null
  payment_proof_url?: string | null
  notes?: string | null
}

export interface UpdateReceivablePayload {
  description?: string
  installment_number?: number
  amount?: number
  due_date?: string | null
  received_date?: string | null
  status?: ReceivableStatus
  invoice_number?: string | null
  invoice_url?: string | null
  payment_proof_url?: string | null
  notes?: string | null
}

export interface ReceivablesSummary {
  total_previsto: number
  total_recebido: number
  total_pendente: number
  total_atrasado: number
  total_faturado: number
  total_cancelado: number
  parcelas_total: number
  parcelas_recebidas: number
  parcelas_pendentes: number
  parcelas_atrasadas: number
  proxima_parcela_data: string | null
  proxima_parcela_valor: number | null
  proxima_parcela_job_id: string | null
  proxima_parcela_descricao: string | null
}

export interface ReceivableFilters {
  job_id?: string
  status?: ReceivableStatus
  search?: string
  due_date_from?: string
  due_date_to?: string
  page?: number
  per_page?: number
  sort_by?: string
  sort_order?: 'asc' | 'desc'
}

export interface ReceivableListMeta {
  total: number
  page: number
  per_page: number
  total_pages: number
  by_status?: Record<string, number>
}

// ============ Status Labels e Cores ============

export const RECEIVABLE_STATUS_LABELS: Record<ReceivableStatus, string> = {
  pendente: 'Pendente',
  faturado: 'Faturado',
  recebido: 'Recebido',
  atrasado: 'Atrasado',
  cancelado: 'Cancelado',
}

export const RECEIVABLE_STATUS_COLORS: Record<ReceivableStatus, string> = {
  pendente: 'bg-amber-100 text-amber-700',
  faturado: 'bg-blue-100 text-blue-700',
  recebido: 'bg-green-100 text-green-700',
  atrasado: 'bg-red-100 text-red-700',
  cancelado: 'bg-zinc-100 text-zinc-600',
}
