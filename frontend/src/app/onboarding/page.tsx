'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  Building2,
  User,
  Users,
  Puzzle,
  Rocket,
  Check,
  X,
  Plus,
  ExternalLink,
  ChevronRight,
  ArrowRight,
  Sparkles,
} from 'lucide-react'
import { toast } from 'sonner'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { apiMutate } from '@/lib/api'

import {
  useOnboardingStatus,
  useUpdateCompany,
  useUpdateProfile,
  useUpdateIntegrations,
  useCompleteOnboarding,
} from '@/hooks/useOnboarding'

// --- Tipos locais ---

interface InviteEntry {
  email: string
  role: string
}

interface WizardState {
  // Passo 1 — Empresa
  companyName: string
  cnpj: string
  city: string
  state: string
  logoUrl: string
  // Passo 2 — Perfil
  fullName: string
  phone: string
  // Passo 3 — Convites
  invites: InviteEntry[]
  inviteEmail: string
  inviteRole: string
  // Passo 4 — Integracoes
  driveAcknowledged: boolean
  whatsappAcknowledged: boolean
  // Controle de quais passos foram concluidos
  completedSteps: Set<number>
}

// --- Configuracao dos passos ---

const STEP_CONFIG = [
  { id: 1, label: 'Empresa', icon: Building2 },
  { id: 2, label: 'Perfil', icon: User },
  { id: 3, label: 'Equipe', icon: Users },
  { id: 4, label: 'Integracoes', icon: Puzzle },
  { id: 5, label: 'Concluir', icon: Rocket },
]

const TOTAL_STEPS = 5

// Roles disponiveis para convite — alinhados com ENUM user_role do banco
// admin nao aparece aqui (o dono ja e admin, nao faz sentido convidar outro admin no onboarding)
const INVITE_ROLES = [
  { value: 'ceo', label: 'CEO' },
  { value: 'produtor_executivo', label: 'Produtor Executivo' },
  { value: 'coordenador', label: 'Coordenador' },
  { value: 'diretor', label: 'Diretor' },
  { value: 'financeiro', label: 'Financeiro' },
  { value: 'atendimento', label: 'Atendimento' },
  { value: 'comercial', label: 'Comercial' },
  { value: 'freelancer', label: 'Freelancer' },
]

// Mascara simples de CNPJ: XX.XXX.XXX/XXXX-XX
function maskCnpj(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 14)
  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
}

// Validacao de CNPJ com digitos verificadores
function isValidCnpj(cnpj: string): boolean {
  const digits = cnpj.replace(/\D/g, '')
  if (digits.length !== 14) return false
  // Rejeitar todos iguais (00.000.000/0000-00)
  if (/^(\d)\1{13}$/.test(digits)) return false

  const calcDigit = (slice: string, weights: number[]): number => {
    const sum = weights.reduce((acc, w, i) => acc + parseInt(slice[i]) * w, 0)
    const remainder = sum % 11
    return remainder < 2 ? 0 : 11 - remainder
  }

  const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  const w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]

  const d1 = calcDigit(digits.slice(0, 12), w1)
  if (d1 !== parseInt(digits[12])) return false

  const d2 = calcDigit(digits.slice(0, 13), w2)
  if (d2 !== parseInt(digits[13])) return false

  return true
}

