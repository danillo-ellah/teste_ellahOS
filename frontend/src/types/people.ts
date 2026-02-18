// Types do modulo People (equipe interna + freelancers)
// Queries diretas via Supabase client (sem Edge Function)

import type { TeamRole } from '@/types/jobs'

// --- Interfaces ---

export interface BankInfo {
  bank_name?: string
  agency?: string
  account?: string
  account_type?: 'corrente' | 'poupanca'
  pix_key?: string
  pix_type?: 'cpf' | 'email' | 'telefone' | 'chave_aleatoria'
}

export interface Person {
  id: string
  tenant_id: string
  profile_id: string | null
  full_name: string
  cpf: string | null
  rg: string | null
  birth_date: string | null
  drt: string | null
  ctps_number: string | null
  ctps_series: string | null
  email: string | null
  phone: string | null
  address: string | null
  city: string | null
  state: string | null
  cep: string | null
  profession: string | null
  default_role: TeamRole | null
  default_rate: number | null
  is_internal: boolean
  is_active: boolean
  bank_info: BankInfo | null
  notes: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

// --- Payloads ---

export interface CreatePersonPayload {
  full_name: string
  email?: string | null
  phone?: string | null
  cpf?: string | null
  profession?: string | null
  default_role?: TeamRole | null
  default_rate?: number | null
  is_internal?: boolean
}

export interface UpdatePersonPayload {
  full_name?: string
  cpf?: string | null
  rg?: string | null
  birth_date?: string | null
  drt?: string | null
  ctps_number?: string | null
  ctps_series?: string | null
  email?: string | null
  phone?: string | null
  address?: string | null
  city?: string | null
  state?: string | null
  cep?: string | null
  profession?: string | null
  default_role?: TeamRole | null
  default_rate?: number | null
  is_internal?: boolean
  is_active?: boolean
  bank_info?: BankInfo | null
  notes?: string | null
}

// --- Filtros ---

export interface PersonFilters {
  search?: string
  is_internal?: boolean
  default_role?: TeamRole
  is_active?: boolean
  sort_by?: string
  sort_order?: 'asc' | 'desc'
  page?: number
  per_page?: number
}
