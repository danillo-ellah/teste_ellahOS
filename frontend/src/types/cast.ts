// Tipos do modulo Elenco (job_cast)

export interface CastMember {
  id: string
  tenant_id: string
  job_id: string
  person_id: string | null
  name: string
  cast_category: string
  character_name: string | null
  cpf: string | null
  rg: string | null
  birth_date: string | null
  drt: string | null
  profession: string | null
  email: string | null
  phone: string | null
  address: string | null
  city: string | null
  state: string | null
  zip_code: string | null
  service_fee: number
  image_rights_fee: number
  agency_fee: number
  total_fee: number
  num_days: number
  scenes_description: string | null
  casting_agency: CastingAgency | null
  data_status: 'completo' | 'incompleto'
  contract_status: 'pendente' | 'enviado' | 'assinado' | 'cancelado'
  sort_order: number
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface CastingAgency {
  name: string | null
  cnpj: string | null
  address: string | null
  representative: string | null
  rep_rg: string | null
  rep_cpf: string | null
  email: string | null
  phone: string | null
}

export type CastDataStatus = CastMember['data_status']
export type CastContractStatus = CastMember['contract_status']
