// --- Enums ---

export type WeatherCondition = 'sol' | 'nublado' | 'chuva' | 'noturna' | 'indoor'
export type PhotoType = 'referencia' | 'bts' | 'continuidade' | 'problema'
export type DayStatus = 'no_cronograma' | 'adiantado' | 'atrasado'
export type SceneStatus = 'ok' | 'incompleta' | 'nao_gravada'

// --- JSONB sub-schemas ---

export interface SceneItem {
  scene_number: string
  description: string | null
  takes: number
  ok_take: number | null
  status: SceneStatus
}

export interface AttendanceItem {
  person_id: string | null
  person_name: string
  role: string
  present: boolean
  arrival_time: string | null
  notes: string | null
}

export interface EquipmentItem {
  name: string
  quantity: number | null
  notes: string | null
}

// --- Entidade principal ---

export interface DiaryPhoto {
  id: string
  url: string
  thumbnail_url: string | null
  caption: string | null
  photo_type: PhotoType
  taken_at: string | null
  created_at: string
}

export interface DiaryEntry {
  id: string
  job_id: string
  shooting_date: string
  day_number: number
  weather_condition: WeatherCondition
  call_time: string | null
  wrap_time: string | null
  planned_scenes: string | null
  filmed_scenes: string | null
  total_takes: number | null
  observations: string | null
  issues: string | null
  highlights: string | null
  // Campos Onda 2.3
  shooting_date_id: string | null
  location: string | null
  filming_start_time: string | null
  lunch_time: string | null
  scenes_list: SceneItem[]
  day_status: DayStatus | null
  executive_summary: string | null
  attendance_list: AttendanceItem[]
  equipment_list: EquipmentItem[]
  next_steps: string | null
  director_signature: string | null
  updated_by: string | null
  created_by: string | null
  created_at: string
  production_diary_photos: DiaryPhoto[]
}

// --- Form data ---

export interface DiaryEntryFormData {
  shooting_date: string
  shooting_date_id: string | null
  day_number: string
  weather_condition: WeatherCondition
  call_time: string
  wrap_time: string
  filming_start_time: string
  lunch_time: string
  location: string
  planned_scenes: string
  filmed_scenes: string
  total_takes: string
  observations: string
  issues: string
  highlights: string
  scenes_list: SceneItem[]
  day_status: DayStatus | null
  executive_summary: string
  attendance_list: AttendanceItem[]
  equipment_list: EquipmentItem[]
  next_steps: string
  director_signature: string
}
