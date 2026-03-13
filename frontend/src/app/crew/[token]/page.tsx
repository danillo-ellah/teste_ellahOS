'use client'

import { useState, useEffect, use } from 'react'
import {
  CheckCircle,
  AlertTriangle,
  Loader2,
  ChevronDown,
  ChevronUp,
  Users,
  ChevronsUpDown,
  Check,
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
  try {
    const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`)
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

  async function handleCepBlur() {
    const cep = form.zip_code.replace(/\D/g, '')
    if (cep.length !== 8) return
    setCepLoading(true)
    const data = await fetchCep(cep)
    setCepLoading(false)
    if (data) {
      setForm((prev) => ({
        ...prev,
        address_street: data.logradouro || prev.address_street,
        address_district: data.bairro || prev.address_district,
        address_city: data.localidade || prev.address_city,
        address_state: data.uf || prev.address_state,
      }))
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
        <div className="flex items-center justify-center py-24">
          <Loader2 className="size-8 animate-spin text-zinc-400" />
        </div>
      </CrewLayout>
    )
  }

  if (jobError || !jobInfo) {
    return (
      <CrewLayout>
        <Card className="max-w-lg mx-auto w-full">
          <CardContent className="flex flex-col items-center py-12 text-center">
            <AlertTriangle className="size-12 text-amber-500 mb-4" />
            <h2 className="text-lg font-semibold">Link invalido</h2>
            <p className="text-sm text-zinc-500 mt-2">
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
      <CrewLayout jobInfo={jobInfo}>
        <Card className="max-w-lg mx-auto w-full">
          <CardContent className="flex flex-col items-center py-12 text-center gap-3">
            <CheckCircle className="size-16 text-green-500" />
            <h2 className="text-2xl font-bold mt-1">Participacao confirmada!</h2>
            <p className="text-zinc-500">Obrigado, {result.full_name}.</p>

            <div className="w-full mt-4 rounded-lg bg-zinc-50 border divide-y text-sm">
              <ConfirmRow label="Job" value={`${jobInfo.job_code} — ${jobInfo.job_title}`} />
              <ConfirmRow label="Funcao" value={result.job_role} />
              <ConfirmRow label="Diarias" value={String(result.num_days)} />
              <ConfirmRow label="Cache por diaria" value={formatBRL(result.daily_rate)} />
              <ConfirmRow label="Total" value={formatBRL(total)} highlight />
            </div>

            <p className="text-xs text-zinc-400 mt-4">A producao sera notificada.</p>
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
      <CrewLayout jobInfo={jobInfo}>
        <Card className="max-w-lg mx-auto w-full">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="size-5 text-rose-500" />
              Cadastro de Equipe
            </CardTitle>
            <p className="text-sm text-zinc-500">
              Informe seu e-mail para comecar. Se voce ja tem cadastro, seus dados serao
              pre-preenchidos automaticamente.
            </p>
          </CardHeader>

          <CardContent>
            {alreadyRegistered ? (
              <div className="flex flex-col items-center py-8 text-center gap-3">
                <CheckCircle className="size-12 text-green-500" />
                <h3 className="font-semibold text-base">Voce ja preencheu este formulario</h3>
                <p className="text-sm text-zinc-500">
                  Sua participacao neste job ja esta registrada. Caso precise de alteracoes,
                  entre em contato com a producao.
                </p>
              </div>
            ) : (
              <form onSubmit={handleEmailSubmit} className="space-y-4">
                <FormField label="Seu e-mail" required>
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
                    className="h-12 text-base"
                    disabled={lookupLoading}
                  />
                </FormField>

                {lookupError && (
                  <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                    {lookupError}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full h-12 text-base"
                  disabled={lookupLoading}
                >
                  {lookupLoading ? (
                    <>
                      <Loader2 className="size-4 mr-2 animate-spin" />
                      Verificando...
                    </>
                  ) : (
                    'Continuar'
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
  // Render — Step 2: Formulario (veterano ou novo)
  // ---------------------------------------------------------------------------

  const numDays = Number(form.num_days) || 0
  const dailyRateNum = parseFloat(form.daily_rate.replace(/\./g, '').replace(',', '.')) || 0
  const estimatedTotal = numDays * dailyRateNum

  return (
    <CrewLayout jobInfo={jobInfo}>
      <div className="max-w-lg mx-auto w-full space-y-4 pb-16">
        <form onSubmit={handleFormSubmit} className="space-y-4">

          {/* ---- Veterano: banner de boas-vindas ---- */}
          {isVeteran && (
            <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800">
              <p className="font-semibold">Bem-vindo de volta, {vendorName}!</p>
              <p className="text-green-700 mt-0.5">
                Seus dados estao cadastrados. Preencha apenas os campos desta participacao.
              </p>
            </div>
          )}

          {/* ======== SECAO: Participacao neste job ======== */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Participacao neste job</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">

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
                        // Permite apenas numeros, ponto e virgula
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

              {/* Preview do total */}
              {numDays > 0 && dailyRateNum > 0 && (
                <div className="rounded-md bg-zinc-50 border px-3 py-2 text-sm flex justify-between items-center">
                  <span className="text-zinc-500">Total estimado</span>
                  <span className="font-semibold text-zinc-900">{formatBRL(estimatedTotal)}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ======== VETERANO: secao colapsavel de dados ======== */}
          {isVeteran && (
            <div className="border rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => setShowVeteranEdit((p) => !p)}
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
                    onCepBlur={handleCepBlur}
                    cepLoading={cepLoading}
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

          {/* ======== NOVO: secoes abertas ======== */}
          {!isVeteran && (
            <>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Dados Pessoais</CardTitle>
                </CardHeader>
                <CardContent>
                  <PersonalDataSection
                    form={form}
                    setField={setField}
                    fieldErrors={fieldErrors}
                    submitting={submitting}
                    showTitle={false}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Endereco</CardTitle>
                </CardHeader>
                <CardContent>
                  <AddressSection
                    form={form}
                    setField={setField}
                    submitting={submitting}
                    onCepBlur={handleCepBlur}
                    cepLoading={cepLoading}
                    showTitle={false}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Dados Bancarios</CardTitle>
                </CardHeader>
                <CardContent>
                  <BankSection
                    form={form}
                    setField={setField}
                    fieldErrors={fieldErrors}
                    submitting={submitting}
                    showBank={showBank}
                    setShowBank={setShowBank}
                    alwaysOpen
                  />
                </CardContent>
              </Card>
            </>
          )}

          {/* Erro global */}
          {submitError && (
            <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
              {submitError}
            </div>
          )}

          {/* Botao de submit */}
          <Button
            type="submit"
            className="w-full h-12 text-base"
            disabled={submitting}
          >
            {submitting ? (
              <>
                <Loader2 className="size-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : isVeteran ? (
              'Confirmar participacao'
            ) : (
              'Salvar e confirmar participacao'
            )}
          </Button>
        </form>
      </div>
    </CrewLayout>
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
  onCepBlur,
  cepLoading,
  showTitle,
}: {
  form: FormState
  setField: <K extends keyof FormState>(field: K, value: FormState[K]) => void
  submitting: boolean
  onCepBlur: () => void
  cepLoading: boolean
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
            onChange={(e) => setField('zip_code', maskCep(e.target.value))}
            onBlur={onCepBlur}
            placeholder="00000-000"
            inputMode="numeric"
            maxLength={9}
            className="h-11"
            disabled={submitting}
          />
          {cepLoading && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 size-4 animate-spin text-zinc-400" />
          )}
        </div>
        <p className="text-xs text-zinc-400 mt-1">
          O endereco sera preenchido automaticamente ao sair do campo.
        </p>
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
// Layout publico (sem sidebar/header do dashboard)
// ---------------------------------------------------------------------------

function CrewLayout({
  children,
  jobInfo,
}: {
  children: React.ReactNode
  jobInfo?: JobInfo | null
}) {
  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col items-center px-4 py-8 sm:py-12">
      {/* Logo */}
      <div className="mb-6 text-center">
        <span className="text-xl font-bold tracking-tight text-zinc-900">
          ELLAH<span className="text-rose-500">OS</span>
        </span>

        {jobInfo && (
          <div className="mt-3">
            <span className="inline-block text-xs font-medium text-zinc-500 bg-white border rounded px-3 py-1">
              {jobInfo.job_code} — {jobInfo.job_title}
            </span>
            <p className="text-xs text-zinc-400 mt-1">{jobInfo.tenant_name}</p>
          </div>
        )}
      </div>

      <div className="w-full max-w-lg">{children}</div>
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
      <Label className="text-sm">
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
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
    <div className="flex justify-between items-center px-4 py-3">
      <span className="text-zinc-500 text-sm">{label}</span>
      <span
        className={
          highlight
            ? 'font-bold text-zinc-900 text-base'
            : 'font-medium text-zinc-800 text-sm'
        }
      >
        {value}
      </span>
    </div>
  )
}
