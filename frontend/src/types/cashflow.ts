// Tipos do modulo Fluxo de Caixa Projetado
// Alinhados com a resposta de GET /financial-dashboard/cashflow

/** Granularidade do agrupamento de periodos */
export type CashflowGranularity = 'daily' | 'weekly' | 'monthly'

/** Detalhe de uma entrada ou saida dentro de um periodo */
export interface CashflowDetail {
  id: string
  job_id: string | null
  job_code: string | null
  description: string
  amount: number
  /** Data de vencimento — formato YYYY-MM-DD */
  due_date: string
  status: string
  installment_number?: number
}

/** Periodo agregado dentro da serie do fluxo de caixa */
export interface CashflowEntry {
  /** Inicio do periodo — formato YYYY-MM-DD */
  period_start: string
  /** Fim do periodo — formato YYYY-MM-DD */
  period_end: string
  /** Label formatado do periodo (ex: "01/03 - 07/03", "Mar/26") */
  period_label: string
  /** Soma das entradas no periodo */
  inflows: number
  /** Soma das saidas no periodo */
  outflows: number
  /** inflows - outflows */
  net: number
  /** Saldo acumulado desde o inicio da serie */
  cumulative_balance: number
  /** Detalhes das entradas (receivables) */
  inflow_details: CashflowDetail[]
  /** Detalhes das saidas (cost_items) */
  outflow_details: CashflowDetail[]
}

/** KPIs agregados do periodo de projecao */
export interface CashflowKpis {
  total_inflows: number
  total_outflows: number
  net_cashflow: number
  /** Menor saldo acumulado ao longo da serie */
  min_balance: number
  /** Data em que ocorre o menor saldo — null se nao houver periodos */
  min_balance_date: string | null
  /** True quando min_balance < 0 */
  is_danger: boolean
  /** Dias ate o primeiro saldo negativo — null se nao houver risco */
  days_until_danger: number | null
  /** Soma de receivables com due_date < hoje e status pendente */
  overdue_receivables: number
  /** Soma de cost_items com payment_due_date < hoje e status pendente */
  overdue_payables: number
}

/** Resposta completa de GET /financial-dashboard/cashflow */
export interface CashflowProjection {
  /** Saldo inicial antes do primeiro periodo */
  opening_balance: number
  /** Serie de periodos agrupados pela granularidade escolhida */
  series: CashflowEntry[]
  kpis: CashflowKpis
}
