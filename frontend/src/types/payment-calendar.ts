// Tipos do modulo Calendario de Pagamentos (G-03)
// Spec: docs/specs/calendario-pagamentos/02-tech-lead-arquitetura.md

/** Discriminador do tipo de evento no calendario */
export type CalendarEventType = 'cost_item' | 'job_payment' | 'invoice'

/** Evento de pagamento a fornecedor (cost_item) */
export interface PayableEvent {
  id: string
  /** Data de vencimento — formato YYYY-MM-DD */
  date: string
  type: 'cost_item'
  amount: number
  status: 'pendente' | 'pago' | 'cancelado'
  /** True se payment_due_date < hoje e status = 'pendente' */
  is_overdue: boolean
  description: string
  vendor_name: string | null
  job_id: string
  job_code: string
  job_title: string
  payment_method: string | null
  nf_status: string | null
}

/** Evento de receita do cliente (jobs.payment_date ou invoice.due_date) */
export interface ReceivableEvent {
  id: string
  /** Data de recebimento — formato YYYY-MM-DD */
  date: string
  type: 'job_payment' | 'invoice'
  amount: number
  status: string
  description: string
  client_name: string | null
  job_id: string
  job_code: string
  job_title: string
}

/** Payload da resposta de GET /payment-calendar/events */
export interface PaymentCalendarEvents {
  payables: PayableEvent[]
  receivables: ReceivableEvent[]
}

/** KPIs agregados do periodo — resposta de GET /payment-calendar/kpis */
export interface PaymentCalendarKpis {
  /** Soma de cost_items pendentes no range */
  total_payable: number
  /** Soma de jobs.closed_value + invoices no range */
  total_receivable: number
  /** total_receivable - total_payable */
  net_balance: number
  /** Quantidade de cost_items vencidos (due_date < hoje, status pendente) */
  overdue_count: number
  overdue_amount: number
  /** Vence nos proximos 7 dias */
  due_this_week: number
  /** Cost_items pagos no range */
  paid_in_period: number
}

/** Body do PATCH /payment-calendar/postpone */
export interface PostponePayload {
  /** IDs dos cost_items a prorrogar — maximo 50 */
  cost_item_ids: string[]
  /** Nova data de vencimento — formato YYYY-MM-DD, deve ser >= hoje */
  new_due_date: string
  /** Motivo obrigatorio — registrado no historico do item */
  reason: string
}

/** Resposta do PATCH /payment-calendar/postpone */
export interface PostponeResult {
  items_updated: number
  new_due_date: string
}
