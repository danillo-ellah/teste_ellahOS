// Tipos para historico de alteracoes de itens de custo

export interface CostItemChange {
  field: string
  label: string
  old_value: unknown
  new_value: unknown
}

export interface CostItemHistoryEntry {
  id: number
  action: 'INSERT' | 'UPDATE' | 'DELETE'
  user_id: string | null
  user_name: string
  created_at: string
  item_label: string
  record_id: string
  changes: CostItemChange[]
}

export type CostItemHistoryAction = 'INSERT' | 'UPDATE' | 'DELETE'
