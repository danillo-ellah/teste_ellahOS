'use client'

import { useState, useEffect, useRef, use } from 'react'
import {
  AlertTriangle,
  Loader2,
  ChevronDown,
  ChevronUp,
  Users,
  ChevronsUpDown,
  Check,
  ArrowLeft,
  ArrowRight,
  Pencil,
  Landmark,
  MapPin,
  ClipboardList,
  Clapperboard,
  Sparkles,
  ShieldCheck,
  Mail,
  BadgeCheck,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const EF_BASE = `${SUPABASE_URL}/functions/v1/crew-registration/public`

// Lista de funcoes — DEVE estar sincronizada com backend (handlers/job-roles.ts)
const JOB_ROLES = [
  'Diretor de Cena',
  'Roteirista',
  'Atendimento',
  'Produtor(a) de Locação',
  'Diretor de Produção',
  'Coordenador de Produção',
  'Produtor',
  'Assistente de Produção I',
  'Assistente de Produção II',
  'Assistente de Produção III',
  'Assistente de Produção IV',
  'Produtor de Casting',
  'Produtor de Locação',
  'Diretor de Arte',
  'Assistente de Arte',
  'Ajudante de Arte I',
  'Ajudante de Arte II',
  'Pesquisa e Layouts',
  'Produtor de Objetos',
  'Assistente de Objetos',
  'Contra Regra',
  'Assistente de Contra Regra',
  'Retirada de Arte',
  'Devolução de Arte',
  'Efeitista',
  'Produtor de Figurino',
  'Assistente de Figurino I',
  'Assistente de Figurino II',
  'Camareira',
  'Maquiador(a)',
  'Assistente de Maquiagem',
  'Cabelereiro(a)',
  'Make/Hair',
  'Assistente de Make',
  'Assistente de Direção I',
  'Assistente de Direção II',
  'Logger / Script Supervisor',
  'Diretor de Fotografia',
  'Operador de Câmera',
  'Assistente de Câmera I',
  'Assistente de Câmera II',
  'DIT',
  'Video Assist',
  'Making Of',
  'Chefe de Elétrica (Gaffer)',
  'Assistente de Elétrica I',
  'Assistente de Elétrica II',
  'Chefe de Maquinária',
  'Assistente de Maquinária I',
  'Assistente de Maquinária II',
  'Operador de Ronin / Steadicam',
  'Operador de Drone',
  'Técnico de Som Direto',
  'Microfonista',
  'Assistente de Som',
  'Motorista',
  'Fotógrafo Still',
  'Assistente de Fotógrafo',
  'Coordenador de Pós',
  'Editor de Vídeo',
  'Finalizador / VFX',
  'Motion Designer',
  'Colorista',
  'Designer Gráfico',
  'Técnico de Áudio',
  'Responsável por Condecine',
  'Advogado',
  'Geradorista',
  'Outros',
] as const

type JobRole = (typeof JOB_ROLES)[number]

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

interface JobInfo {
  job_title: string
  job_code: string
  tenant_name: string
}

interface LookupResult {
  is_veteran: boolean
  full_name?: string
  vendor_id?: string
  already_registered?: boolean
  // Dados pre-existentes do vendor para pre-preenchimento
  cpf?: string
  cnpj?: string
  rg?: string
  birth_date?: string
  phone?: string
  entity_type?: 'pf' | 'pj'
  zip_code?: string
  address_street?: string
  address_number?: string
  address_complement?: string
  address_district?: string
  address_city?: string
  address_state?: string
  bank_name?: string
  bank_code?: string
  agency?: string
  account_number?: string
  account_type?: string
  pix_key?: string
  pix_key_type?: string
  drt?: string
  ctps?: string
}

interface SubmitResult {
  id: string
  full_name: string
  job_role: string
  num_days: number
  daily_rate: number
  total: number
  is_veteran: boolean
}

type Step = 'email' | 'form' | 'done'

// ---------------------------------------------------------------------------
// Helpers de API publicos (sem JWT)
// ---------------------------------------------------------------------------

async function publicGet<T>(path: string): Promise<T> {
  const res = await fetch(`${EF_BASE}/${path}`, {
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_ANON_KEY,
    },
  })
  const json = await res.json()
  if (!res.ok || json?.error) {
    const err = json?.error || {}
    throw new Error(err.message || 'Erro ao carregar dados')
  }
  return json.data as T
}

// Erro estruturado da API com detalhes de campo
class ApiValidationError extends Error {
  issues: Array<{ field: string; message: string }>
  constructor(message: string, issues: Array<{ field: string; message: string }>) {
    super(message)
    this.issues = issues
  }
}

async function publicPost<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${EF_BASE}/${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify(body),
  })
  const json = await res.json()
  if (!res.ok || json?.error) {
    const err = json?.error || {}
    const issues = err.details?.issues as Array<{ field: string; message: string }> | undefined
    if (issues?.length) {
      throw new ApiValidationError(err.message || 'Erro de validacao', issues)
    }
    throw new Error(err.message || 'Erro ao processar solicitacao')
  }
  return json.data as T
}

// ---------------------------------------------------------------------------
// Helpers de formatacao / mascaras
// ---------------------------------------------------------------------------

function maskCep(v: string) {
  return v.replace(/\D/g, '').replace(/^(\d{5})(\d)/, '$1-$2').slice(0, 9)
}

function maskCpf(v: string) {
  return v
    .replace(/\D/g, '')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
    .slice(0, 14)
}

function maskCnpj(v: string) {
  return v
    .replace(/\D/g, '')
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2')
    .slice(0, 18)
}

