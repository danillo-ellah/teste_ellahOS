'use client'

import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ShieldAlert, Save, Building2, Palette } from 'lucide-react'
import { apiGet, apiMutate, safeErrorMessage } from '@/lib/api'
import { useUserRole } from '@/hooks/useUserRole'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

// --- Tipos ---

interface CompanySettings {
  phone?: string | null
  email?: string | null
  address?: string | null
  city?: string | null
  state?: string | null
  zip?: string | null
  ie?: string | null
  im?: string | null
}

interface TenantSettings {
  id: string
  name: string
  slug: string
  cnpj: string | null
  company_name: string | null
  brand_color: string | null
  logo_url: string | null
  onboarding_completed: boolean
  settings: {
    company?: CompanySettings
    [key: string]: unknown
  } | null
}

// --- Constantes ---

const ADMIN_ROLES = ['admin', 'ceo']
const DEFAULT_BRAND_COLOR = '#3B82F6'
const BR_STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS',
  'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC',
  'SP', 'SE', 'TO',
]

function isValidHex(value: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(value)
}

// --- Componente de Input de Cor ---

function ColorInput({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  const [hexText, setHexText] = useState(value)
  const pickerRef = useRef<HTMLInputElement>(null)

  useEffect(() => { setHexText(value) }, [value])

  function handlePickerChange(e: React.ChangeEvent<HTMLInputElement>) {
    onChange(e.target.value)
    setHexText(e.target.value)
  }

  function handleTextChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value
    setHexText(raw)
    const normalized = raw.startsWith('#') ? raw : `#${raw}`
    if (isValidHex(normalized)) onChange(normalized)
  }

  function handleTextBlur() {
    const normalized = hexText.startsWith('#') ? hexText : `#${hexText}`
    if (isValidHex(normalized)) {
      onChange(normalized)
      setHexText(normalized)
    } else {
      setHexText(value)
    }
  }

  return (
    <div className="flex items-center gap-3">
      <div
        className="relative size-10 shrink-0 rounded-md border border-input overflow-hidden cursor-pointer"
        onClick={() => pickerRef.current?.click()}
        style={{ backgroundColor: isValidHex(value) ? value : DEFAULT_BRAND_COLOR }}
      >
        <input
          ref={pickerRef}
          type="color"
          value={isValidHex(value) ? value : DEFAULT_BRAND_COLOR}
          onChange={handlePickerChange}
          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
          aria-label="Selecionar cor"
        />
      </div>
      <Input
        type="text"
        value={hexText}
        onChange={handleTextChange}
        onBlur={handleTextBlur}
        placeholder="#3B82F6"
        maxLength={7}
        className="w-36 font-mono text-sm"
        aria-label="Codigo hexadecimal da cor"
      />
    </div>
  )
}

// --- Preview de Marca ---

function BrandPreview({ companyName, brandColor, logoUrl }: { companyName: string; brandColor: string; logoUrl: string }) {
  const safeColor = isValidHex(brandColor) ? brandColor : DEFAULT_BRAND_COLOR
  const displayName = companyName.trim() || 'Nome da empresa'

  return (
    <div className="rounded-lg border overflow-hidden">
      <div className="h-1.5 w-full" style={{ backgroundColor: safeColor }} />
      <div className="flex items-center gap-3 p-4 bg-sidebar">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt="Logo" className="size-10 rounded object-contain border" />
        ) : (
          <div
            className="size-10 rounded flex items-center justify-center text-white font-bold text-lg shrink-0"
            style={{ backgroundColor: safeColor }}
          >
            {displayName.charAt(0).toUpperCase()}
          </div>
        )}
        <div>
          <p className="font-semibold text-sm">{displayName}</p>
          <p className="text-xs text-muted-foreground">Plataforma de Producao</p>
        </div>
      </div>
      <div className="px-4 pb-4 bg-sidebar">
        <button
          type="button"
          className="inline-flex h-8 items-center justify-center rounded-md px-4 text-xs font-medium text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: safeColor }}
        >
          Novo Job
        </button>
      </div>
    </div>
  )
}

// --- Pagina Principal ---