// Mascara simples de telefone: (XX) XXXXX-XXXX
function maskPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 10) {
    return digits
      .replace(/^(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2')
  }
  return digits
    .replace(/^(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2')
}

// --- Componente: Barra de progresso com circulos ---

function StepperBar({
  currentStep,
  completedSteps,
  onStepClick,
}: {
  currentStep: number
  completedSteps: Set<number>
  onStepClick: (step: number) => void
}) {
  return (
    <div className="flex items-center justify-between mb-8">
      {STEP_CONFIG.map((step, index) => {
        const isCompleted = completedSteps.has(step.id)
        const isCurrent = currentStep === step.id
        const isFuture = step.id > currentStep && !isCompleted
        const canClick = isCompleted || isCurrent

        return (
          <div key={step.id} className="flex items-center flex-1">
            {/* Circulo do passo */}
            <div className="flex flex-col items-center">
              <button
                onClick={() => canClick && onStepClick(step.id)}
                disabled={isFuture}
                className={cn(
                  'w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition-all',
                  'border-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                  isCompleted && 'bg-green-500 border-green-500 text-white cursor-pointer',
                  isCurrent && !isCompleted && 'bg-primary border-primary text-primary-foreground',
                  isFuture && 'bg-muted border-muted-foreground/20 text-muted-foreground cursor-not-allowed',
                )}
                aria-label={`Passo ${step.id}: ${step.label}`}
              >
                {isCompleted ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <span>{step.id}</span>
                )}
              </button>
              <span
                className={cn(
                  'mt-1 text-[10px] font-medium hidden sm:block',
                  isCurrent && 'text-primary',
                  isCompleted && 'text-green-600 dark:text-green-400',
                  isFuture && 'text-muted-foreground',
                )}
              >
                {step.label}
              </span>
            </div>

            {/* Linha conectora (exceto no ultimo) */}
            {index < STEP_CONFIG.length - 1 && (
              <div
                className={cn(
                  'flex-1 h-0.5 mx-2 rounded-full transition-colors',
                  isCompleted ? 'bg-green-500' : 'bg-muted',
                )}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

// --- Passo 1: Dados da Empresa ---

function StepCompany({
  state,
  onChange,
}: {
  state: WizardState
  onChange: (updates: Partial<WizardState>) => void
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="company-name">
          Nome da empresa <span className="text-destructive">*</span>
        </Label>
        <Input
          id="company-name"
          placeholder="Ex: Ellah Filmes"
          value={state.companyName}
          onChange={(e) => onChange({ companyName: e.target.value })}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="cnpj">CNPJ (opcional)</Label>
        <Input
          id="cnpj"
          placeholder="00.000.000/0000-00"
          value={state.cnpj}
          onChange={(e) => onChange({ cnpj: maskCnpj(e.target.value) })}
          inputMode="numeric"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="city">Cidade (opcional)</Label>
          <Input
            id="city"
            placeholder="Ex: Sao Paulo"
            value={state.city}
            onChange={(e) => onChange({ city: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="state">Estado (opcional)</Label>
          <Input
            id="state"
            placeholder="Ex: SP"
            maxLength={2}
            value={state.state}
            onChange={(e) => onChange({ state: e.target.value.toUpperCase() })}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="logo-url">URL do logo (opcional)</Label>
        <Input
          id="logo-url"
          type="url"
          placeholder="https://exemplo.com/logo.png"
          value={state.logoUrl}
          onChange={(e) => onChange({ logoUrl: e.target.value })}
        />
        <p className="text-xs text-muted-foreground">
          Voce pode configurar o upload do logo depois em Configuracoes.
        </p>
      </div>
    </div>
  )
}

// --- Passo 2: Perfil do Usuario ---

function StepProfile({
  state,
  onChange,
}: {
  state: WizardState
  onChange: (updates: Partial<WizardState>) => void
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="full-name">
          Nome completo <span className="text-destructive">*</span>
        </Label>
        <Input
          id="full-name"
          placeholder="Ex: Ana Paula Souza"
          value={state.fullName}
          onChange={(e) => onChange({ fullName: e.target.value })}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="phone">Telefone (opcional)</Label>
        <Input
          id="phone"
          placeholder="(11) 99999-9999"
          inputMode="tel"
          value={state.phone}
          onChange={(e) => onChange({ phone: maskPhone(e.target.value) })}
        />
      </div>

      <p className="text-sm text-muted-foreground">
        Esses dados identificam voce dentro do sistema. Pode alterar depois em Configuracoes.
      </p>
    </div>
  )
}

// --- Passo 3: Convidar Equipe ---

function StepTeam({
  state,
  onChange,
}: {
  state: WizardState
  onChange: (updates: Partial<WizardState>) => void
}) {
  const addInvite = () => {
    const email = state.inviteEmail.trim()
    if (!email) {
      toast.error('Informe o e-mail para adicionar')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error('E-mail invalido')
      return
    }
    if (state.invites.some((inv) => inv.email === email)) {
      toast.error('E-mail ja adicionado')
      return
    }
    if (state.invites.length >= 10) {
      toast.error('Maximo de 10 convites por vez')
      return
    }
    onChange({
      invites: [...state.invites, { email, role: state.inviteRole || 'coordenador' }],
      inviteEmail: '',
      inviteRole: 'coordenador',
    })
  }

  const removeInvite = (email: string) => {
    onChange({ invites: state.invites.filter((inv) => inv.email !== email) })
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Convide membros da sua equipe para acessar o sistema. Voce pode pular esta etapa e convidar depois em Configuracoes &gt; Equipe.
      </p>

      {/* Formulario de adicionar convite */}
      <div className="flex gap-2">
        <Input
          placeholder="email@exemplo.com"
          type="email"
          value={state.inviteEmail}
          onChange={(e) => onChange({ inviteEmail: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              addInvite()
            }
          }}
          className="flex-1"
        />
        <Select
          value={state.inviteRole || 'coordenador'}
          onValueChange={(val) => onChange({ inviteRole: val })}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Funcao" />
          </SelectTrigger>
          <SelectContent>
            {INVITE_ROLES.map((r) => (
              <SelectItem key={r.value} value={r.value}>
                {r.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={addInvite}
          aria-label="Adicionar convite"
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      {/* Lista de convites pendentes */}
      {state.invites.length > 0 && (
        <div className="space-y-2">
          {state.invites.map((inv) => {
            const roleLabel = INVITE_ROLES.find((r) => r.value === inv.role)?.label ?? inv.role
            return (
              <div
                key={inv.email}
                className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
              >
                <div className="flex flex-col min-w-0">
                  <span className="font-medium truncate">{inv.email}</span>
                  <span className="text-xs text-muted-foreground">{roleLabel}</span>
                </div>
                <button
                  onClick={() => removeInvite(inv.email)}
                  className="ml-2 text-muted-foreground hover:text-destructive transition-colors"
                  aria-label={`Remover ${inv.email}`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )
          })}
          <p className="text-xs text-muted-foreground">
            {state.invites.length}/10 convite{state.invites.length !== 1 ? 's' : ''} adicionado{state.invites.length !== 1 ? 's' : ''}
          </p>
        </div>
      )}
    </div>
  )
}

// --- Passo 4: Integracoes ---

function StepIntegrations({
  state,
  onChange,
}: {
  state: WizardState
  onChange: (updates: Partial<WizardState>) => void
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Configure as integracoes para automatizar seu fluxo. Voce pode pular agora e configurar depois em Configuracoes.
      </p>

      {/* Card Google Drive */}
      <div className="rounded-lg border p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-md bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
            {/* Icone simples representando Drive */}
            <svg
              viewBox="0 0 87.3 78"
              className="w-5 h-5"
              aria-hidden="true"
            >
              <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da" />
              <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z" fill="#00ac47" />
              <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335" />
              <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d" />
              <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc" />
              <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 27h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <p className="font-medium text-sm">Google Drive</p>
              <a
                href="/settings/integrations"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                Configurar
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Armazene e organize automaticamente todos os arquivos dos seus projetos no Drive.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            id="drive-ack"
            checked={state.driveAcknowledged}
            onCheckedChange={(checked) =>
              onChange({ driveAcknowledged: Boolean(checked) })
            }
          />
          <label htmlFor="drive-ack" className="text-sm cursor-pointer">
            Ja configurei o Google Drive
          </label>
        </div>
      </div>

      {/* Card WhatsApp */}
      <div className="rounded-lg border p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-md bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0">
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-green-600" aria-hidden="true">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <p className="font-medium text-sm">WhatsApp</p>
              <a
                href="/settings/integrations"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                Configurar
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Receba notificacoes e interaja com clientes diretamente pelo WhatsApp.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            id="whatsapp-ack"
            checked={state.whatsappAcknowledged}
            onCheckedChange={(checked) =>
              onChange({ whatsappAcknowledged: Boolean(checked) })
            }
          />
          <label htmlFor="whatsapp-ack" className="text-sm cursor-pointer">
            Ja configurei o WhatsApp
          </label>
        </div>
      </div>
    </div>
  )
}

// --- Passo 5: Conclusao ---

function StepDone({
  companyName,
  completedSteps,
}: {
  companyName: string
  completedSteps: Set<number>
}) {
  const [seedLoading, setSeedLoading] = useState(false)
  const seedingRef = useRef(false)
  const [seedDone, setSeedDone] = useState(false)

  const STEP_LABELS: Record<number, string> = {
    1: 'Dados da empresa',
    2: 'Perfil configurado',
    3: 'Equipe convidada',
    4: 'Integracoes reconhecidas',
  }

  const shortcuts = [
    { label: 'Novo Job', href: '/jobs/new', description: 'Criar um projeto' },
    { label: 'CRM', href: '/crm', description: 'Pipeline de oportunidades' },
    { label: 'Financeiro', href: '/financeiro', description: 'Gestao financeira' },
    { label: 'Equipe', href: '/settings/team', description: 'Gerenciar membros' },
  ]

  // Carregar dados de exemplo via POST /onboarding/seed-demo
  const handleSeedDemo = async () => {
    if (seedingRef.current || seedDone) return
    seedingRef.current = true
    setSeedLoading(true)
    try {
      await apiMutate('onboarding', 'POST', {}, 'seed-demo')
      setSeedDone(true)
      toast.success('Dados de exemplo carregados! Explore o dashboard para ver como o sistema funciona.')
    } catch (err: unknown) {
      // Conflito = seed ja foi executado (idempotencia)
      if (
        err &&
        typeof err === 'object' &&
        'status' in err &&
        (err as { status: number }).status === 409
      ) {
        setSeedDone(true)
        toast.info('Dados de exemplo ja estavam carregados.')
      } else {
        toast.error('Nao foi possivel carregar os dados de exemplo. Tente novamente.')
      }
    } finally {
      setSeedLoading(false)
      seedingRef.current = false
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mx-auto">
          <Rocket className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-xl font-semibold">
          {companyName ? `Bem-vindo, ${companyName}!` : 'Tudo pronto!'}
        </h2>
        <p className="text-sm text-muted-foreground">
          O ELLAHOS esta configurado e pronto para usar.
        </p>
      </div>

      {/* Resumo do que foi feito */}
      <div className="space-y-2">
        {[1, 2, 3, 4].map((step) => {
          const done = completedSteps.has(step)
          return (
            <div key={step} className="flex items-center gap-3 text-sm">
              <div
                className={cn(
                  'w-5 h-5 rounded-full flex items-center justify-center shrink-0',
                  done
                    ? 'bg-green-500 text-white'
                    : 'bg-muted text-muted-foreground',
                )}
              >
                {done ? (
                  <Check className="w-3 h-3" />
                ) : (
                  <span className="text-[10px]">—</span>
                )}
              </div>
              <span className={done ? 'text-foreground' : 'text-muted-foreground line-through'}>
                {STEP_LABELS[step]}
              </span>
            </div>
          )
        })}
      </div>

      {/* Card: carregar dados de exemplo */}
      <div className="rounded-lg border border-dashed p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm">Explorar com dados de exemplo</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Cria 2 clientes, 3 jobs e 6 entregaveis de exemplo para voce ver o sistema funcionando antes de inserir dados reais.
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant={seedDone ? 'outline' : 'secondary'}
          size="sm"
          onClick={handleSeedDemo}
          disabled={seedLoading || seedDone}
          className="w-full gap-2"
        >
          {seedLoading ? (
            <>
              <span className="w-3.5 h-3.5 border-2 border-current/30 border-t-current rounded-full animate-spin" />
              Carregando dados...
            </>
          ) : seedDone ? (
            <>
              <Check className="w-3.5 h-3.5 text-green-500" />
              Dados de exemplo carregados
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5" />
              Carregar dados de exemplo
            </>
          )}
        </Button>
      </div>

      {/* Atalhos rapidos */}
      <div>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
          Por onde comecar?
        </p>
        <div className="grid grid-cols-2 gap-2">
          {shortcuts.map((sc) => (
            <a
              key={sc.href}
              href={sc.href}
              className="rounded-lg border p-3 hover:bg-accent transition-colors group"
            >
              <p className="text-sm font-medium group-hover:text-primary transition-colors">
                {sc.label}
              </p>
              <p className="text-xs text-muted-foreground">{sc.description}</p>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}

// --- Componente principal: Wizard ---

export default function OnboardingPage() {
  const router = useRouter()
  const { data: status, isLoading } = useOnboardingStatus()

  const updateCompany = useUpdateCompany()
  const updateProfile = useUpdateProfile()
  const updateIntegrations = useUpdateIntegrations()
  const completeOnboarding = useCompleteOnboarding()

  const [currentStep, setCurrentStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const submittingRef = useRef(false)

  // Estado do formulario
  const [wizardState, setWizardState] = useState<WizardState>({
    companyName: '',
    cnpj: '',
    city: '',
    state: '',
    logoUrl: '',
    fullName: '',
    phone: '',
    invites: [],
    inviteEmail: '',
    inviteRole: 'coordenador',
    driveAcknowledged: false,
    whatsappAcknowledged: false,
    completedSteps: new Set(),
  })

  // Guard: redirecionar se onboarding ja foi concluido
  useEffect(() => {
    if (status?.tenant?.onboarding_completed === true) {
      router.push('/')
    }
  }, [status, router])

  // Pre-preencher com dados do status
  useEffect(() => {
    if (!status) return
    const saved = status.tenant.settings

    setWizardState((prev) => ({
      ...prev,
      companyName: status.tenant.name ?? '',
      cnpj: status.tenant.cnpj ?? '',
      city: saved?.address?.city ?? '',
      state: saved?.address?.state ?? '',
      logoUrl: status.tenant.logo_url ?? '',
      fullName: status.profile.full_name ?? '',
      phone: status.profile.phone ?? '',
      driveAcknowledged: saved?.integrations?.drive_acknowledged ?? false,
      whatsappAcknowledged: saved?.integrations?.whatsapp_acknowledged ?? false,
    }))

    // Retomar do passo salvo (se houver) e restaurar completedSteps
    if (saved?.onboarding_step && saved.onboarding_step > 1) {
      const step = Math.min(saved.onboarding_step, TOTAL_STEPS)
      setCurrentStep(step)
      // Marcar todos os passos anteriores como concluidos
      const restored = new Set<number>()
      for (let i = 1; i < step; i++) restored.add(i)
      setWizardState((p) => ({ ...p, completedSteps: restored }))
    }
  }, [status])

  // Atualiza estado parcialmente
  const handleChange = (updates: Partial<WizardState>) => {
    setWizardState((prev) => ({ ...prev, ...updates }))
  }

  // Marca passo como concluido
  const markCompleted = (step: number) => {
    setWizardState((prev) => ({
      ...prev,
      completedSteps: new Set([...prev.completedSteps, step]),
    }))
  }

  // Retroceder passo
  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1)
    }
  }

  // Permitir clicar num passo ja concluido para voltar
  const handleStepClick = (step: number) => {
    if (step <= currentStep) {
      setCurrentStep(step)
    }
  }

  // Avancar / submeter passo atual
  const handleNext = async () => {
    if (submittingRef.current) return
    submittingRef.current = true
    setSubmitting(true)
    try {
      if (currentStep === 1) {
        // Validacao minima
        if (!wizardState.companyName.trim()) {
          toast.error('Informe o nome da empresa')
          return
        }
        // Validar CNPJ se preenchido
        if (wizardState.cnpj && !isValidCnpj(wizardState.cnpj)) {
          toast.error('CNPJ invalido. Verifique os digitos.')
          return
        }
        await updateCompany.mutateAsync({
          name: wizardState.companyName.trim(),
          cnpj: wizardState.cnpj || null,
          logo_url: wizardState.logoUrl || null,
          city: wizardState.city || null,
          state: wizardState.state || null,
        })
        markCompleted(1)
        setCurrentStep(2)

      } else if (currentStep === 2) {
        if (!wizardState.fullName.trim()) {
          toast.error('Informe seu nome completo')
          return
        }
        await updateProfile.mutateAsync({
          full_name: wizardState.fullName.trim(),
          phone: wizardState.phone || null,
        })
        markCompleted(2)
        setCurrentStep(3)

      } else if (currentStep === 3) {
        // Enviar convites via EF tenant-management existente
        if (wizardState.invites.length > 0) {
          const results = await Promise.allSettled(
            wizardState.invites.map((invite) =>
              apiMutate('tenant-management', 'POST', {
                email: invite.email,
                role: invite.role,
              }, 'invitations')
            )
          )
          const failed = results.filter((r) => r.status === 'rejected').length
          const succeeded = results.filter((r) => r.status === 'fulfilled').length
          if (succeeded > 0) {
            toast.success(`${succeeded} convite(s) enviado(s)`)
          }
          if (failed > 0) {
            toast.error(`${failed} convite(s) falharam — tente novamente em Configuracoes > Equipe`)
          }
        }
        markCompleted(3)
        setCurrentStep(4)

      } else if (currentStep === 4) {
        await updateIntegrations.mutateAsync({
          drive_acknowledged: wizardState.driveAcknowledged,
          whatsapp_acknowledged: wizardState.whatsappAcknowledged,
        })
        markCompleted(4)
        setCurrentStep(5)

      } else if (currentStep === 5) {
        // Concluir onboarding e redirecionar
        await completeOnboarding.mutateAsync()
        toast.success('Onboarding concluido! Bem-vindo ao ELLAHOS.')
        router.push('/')
      }
    } catch {
      // Erros ja tratados nas mutations
    } finally {
      setSubmitting(false)
      submittingRef.current = false
    }
  }

  // Pular passo opcional (3 e 4)
  const handleSkip = () => {
    if (currentStep === 3) {
      markCompleted(3)
      setCurrentStep(4)
    } else if (currentStep === 4) {
      markCompleted(4)
      setCurrentStep(5)
    }
  }

  // --- Dados do passo atual ---

  const stepConfig = STEP_CONFIG[currentStep - 1]
  const StepIcon = stepConfig.icon

  const stepTitles: Record<number, string> = {
    1: 'Dados da empresa',
    2: 'Seu perfil',
    3: 'Convide sua equipe',
    4: 'Integracoes',
    5: 'Tudo pronto!',
  }

  const stepDescriptions: Record<number, string> = {
    1: 'Informe os dados basicos da sua empresa para comecar.',
    2: 'Como os outros membros te verao no sistema.',
    3: 'Opcional — voce pode convidar depois.',
    4: 'Opcional — configure as integracoes para automatizar seu fluxo.',
    5: 'Seu espaco de trabalho esta configurado.',
  }

  const isOptionalStep = currentStep === 3 || currentStep === 4

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-12 bg-muted rounded-lg" />
        <div className="h-64 bg-muted rounded-xl" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Stepper */}
      <StepperBar
        currentStep={currentStep}
        completedSteps={wizardState.completedSteps}
        onStepClick={handleStepClick}
      />

      {/* Indicador textual de progresso — visivel apenas no mobile */}
      <p className="sm:hidden text-center text-xs text-muted-foreground -mt-4">
        Passo {currentStep} de {TOTAL_STEPS} — {STEP_CONFIG[currentStep - 1].label}
      </p>

      {/* Card do passo */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <StepIcon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">{stepTitles[currentStep]}</CardTitle>
              <CardDescription className="mt-0.5">
                {stepDescriptions[currentStep]}
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {currentStep === 1 && (
            <StepCompany state={wizardState} onChange={handleChange} />
          )}
          {currentStep === 2 && (
            <StepProfile state={wizardState} onChange={handleChange} />
          )}
          {currentStep === 3 && (
            <StepTeam state={wizardState} onChange={handleChange} />
          )}
          {currentStep === 4 && (
            <StepIntegrations state={wizardState} onChange={handleChange} />
          )}
          {currentStep === 5 && (
            <StepDone
              companyName={wizardState.companyName}
              completedSteps={wizardState.completedSteps}
            />
          )}
        </CardContent>
      </Card>

      {/* Navegacao — sticky no mobile para nao ser coberto pelo teclado */}
      <div className="sticky bottom-0 z-10 bg-background/95 backdrop-blur-sm border-t border-border/40 -mx-4 px-4 py-3 sm:relative sm:bottom-auto sm:z-auto sm:bg-transparent sm:backdrop-blur-none sm:border-0 sm:mx-0 sm:px-0 sm:py-0">
        {/* Texto explicativo para passos opcionais */}
        {isOptionalStep && (
          <p className="text-center text-xs text-muted-foreground mb-2">
            Voce pode configurar isso depois em Configuracoes
          </p>
        )}

        <div className="flex items-center justify-between gap-3">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 1 || submitting}
            className="w-24"
          >
            Anterior
          </Button>

          <div className="flex items-center gap-2">
            {isOptionalStep && (
              <Button
                variant="outline"
                onClick={handleSkip}
                disabled={submitting}
              >
                Pular etapa
              </Button>
            )}

            {currentStep === TOTAL_STEPS ? (
              <Button
                onClick={handleNext}
                disabled={submitting}
                size="lg"
                className="gap-2"
              >
                {submitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    Finalizando...
                  </>
                ) : (
                  <>
                    Ir para o Dashboard
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </Button>
            ) : (
              <Button
                onClick={handleNext}
                disabled={submitting}
                className="w-32"
              >
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    Salvando...
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    Proximo
                    <ChevronRight className="w-4 h-4" />
                  </span>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
