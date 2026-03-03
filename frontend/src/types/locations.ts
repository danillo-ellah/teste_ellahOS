// Types do modulo Locacoes

export const PERMIT_STATUSES = [
  'nao_necessario',
  'solicitado',
  'aprovado',
  'reprovado',
  'em_analise',
] as const

export type PermitStatus = (typeof PERMIT_STATUSES)[number]

export const PERMIT_STATUS_LABELS: Record<PermitStatus, string> = {
  nao_necessario: 'Nao necessario',
  solicitado: 'Solicitado',
  aprovado: 'Aprovado',
  reprovado: 'Reprovado',
  em_analise: 'Em analise',
}

export interface LocationPhoto {
  id: string
  location_id: string
  url: string
  caption: string | null
  is_cover: boolean
  created_at: string
}

export interface Location {
  id: string
  name: string
  description: string | null
  // Endereco
  address_street: string | null
  address_number: string | null
  address_complement: string | null
  address_neighborhood: string | null
  address_city: string | null
  address_state: string | null
  address_zip: string | null
  address_country: string | null
  // Contato
  contact_name: string | null
  contact_phone: string | null
  contact_email: string | null
  // Financeiro
  daily_rate: number | null
  // Misc
  notes: string | null
  is_active: boolean
  // Auditoria
  created_at: string
  updated_at: string
  deleted_at: string | null
  // Relacionamentos
  location_photos?: LocationPhoto[]
  job_locations?: JobLocation[]
}

export interface JobLocation {
  id: string
  job_id: string
  location_id: string
  filming_dates: string[] | null
  notes: string | null
  daily_rate_override: number | null
  permit_status: PermitStatus | null
  permit_notes: string | null
  created_at: string
  updated_at: string
  // Relacionamentos expandidos
  locations?: Location
}

// Payload para criar locacao
export interface CreateLocationPayload {
  name: string
  description?: string | null
  address_street?: string | null
  address_number?: string | null
  address_complement?: string | null
  address_neighborhood?: string | null
  address_city?: string | null
  address_state?: string | null
  address_zip?: string | null
  address_country?: string | null
  contact_name?: string | null
  contact_phone?: string | null
  contact_email?: string | null
  daily_rate?: number | null
  notes?: string | null
}

// Payload para vincular locacao a job
export interface LinkJobLocationPayload {
  job_id: string
  location_id: string
  filming_dates?: string[] | null
  notes?: string | null
  daily_rate_override?: number | null
  permit_status?: PermitStatus | null
  permit_notes?: string | null
}

// Payload para atualizar vinculo
export interface UpdateJobLocationPayload {
  filming_dates?: string[] | null
  notes?: string | null
  daily_rate_override?: number | null
  permit_status?: PermitStatus | null
  permit_notes?: string | null
}
