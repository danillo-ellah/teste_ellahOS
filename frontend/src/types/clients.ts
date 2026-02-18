// Types do modulo Clients/Agencies/Contacts
// Queries diretas via Supabase client (sem Edge Function)

// --- Enums ---

export const CLIENT_SEGMENTS = [
  'automotivo',
  'varejo',
  'fintech',
  'alimentos_bebidas',
  'moda',
  'tecnologia',
  'saude',
  'educacao',
  'governo',
  'outro',
] as const

export type ClientSegment = (typeof CLIENT_SEGMENTS)[number]

// --- Interfaces ---

export interface Client {
  id: string
  tenant_id: string
  name: string
  trading_name: string | null
  cnpj: string | null
  segment: ClientSegment | null
  address: string | null
  city: string | null
  state: string | null
  cep: string | null
  website: string | null
  notes: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface Agency {
  id: string
  tenant_id: string
  name: string
  trading_name: string | null
  cnpj: string | null
  address: string | null
  city: string | null
  state: string | null
  cep: string | null
  website: string | null
  notes: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface Contact {
  id: string
  tenant_id: string
  client_id: string | null
  agency_id: string | null
  name: string
  email: string | null
  phone: string | null
  role: string | null
  is_primary: boolean
  created_at: string
  updated_at: string
  deleted_at: string | null
}

// --- Payloads ---

export interface CreateClientPayload {
  name: string
  trading_name?: string | null
  cnpj?: string | null
  segment?: ClientSegment | null
  address?: string | null
  city?: string | null
  state?: string | null
  cep?: string | null
  website?: string | null
  notes?: string | null
}

export interface UpdateClientPayload {
  name?: string
  trading_name?: string | null
  cnpj?: string | null
  segment?: ClientSegment | null
  address?: string | null
  city?: string | null
  state?: string | null
  cep?: string | null
  website?: string | null
  notes?: string | null
  is_active?: boolean
}

export interface CreateAgencyPayload {
  name: string
  trading_name?: string | null
  cnpj?: string | null
  address?: string | null
  city?: string | null
  state?: string | null
  cep?: string | null
  website?: string | null
  notes?: string | null
}

export interface UpdateAgencyPayload {
  name?: string
  trading_name?: string | null
  cnpj?: string | null
  address?: string | null
  city?: string | null
  state?: string | null
  cep?: string | null
  website?: string | null
  notes?: string | null
  is_active?: boolean
}

export interface CreateContactPayload {
  client_id?: string | null
  agency_id?: string | null
  name: string
  email?: string | null
  phone?: string | null
  role?: string | null
  is_primary?: boolean
}

export interface UpdateContactPayload {
  name?: string
  email?: string | null
  phone?: string | null
  role?: string | null
  is_primary?: boolean
}

// --- Filtros ---

export interface ClientFilters {
  search?: string
  segment?: ClientSegment
  is_active?: boolean
  sort_by?: string
  sort_order?: 'asc' | 'desc'
  page?: number
  per_page?: number
}

export type AgencyFilters = Omit<ClientFilters, 'segment'>