// Formata digitos puros para exibicao de telefone
function formatPhone(digits: string): string {
  const d = digits.slice(0, 11)
  if (d.length === 0) return ''
  if (d.length <= 2) return `(${d}`
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

// Extrai apenas digitos de qualquer entrada
function phoneDigits(v: string): string {
  return v.replace(/\D/g, '').slice(0, 11)
}

function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

async function fetchCep(cep: string): Promise<{
  logradouro: string
  bairro: string
  localidade: string
  uf: string
} | null> {
  const clean = cep.replace(/\D/g, '')
  if (clean.length !== 8) return null

  // Tenta BrasilAPI primeiro (mais rapida), fallback para ViaCEP
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 4000)
    const res = await fetch(`https://brasilapi.com.br/api/cep/v2/${clean}`, {
      signal: controller.signal,
    })
    clearTimeout(timeout)
    if (res.ok) {
      const data = await res.json()
      return {
        logradouro: data.street || '',
        bairro: data.neighborhood || '',
        localidade: data.city || '',
        uf: data.state || '',
      }
    }
  } catch {
    // Fallback para ViaCEP
  }

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 4000)
    const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`, {
      signal: controller.signal,
    })
    clearTimeout(timeout)
    const data = await res.json()
    if (data.erro) return null
    return data
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Estado do formulario
// ---------------------------------------------------------------------------

interface FormState {
  // Participacao no job
  job_role: JobRole | ''
  job_role_custom: string // texto livre quando "Outros" selecionado
  num_days: string
  daily_rate: string
  // Dados pessoais
  full_name: string
  entity_type: 'pf' | 'pj'
  cpf: string
  cnpj: string
  rg: string
  birth_date: string
  drt: string
  ctps: string
  email: string
  phone: string
  // Endereco
  zip_code: string
  address_street: string
  address_number: string
  address_complement: string
  address_district: string
  address_city: string
  address_state: string
  // Dados bancarios
  bank_name: string
  bank_code: string
  agency: string
  account_number: string
  account_type: string
  pix_key_type: string
  pix_key: string
}

function emptyForm(email = ''): FormState {
  return {
    job_role: '',
    job_role_custom: '',
    num_days: '',
    daily_rate: '',
    full_name: '',
    entity_type: 'pf',
    cpf: '',
    cnpj: '',
    rg: '',
    birth_date: '',
    drt: '',
    ctps: '',
    email,
    phone: '',
    zip_code: '',
    address_street: '',
    address_number: '',
    address_complement: '',
    address_district: '',
    address_city: '',
    address_state: '',
    bank_name: '',
    bank_code: '',
    agency: '',
    account_number: '',
    account_type: '',
    pix_key_type: '',
    pix_key: '',
  }
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

export default function CrewRegistrationPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = use(params)

  // Estado da pagina
  const [step, setStep] = useState<Step>('email')
  const [jobInfo, setJobInfo] = useState<JobInfo | null>(null)
  const [jobLoading, setJobLoading] = useState(true)
  const [jobError, setJobError] = useState<string | null>(null)

  // Step 1 — email
  const [email, setEmail] = useState('')
  const [lookupLoading, setLookupLoading] = useState(false)
  const [lookupError, setLookupError] = useState<string | null>(null)
  const [alreadyRegistered, setAlreadyRegistered] = useState(false)

  // Step 2 — formulario
  const [isVeteran, setIsVeteran] = useState(false)
  const [vendorName, setVendorName] = useState('')
  const [form, setForm] = useState<FormState>(emptyForm())
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [showVeteranEdit, setShowVeteranEdit] = useState(false)
  const [showBank, setShowBank] = useState(false)
  const [cepLoading, setCepLoading] = useState(false)

  // Sub-steps do formulario
  const [formStep, setFormStep] = useState(1)
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('left')
  const [animating, setAnimating] = useState(false)

  // Step 3 — confirmacao
  const [result, setResult] = useState<SubmitResult | null>(null)

  // Carrega info do job ao montar
  useEffect(() => {
    let cancelled = false
    setJobLoading(true)
    publicGet<JobInfo>(`${token}`)
      .then((data) => {
        if (!cancelled) {
          setJobInfo(data)
          setJobLoading(false)
        }
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setJobError(err.message)
          setJobLoading(false)
        }
      })
    return () => { cancelled = true }
  }, [token])

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  function setField<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev }
        delete next[field]
        return next
      })
    }
  }

  const [cepError, setCepError] = useState<string | null>(null)
  const cepAbortRef = useRef<AbortController | null>(null)

  // Busca CEP automaticamente quando o usuario digita 8 digitos
  function handleCepChange(rawValue: string) {
    const masked = maskCep(rawValue)
    setField('zip_code', masked)
    setCepError(null)

    const digits = masked.replace(/\D/g, '')
    if (digits.length === 8) {
      // Cancela request anterior se existir
      cepAbortRef.current?.abort()
      setCepLoading(true)
      fetchCep(digits).then((data) => {
        setCepLoading(false)
        if (data) {
          setCepError(null)
          setForm((prev) => ({
            ...prev,
            address_street: data.logradouro || prev.address_street,
            address_district: data.bairro || prev.address_district,
            address_city: data.localidade || prev.address_city,
            address_state: data.uf || prev.address_state,
          }))
        } else {
          setCepError('CEP nao encontrado. Preencha o endereco manualmente.')
        }
      })
    }
  }

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLookupError(null)

    const trimmed = email.trim().toLowerCase()
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setLookupError('Informe um e-mail valido')
      return
    }

    setLookupLoading(true)
    try {
      const data = await publicPost<LookupResult>(`${token}/lookup`, { email: trimmed })

      if (data.already_registered) {
        setAlreadyRegistered(true)
        return
      }

      // Montar estado base do formulario
      const base = emptyForm(trimmed)

      if (data.is_veteran) {
        setIsVeteran(true)
        setVendorName(data.full_name || '')
        // Pre-preencher campos do vendor
        setForm({
          ...base,
          full_name: data.full_name || '',
          entity_type: data.entity_type || 'pf',
          cpf: data.cpf ? maskCpf(data.cpf) : '',
          cnpj: data.cnpj ? maskCnpj(data.cnpj) : '',
          rg: data.rg || '',
          birth_date: data.birth_date || '',
          drt: data.drt || '',
          ctps: data.ctps || '',
          phone: data.phone ? phoneDigits(data.phone) : '',
          zip_code: data.zip_code ? maskCep(data.zip_code) : '',
          address_street: data.address_street || '',
          address_number: data.address_number || '',
          address_complement: data.address_complement || '',
          address_district: data.address_district || '',
          address_city: data.address_city || '',
          address_state: data.address_state || '',
          bank_name: data.bank_name || '',
          bank_code: data.bank_code || '',
          agency: data.agency || '',
          account_number: data.account_number || '',
          account_type: data.account_type || '',
          pix_key_type: data.pix_key_type || '',
          pix_key: data.pix_key || '',
        })

        // Abrir secao bancaria se ja tem dados
        if (data.bank_name || data.pix_key || data.account_number) {
          setShowBank(true)
        }
      } else {
        setIsVeteran(false)
        setForm(base)
      }

      setStep('form')
    } catch (err: unknown) {
      setLookupError(err instanceof Error ? err.message : 'Erro ao verificar e-mail')
    } finally {
      setLookupLoading(false)
    }
  }

  // Numero total de sub-steps dependendo do tipo de usuario
  const totalFormSteps = isVeteran ? 2 : 4

  // Navega para o proximo sub-step com animacao e validacao
  function goToNextFormStep() {
    if (!validateStep(formStep)) return
    setSlideDirection('left')
    setAnimating(true)
    setTimeout(() => {
      setFormStep((s) => s + 1)
      setAnimating(false)
    }, 50)
  }

  // Navega para o sub-step anterior com animacao
  function goToPrevFormStep() {
    setSlideDirection('right')
    setAnimating(true)
    setTimeout(() => {
      setFormStep((s) => s - 1)
      setAnimating(false)
    }, 50)
  }

  // Vai direto para um sub-step especifico (usado na revisao para editar)
  function goToFormStep(target: number) {
    setSlideDirection(target < formStep ? 'right' : 'left')
    setAnimating(true)
    setTimeout(() => {
      setFormStep(target)
      setAnimating(false)
    }, 50)
  }

  // Valida apenas os campos do sub-step atual
  function validateStep(step: number): boolean {
    const errors: Record<string, string> = {}

    if (step === 1) {
      // Participacao
      if (!form.job_role) errors.job_role = 'Selecione a funcao'
      if (form.job_role === 'Outros' && !form.job_role_custom.trim()) {
        errors.job_role_custom = 'Descreva a funcao'
      }
      const days = Number(form.num_days)
      if (!form.num_days || isNaN(days) || days < 1) {
        errors.num_days = 'Informe o numero de diarias (minimo 1)'
      }
      const rate = parseFloat(form.daily_rate.replace(/\./g, '').replace(',', '.'))
      if (!form.daily_rate || isNaN(rate) || rate <= 0) {
        errors.daily_rate = 'Informe o cache por diaria'
      }
    }

    if (step === 2 && !isVeteran) {
      // Dados pessoais (apenas para novos freelancers)
      if (!form.full_name.trim()) errors.full_name = 'Nome e obrigatorio'
      if (form.entity_type === 'pf') {
        const cpfDigits = form.cpf.replace(/\D/g, '')
        if (cpfDigits && cpfDigits.length !== 11) {
          errors.cpf = 'CPF deve ter 11 digitos'
        }
      } else {
        const cnpjDigits = form.cnpj.replace(/\D/g, '')
        if (cnpjDigits && cnpjDigits.length !== 14) {
          errors.cnpj = 'CNPJ deve ter 14 digitos'
        }
      }
      if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
        errors.email = 'E-mail invalido'
      }
    }

    if (step === 3 && !isVeteran) {
      // Endereco & Banco — PIX obrigatorio para novos
      if (!form.pix_key_type) errors.pix_key_type = 'Selecione o tipo de chave PIX'
      if (!form.pix_key.trim()) errors.pix_key = 'Informe a chave PIX'
    }

    setFieldErrors((prev) => ({ ...prev, ...errors }))

    if (Object.keys(errors).length > 0) {
      const firstErrorField = Object.keys(errors)[0]
      setTimeout(() => {
        const el = document.querySelector(`[data-field="${firstErrorField}"]`)
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 50)
      return false
    }

    return true
  }

  function validate(): boolean {
    const errors: Record<string, string> = {}

    if (!form.job_role) errors.job_role = 'Selecione a funcao'
    if (form.job_role === 'Outros' && !form.job_role_custom.trim()) {
      errors.job_role_custom = 'Descreva a funcao'
    }

    const days = Number(form.num_days)
    if (!form.num_days || isNaN(days) || days < 1) {
      errors.num_days = 'Informe o numero de diarias (minimo 1)'
    }

    const rate = Number(form.daily_rate.replace(/\./g, '').replace(',', '.'))
    if (!form.daily_rate || isNaN(rate) || rate <= 0) {
      errors.daily_rate = 'Informe o cache por diaria'
    }

    if (!isVeteran || showVeteranEdit) {
      if (!form.full_name.trim()) errors.full_name = 'Nome e obrigatorio'

      if (form.entity_type === 'pf') {
        const cpfDigits = form.cpf.replace(/\D/g, '')
        if (cpfDigits && cpfDigits.length !== 11) {
          errors.cpf = 'CPF deve ter 11 digitos'
        }
      } else {
        const cnpjDigits = form.cnpj.replace(/\D/g, '')
        if (cnpjDigits && cnpjDigits.length !== 14) {
          errors.cnpj = 'CNPJ deve ter 14 digitos'
        }
      }

      if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
        errors.email = 'E-mail invalido'
      }
    }

    // Dados bancarios obrigatorios para novo freelancer
    if (!isVeteran) {
      if (!form.pix_key_type) errors.pix_key_type = 'Selecione o tipo de chave PIX'
      if (!form.pix_key.trim()) errors.pix_key = 'Informe a chave PIX'
    }

    setFieldErrors(errors)

    // Scroll para o primeiro campo com erro
    if (Object.keys(errors).length > 0) {
      const firstErrorField = Object.keys(errors)[0]
      setTimeout(() => {
        const el = document.querySelector(`[data-field="${firstErrorField}"]`)
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 50)
    }

    return Object.keys(errors).length === 0
  }

  async function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitError(null)

    if (!validate()) return

    const days = Number(form.num_days)
    const rateRaw = form.daily_rate.replace(/\./g, '').replace(',', '.')
    const rate = parseFloat(rateRaw)

    const payload: Record<string, unknown> = {
      job_role: form.job_role,
      num_days: days,
      daily_rate: rate,
      email: email.trim().toLowerCase(),
      // Se "Outros", inclui a funcao customizada nas notas
      notes: form.job_role === 'Outros' && form.job_role_custom.trim()
        ? `Funcao sugerida: ${form.job_role_custom.trim()}`
        : null,
    }

    // Incluir dados pessoais/endereco/banco se novo ou se editou
    if (!isVeteran || showVeteranEdit) {
      Object.assign(payload, {
        full_name: form.full_name.trim(),
        entity_type: form.entity_type,
        cpf: form.cpf.replace(/\D/g, '') || null,
        cnpj: form.cnpj.replace(/\D/g, '') || null,
        rg: form.rg.trim() || null,
        birth_date: form.birth_date || null,
        drt: form.drt.trim() || null,
        ctps: form.ctps.trim() || null,
        phone: form.phone.replace(/\D/g, '') || null,
        zip_code: form.zip_code.replace(/\D/g, '') || null,
        address_street: form.address_street.trim() || null,
        address_number: form.address_number.trim() || null,
        address_complement: form.address_complement.trim() || null,
        address_district: form.address_district.trim() || null,
        address_city: form.address_city.trim() || null,
        address_state: form.address_state.trim() || null,
        bank_name: form.bank_name.trim() || null,
        bank_code: form.bank_code.trim() || null,
        agency: form.agency.trim() || null,
        account_number: form.account_number.trim() || null,
        account_type: form.account_type || null,
        pix_key_type: form.pix_key_type || null,
        pix_key: form.pix_key.trim() || null,
      })
    }

    setSubmitting(true)
    try {
      const data = await publicPost<SubmitResult>(`${token}/submit`, payload)
      setResult(data)
      setStep('done')
    } catch (err: unknown) {
      if (err instanceof ApiValidationError) {
        // Mapear erros do backend para campos do formulario
        const backendErrors: Record<string, string> = {}
        for (const issue of err.issues) {
          backendErrors[issue.field] = issue.message
        }
        setFieldErrors((prev) => ({ ...prev, ...backendErrors }))
        setSubmitError(err.message)
        // Scroll para primeiro campo com erro
        if (err.issues.length > 0) {
          setTimeout(() => {
            const el = document.querySelector(`[data-field="${err.issues[0].field}"]`)
            el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
          }, 50)
        }
      } else {
        setSubmitError(err instanceof Error ? err.message : 'Erro ao enviar formulario')
      }
    } finally {
      setSubmitting(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Render — loading / erro do job
  // ---------------------------------------------------------------------------

  if (jobLoading) {
    return (
      <CrewLayout>
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="relative">
            <div className="size-12 rounded-full border-2 border-rose-100 animate-pulse" />
            <Loader2 className="size-6 animate-spin text-rose-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>
          <p className="text-sm text-zinc-400 animate-pulse">Carregando formulario...</p>
        </div>
      </CrewLayout>
    )
  }

  if (jobError || !jobInfo) {
    return (
      <CrewLayout>
        <Card className="max-w-lg mx-auto w-full border-amber-200/60 shadow-lg shadow-amber-50">
          <CardContent className="flex flex-col items-center py-12 text-center">
            <div className="size-16 rounded-2xl bg-amber-50 flex items-center justify-center mb-4">
              <AlertTriangle className="size-8 text-amber-500" />
            </div>
            <h2 className="text-lg font-semibold text-zinc-800">Link invalido ou expirado</h2>
            <p className="text-sm text-zinc-500 mt-2 max-w-xs">
              Este link de cadastro nao existe ou ja expirou. Entre em contato com a producao
              para solicitar um novo link.
            </p>
          </CardContent>
        </Card>
      </CrewLayout>
    )
  }

  // ---------------------------------------------------------------------------
  // Render — Step 3: Confirmacao
  // ---------------------------------------------------------------------------

  if (step === 'done' && result) {
    const total = result.num_days * result.daily_rate
    return (
      <CrewLayout jobInfo={jobInfo} step={step}>
        <Card className="max-w-lg mx-auto w-full shadow-xl shadow-green-900/5 border-green-200/40 overflow-hidden bg-white/90 backdrop-blur-sm">
          {/* Celebration gradient bar */}
          <div className="h-1.5 bg-gradient-to-r from-green-400 via-emerald-500 to-teal-400" />

          <CardContent className="flex flex-col items-center py-10 px-6 sm:px-8 text-center gap-5">
            {/* Success icon with pulse animation */}
            <div className="relative animate-[scaleIn_0.5s_ease-out]">
              <div className="size-24 rounded-3xl bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center border border-green-200/40" style={{ animation: 'celebratePulse 2s infinite' }}>
                <BadgeCheck className="size-12 text-green-500" />
              </div>
              <div className="absolute -top-2 -right-2 size-8 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-green-500/30 animate-[scaleIn_0.3s_ease-out_0.3s_both]">
                <Check className="size-4 text-white" />
              </div>
            </div>

            <div className="animate-[fadeUp_0.5s_ease-out_0.2s_both]">
              <h2 className="text-2xl font-extrabold text-zinc-800">Tudo certo!</h2>
              <p className="text-zinc-500 mt-1.5">
                Obrigado, <span className="font-bold text-zinc-700">{result.full_name}</span>.
              </p>
            </div>

            <div className="w-full rounded-2xl bg-gradient-to-b from-zinc-50/80 to-white border border-zinc-200/40 divide-y divide-zinc-100 text-sm overflow-hidden shadow-sm animate-[fadeUp_0.5s_ease-out_0.3s_both]">
              <ConfirmRow label="Job" value={`${jobInfo.job_code} — ${jobInfo.job_title}`} />
              <ConfirmRow label="Funcao" value={result.job_role} />
              <ConfirmRow label="Diarias" value={String(result.num_days)} />
              <ConfirmRow label="Cache/diaria" value={formatBRL(result.daily_rate)} />
              <ConfirmRow label="Total estimado" value={formatBRL(total)} highlight />
            </div>

            <div className="flex items-center gap-2 text-xs text-zinc-400 animate-[fadeUp_0.5s_ease-out_0.4s_both]">
              <div className="size-2 rounded-full bg-green-400 animate-pulse" />
              A producao sera notificada automaticamente.
            </div>

            <div className="rounded-xl bg-zinc-50 border border-zinc-200/40 px-4 py-3 text-[10px] text-zinc-400 leading-relaxed max-w-sm animate-[fadeUp_0.5s_ease-out_0.5s_both]">
              <div className="flex items-start gap-2">
                <ShieldCheck className="size-3 mt-0.5 shrink-0 text-zinc-400" />
                <span>Os valores indicados sao estimativas sujeitas a aprovacao da producao e nao constituem vinculo contratual.</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </CrewLayout>
    )
  }

  // ---------------------------------------------------------------------------
  // Render — Step 1: Email
  // ---------------------------------------------------------------------------

  if (step === 'email') {
    return (
      <CrewLayout jobInfo={jobInfo} step={step}>
        <Card className="max-w-lg mx-auto w-full shadow-xl shadow-zinc-900/5 border-zinc-200/40 overflow-hidden card-hover bg-white/80 backdrop-blur-sm">
          {/* Accent bar */}
          <div className="h-1 bg-gradient-to-r from-rose-500 via-pink-500 to-violet-500" />

          <CardContent className="pt-8 pb-8 px-6 sm:px-8">
            {alreadyRegistered ? (
              <div className="flex flex-col items-center py-6 text-center gap-4 animate-[scaleIn_0.4s_ease-out]">
                <div className="size-20 rounded-2xl bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center border border-green-200/50">
                  <BadgeCheck className="size-10 text-green-500" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-zinc-800">Voce ja esta cadastrado!</h3>
                  <p className="text-sm text-zinc-500 max-w-xs mt-2">
                    Sua participacao neste job ja esta registrada. Caso precise de alteracoes,
                    entre em contato com a producao.
                  </p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleEmailSubmit} className="space-y-6">
                {/* Hero icon + title */}
                <div className="text-center space-y-3">
                  <div className="inline-flex size-14 rounded-2xl bg-gradient-to-br from-rose-50 to-pink-50 items-center justify-center border border-rose-100/80 mx-auto">
                    <Sparkles className="size-7 text-rose-500" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-zinc-800">Cadastro de Equipe</h2>
                    <p className="text-sm text-zinc-500 mt-1.5 max-w-xs mx-auto leading-relaxed">
                      Informe seu e-mail para comecar. Se voce ja tem cadastro, seus dados serao pre-preenchidos.
                    </p>
                  </div>
                </div>

                <div className="input-glow rounded-xl transition-all duration-200">
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value)
                      setLookupError(null)
                    }}
                    placeholder="voce@email.com"
                    autoComplete="email"
                    autoFocus
                    className="h-13 text-base rounded-xl border-zinc-200 focus:border-rose-300 focus:ring-rose-100 px-4"
                    disabled={lookupLoading}
                  />
                </div>

                {lookupError && (
                  <div className="rounded-xl bg-red-50 border border-red-200/60 px-4 py-3 text-sm text-red-700 flex items-start gap-2.5 animate-[scaleIn_0.2s_ease-out]">
                    <AlertTriangle className="size-4 mt-0.5 shrink-0 text-red-400" />
                    <span>{lookupError}</span>
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full h-13 text-base font-semibold rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 shadow-lg shadow-rose-500/20 hover:shadow-rose-500/30 transition-all duration-300 hover:scale-[1.01] active:scale-[0.99]"
                  disabled={lookupLoading}
                >
                  {lookupLoading ? (
                    <>
                      <Loader2 className="size-4 mr-2 animate-spin" />
                      Verificando...
                    </>
                  ) : (
                    <span className="flex items-center gap-2">
                      Continuar
                      <ArrowRight className="size-4" />
                    </span>
                  )}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </CrewLayout>
    )
  }

  // ---------------------------------------------------------------------------
  // Render — Step 2: Formulario wizard multi-step
  // ---------------------------------------------------------------------------

  const numDays = Number(form.num_days) || 0
  const dailyRateNum = parseFloat(form.daily_rate.replace(/\./g, '').replace(',', '.')) || 0
  const estimatedTotal = numDays * dailyRateNum

  // Determina a classe de animacao para o conteudo do sub-step
  const slideClass = animating
    ? ''
    : slideDirection === 'left'
      ? 'animate-slideInRight'
      : 'animate-slideInLeft'

  // Sub-steps para novos freelancers
  const newUserSteps = [
    { label: 'Participacao', icon: Clapperboard },
    { label: 'Dados', icon: Users },
    { label: 'Endereco & Banco', icon: Landmark },
    { label: 'Revisao', icon: ClipboardList },
  ]
  // Sub-steps para veteranos
  const veteranSteps = [
    { label: 'Participacao', icon: Clapperboard },
    { label: 'Revisao', icon: ClipboardList },
  ]
  const subSteps = isVeteran ? veteranSteps : newUserSteps

  // Secao de participacao — usada no step 1 de ambos os fluxos
  const participacaoSection = (
    <div className="space-y-4">
      <FormField label="Funcao no job" required error={fieldErrors.job_role}>
        <div data-field="job_role">
          <JobRoleCombobox
            value={form.job_role}
            onSelect={(v) => {
              setField('job_role', v as JobRole)
              if (v !== 'Outros') setField('job_role_custom', '')
            }}
            disabled={submitting}
          />
        </div>
      </FormField>

      {form.job_role === 'Outros' && (
        <FormField label="Descreva sua funcao" required error={fieldErrors.job_role_custom}>
          <div data-field="job_role_custom">
            <Input
              value={form.job_role_custom}
              onChange={(e) => setField('job_role_custom', e.target.value)}
              placeholder="Ex: Drone FPV, Piloto de grua..."
              className="h-11"
              maxLength={200}
              disabled={submitting}
            />
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Sua sugestao sera avaliada pela producao.
          </p>
        </FormField>
      )}

      <div className="grid grid-cols-2 gap-3">
        <FormField label="Numero de diarias" required error={fieldErrors.num_days}>
          <div data-field="num_days">
            <Input
              type="number"
              inputMode="numeric"
              value={form.num_days}
              onChange={(e) => setField('num_days', e.target.value)}
              placeholder="0"
              min={1}
              className="h-11"
              disabled={submitting}
            />
          </div>
        </FormField>

        <FormField label="Cache por diaria (R$)" required error={fieldErrors.daily_rate}>
          <div data-field="daily_rate">
            <Input
              type="text"
              inputMode="decimal"
              value={form.daily_rate}
              onChange={(e) => {
                const v = e.target.value.replace(/[^0-9.,]/g, '')
                setField('daily_rate', v)
              }}
              placeholder="0,00"
              className="h-11"
              disabled={submitting}
            />
          </div>
        </FormField>
      </div>

      {/* Preview do total + disclaimer */}
      {numDays > 0 && dailyRateNum > 0 && (
        <div className="rounded-xl border border-rose-200/50 overflow-hidden animate-[scaleIn_0.3s_ease-out]">
          <div className="bg-gradient-to-r from-rose-50 via-pink-50 to-rose-50 px-4 py-3 flex justify-between items-center">
            <div>
              <span className="text-xs font-medium text-rose-400 uppercase tracking-wider">Estimativa</span>
              <p className="text-[10px] text-rose-300 mt-0.5">{numDays} {numDays === 1 ? 'diaria' : 'diarias'} x {formatBRL(dailyRateNum)}</p>
            </div>
            <span className="font-extrabold text-xl text-rose-600 tracking-tight animate-[fadeUp_0.3s_ease-out]">{formatBRL(estimatedTotal)}</span>
          </div>
          <div className="bg-amber-50/80 px-4 py-2 flex items-start gap-2 border-t border-amber-200/40">
            <ShieldCheck className="size-3.5 text-amber-500 mt-0.5 shrink-0" />
            <p className="text-[10px] text-amber-700 leading-relaxed">
              <span className="font-semibold">Valor estimativo.</span> O valor final sera definido e aprovado pela producao. Este cadastro nao constitui contrato.
            </p>
          </div>
        </div>
      )}
    </div>
  )

  // Conteudo de cada sub-step
  function renderSubStepContent() {
    // Fluxo VETERANO
    if (isVeteran) {
      if (formStep === 1) return participacaoSection
      if (formStep === 2) {
        return (
          <ReviewStep
            form={form}
            isVeteran={isVeteran}
            vendorName={vendorName}
            estimatedTotal={estimatedTotal}
            numDays={numDays}
            dailyRateNum={dailyRateNum}
            onEditStep={goToFormStep}
            showVeteranEdit={showVeteranEdit}
            setShowVeteranEdit={setShowVeteranEdit}
            setField={setField}
            fieldErrors={fieldErrors}
            submitting={submitting}
            handleCepChange={handleCepChange}
            cepLoading={cepLoading}
            cepError={cepError}
            showBank={showBank}
            setShowBank={setShowBank}
          />
        )
      }
    }

    // Fluxo NOVO freelancer
    if (formStep === 1) return participacaoSection
    if (formStep === 2) {
      return (
        <PersonalDataSection
          form={form}
          setField={setField}
          fieldErrors={fieldErrors}
          submitting={submitting}
          showTitle={false}
        />
      )
    }
    if (formStep === 3) {
      return (
        <div className="space-y-6">
          <div>
            <p className="text-sm font-semibold text-zinc-700 mb-3 flex items-center gap-2">
              <MapPin className="size-4 text-rose-400" />
              Endereco
            </p>
            <AddressSection
              form={form}
              setField={setField}
              submitting={submitting}
              onCepChange={handleCepChange}
              cepLoading={cepLoading}
              cepError={cepError}
              showTitle={false}
            />
          </div>
          <div className="border-t pt-4">
            <p className="text-sm font-semibold text-zinc-700 mb-3 flex items-center gap-2">
              <Landmark className="size-4 text-rose-400" />
              Dados Bancarios
            </p>
            <BankSection
              form={form}
              setField={setField}
              fieldErrors={fieldErrors}
              submitting={submitting}
              showBank={showBank}
              setShowBank={setShowBank}
              alwaysOpen
            />
          </div>
        </div>
      )
    }
    if (formStep === 4) {
      return (
        <ReviewStep
          form={form}
          isVeteran={isVeteran}
          vendorName={vendorName}
          estimatedTotal={estimatedTotal}
          numDays={numDays}
          dailyRateNum={dailyRateNum}
          onEditStep={goToFormStep}
          showVeteranEdit={showVeteranEdit}
          setShowVeteranEdit={setShowVeteranEdit}
          setField={setField}
          fieldErrors={fieldErrors}
          submitting={submitting}
          handleCepChange={handleCepChange}
          cepLoading={cepLoading}
          cepError={cepError}
          showBank={showBank}
          setShowBank={setShowBank}
        />
      )
    }
    return null
  }

  const isLastFormStep = formStep === totalFormSteps

  return (
    <CrewLayout jobInfo={jobInfo} step={step}>
      <div className="max-w-lg mx-auto w-full pb-16">
        <form onSubmit={handleFormSubmit} className="space-y-4">

          {/* ---- Veterano: banner de boas-vindas ---- */}
          {isVeteran && (
            <div className="rounded-xl bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200/60 px-4 py-4 text-sm text-green-800 shadow-sm">
              <p className="font-bold text-base">Bem-vindo de volta, {vendorName}!</p>
              <p className="text-green-700 mt-1">
                Seus dados estao cadastrados. Preencha apenas os campos desta participacao.
              </p>
            </div>
          )}

          {/* ======== CARD do wizard ======== */}
          <Card className="shadow-lg shadow-zinc-900/5 border-zinc-200/40 overflow-hidden bg-white/80 backdrop-blur-sm">
            <div className="h-0.5 bg-gradient-to-r from-rose-500 via-pink-500 to-violet-500" />

            <CardHeader className="pb-3 pt-5">
              <div className="flex items-center gap-2 mb-3">
                <CardTitle className="text-base font-bold flex items-center gap-2 text-zinc-800">
                  {(() => {
                    const s = subSteps[formStep - 1]
                    const Icon = s.icon
                    return (
                      <>
                        <Icon className="size-4 text-rose-500" />
                        {s.label}
                      </>
                    )
                  })()}
                </CardTitle>
              </div>

              {/* Sub-step indicator */}
              <SubStepIndicator current={formStep} total={totalFormSteps} steps={subSteps} />
            </CardHeader>

            <CardContent className="overflow-hidden">
              {/* Conteudo animado do sub-step */}
              <div key={formStep} className={slideClass}>
                {renderSubStepContent()}
              </div>
            </CardContent>

            {/* Navegacao entre sub-steps */}
            <div className={cn(
              'flex gap-3 px-6 pb-6 pt-2',
              formStep === 1 ? 'justify-end' : 'justify-between',
            )}>
              {formStep > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  className="flex items-center gap-1.5 text-zinc-500 hover:text-zinc-700"
                  onClick={goToPrevFormStep}
                  disabled={submitting}
                >
                  <ArrowLeft className="size-4" />
                  Voltar
                </Button>
              )}

              {!isLastFormStep && (
                <Button
                  type="button"
                  className="flex items-center gap-1.5 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 shadow-md shadow-rose-500/20 transition-all duration-200 hover:scale-[1.01] active:scale-[0.99]"
                  onClick={goToNextFormStep}
                  disabled={submitting}
                >
                  Proximo
                  <ArrowRight className="size-4" />
                </Button>
              )}
            </div>
          </Card>

          {/* Erro global + aviso legal + botao de submit — apenas no ultimo step */}
          {isLastFormStep && (
            <>
              {submitError && (
                <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 flex items-start gap-2">
                  <AlertTriangle className="size-4 mt-0.5 shrink-0 text-red-500" />
                  <span>{submitError}</span>
                </div>
              )}

              {/* Aviso legal */}
              <div className="rounded-xl bg-gradient-to-r from-amber-50 to-orange-50/50 border border-amber-200/50 px-4 py-4 text-xs leading-relaxed shadow-sm">
                <div className="flex items-start gap-2.5">
                  <div className="size-7 rounded-lg bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
                    <ShieldCheck className="size-4 text-amber-600" />
                  </div>
                  <div>
                    <p className="font-bold text-amber-800 text-sm">Aviso importante</p>
                    <p className="text-amber-700 mt-1">
                      Os valores informados sao <span className="font-semibold">apenas estimativos</span> e nao representam
                      um contrato ou compromisso financeiro. O valor final sera definido e aprovado
                      pela producao. O preenchimento deste cadastro <span className="font-semibold">nao garante a contratacao</span>.
                    </p>
                  </div>
                </div>
              </div>

              {/* Botao de submit */}
              <Button
                type="submit"
                className="w-full h-13 text-base font-semibold rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 shadow-lg shadow-rose-500/20 hover:shadow-rose-500/30 transition-all duration-300 hover:scale-[1.01] active:scale-[0.99]"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="size-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : isVeteran ? (
                  <span className="flex items-center gap-2">
                    Confirmar participacao
                    <ArrowRight className="size-4" />
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    Salvar e confirmar
                    <ArrowRight className="size-4" />
                  </span>
                )}
              </Button>
            </>
          )}
        </form>
      </div>
    </CrewLayout>
  )
}

// ---------------------------------------------------------------------------
// Sub-step indicator dentro do wizard
// ---------------------------------------------------------------------------

function SubStepIndicator({
  current,
  total,
  steps,
}: {
  current: number
  total: number
  steps: Array<{ label: string; icon: React.ElementType }>
}) {
  return (
    <div className="flex items-center gap-0">
      {steps.map(({ label, icon: Icon }, i) => {
        const stepNum = i + 1
        const isDone = stepNum < current
        const isActive = stepNum === current
        return (
          <div key={label} className="flex items-center">
            {i > 0 && (
              <div className="w-6 sm:w-10 h-0.5 mx-1 rounded-full overflow-hidden bg-zinc-200">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-500 ease-out',
                    isDone ? 'w-full bg-gradient-to-r from-rose-400 to-pink-400' : 'w-0',
                  )}
                />
              </div>
            )}
            <div className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  'size-7 rounded-lg flex items-center justify-center transition-all duration-300',
                  isDone && 'bg-gradient-to-br from-rose-500 to-pink-500 text-white shadow-md shadow-rose-500/20',
                  isActive && 'bg-gradient-to-br from-rose-500 to-pink-500 text-white shadow-md shadow-rose-500/25 scale-110',
                  !isDone && !isActive && 'bg-zinc-100 text-zinc-400 border border-zinc-200',
                )}
              >
                {isDone ? (
                  <Check className="size-3.5" />
                ) : (
                  <Icon className="size-3.5" />
                )}
              </div>
              <span
                className={cn(
                  'text-[9px] font-semibold tracking-wide uppercase transition-colors duration-200 hidden sm:block',
                  isActive ? 'text-rose-600' : isDone ? 'text-rose-400' : 'text-zinc-400',
                )}
              >
                {label}
              </span>
            </div>
          </div>
        )
      })}
      <span className="ml-auto text-[10px] text-zinc-400 font-medium tabular-nums">
        {current}/{total}
      </span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step de Revisao — resumo antes de enviar
// ---------------------------------------------------------------------------

function ReviewStep({
  form,
  isVeteran,
  vendorName,
  estimatedTotal,
  numDays,
  dailyRateNum,
  onEditStep,
  showVeteranEdit,
  setShowVeteranEdit,
  setField,
  fieldErrors,
  submitting,
  handleCepChange,
  cepLoading,
  cepError,
  showBank,
  setShowBank,
}: {
  form: FormState
  isVeteran: boolean
  vendorName: string
  estimatedTotal: number
  numDays: number
  dailyRateNum: number
  onEditStep: (step: number) => void
  showVeteranEdit: boolean
  setShowVeteranEdit: (v: boolean) => void
  setField: <K extends keyof FormState>(field: K, value: FormState[K]) => void
  fieldErrors: Record<string, string>
  submitting: boolean
  handleCepChange: (value: string) => void
  cepLoading: boolean
  cepError: string | null
  showBank: boolean
  setShowBank: (v: boolean) => void
}) {
  const pixTypeLabel: Record<string, string> = {
    cpf: 'CPF',
    cnpj: 'CNPJ',
    email: 'E-mail',
    telefone: 'Telefone',
    aleatoria: 'Chave Aleatoria',
  }

  return (
    <div className="space-y-4">
      {/* Bloco: Participacao */}
      <ReviewBlock
        title="Participacao"
        icon={Clapperboard}
        onEdit={() => onEditStep(1)}
      >
        <ReviewRow label="Funcao" value={form.job_role === 'Outros' && form.job_role_custom ? form.job_role_custom : form.job_role} />
        <ReviewRow
          label="Diarias"
          value={`${numDays} x ${formatBRL(dailyRateNum)}`}
        />
        <ReviewRow
          label="Total estimado"
          value={formatBRL(estimatedTotal)}
          highlight
        />
      </ReviewBlock>

      {/* Bloco: Dados pessoais — apenas para novos freelancers */}
      {!isVeteran && (
        <ReviewBlock
          title="Dados Pessoais"
          icon={Users}
          onEdit={() => onEditStep(2)}
        >
          <ReviewRow label="Nome" value={form.full_name || '—'} />
          {form.entity_type === 'pf' ? (
            <ReviewRow label="CPF" value={form.cpf || '—'} />
          ) : (
            <ReviewRow label="CNPJ" value={form.cnpj || '—'} />
          )}
          <ReviewRow label="E-mail" value={form.email || '—'} />
          {form.phone && (
            <ReviewRow label="Telefone" value={`(${form.phone.slice(0, 2)}) ${form.phone.slice(2, 7)}-${form.phone.slice(7)}`} />
          )}
        </ReviewBlock>
      )}

      {/* Bloco: PIX — apenas para novos freelancers */}
      {!isVeteran && (
        <ReviewBlock
          title="PIX"
          icon={Landmark}
          onEdit={() => onEditStep(3)}
        >
          {form.pix_key_type && (
            <ReviewRow label="Tipo" value={pixTypeLabel[form.pix_key_type] || form.pix_key_type} />
          )}
          <ReviewRow label="Chave" value={form.pix_key || '—'} />
          {form.bank_name && <ReviewRow label="Banco" value={form.bank_name} />}
        </ReviewBlock>
      )}

      {/* Bloco: Veterano — link para conferir/atualizar dados */}
      {isVeteran && (
        <div className="border rounded-lg overflow-hidden">
          <button
            type="button"
            onClick={() => setShowVeteranEdit(!showVeteranEdit)}
            className="w-full flex items-center justify-between px-4 py-3 bg-zinc-50 hover:bg-zinc-100 transition-colors text-sm font-medium text-zinc-700"
            disabled={submitting}
          >
            <span>Conferir ou atualizar meus dados</span>
            {showVeteranEdit ? (
              <ChevronUp className="size-4 text-zinc-500" />
            ) : (
              <ChevronDown className="size-4 text-zinc-500" />
            )}
          </button>

          {showVeteranEdit && (
            <div className="p-4 space-y-6 border-t">
              <PersonalDataSection
                form={form}
                setField={setField}
                fieldErrors={fieldErrors}
                submitting={submitting}
                showTitle={false}
              />
              <AddressSection
                form={form}
                setField={setField}
                submitting={submitting}
                onCepChange={handleCepChange}
                cepLoading={cepLoading}
                cepError={cepError}
                showTitle={false}
              />
              <BankSection
                form={form}
                setField={setField}
                fieldErrors={fieldErrors}
                submitting={submitting}
                showBank={showBank}
                setShowBank={setShowBank}
                inline
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function ReviewBlock({
  title,
  icon: Icon,
  onEdit,
  children,
}: {
  title: string
  icon: React.ElementType
  onEdit: () => void
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-zinc-200/60 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-50/80 border-b border-zinc-100">
        <span className="text-xs font-semibold text-zinc-600 uppercase tracking-wide flex items-center gap-1.5">
          <Icon className="size-3.5 text-rose-400" />
          {title}
        </span>
        <button
          type="button"
          onClick={onEdit}
          className="flex items-center gap-1 text-[11px] text-rose-500 hover:text-rose-700 font-medium transition-colors"
        >
          <Pencil className="size-3" />
          Editar
        </button>
      </div>
      <div className="divide-y divide-zinc-100">
        {children}
      </div>
    </div>
  )
}

function ReviewRow({
  label,
  value,
  highlight,
}: {
  label: string
  value: string
  highlight?: boolean
}) {
  return (
    <div className={cn(
      'flex justify-between items-center px-4 py-2.5 text-sm',
      highlight && 'bg-rose-50/50',
    )}>
      <span className="text-zinc-500">{label}</span>
      <span className={cn(
        'font-medium text-zinc-800',
        highlight && 'font-bold text-rose-600',
      )}>
        {value}
      </span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Secao: Dados Pessoais
// ---------------------------------------------------------------------------

function PersonalDataSection({
  form,
  setField,
  fieldErrors,
  submitting,
  showTitle,
}: {
  form: FormState
  setField: <K extends keyof FormState>(field: K, value: FormState[K]) => void
  fieldErrors: Record<string, string>
  submitting: boolean
  showTitle: boolean
}) {
  return (
    <div className="space-y-4">
      {showTitle && (
        <h3 className="text-sm font-semibold text-zinc-700 border-b pb-1">Dados Pessoais</h3>
      )}

      <FormField label="Tipo" required>
        <Select
          value={form.entity_type}
          onValueChange={(v) => setField('entity_type', v as 'pf' | 'pj')}
          disabled={submitting}
        >
          <SelectTrigger className="h-11">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pf">Pessoa Fisica (PF)</SelectItem>
            <SelectItem value="pj">Pessoa Juridica (PJ)</SelectItem>
          </SelectContent>
        </Select>
      </FormField>

      <FormField label="Nome Completo" required error={fieldErrors.full_name}>
        <div data-field="full_name">
          <Input
            value={form.full_name}
            onChange={(e) => setField('full_name', e.target.value)}
            placeholder="Seu nome completo"
            className="h-11"
            disabled={submitting}
          />
        </div>
      </FormField>

      {form.entity_type === 'pf' ? (
        <FormField label="CPF" error={fieldErrors.cpf}>
          <div data-field="cpf">
            <Input
              value={form.cpf}
              onChange={(e) => setField('cpf', maskCpf(e.target.value))}
              placeholder="000.000.000-00"
              inputMode="numeric"
              maxLength={14}
              className="h-11"
              disabled={submitting}
            />
          </div>
        </FormField>
      ) : (
        <FormField label="CNPJ" error={fieldErrors.cnpj}>
          <div data-field="cnpj">
            <Input
              value={form.cnpj}
              onChange={(e) => setField('cnpj', maskCnpj(e.target.value))}
              placeholder="00.000.000/0000-00"
              inputMode="numeric"
              maxLength={18}
              className="h-11"
              disabled={submitting}
            />
          </div>
        </FormField>
      )}

      <FormField label="RG">
        <Input
          value={form.rg}
          onChange={(e) => setField('rg', e.target.value)}
          placeholder="Numero do RG"
          maxLength={20}
          className="h-11"
          disabled={submitting}
        />
      </FormField>

      <FormField label="Data de Nascimento">
        <Input
          type="date"
          value={form.birth_date}
          onChange={(e) => setField('birth_date', e.target.value)}
          className="h-11"
          disabled={submitting}
        />
      </FormField>

      <div className="grid grid-cols-2 gap-3">
        <FormField label="DRT">
          <Input
            value={form.drt}
            onChange={(e) => setField('drt', e.target.value)}
            placeholder="Numero DRT"
            maxLength={30}
            className="h-11"
            disabled={submitting}
          />
        </FormField>
        <FormField label="CTPS">
          <Input
            value={form.ctps}
            onChange={(e) => setField('ctps', e.target.value)}
            placeholder="Numero CTPS"
            maxLength={30}
            className="h-11"
            disabled={submitting}
          />
        </FormField>
      </div>

      <FormField label="E-mail" error={fieldErrors.email}>
        <Input
          type="email"
          value={form.email}
          onChange={(e) => setField('email', e.target.value)}
          placeholder="voce@email.com"
          className="h-11"
          disabled={submitting}
        />
      </FormField>

      <FormField label="Telefone / WhatsApp">
        <Input
          value={formatPhone(form.phone)}
          onChange={(e) => setField('phone', phoneDigits(e.target.value))}
          placeholder="(11) 99999-9999"
          inputMode="tel"
          maxLength={16}
          className="h-11"
          disabled={submitting}
        />
      </FormField>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Secao: Endereco
// ---------------------------------------------------------------------------

function AddressSection({
  form,
  setField,
  submitting,
  onCepChange,
  cepLoading,
  cepError,
  showTitle,
}: {
  form: FormState
  setField: <K extends keyof FormState>(field: K, value: FormState[K]) => void
  submitting: boolean
  onCepChange: (value: string) => void
  cepLoading: boolean
  cepError?: string | null
  showTitle: boolean
}) {
  return (
    <div className="space-y-4">
      {showTitle && (
        <h3 className="text-sm font-semibold text-zinc-700 border-b pb-1">Endereco</h3>
      )}

      <FormField label="CEP">
        <div className="relative">
          <Input
            value={form.zip_code}
            onChange={(e) => onCepChange(e.target.value)}
            placeholder="00000-000"
            inputMode="numeric"
            maxLength={9}
            className="h-11"
            disabled={submitting}
          />
          {cepLoading && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 size-4 animate-spin text-rose-400" />
          )}
        </div>
        {cepError ? (
          <p className="text-xs text-red-500 mt-1">{cepError}</p>
        ) : (
          <p className="text-xs text-zinc-400 mt-1">
            Preencha o CEP e o endereco sera preenchido automaticamente.
          </p>
        )}
      </FormField>

      <FormField label="Rua / Avenida">
        <Input
          value={form.address_street}
          onChange={(e) => setField('address_street', e.target.value)}
          placeholder="Nome da rua"
          className="h-11"
          disabled={submitting}
        />
      </FormField>

      <div className="grid grid-cols-2 gap-3">
        <FormField label="Numero">
          <Input
            value={form.address_number}
            onChange={(e) => setField('address_number', e.target.value)}
            placeholder="123"
            maxLength={20}
            className="h-11"
            disabled={submitting}
          />
        </FormField>
        <FormField label="Complemento">
          <Input
            value={form.address_complement}
            onChange={(e) => setField('address_complement', e.target.value)}
            placeholder="Apto, sala..."
            maxLength={100}
            className="h-11"
            disabled={submitting}
          />
        </FormField>
      </div>

      <FormField label="Bairro">
        <Input
          value={form.address_district}
          onChange={(e) => setField('address_district', e.target.value)}
          placeholder="Bairro"
          className="h-11"
          disabled={submitting}
        />
      </FormField>

      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <FormField label="Cidade">
            <Input
              value={form.address_city}
              onChange={(e) => setField('address_city', e.target.value)}
              placeholder="Cidade"
              className="h-11"
              disabled={submitting}
            />
          </FormField>
        </div>
        <FormField label="UF">
          <Input
            value={form.address_state}
            onChange={(e) =>
              setField('address_state', e.target.value.toUpperCase().slice(0, 2))
            }
            placeholder="SP"
            maxLength={2}
            className="h-11"
            disabled={submitting}
          />
        </FormField>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Secao: Dados Bancarios (colapsavel)
// ---------------------------------------------------------------------------

function BankSection({
  form,
  setField,
  fieldErrors,
  submitting,
  showBank,
  setShowBank,
  inline = false,
  alwaysOpen = false,
}: {
  form: FormState
  setField: <K extends keyof FormState>(field: K, value: FormState[K]) => void
  fieldErrors?: Record<string, string>
  submitting: boolean
  showBank: boolean
  setShowBank: (v: boolean) => void
  inline?: boolean
  alwaysOpen?: boolean
}) {
  const isOpen = alwaysOpen || showBank
  const errors = fieldErrors || {}

  const inner = (
    <>
      {!alwaysOpen && (
        <button
          type="button"
          onClick={() => setShowBank(!showBank)}
          className="w-full flex items-center justify-between px-4 py-3 bg-zinc-50 hover:bg-zinc-100 transition-colors text-sm font-medium text-zinc-700"
          disabled={submitting}
        >
          <span>Dados Bancarios</span>
          {showBank ? (
            <ChevronUp className="size-4 text-zinc-500" />
          ) : (
            <ChevronDown className="size-4 text-zinc-500" />
          )}
        </button>
      )}

      {isOpen && (
        <div className={cn('p-4 space-y-4', !alwaysOpen && 'border-t')}>
          <p className="text-xs text-zinc-500">
            Informe os dados da conta para receber o pagamento. Chave PIX e obrigatoria.
          </p>

          <FormField label="Banco">
            <Input
              value={form.bank_name}
              onChange={(e) => setField('bank_name', e.target.value)}
              placeholder="Ex: Nubank, Itau, Bradesco..."
              className="h-11"
              disabled={submitting}
            />
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Agencia">
              <Input
                value={form.agency}
                onChange={(e) => setField('agency', e.target.value)}
                placeholder="0000"
                inputMode="numeric"
                maxLength={10}
                className="h-11"
                disabled={submitting}
              />
            </FormField>
            <FormField label="Conta">
              <Input
                value={form.account_number}
                onChange={(e) => setField('account_number', e.target.value)}
                placeholder="00000-0"
                inputMode="numeric"
                maxLength={20}
                className="h-11"
                disabled={submitting}
              />
            </FormField>
          </div>

          <FormField label="Tipo de Conta">
            <Select
              value={form.account_type}
              onValueChange={(v) => setField('account_type', v)}
              disabled={submitting}
            >
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="corrente">Conta Corrente (C/C)</SelectItem>
                <SelectItem value="poupanca">Conta Poupanca (C/P)</SelectItem>
              </SelectContent>
            </Select>
          </FormField>

          <FormField label="Tipo de Chave PIX" required error={errors.pix_key_type}>
            <div data-field="pix_key_type">
              <Select
                value={form.pix_key_type}
                onValueChange={(v) => setField('pix_key_type', v)}
                disabled={submitting}
              >
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cpf">CPF</SelectItem>
                  <SelectItem value="cnpj">CNPJ</SelectItem>
                  <SelectItem value="email">E-mail</SelectItem>
                  <SelectItem value="telefone">Telefone</SelectItem>
                  <SelectItem value="aleatoria">Chave Aleatoria</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </FormField>

          {form.pix_key_type && (
            <FormField label="Chave PIX" required error={errors.pix_key}>
              <div data-field="pix_key">
                <Input
                  value={form.pix_key}
                  onChange={(e) => setField('pix_key', e.target.value)}
                  placeholder="Sua chave PIX"
                  className="h-11"
                  disabled={submitting}
                />
              </div>
            </FormField>
          )}
        </div>
      )}
    </>
  )

  if (inline) {
    return <div className="border rounded-lg overflow-hidden">{inner}</div>
  }

  return <div className="border rounded-lg overflow-hidden">{inner}</div>
}

// ---------------------------------------------------------------------------
// Combobox de funcoes (searchable)
// ---------------------------------------------------------------------------

function JobRoleCombobox({
  value,
  onSelect,
  disabled,
}: {
  value: string
  onSelect: (v: string) => void
  disabled: boolean
}) {
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full h-11 justify-between font-normal"
          disabled={disabled}
        >
          {value || 'Selecione ou digite sua funcao...'}
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar funcao..." />
          <CommandList>
            <CommandEmpty>Nenhuma funcao encontrada.</CommandEmpty>
            <CommandGroup>
              {JOB_ROLES.map((role) => (
                <CommandItem
                  key={role}
                  value={role}
                  onSelect={() => {
                    onSelect(role)
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 size-4',
                      value === role ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                  {role}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

// ---------------------------------------------------------------------------
// Step progress indicator
// ---------------------------------------------------------------------------

const STEP_CONFIG = [
  { label: 'E-mail', icon: Mail },
  { label: 'Dados', icon: Users },
  { label: 'Pronto', icon: BadgeCheck },
]

function StepIndicator({ current }: { current: Step }) {
  const stepIndex = current === 'email' ? 0 : current === 'form' ? 1 : 2

  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {STEP_CONFIG.map(({ label, icon: Icon }, i) => {
        const isDone = i < stepIndex
        const isActive = i === stepIndex
        return (
          <div key={label} className="flex items-center">
            {i > 0 && (
              <div className="w-10 sm:w-16 h-0.5 mx-1 rounded-full overflow-hidden bg-zinc-200">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-700 ease-out',
                    isDone ? 'w-full bg-gradient-to-r from-rose-400 to-rose-500' : 'w-0',
                  )}
                />
              </div>
            )}
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  'size-10 rounded-xl flex items-center justify-center transition-all duration-500',
                  isDone && 'bg-gradient-to-br from-rose-500 to-pink-500 text-white shadow-lg shadow-rose-500/25',
                  isActive && 'bg-gradient-to-br from-rose-500 to-pink-500 text-white shadow-lg shadow-rose-500/30 scale-110',
                  !isDone && !isActive && 'bg-white text-zinc-400 border border-zinc-200 shadow-sm',
                )}
              >
                {isDone ? (
                  <Check className="size-4 animate-[scaleIn_0.3s_ease-out]" />
                ) : (
                  <Icon className="size-4" />
                )}
              </div>
              <span
                className={cn(
                  'text-[10px] font-semibold tracking-wide uppercase transition-colors duration-300',
                  isActive ? 'text-rose-600' : isDone ? 'text-rose-400' : 'text-zinc-400',
                )}
              >
                {label}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Layout publico (sem sidebar/header do dashboard)
// ---------------------------------------------------------------------------

function CrewLayout({
  children,
  jobInfo,
  step = 'email',
}: {
  children: React.ReactNode
  jobInfo?: JobInfo | null
  step?: Step
}) {
  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col items-center px-4 py-6 sm:py-10 relative overflow-hidden">
      {/* Animated gradient mesh background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full bg-gradient-to-br from-rose-200/30 via-pink-100/20 to-transparent blur-3xl animate-[drift_20s_ease-in-out_infinite]" />
        <div className="absolute -bottom-40 -left-40 w-[400px] h-[400px] rounded-full bg-gradient-to-tr from-violet-100/20 via-rose-50/30 to-transparent blur-3xl animate-[drift_25s_ease-in-out_infinite_reverse]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-gradient-to-b from-rose-50/10 to-transparent blur-3xl" />
      </div>

      {/* Subtle dot pattern overlay */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{
        backgroundImage: 'radial-gradient(circle, #000 1px, transparent 1px)',
        backgroundSize: '24px 24px',
      }} />

      {/* Logo + Job info */}
      <div className="mb-4 text-center relative z-10 animate-[fadeDown_0.6s_ease-out]">
        <div className="inline-flex items-center gap-2">
          <div className="size-9 rounded-xl bg-gradient-to-br from-rose-500 via-rose-500 to-pink-600 flex items-center justify-center shadow-lg shadow-rose-500/25 rotate-[-3deg] hover:rotate-0 transition-transform duration-300">
            <Clapperboard className="size-[18px] text-white" />
          </div>
          <span className="text-2xl font-extrabold tracking-tight text-zinc-900">
            Ellah<span className="bg-gradient-to-r from-rose-500 to-pink-500 bg-clip-text text-transparent">OS</span>
          </span>
        </div>

        {jobInfo && (
          <div className="mt-4 animate-[fadeUp_0.6s_ease-out_0.1s_both]">
            <div className="inline-flex items-center gap-2.5 bg-white/90 backdrop-blur-md border border-zinc-200/50 rounded-full px-5 py-2 shadow-sm hover:shadow-md transition-shadow duration-300">
              <Clapperboard className="size-3.5 text-rose-400" />
              <span className="text-xs font-bold text-rose-500 tracking-wide">{jobInfo.job_code}</span>
              <span className="w-px h-3.5 bg-zinc-200" />
              <span className="text-xs font-medium text-zinc-600">{jobInfo.job_title}</span>
            </div>
            <p className="text-[11px] text-zinc-400 mt-2 font-medium tracking-wide uppercase">{jobInfo.tenant_name}</p>
          </div>
        )}
      </div>

      {/* Step indicator */}
      {jobInfo && (
        <div className="animate-[fadeUp_0.6s_ease-out_0.2s_both]">
          <StepIndicator current={step} />
        </div>
      )}

      <div className="w-full max-w-lg relative z-10 animate-[fadeUp_0.5s_ease-out_0.3s_both]">
        {children}
      </div>

      {/* Footer */}
      <div className="mt-16 relative z-10 text-center animate-[fadeUp_0.6s_ease-out_0.5s_both]">
        <div className="inline-flex items-center gap-1.5 text-zinc-300">
          <Clapperboard className="size-3" />
          <span className="text-[10px] font-medium tracking-wider uppercase">Powered by EllahOS</span>
        </div>
      </div>

      {/* CSS Animations */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes drift {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -20px) scale(1.05); }
          66% { transform: translate(-20px, 15px) scale(0.95); }
        }
        @keyframes fadeDown {
          from { opacity: 0; transform: translateY(-12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes celebratePulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.3); }
          50% { box-shadow: 0 0 0 12px rgba(34, 197, 94, 0); }
        }
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(30px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(-30px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .animate-slideInRight {
          animation: slideInRight 0.3s ease-out both;
        }
        .animate-slideInLeft {
          animation: slideInLeft 0.3s ease-out both;
        }
        .input-glow:focus-within {
          box-shadow: 0 0 0 3px rgba(244, 63, 94, 0.08);
          border-color: rgba(244, 63, 94, 0.3);
        }
        .card-hover {
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .card-hover:hover {
          transform: translateY(-1px);
          box-shadow: 0 8px 30px -8px rgba(0, 0, 0, 0.08);
        }
      `}} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Componentes auxiliares
// ---------------------------------------------------------------------------

function FormField({
  label,
  required,
  error,
  children,
}: {
  label: string
  required?: boolean
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium text-zinc-700">
        {label}
        {required && <span className="text-rose-500 ml-0.5">*</span>}
      </Label>
      {children}
      {error && (
        <p className="text-xs text-red-600 flex items-center gap-1">
          <span className="size-1 rounded-full bg-red-500 shrink-0" />
          {error}
        </p>
      )}
    </div>
  )
}

function ConfirmRow({
  label,
  value,
  highlight,
}: {
  label: string
  value: string
  highlight?: boolean
}) {
  return (
    <div className={cn(
      'flex justify-between items-center px-4 py-3',
      highlight && 'bg-gradient-to-r from-rose-50/50 to-transparent',
    )}>
      <span className="text-zinc-500 text-sm">{label}</span>
      <span
        className={
          highlight
            ? 'font-bold text-rose-600 text-base'
            : 'font-medium text-zinc-800 text-sm'
        }
      >
        {value}
      </span>
    </div>
  )
}
