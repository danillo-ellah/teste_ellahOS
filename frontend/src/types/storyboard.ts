// Tipos do modulo Storyboard

export interface StoryboardScene {
  id: string
  tenant_id: string
  job_id: string
  scene_number: number
  title: string
  description: string | null
  shot_type: string | null
  location: string | null
  cast_notes: string | null
  camera_notes: string | null
  mood_references: string[]
  status: 'pendente' | 'em_preparo' | 'filmada' | 'aprovada'
  sort_order: number
  shooting_date_id: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export type SceneStatus = StoryboardScene['status']
