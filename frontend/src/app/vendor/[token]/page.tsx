'use client'

import { useState, useEffect, use } from 'react'
import { CheckCircle, AlertTriangle, Loader2, Clock, ChevronDown, ChevronUp } from 'lucide-react'
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
import { useVendorPortalPublic, useSubmitVendorPortal } from '@/hooks/useVendorPortal'
import type { VendorPortalFormPayload } from '@/types/vendor-portal'

// ---- Validacao de CPF ----
function validateCpf(cpf: string): boolean {
  const digits = cpf.replace(/\D/g, '')
  if (digits.length !== 11) return false
  if (/^(\d)\1+$/.test(digits)) return false
  let sum = 0
  for (let i = 0; i < 9; i++) sum += parseInt(digits[i]) * (10 - i)
  let rem = (sum * 10) % 11
  if (rem === 10 || rem === 11) rem = 0
  if (rem !== parseInt(digits[9])) return false
  sum = 0
  for (let i = 0; i < 10; i++) sum += parseInt(digits[i]) * (11 - i)
  rem = (sum * 10) % 11
  if (rem === 10 || rem === 11) rem = 0
  return rem === parseInt(digits[10])
}

// ---- Validacao de CNPJ ----
function validateCnpj(cnpj: string): boolean {
  const digits = cnpj.replace(/\D/g, '')
  if (digits.length !== 14) return false
  if (/^(\d)\1+$/.test(digits)) return false
  const calc = (d: string, weights: number[]) =>
    weights.reduce((acc, w, i) => acc + parseInt(d[i]) * w, 0)
  const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  const w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  const mod = (n: number) => { const r = n % 11; return r < 2 ? 0 : 11 - r }
  const d1 = mod(calc(digits, w1))
  const d2 = mod(calc(digits, w2))
  return d1 === parseInt(digits[12]) && d2 === parseInt(digits[13])
}

// ---- Mascara de CEP ----
function maskCep(v: string) {
  return v.replace(/\D/g, '').replace(/^(\d{5})(\d)/, '$1-$2').slice(0, 9)
}

// ---- Busca CEP via ViaCEP ----
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

// ---- Estado inicial do formulario ----
function emptyForm(): VendorPortalFormPayload {
  return {
    full_name: '',
    entity_type: 'pf',
    cpf: '',
    cnpj: '',
    razao_social: '',
    rg: '',
    birth_date: '',
    email: '',
    phone: '',
    zip_code: '',
    address_street: '',
    address_number: '',
    address_complement: '',
    address_district: '',
    address_city: '',
    address_state: '',
    bank_account: {
      bank_name: '',
      bank_code: '',
      agency: '',
      account_number: '',
      account_type: null,
      pix_key: '',
      pix_key_type: null,
    },
  }
}

