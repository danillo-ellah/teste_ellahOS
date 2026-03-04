// Tipos do modulo Ordem do Dia (shooting_day_orders)

export interface CrewCall {
  department: string
  call_time: string // "HH:MM"
}

export interface FilmingBlock {
  start_time: string
  end_time: string
  scene_ids: string[]
  scenes_label: string // "Cenas 1, 3, 5"
  location: string
  cast_names: string
  notes: string
  adjustment_minutes: number
}

export interface CastScheduleEntry {
  cast_id: string | null
  name: string
  character: string
  call_time: string
  makeup_time: string
  on_set_time: string
  wrap_time: string
}

export type ODStatus = 'rascunho' | 'publicada' | 'compartilhada'
export type ODTemplate = 'classico' | 'moderno'

export interface ShootingDayOrder {
  id: string
  tenant_id: string
  job_id: string
  shooting_date_id: string | null
  title: string
  day_number: number | null
  general_location: string | null
  weather_summary: string | null
  weather_data: Record<string, unknown> | null
  first_call: string | null
  production_call: string | null
  filming_start: string | null
  breakfast_time: string | null
  lunch_time: string | null
  camera_wrap: string | null
  deproduction: string | null
  crew_calls: CrewCall[]
  filming_blocks: FilmingBlock[]
  cast_schedule: CastScheduleEntry[]
  important_info: string
  pdf_template: ODTemplate
  status: ODStatus
  pdf_url: string | null
  shared_at: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

// Auto-fill response from backend
export interface AutoFillResult {
  shooting_date: {
    date: string
    description: string | null
    location: string | null
  }
  weather: {
    summary: string
    data: Record<string, unknown> | null
  }
  suggested_crew_calls: CrewCall[]
  scenes: Array<{
    id: string
    scene_number: number
    title: string
    shot_type: string | null
    location: string | null
    cast_notes: string | null
    mood_references: string[]
  }>
  cast: Array<{
    cast_id: string
    name: string
    character: string | null
    phone: string | null
  }>
  locations: Array<{ name: string; address: string | null }>
  important_info: string
  tenant: {
    logo_url: string | null
    brand_color: string | null
    company_name: string | null
  }
}
