'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import {
  Building2,
  MapPin,
  Film,
  Landmark,
  Upload,
  Loader2,
  Save,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  useCompanyInfo,
  useUpdateCompanyInfo,
  useUploadLogo,
} from '@/hooks/useSettings'
import type { CompanyInfo } from '@/types/settings'

// UFs brasileiras
const BRAZILIAN_STATES = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG',
  'PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO',
] as const

// Mascara CNPJ: 00.000.000/0000-00
function maskCnpj(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 14)
  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
}

// Mascara CEP: 00000-000
function maskCep(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8)
  return digits.replace(/^(\d{5})(\d)/, '$1-$2')
}

// Mascara telefone: (00) 00000-0000
function maskPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 2) return digits.replace(/^(\d{0,2})/, '($1')
  if (digits.length <= 7) return digits.replace(/^(\d{2})(\d{0,5})/, '($1) $2')
  return digits.replace(/^(\d{2})(\d{4,5})(\d{0,4})/, '($1) $2-$3')
}

type FormData = Omit<CompanyInfo, 'logo_url'>

const EMPTY_FORM: FormData = {
  legal_name: '',
  trade_name: '',
  cnpj: '',
  state_registration: '',
  address: '',
  city: '',
  state: '',
  zip_code: '',
  phone: '',
  email: '',
  ancine_registration: '',
  default_audio_company: '',
  bank_name: '',
  bank_agency: '',
  bank_account: '',
  bank_pix: '',
}

