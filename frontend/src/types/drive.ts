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

// Permissoes de membros no Drive — modelo rico (match backend list-permissions)

export interface DrivePermissionDetail {
  id: string
  folder_key: string
  drive_role: 'writer' | 'reader'
  drive_permission_id: string | null
  granted_at: string
  revoked_at: string | null
  error_message: string | null
}

export interface DrivePermissionMember {
  job_team_id: string
  person_id: string
  person_name: string
  email: string
  role: string
  permissions: DrivePermissionDetail[]
}

export interface DrivePermissionsResponse {
  members: DrivePermissionMember[]
  meta: {
    total_members: number
    total_active_permissions: number
    active_only: boolean
  }
}
