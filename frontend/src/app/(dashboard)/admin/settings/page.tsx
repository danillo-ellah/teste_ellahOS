'use client'

import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ShieldAlert, Save } from 'lucide-react'
import { apiGet, apiMutate, safeErrorMessage } from '@/lib/api'
import { useUserRole } from '@/hooks/useUserRole'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

// --- Tipos ---

interface TenantSettings {
  company_name: string | null
  brand_color: string | null
  logo_url: string | null
}

// --- Constantes ---

const ADMIN_ROLES = ['admin', 'ceo']
const DEFAULT_BRAND_COLOR = '#3B82F6'

function isValidHex(value: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(value)
}

// --- Componente de Input de Cor ---

interface ColorInputProps {
  value: string
  onChange: (color: string) => void
}

function ColorInput({ value, onChange }: ColorInputProps) {
  const [hexText, setHexText] = useState(value)
  const pickerRef = useRef<HTMLInputElement>(null)

  // Sincronizar texto quando o valor externo muda
  useEffect(() => {
    setHexText(value)
  }, [value])

  function handlePickerChange(e: React.ChangeEvent<HTMLInputElement>) {
    const color = e.target.value
    onChange(color)
    setHexText(color)
  }

  function handleTextChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value
    setHexText(raw)
    // So propaga se for um hex valido completo
    const normalized = raw.startsWith('#') ? raw : `#${raw}`
    if (isValidHex(normalized)) {
      onChange(normalized)
    }
  }

  function handleTextBlur() {
    // Ao sair do campo, normalizar ou reverter para o valor valido
    const normalized = hexText.startsWith('#') ? hexText : `#${hexText}`
    if (isValidHex(normalized)) {
      onChange(normalized)
      setHexText(normalized)
    } else {
      // Reverter para o valor atual valido
      setHexText(value)
    }
  }

  return (
    <div className="flex items-center gap-3">
      {/* Color picker nativo */}
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

      {/* Hex text input */}
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

interface BrandPreviewProps {
  companyName: string
  brandColor: string
  logoUrl: string
}

function BrandPreview({ companyName, brandColor, logoUrl }: BrandPreviewProps) {
  const safeColor = isValidHex(brandColor) ? brandColor : DEFAULT_BRAND_COLOR
  const displayName = companyName.trim() || 'Nome da empresa'

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Preview da marca
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border overflow-hidden">
          {/* Barra de cor da marca */}
          <div className="h-1.5 w-full" style={{ backgroundColor: safeColor }} />

          {/* Conteudo da preview */}
          <div className="flex items-center gap-3 p-4 bg-sidebar">
            {/* Logo ou inicial */}
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt="Logo"
                className="size-10 rounded object-contain border"
              />
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

          {/* Botao de exemplo com a cor */}
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
      </CardContent>
    </Card>
  )
}

// --- Pagina Principal ---

export default function AdminSettingsPage() {
  const { role, isLoading: roleLoading } = useUserRole()
  const isAdmin = role !== null && ADMIN_ROLES.includes(role)

  const [companyName, setCompanyName] = useState('')
  const [brandColor, setBrandColor] = useState(DEFAULT_BRAND_COLOR)
  const [logoUrl, setLogoUrl] = useState('')
  const [isDirty, setIsDirty] = useState(false)
  const [initialized, setInitialized] = useState(false)

  // Buscar configuracoes atuais
  const { data: settingsResponse, isLoading: settingsLoading } = useQuery({
    queryKey: ['tenant-settings'],
    queryFn: () => apiGet<TenantSettings>('tenant-management/settings'),
    enabled: isAdmin,
  })

  // Inicializar formulario com dados do servidor (React Query v5 — sem onSuccess)
  useEffect(() => {
    if (settingsResponse?.data && !initialized) {
      const settings = settingsResponse.data
      setCompanyName(settings.company_name ?? '')
      setBrandColor(settings.brand_color ?? DEFAULT_BRAND_COLOR)
      setLogoUrl(settings.logo_url ?? '')
      setIsDirty(false)
      setInitialized(true)
    }
  }, [settingsResponse, initialized])

  const saveMutation = useMutation({
    mutationFn: () =>
      apiMutate('tenant-management/settings', 'PATCH', {
        company_name: companyName.trim() || null,
        brand_color: isValidHex(brandColor) ? brandColor : null,
        logo_url: logoUrl.trim() || null,
      }),
    onSuccess: () => {
      toast.success('Configuracoes salvas com sucesso')
      setIsDirty(false)
    },
    onError: (err) => {
      toast.error(safeErrorMessage(err))
    },
  })

  function handleCompanyNameChange(value: string) {
    setCompanyName(value)
    setIsDirty(true)
  }

  function handleBrandColorChange(color: string) {
    setBrandColor(color)
    setIsDirty(true)
  }

  function handleLogoUrlChange(value: string) {
    setLogoUrl(value)
    setIsDirty(true)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    saveMutation.mutate()
  }

  // --- Guards ---

  if (roleLoading) {
    return (
      <div className="py-16 text-center text-sm text-muted-foreground">
        Verificando permissoes...
      </div>
    )
  }

  if (!role || !ADMIN_ROLES.includes(role)) {
    return (
      <div className="py-16 flex flex-col items-center gap-3 text-center">
        <ShieldAlert className="size-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Acesso restrito. Somente administradores podem alterar as configuracoes.
        </p>
      </div>
    )
  }

  if (settingsLoading) {
    return (
      <div className="py-16 text-center text-sm text-muted-foreground">
        Carregando configuracoes...
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Configuracoes</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Personalize as informacoes e a identidade visual da sua organizacao
        </p>
      </div>

      {/* Formulario */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Informacoes da Empresa</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Nome da empresa */}
            <div className="space-y-1.5">
              <Label htmlFor="company-name">Nome da empresa</Label>
              <Input
                id="company-name"
                type="text"
                value={companyName}
                onChange={(e) => handleCompanyNameChange(e.target.value)}
                placeholder="Ex: Ellah Filmes Producoes"
                maxLength={120}
              />
            </div>

            {/* Cor da marca */}
            <div className="space-y-1.5">
              <Label>Cor da marca</Label>
              <ColorInput value={brandColor} onChange={handleBrandColorChange} />
              <p className="text-xs text-muted-foreground">
                Utilizada em botoes, destaques e elementos visuais do sistema
              </p>
            </div>

            {/* Logo URL */}
            <div className="space-y-1.5">
              <Label htmlFor="logo-url">URL do logotipo</Label>
              <Input
                id="logo-url"
                type="url"
                value={logoUrl}
                onChange={(e) => handleLogoUrlChange(e.target.value)}
                placeholder="https://exemplo.com/logo.png"
              />
              <p className="text-xs text-muted-foreground">
                Link publico para a imagem do logotipo (upload em breve)
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Preview */}
        <BrandPreview
          companyName={companyName}
          brandColor={brandColor}
          logoUrl={logoUrl}
        />

        {/* Botao de salvar */}
        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={saveMutation.isPending || !isDirty}
            className="h-9 px-5"
          >
            <Save className="size-4 mr-1.5" />
            {saveMutation.isPending ? 'Salvando...' : 'Salvar Configuracoes'}
          </Button>
        </div>
      </form>
    </div>
  )
}
