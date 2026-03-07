// Tipos para Pre-Producao (Onda 2.2)

export interface ChecklistItem {
  id: string
  label: string
  checked: boolean
  position: number
  is_extra: boolean
}

export interface PpmDecision {
  id: string
  date: string
  description: string
  responsible: string | null
  created_by_name: string
  created_at: string
}

export interface TemplateItem {
  id: string
  label: string
  position: number
}

export interface ChecklistTemplate {
  id: string
  tenant_id: string
  project_type: string | null
  name: string
  items: TemplateItem[]
  is_active: boolean
  created_by: string
  created_at: string
  updated_at: string
}

export type PpmStatus = 'rascunho' | 'agendado' | 'realizado' | 'cancelado'

// Formato novo do custom_fields.ppm
export interface PpmDataV2 {
  status: PpmStatus
  document_url: string | null
  date: string | null
  location: string | null
  participants: string[]
  notes: string | null
  checklist?: Record<string, boolean>
  checklist_items?: ChecklistItem[]
  pre_production_complete?: boolean
  decisions?: PpmDecision[]
  suggestion_dismissed?: boolean
}

// Payloads para mutations de templates
export interface CreateTemplatePayload {
  project_type: string | null
  name: string
  items: Array<{ label: string; position: number }>
}

export interface UpdateTemplatePayload {
  name?: string
  items?: TemplateItem[]
}

// Labels do formato legado para conversao
export const LEGACY_CHECKLIST_LABELS: Record<string, string> = {
  roteiro: 'Roteiro/storyboard aprovado',
  locacoes: 'Locacoes confirmadas',
  equipe: 'Equipe tecnica confirmada',
  elenco: 'Elenco confirmado',
  cronograma: 'Cronograma de filmagem definido',
  orcamento: 'Orcamento aprovado',
}

// Fallback: 6 itens originais quando nenhum template existe
export const DEFAULT_CHECKLIST_ITEMS: ChecklistItem[] = Object.entries(
  LEGACY_CHECKLIST_LABELS,
).map(([key, label], idx) => ({
  id: key,
  label,
  checked: false,
  position: idx + 1,
  is_extra: false,
}))