export default function AdminSettingsPage() {
  const { role, isLoading: roleLoading } = useUserRole()
  const isAdmin = role !== null && ADMIN_ROLES.includes(role)

  // Branding
  const [companyName, setCompanyName] = useState('')
  const [brandColor, setBrandColor] = useState(DEFAULT_BRAND_COLOR)
  const [logoUrl, setLogoUrl] = useState('')

  // Dados da empresa
  const [cnpj, setCnpj] = useState('')
  const [companyPhone, setCompanyPhone] = useState('')
  const [companyEmail, setCompanyEmail] = useState('')
  const [companyAddress, setCompanyAddress] = useState('')
  const [companyCity, setCompanyCity] = useState('')
  const [companyState, setCompanyState] = useState('')
  const [companyZip, setCompanyZip] = useState('')
  const [companyIe, setCompanyIe] = useState('')
  const [companyIm, setCompanyIm] = useState('')

  const [isDirty, setIsDirty] = useState(false)
  const [initialized, setInitialized] = useState(false)

  const { data: settingsResponse, isLoading: settingsLoading } = useQuery({
    queryKey: ['tenant-settings'],
    queryFn: () => apiGet<TenantSettings>('tenant-management/settings'),
    enabled: isAdmin,
  })

  useEffect(() => {
    if (settingsResponse?.data && !initialized) {
      const s = settingsResponse.data
      setCompanyName(s.company_name ?? s.name ?? '')
      setBrandColor(s.brand_color ?? DEFAULT_BRAND_COLOR)
      setLogoUrl(s.logo_url ?? '')
      setCnpj(s.cnpj ?? '')

      const c = s.settings?.company
      if (c) {
        setCompanyPhone(c.phone ?? '')
        setCompanyEmail(c.email ?? '')
        setCompanyAddress(c.address ?? '')
        setCompanyCity(c.city ?? '')
        setCompanyState(c.state ?? '')
        setCompanyZip(c.zip ?? '')
        setCompanyIe(c.ie ?? '')
        setCompanyIm(c.im ?? '')
      }

      setIsDirty(false)
      setInitialized(true)
    }
  }, [settingsResponse, initialized])

  const saveMutation = useMutation({
    mutationFn: () =>
      apiMutate('tenant-management/settings', 'PATCH', {
        company_name: companyName.trim() || null,
        cnpj: cnpj.trim() || null,
        brand_color: isValidHex(brandColor) ? brandColor : null,
        logo_url: logoUrl.trim() || null,
        company_phone: companyPhone.trim() || null,
        company_email: companyEmail.trim() || null,
        company_address: companyAddress.trim() || null,
        company_city: companyCity.trim() || null,
        company_state: companyState.trim() || null,
        company_zip: companyZip.trim() || null,
        company_ie: companyIe.trim() || null,
        company_im: companyIm.trim() || null,
      }),
    onSuccess: () => {
      toast.success('Configuracoes salvas')
      setIsDirty(false)
    },
    onError: (err) => {
      toast.error(safeErrorMessage(err))
    },
  })

  function markDirty<T>(setter: (v: T) => void) {
    return (v: T) => { setter(v); setIsDirty(true) }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    saveMutation.mutate()
  }

  // --- Guards ---

  if (roleLoading) {
    return <div className="py-16 text-center text-sm text-muted-foreground">Verificando permissoes...</div>
  }

  if (!role || !ADMIN_ROLES.includes(role)) {
    return (
      <div className="py-16 flex flex-col items-center gap-3 text-center">
        <ShieldAlert className="size-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Acesso restrito. Somente administradores podem alterar as configuracoes.</p>
      </div>
    )
  }

  if (settingsLoading) {
    return <div className="py-16 text-center text-sm text-muted-foreground">Carregando configuracoes...</div>
  }

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Configuracoes</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Informacoes da empresa e identidade visual
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Dados da Empresa */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="size-4" />
              Dados da Empresa
            </CardTitle>
            <CardDescription>Informacoes cadastrais da produtora</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Nome + CNPJ */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="company-name">Razao Social / Nome</Label>
                <Input
                  id="company-name"
                  value={companyName}
                  onChange={(e) => markDirty(setCompanyName)(e.target.value)}
                  placeholder="Ex: Ellah Filmes LTDA"
                  maxLength={200}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cnpj">CNPJ</Label>
                <Input
                  id="cnpj"
                  value={cnpj}
                  onChange={(e) => markDirty(setCnpj)(e.target.value)}
                  placeholder="00.000.000/0000-00"
                  maxLength={20}
                />
              </div>
            </div>

            {/* Telefone + Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="company-phone">Telefone</Label>
                <Input
                  id="company-phone"
                  value={companyPhone}
                  onChange={(e) => markDirty(setCompanyPhone)(e.target.value)}
                  placeholder="(11) 99999-0000"
                  maxLength={30}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="company-email">Email</Label>
                <Input
                  id="company-email"
                  type="email"
                  value={companyEmail}
                  onChange={(e) => markDirty(setCompanyEmail)(e.target.value)}
                  placeholder="contato@empresa.com"
                  maxLength={200}
                />
              </div>
            </div>

            {/* Endereco */}
            <div className="space-y-1.5">
              <Label htmlFor="company-address">Endereco</Label>
              <Input
                id="company-address"
                value={companyAddress}
                onChange={(e) => markDirty(setCompanyAddress)(e.target.value)}
                placeholder="Rua, numero, complemento, bairro"
                maxLength={500}
              />
            </div>

            {/* Cidade + Estado + CEP */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="space-y-1.5 col-span-2 sm:col-span-1">
                <Label htmlFor="company-city">Cidade</Label>
                <Input
                  id="company-city"
                  value={companyCity}
                  onChange={(e) => markDirty(setCompanyCity)(e.target.value)}
                  placeholder="Sao Paulo"
                  maxLength={100}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="company-state">UF</Label>
                <select
                  id="company-state"
                  value={companyState}
                  onChange={(e) => markDirty(setCompanyState)(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="">--</option>
                  {BR_STATES.map((uf) => (
                    <option key={uf} value={uf}>{uf}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="company-zip">CEP</Label>
                <Input
                  id="company-zip"
                  value={companyZip}
                  onChange={(e) => markDirty(setCompanyZip)(e.target.value)}
                  placeholder="00000-000"
                  maxLength={10}
                />
              </div>
            </div>

            {/* IE + IM */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="company-ie">Inscricao Estadual</Label>
                <Input
                  id="company-ie"
                  value={companyIe}
                  onChange={(e) => markDirty(setCompanyIe)(e.target.value)}
                  placeholder="Opcional"
                  maxLength={30}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="company-im">Inscricao Municipal</Label>
                <Input
                  id="company-im"
                  value={companyIm}
                  onChange={(e) => markDirty(setCompanyIm)(e.target.value)}
                  placeholder="Opcional"
                  maxLength={30}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Identidade Visual */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Palette className="size-4" />
              Identidade Visual
            </CardTitle>
            <CardDescription>Personalize a aparencia do sistema</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Cor da marca */}
            <div className="space-y-1.5">
              <Label>Cor da marca</Label>
              <ColorInput value={brandColor} onChange={(c) => { setBrandColor(c); setIsDirty(true) }} />
              <p className="text-xs text-muted-foreground">
                Utilizada em botoes, destaques e elementos visuais
              </p>
            </div>

            {/* Logo URL */}
            <div className="space-y-1.5">
              <Label htmlFor="logo-url">URL do logotipo</Label>
              <Input
                id="logo-url"
                type="url"
                value={logoUrl}
                onChange={(e) => markDirty(setLogoUrl)(e.target.value)}
                placeholder="https://exemplo.com/logo.png"
              />
              <p className="text-xs text-muted-foreground">
                Cole a URL de uma imagem PNG ou SVG do logotipo
              </p>
            </div>

            {/* Preview */}
            <BrandPreview companyName={companyName} brandColor={brandColor} logoUrl={logoUrl} />
          </CardContent>
        </Card>

        {/* Salvar */}
        <div className="flex justify-end">
          <Button type="submit" disabled={saveMutation.isPending || !isDirty} className="h-9 px-5">
            <Save className="size-4 mr-1.5" />
            {saveMutation.isPending ? 'Salvando...' : 'Salvar Configuracoes'}
          </Button>
        </div>
      </form>
    </div>
  )
}