export default function CompanySettingsPage() {
  const { data: companyInfo, isLoading } = useCompanyInfo()
  const updateMutation = useUpdateCompanyInfo()
  const uploadMutation = useUploadLogo()

  const [form, setForm] = useState<FormData>(EMPTY_FORM)
  const [isDirty, setIsDirty] = useState(false)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Sincronizar form com dados carregados
  useEffect(() => {
    if (companyInfo) {
      const { logo_url: _logo, ...rest } = companyInfo
      setForm(rest)
      setLogoPreview(companyInfo.logo_url)
      setIsDirty(false)
    }
  }, [companyInfo])

  const handleChange = useCallback((field: keyof FormData, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
    setIsDirty(true)
  }, [])

  const handleMaskedChange = useCallback((field: keyof FormData, value: string, maskFn: (v: string) => string) => {
    setForm(prev => ({ ...prev, [field]: maskFn(value) }))
    setIsDirty(true)
  }, [])

  const handleSave = useCallback(() => {
    updateMutation.mutate(form, {
      onSuccess: () => setIsDirty(false),
    })
  }, [form, updateMutation])

  const handleLogoUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Preview local imediato
    const reader = new FileReader()
    reader.onload = () => setLogoPreview(reader.result as string)
    reader.readAsDataURL(file)

    uploadMutation.mutate(file)
  }, [uploadMutation])

  const handleRemoveLogo = useCallback(() => {
    setLogoPreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [])

  if (isLoading) {
    return (
      <div className="space-y-6 pt-4">
        <div className="grid gap-6 lg:grid-cols-2">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-60" />
              </CardHeader>
              <CardContent className="space-y-4">
                {[1, 2, 3].map(j => (
                  <Skeleton key={j} className="h-9 w-full" />
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 pt-4">
      {/* Header com botao salvar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Dados utilizados em claquetes, cartas orcamento, solicitacoes de NF e outros documentos.
        </p>
        <Button
          onClick={handleSave}
          disabled={!isDirty || updateMutation.isPending}
          size="sm"
        >
          {updateMutation.isPending ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <Save className="mr-2 size-4" />
          )}
          Salvar Alteracoes
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Card 1: Identificacao */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="size-4" />
              Identificacao
            </CardTitle>
            <CardDescription>Razao social, CNPJ e logo da empresa</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Logo upload */}
            <div className="space-y-2">
              <Label>Logo</Label>
              <div className="flex items-center gap-4">
                <div
                  className="flex size-20 cursor-pointer items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-border bg-muted/50 transition-colors hover:border-primary/50"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {logoPreview ? (
                    <img
                      src={logoPreview}
                      alt="Logo"
                      className="size-full object-contain"
                    />
                  ) : (
                    <Upload className="size-6 text-muted-foreground" />
                  )}
                </div>
                <div className="space-y-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadMutation.isPending}
                  >
                    {uploadMutation.isPending ? (
                      <Loader2 className="mr-2 size-3 animate-spin" />
                    ) : (
                      <Upload className="mr-2 size-3" />
                    )}
                    Enviar Logo
                  </Button>
                  {logoPreview && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground"
                      onClick={handleRemoveLogo}
                    >
                      <X className="mr-1 size-3" />
                      Remover
                    </Button>
                  )}
                  <p className="text-xs text-muted-foreground">
                    PNG, JPG ou WebP. Max 2MB.
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={handleLogoUpload}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="legal_name">Razao Social</Label>
              <Input
                id="legal_name"
                value={form.legal_name}
                onChange={e => handleChange('legal_name', e.target.value)}
                placeholder="Ellah Filmes Producoes Ltda"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="trade_name">Nome Fantasia</Label>
              <Input
                id="trade_name"
                value={form.trade_name}
                onChange={e => handleChange('trade_name', e.target.value)}
                placeholder="Ellah Filmes"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="cnpj">CNPJ</Label>
                <Input
                  id="cnpj"
                  value={form.cnpj}
                  onChange={e => handleMaskedChange('cnpj', e.target.value, maskCnpj)}
                  placeholder="00.000.000/0000-00"
                  maxLength={18}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state_registration">Inscricao Estadual</Label>
                <Input
                  id="state_registration"
                  value={form.state_registration}
                  onChange={e => handleChange('state_registration', e.target.value)}
                  placeholder="000.000.000.000"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Contato & Endereco */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MapPin className="size-4" />
              Contato e Endereco
            </CardTitle>
            <CardDescription>Endereco, telefone e email da empresa</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="address">Endereco</Label>
              <Input
                id="address"
                value={form.address}
                onChange={e => handleChange('address', e.target.value)}
                placeholder="Rua Exemplo, 123 - Sala 456"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2 sm:col-span-1">
                <Label htmlFor="city">Cidade</Label>
                <Input
                  id="city"
                  value={form.city}
                  onChange={e => handleChange('city', e.target.value)}
                  placeholder="Sao Paulo"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">UF</Label>
                <Select
                  value={form.state}
                  onValueChange={v => handleChange('state', v)}
                >
                  <SelectTrigger id="state">
                    <SelectValue placeholder="UF" />
                  </SelectTrigger>
                  <SelectContent>
                    {BRAZILIAN_STATES.map(uf => (
                      <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="zip_code">CEP</Label>
                <Input
                  id="zip_code"
                  value={form.zip_code}
                  onChange={e => handleMaskedChange('zip_code', e.target.value, maskCep)}
                  placeholder="00000-000"
                  maxLength={9}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  value={form.phone}
                  onChange={e => handleMaskedChange('phone', e.target.value, maskPhone)}
                  placeholder="(11) 99999-0000"
                  maxLength={15}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={e => handleChange('email', e.target.value)}
                  placeholder="contato@empresa.com.br"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Producao (ANCINE) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Film className="size-4" />
              Producao (ANCINE)
            </CardTitle>
            <CardDescription>Dados de registro e producao audiovisual</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ancine_registration">Registro ANCINE</Label>
              <Input
                id="ancine_registration"
                value={form.ancine_registration}
                onChange={e => handleChange('ancine_registration', e.target.value)}
                placeholder="Ex: 12345"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="default_audio_company">Produtora de Audio Padrao</Label>
              <Input
                id="default_audio_company"
                value={form.default_audio_company}
                onChange={e => handleChange('default_audio_company', e.target.value)}
                placeholder="Nome da produtora de audio"
              />
              <p className="text-xs text-muted-foreground">
                Preenchido automaticamente na claquete como &quot;Producao de Audio&quot;
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Dados Bancarios */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Landmark className="size-4" />
              Dados Bancarios
            </CardTitle>
            <CardDescription>Conta bancaria para recebimentos e pagamentos</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bank_name">Banco</Label>
              <Input
                id="bank_name"
                value={form.bank_name}
                onChange={e => handleChange('bank_name', e.target.value)}
                placeholder="Ex: Itau, Bradesco, Nubank"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="bank_agency">Agencia</Label>
                <Input
                  id="bank_agency"
                  value={form.bank_agency}
                  onChange={e => handleChange('bank_agency', e.target.value)}
                  placeholder="0001"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bank_account">Conta</Label>
                <Input
                  id="bank_account"
                  value={form.bank_account}
                  onChange={e => handleChange('bank_account', e.target.value)}
                  placeholder="12345-6"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bank_pix">Chave PIX</Label>
              <Input
                id="bank_pix"
                value={form.bank_pix}
                onChange={e => handleChange('bank_pix', e.target.value)}
                placeholder="CNPJ, email, telefone ou chave aleatoria"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