// ---- Componente principal ----
export default function VendorPortalPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = use(params)

  const { data: portalRes, isLoading, isError } = useVendorPortalPublic(token)
  const portal = portalRes?.data

  const { mutateAsync: submit, isPending: isSubmitting } = useSubmitVendorPortal(token)

  const [form, setForm] = useState<VendorPortalFormPayload>(emptyForm())
  const [submitted, setSubmitted] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [showBank, setShowBank] = useState(false)
  const [cepLoading, setCepLoading] = useState(false)

  // Pre-preencher formulario com dados existentes do vendor
  useEffect(() => {
    if (!portal || portal.status !== 'pending') return

    const v = portal.vendor
    const ba = v?.bank_accounts?.[0]

    setForm({
      full_name:          v?.full_name ?? portal.invite?.name ?? '',
      entity_type:        (v?.entity_type as 'pf' | 'pj') ?? 'pf',
      cpf:                v?.cpf ?? '',
      cnpj:               v?.cnpj ?? '',
      razao_social:       v?.razao_social ?? '',
      rg:                 (v as unknown as Record<string, unknown>)?.rg as string ?? '',
      birth_date:         (v as unknown as Record<string, unknown>)?.birth_date as string ?? '',
      email:              v?.email ?? portal.invite?.email ?? '',
      phone:              v?.phone ?? '',
      zip_code:           (v as unknown as Record<string, unknown>)?.zip_code as string ?? '',
      address_street:     (v as unknown as Record<string, unknown>)?.address_street as string ?? '',
      address_number:     (v as unknown as Record<string, unknown>)?.address_number as string ?? '',
      address_complement: (v as unknown as Record<string, unknown>)?.address_complement as string ?? '',
      address_district:   (v as unknown as Record<string, unknown>)?.address_district as string ?? '',
      address_city:       (v as unknown as Record<string, unknown>)?.address_city as string ?? '',
      address_state:      (v as unknown as Record<string, unknown>)?.address_state as string ?? '',
      bank_account: {
        bank_name:      ba?.bank_name ?? '',
        bank_code:      ba?.bank_code ?? '',
        agency:         ba?.agency ?? '',
        account_number: ba?.account_number ?? '',
        account_type:   (ba?.account_type as 'corrente' | 'poupanca') ?? null,
        pix_key:        ba?.pix_key ?? '',
        pix_key_type:   (ba?.pix_key_type as 'cpf' | 'cnpj' | 'email' | 'telefone' | 'aleatoria') ?? null,
      },
    })

    // Abrir secao bancaria se ja tem dados
    if (ba?.bank_name || ba?.pix_key || ba?.account_number) {
      setShowBank(true)
    }
  }, [portal])

  function setField(field: keyof VendorPortalFormPayload, value: unknown) {
    setForm((prev) => ({ ...prev, [field]: value }))
    // Limpar erro do campo ao editar
    if (fieldErrors[field]) {
      setFieldErrors((prev) => { const next = { ...prev }; delete next[field]; return next })
    }
  }

  function setBankField(field: string, value: unknown) {
    setForm((prev) => ({
      ...prev,
      bank_account: { ...prev.bank_account, [field]: value },
    }))
  }

  // Lookup de CEP automatico
  async function handleCepBlur() {
    const cep = form.zip_code?.replace(/\D/g, '') ?? ''
    if (cep.length !== 8) return
    setCepLoading(true)
    const data = await fetchCep(cep)
    setCepLoading(false)
    if (data) {
      setForm((prev) => ({
        ...prev,
        address_street:   data.logradouro || prev.address_street,
        address_district: data.bairro     || prev.address_district,
        address_city:     data.localidade || prev.address_city,
        address_state:    data.uf         || prev.address_state,
      }))
    }
  }

  // Validacao no client antes de enviar
  function validate(): boolean {
    const errors: Record<string, string> = {}

    if (!form.full_name?.trim()) {
      errors.full_name = 'Nome e obrigatorio'
    }

    if (form.entity_type === 'pf' && form.cpf?.replace(/\D/g, '')) {
      if (!validateCpf(form.cpf)) {
        errors.cpf = 'CPF invalido'
      }
    }

    if (form.entity_type === 'pj' && form.cnpj?.replace(/\D/g, '')) {
      if (!validateCnpj(form.cnpj)) {
        errors.cnpj = 'CNPJ invalido'
      }
    }

    if (form.email?.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errors.email = 'E-mail invalido'
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrorMsg(null)

    if (!validate()) return

    // Limpar mascaras antes de enviar
    const payload: VendorPortalFormPayload = {
      ...form,
      cpf:      form.cpf?.replace(/\D/g, '') || null,
      cnpj:     form.cnpj?.replace(/\D/g, '') || null,
      zip_code: form.zip_code?.replace(/\D/g, '') || null,
    }

    try {
      await submit(payload)
      setSubmitted(true)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar dados'
      setErrorMsg(msg)
    }
  }

  // ---- Estados de carregamento / erro / ja usado ----

  if (isLoading) {
    return (
      <VendorLayout>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="size-8 animate-spin text-zinc-400" />
        </div>
      </VendorLayout>
    )
  }

  if (isError) {
    return (
      <VendorLayout>
        <Card className="max-w-lg mx-auto">
          <CardContent className="flex flex-col items-center py-12 text-center">
            <AlertTriangle className="size-12 text-amber-500 mb-4" />
            <h2 className="text-lg font-semibold">Link invalido</h2>
            <p className="text-sm text-zinc-500 mt-2">
              Este link de cadastro nao existe ou ja expirou.
              Entre em contato com a producao para solicitar um novo link.
            </p>
          </CardContent>
        </Card>
      </VendorLayout>
    )
  }

  if (!portal) {
    return (
      <VendorLayout>
        <Card className="max-w-lg mx-auto">
          <CardContent className="flex flex-col items-center py-12 text-center">
            <Clock className="size-12 text-zinc-400 mb-4" />
            <h2 className="text-lg font-semibold">Link expirado</h2>
            <p className="text-sm text-zinc-500 mt-2">
              Este link de cadastro expirou. Solicite um novo link a producao.
            </p>
          </CardContent>
        </Card>
      </VendorLayout>
    )
  }

  // Formulario ja preenchido (token utilizado anteriormente)
  if (portal.status === 'used' || submitted) {
    return (
      <VendorLayout>
        <Card className="max-w-lg mx-auto">
          <CardContent className="flex flex-col items-center py-12 text-center">
            <CheckCircle className="size-12 text-green-500 mb-4" />
            <h2 className="text-lg font-semibold">Dados salvos com sucesso!</h2>
            <p className="text-sm text-zinc-500 mt-2">
              Obrigado por preencher seus dados cadastrais.
              A producao sera notificada e entrara em contato se necessario.
            </p>
          </CardContent>
        </Card>
      </VendorLayout>
    )
  }

  // ---- Formulario ----

  const invite = portal.invite
  const isPf = form.entity_type === 'pf'

  return (
    <VendorLayout>
      <div className="max-w-xl mx-auto space-y-4 pb-12">
        {/* Cabecalho do convite */}
        {invite?.job && (
          <div className="text-center">
            <span className="text-xs font-medium text-zinc-500 bg-zinc-100 rounded px-2 py-1">
              Job: {invite.job.code} — {invite.job.title}
            </span>
          </div>
        )}

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Cadastro de Fornecedor</CardTitle>
            <p className="text-sm text-zinc-500">
              Preencha seus dados para que possamos processar seus pagamentos corretamente.
            </p>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">

              {/* ======== DADOS PESSOAIS ======== */}
              <Section title="Dados Pessoais">
                {/* Tipo */}
                <FormField label="Tipo de Pessoa" required>
                  <Select
                    value={form.entity_type ?? 'pf'}
                    onValueChange={(v) => setField('entity_type', v as 'pf' | 'pj')}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pf">Pessoa Fisica (PF)</SelectItem>
                      <SelectItem value="pj">Pessoa Juridica (PJ)</SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>

                {/* Nome */}
                <FormField label={isPf ? 'Nome Completo' : 'Nome Fantasia'} required error={fieldErrors.full_name}>
                  <Input
                    value={form.full_name ?? ''}
                    onChange={(e) => setField('full_name', e.target.value)}
                    placeholder={isPf ? 'Seu nome completo' : 'Nome fantasia da empresa'}
                    disabled={isSubmitting}
                    required
                  />
                </FormField>

                {/* PF: CPF + RG + Data de Nascimento */}
                {isPf && (
                  <>
                    <FormField label="CPF" error={fieldErrors.cpf}>
                      <Input
                        value={form.cpf ?? ''}
                        onChange={(e) => setField('cpf', e.target.value)}
                        placeholder="000.000.000-00"
                        maxLength={14}
                        disabled={isSubmitting}
                      />
                    </FormField>
                    <FormField label="RG">
                      <Input
                        value={form.rg ?? ''}
                        onChange={(e) => setField('rg', e.target.value)}
                        placeholder="0000000"
                        maxLength={20}
                        disabled={isSubmitting}
                      />
                    </FormField>
                    <FormField label="Data de Nascimento">
                      <Input
                        type="date"
                        value={form.birth_date ?? ''}
                        onChange={(e) => setField('birth_date', e.target.value)}
                        disabled={isSubmitting}
                      />
                    </FormField>
                  </>
                )}

                {/* PJ: CNPJ + Razao Social */}
                {!isPf && (
                  <>
                    <FormField label="CNPJ" error={fieldErrors.cnpj}>
                      <Input
                        value={form.cnpj ?? ''}
                        onChange={(e) => setField('cnpj', e.target.value)}
                        placeholder="00.000.000/0000-00"
                        maxLength={18}
                        disabled={isSubmitting}
                      />
                    </FormField>
                    <FormField label="Razao Social">
                      <Input
                        value={form.razao_social ?? ''}
                        onChange={(e) => setField('razao_social', e.target.value)}
                        placeholder="Razao social da empresa"
                        disabled={isSubmitting}
                      />
                    </FormField>
                  </>
                )}

                {/* Email */}
                <FormField label="E-mail" error={fieldErrors.email}>
                  <Input
                    type="email"
                    value={form.email ?? ''}
                    onChange={(e) => setField('email', e.target.value)}
                    placeholder="seu@email.com"
                    disabled={isSubmitting}
                  />
                </FormField>

                {/* Telefone */}
                <FormField label="Telefone / WhatsApp">
                  <Input
                    value={form.phone ?? ''}
                    onChange={(e) => setField('phone', e.target.value)}
                    placeholder="(11) 99999-9999"
                    maxLength={20}
                    disabled={isSubmitting}
                  />
                </FormField>
              </Section>

              {/* ======== ENDERECO ======== */}
              <Section title="Endereco">
                {/* CEP */}
                <FormField label="CEP">
                  <div className="relative">
                    <Input
                      value={form.zip_code ?? ''}
                      onChange={(e) => setField('zip_code', maskCep(e.target.value))}
                      onBlur={handleCepBlur}
                      placeholder="00000-000"
                      maxLength={9}
                      disabled={isSubmitting}
                    />
                    {cepLoading && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 size-4 animate-spin text-zinc-400" />
                    )}
                  </div>
                  <p className="text-xs text-zinc-400 mt-1">
                    O endereco sera preenchido automaticamente ao sair do campo.
                  </p>
                </FormField>

                {/* Rua */}
                <FormField label="Rua / Avenida">
                  <Input
                    value={form.address_street ?? ''}
                    onChange={(e) => setField('address_street', e.target.value)}
                    placeholder="Nome da rua"
                    disabled={isSubmitting}
                  />
                </FormField>

                {/* Numero + Complemento */}
                <div className="grid grid-cols-2 gap-3">
                  <FormField label="Numero">
                    <Input
                      value={form.address_number ?? ''}
                      onChange={(e) => setField('address_number', e.target.value)}
                      placeholder="123"
                      maxLength={20}
                      disabled={isSubmitting}
                    />
                  </FormField>
                  <FormField label="Complemento">
                    <Input
                      value={form.address_complement ?? ''}
                      onChange={(e) => setField('address_complement', e.target.value)}
                      placeholder="Apto, sala..."
                      maxLength={100}
                      disabled={isSubmitting}
                    />
                  </FormField>
                </div>

                {/* Bairro */}
                <FormField label="Bairro">
                  <Input
                    value={form.address_district ?? ''}
                    onChange={(e) => setField('address_district', e.target.value)}
                    placeholder="Bairro"
                    disabled={isSubmitting}
                  />
                </FormField>

                {/* Cidade + Estado */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <FormField label="Cidade">
                      <Input
                        value={form.address_city ?? ''}
                        onChange={(e) => setField('address_city', e.target.value)}
                        placeholder="Cidade"
                        disabled={isSubmitting}
                      />
                    </FormField>
                  </div>
                  <FormField label="UF">
                    <Input
                      value={form.address_state ?? ''}
                      onChange={(e) => setField('address_state', e.target.value.toUpperCase().slice(0, 2))}
                      placeholder="SP"
                      maxLength={2}
                      disabled={isSubmitting}
                    />
                  </FormField>
                </div>
              </Section>

              {/* ======== DADOS BANCARIOS (colapsavel) ======== */}
              <div className="border rounded-lg overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowBank((p) => !p)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-zinc-50 hover:bg-zinc-100 transition-colors text-sm font-medium text-zinc-700"
                  disabled={isSubmitting}
                >
                  <span>Dados Bancarios (opcional)</span>
                  {showBank ? (
                    <ChevronUp className="size-4 text-zinc-500" />
                  ) : (
                    <ChevronDown className="size-4 text-zinc-500" />
                  )}
                </button>

                {showBank && (
                  <div className="p-4 space-y-4 border-t">
                    <p className="text-xs text-zinc-500">
                      Informe os dados da conta que deseja receber o pagamento.
                    </p>

                    {/* Banco */}
                    <FormField label="Banco">
                      <Input
                        value={form.bank_account?.bank_name ?? ''}
                        onChange={(e) => setBankField('bank_name', e.target.value)}
                        placeholder="Ex: Nubank, Itau, Bradesco..."
                        disabled={isSubmitting}
                      />
                    </FormField>

                    {/* Agencia + Conta */}
                    <div className="grid grid-cols-2 gap-3">
                      <FormField label="Agencia">
                        <Input
                          value={form.bank_account?.agency ?? ''}
                          onChange={(e) => setBankField('agency', e.target.value)}
                          placeholder="0000"
                          maxLength={10}
                          disabled={isSubmitting}
                        />
                      </FormField>
                      <FormField label="Conta">
                        <Input
                          value={form.bank_account?.account_number ?? ''}
                          onChange={(e) => setBankField('account_number', e.target.value)}
                          placeholder="00000-0"
                          maxLength={20}
                          disabled={isSubmitting}
                        />
                      </FormField>
                    </div>

                    {/* Tipo de conta */}
                    <FormField label="Tipo de Conta">
                      <Select
                        value={form.bank_account?.account_type ?? ''}
                        onValueChange={(v) => setBankField('account_type', v || null)}
                        disabled={isSubmitting}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="corrente">Corrente</SelectItem>
                          <SelectItem value="poupanca">Poupanca</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormField>

                    {/* Tipo de chave PIX */}
                    <FormField label="Tipo de Chave PIX">
                      <Select
                        value={form.bank_account?.pix_key_type ?? ''}
                        onValueChange={(v) => setBankField('pix_key_type', v || null)}
                        disabled={isSubmitting}
                      >
                        <SelectTrigger>
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
                    </FormField>

                    {/* Chave PIX */}
                    {form.bank_account?.pix_key_type && (
                      <FormField label="Chave PIX">
                        <Input
                          value={form.bank_account?.pix_key ?? ''}
                          onChange={(e) => setBankField('pix_key', e.target.value)}
                          placeholder="Sua chave PIX"
                          disabled={isSubmitting}
                        />
                      </FormField>
                    )}
                  </div>
                )}
              </div>

              {/* Mensagem de erro global */}
              {errorMsg && (
                <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                  {errorMsg}
                </div>
              )}

              {/* Botao de envio */}
              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting}
                size="lg"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="size-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  'Salvar Dados'
                )}
              </Button>

              {/* Info de expiracao */}
              {invite?.expires_at && (
                <p className="text-center text-xs text-zinc-400">
                  Este link expira em{' '}
                  {new Date(invite.expires_at).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              )}
            </form>
          </CardContent>
        </Card>
      </div>
    </VendorLayout>
  )
}

// ---- Componentes auxiliares ----

function VendorLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col items-center px-4 py-8 sm:py-12">
      {/* Logo */}
      <div className="mb-6">
        <span className="text-xl font-bold tracking-tight text-zinc-900">
          ELLAH<span className="text-rose-500">OS</span>
        </span>
      </div>
      {children}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-zinc-700 border-b pb-1">{title}</h3>
      {children}
    </div>
  )
}

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
      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}
    </div>
  )
}
