// Tipos do Portal do Fornecedor (T1.5)

import type { Vendor, BankAccount } from './cost-management'

// Status computado do convite
export type InviteStatus = 'pending' | 'used' | 'expired'

export interface VendorInvite {
  id: string
  token: string
  email: string | null
  name: string | null
  expires_at: string
  used_at: string | null
  created_at: string
  vendor_id: string | null
  job_id: string | null
  portal_url: string
  computed_status: InviteStatus
  vendors?: Pick<Vendor, 'id' | 'full_name' | 'email'> | null
  jobs?: { id: string; title: string; code: string } | null
  profiles?: { id: string; full_name: string } | null
}

// Resposta do GET public/:token quando convite esta pendente
export interface VendorPortalData {
  status: 'pending' | 'used'
  used_at?: string
  message?: string
  invite?: {
    id: string
    token: string
    email: string | null
    name: string | null
    expires_at: string
    job: { id: string; title: string; code: string } | null
  }
  vendor?: (Vendor & { bank_accounts?: BankAccount[] }) | null
}

// Payload do formulario do fornecedor
export interface VendorPortalFormPayload {
  // Dados pessoais
  full_name: string
  entity_type?: 'pf' | 'pj'
  cpf?: string | null
  cnpj?: string | null
  razao_social?: string | null
  rg?: string | null
  birth_date?: string | null
  email?: string | null
  phone?: string | null
  // Endereco
  zip_code?: string | null
  address_street?: string | null
  address_number?: string | null
  address_complement?: string | null
  address_district?: string | null
  address_city?: string | null
  address_state?: string | null
  // Dados bancarios
  bank_account?: {
    bank_name?: string | null
    bank_code?: string | null
    agency?: string | null
    account_number?: string | null
    account_type?: 'corrente' | 'poupanca' | null
    pix_key?: string | null
    pix_key_type?: 'cpf' | 'cnpj' | 'email' | 'telefone' | 'aleatoria' | null
  } | null
}

// Payload para criar um convite (admin)
export interface CreateInvitePayload {
  vendor_id?: string | null
  job_id?: string | null
  email?: string | null
  name?: string | null
  expires_days?: number
}
