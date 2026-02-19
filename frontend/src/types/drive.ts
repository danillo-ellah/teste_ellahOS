// Tipos para integracao Google Drive

export interface DriveFolderRow {
  id: string
  job_id: string
  folder_key: string
  google_drive_id: string | null
  url: string | null
  parent_folder_id: string | null
  created_at: string
}

// Resposta da API drive-integration/:jobId/folders
export interface DriveFoldersResponse {
  data: DriveFolderRow[]
  meta: { total: number }
}

// Resposta de create-structure e recreate
export interface DriveStructureResponse {
  folders_created: number
  root_url: string | null
  warnings?: string[]
  recreated?: boolean
}
