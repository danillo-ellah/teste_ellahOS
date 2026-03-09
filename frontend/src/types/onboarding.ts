// Tipos do modulo de onboarding

export interface OnboardingStatus {
  tenant: {
    id: string
    name: string | null
    cnpj: string | null
    logo_url: string | null
    onboarding_completed: boolean
    settings: {
      onboarding_step?: number
      address?: { city?: string; state?: string }
      integrations?: {
        drive_acknowledged?: boolean
        whatsapp_acknowledged?: boolean
      }
    }
  }
  profile: {
    full_name: string
    phone: string | null
    role: string
  }
}

export interface CompanyData {
  name: string
  cnpj?: string | null
  logo_url?: string | null
  city?: string | null
  state?: string | null
}

export interface ProfileData {
  full_name: string
  phone?: string | null
}

export interface IntegrationsData {
  drive_acknowledged?: boolean
  whatsapp_acknowledged?: boolean
}
