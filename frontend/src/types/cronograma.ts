// Tipos para o modulo Cronograma / Gantt Chart

export interface JobPhase {
  id: string
  tenant_id: string
  job_id: string
  phase_key: string
  phase_label: string
  phase_emoji: string
  phase_color: string
  start_date: string | null   // YYYY-MM-DD ou null (template sem datas)
  end_date: string | null     // YYYY-MM-DD ou null (template sem datas)
  complement: string | null
  skip_weekends: boolean
  status: PhaseStatus
  sort_order: number
  created_at: string
  updated_at: string
}

export type PhaseStatus = 'pending' | 'in_progress' | 'completed'

export interface PhaseExportData {
  job: {
    code: string
    title: string
    client_name: string
    client_logo_url?: string | null
    agency_name?: string | null
    agency_logo_url?: string | null
  }
  phases: JobPhase[]
  tenant: {
    company_name: string
    logo_url?: string | null
    brand_color?: string | null
  }
  generated_at: string
}

export interface BulkCreatePayload {
  job_id: string
  start_date?: string
}

export interface CreatePhasePayload {
  job_id: string
  phase_key: string
  phase_label: string
  phase_emoji: string
  phase_color: string
  start_date: string
  end_date: string
  complement?: string | null
  skip_weekends?: boolean
  status?: PhaseStatus
  sort_order?: number
}

export interface UpdatePhasePayload {
  phase_label?: string
  phase_emoji?: string
  phase_color?: string
  start_date?: string
  end_date?: string
  complement?: string | null
  skip_weekends?: boolean
  status?: PhaseStatus
  sort_order?: number
}

export interface ReorderPayload {
  job_id: string
  items: Array<{ id: string; sort_order: number }>
}

// Templates de fases comuns em producao audiovisual
export interface PhaseTemplate {
  phase_key: string
  phase_label: string
  phase_emoji: string
  phase_color: string
}

export const PHASE_TEMPLATES: PhaseTemplate[] = [
  { phase_key: 'orcamento', phase_label: 'Orcamento', phase_emoji: '\ud83d\udcb0', phase_color: '#F59E0B' },
  { phase_key: 'briefing', phase_label: 'Briefing', phase_emoji: '\ud83d\udccb', phase_color: '#8B5CF6' },
  { phase_key: 'pre_producao', phase_label: 'Pre-Producao', phase_emoji: '\ud83d\udcc5', phase_color: '#3B82F6' },
  { phase_key: 'ppm', phase_label: 'PPM', phase_emoji: '\ud83e\udd1d', phase_color: '#06B6D4' },
  { phase_key: 'filmagem', phase_label: 'Filmagem', phase_emoji: '\ud83c\udfa5', phase_color: '#EF4444' },
  { phase_key: 'pos_producao', phase_label: 'Pos-Producao', phase_emoji: '\ud83c\udfac', phase_color: '#A855F7' },
  { phase_key: 'color', phase_label: 'Color', phase_emoji: '\ud83c\udfa8', phase_color: '#F472B6' },
  { phase_key: 'entrega', phase_label: 'Entrega', phase_emoji: '\ud83d\udce6', phase_color: '#22C55E' },
  { phase_key: 'aprovacao_cliente', phase_label: 'Aprovacao do Cliente', phase_emoji: '\u2705', phase_color: '#10B981' },
  { phase_key: 'edicao', phase_label: 'Edicao', phase_emoji: '\u2702\ufe0f', phase_color: '#64748B' },
  { phase_key: 'casting', phase_label: 'Casting/Elenco', phase_emoji: '\ud83c\udfad', phase_color: '#F43F5E' },
  { phase_key: 'locacao', phase_label: 'Locacao', phase_emoji: '\ud83d\udccd', phase_color: '#14B8A6' },
  { phase_key: 'figurino', phase_label: 'Figurino', phase_emoji: '\ud83d\udc57', phase_color: '#EC4899' },
  { phase_key: 'sound_design', phase_label: 'Sound Design', phase_emoji: '\ud83c\udfa7', phase_color: '#6366F1' },
  { phase_key: 'vfx', phase_label: 'VFX', phase_emoji: '\u2728', phase_color: '#8B5CF6' },
  { phase_key: 'motion', phase_label: 'Motion Graphics', phase_emoji: '\ud83c\udf1f', phase_color: '#0EA5E9' },
]

// Paleta de cores padrao por fase
export const PHASE_COLOR_PALETTE = [
  { label: 'Amber', value: '#F59E0B' },
  { label: 'Violet', value: '#8B5CF6' },
  { label: 'Blue', value: '#3B82F6' },
  { label: 'Cyan', value: '#06B6D4' },
  { label: 'Red', value: '#EF4444' },
  { label: 'Purple', value: '#A855F7' },
  { label: 'Pink', value: '#F472B6' },
  { label: 'Teal', value: '#14B8A6' },
  { label: 'Green', value: '#22C55E' },
  { label: 'Emerald', value: '#10B981' },
  { label: 'Slate', value: '#64748B' },
  { label: 'Rose', value: '#F43F5E' },
]

// Status de fase — config visual
export const PHASE_STATUS_CONFIG: Record<
  PhaseStatus,
  { label: string; className: string; dotColor: string }
> = {
  pending: {
    label: 'Nao iniciado',
    className: 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-transparent',
    dotColor: '#64748B',
  },
  in_progress: {
    label: 'Em andamento',
    className: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-transparent',
    dotColor: '#3B82F6',
  },
  completed: {
    label: 'Concluido',
    className: 'bg-green-500/10 text-green-700 dark:text-green-400 border-transparent',
    dotColor: '#22C55E',
  },
}
