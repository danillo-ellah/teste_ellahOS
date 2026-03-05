// Tipos para o modulo Cronograma / Gantt Chart

export interface JobPhase {
  id: string
  tenant_id: string
  job_id: string
  phase_key: string
  phase_label: string
  phase_emoji: string
  phase_color: string
  start_date: string   // YYYY-MM-DD
  end_date: string     // YYYY-MM-DD
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
