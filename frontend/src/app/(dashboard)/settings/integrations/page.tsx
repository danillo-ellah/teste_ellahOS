'use client'

import { useState } from 'react'
import {
  HardDrive,
  MessageCircle,
  FileSignature,
  Workflow,
  Loader2,
  Check,
  X,
  Settings2,
  Zap,
  Plus,
  Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import {
  useIntegrations,
  useUpdateIntegration,
  useTestConnection,
} from '@/hooks/useSettings'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { IntegrationName, DriveTemplate, GoogleDriveConfig } from '@/types/settings'

// ---------------------------------------------------------------------------
// Tipos auxiliares
// ---------------------------------------------------------------------------

// Estende GoogleDriveConfig para incluir templates (campo salvo em JSON livre)
type GoogleDriveConfigWithTemplates = GoogleDriveConfig & { templates?: DriveTemplate[] }

// Chaves validas de pasta destino para templates do Drive
const DRIVE_FOLDER_KEYS = [
  { value: 'documentos', label: 'Documentos' },
  { value: 'contratos', label: 'Contratos' },
  { value: 'orcamentos', label: 'Orcamentos' },
  { value: 'referencias', label: 'Referencias' },
  { value: 'entregaveis', label: 'Entregaveis' },
] as const

// ---------------------------------------------------------------------------
// Tipos de estado local dos formularios
// ---------------------------------------------------------------------------

interface DriveFormState {
  service_account_json: string
  drive_type: 'my_drive' | 'shared_drive'
  shared_drive_id: string
  root_folder_id: string
  enabled: boolean
  templates: DriveTemplate[]
}

interface WhatsAppFormState {
  instance_url: string
  instance_name: string
  api_key: string
  provider: 'evolution' | 'zapi'
  enabled: boolean
}

interface N8nFormState {
  job_approved: string
  margin_alert: string
  status_change: string
  enabled: boolean
}

// ---------------------------------------------------------------------------
// Sub-componente: Skeleton dos cards no loading
// ---------------------------------------------------------------------------

function IntegrationCardSkeleton() {
  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-40" />
            </div>
          </div>
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 pt-0">
        <Separator />
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-5 w-10 rounded-full" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 flex-1 rounded-md" />
          <Skeleton className="h-9 flex-1 rounded-md" />
        </div>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Sub-componente: Badge de status
// ---------------------------------------------------------------------------

interface StatusBadgeProps {
  configured: boolean
  enabled: boolean
}

function StatusBadge({ configured, enabled }: StatusBadgeProps) {
  if (!configured) {
    return (
      <Badge variant="secondary" className="gap-1 text-xs font-medium">
        <span className="h-1.5 w-1.5 rounded-full bg-zinc-400" />
        Nao configurado
      </Badge>
    )
  }
  if (enabled) {
    return (
      <Badge
        variant="outline"
        className="gap-1 border-emerald-500/40 bg-emerald-500/10 text-emerald-600 text-xs font-medium dark:text-emerald-400"
      >
        <Check className="h-3 w-3" />
        Conectado
      </Badge>
    )
  }
  return (
    <Badge
      variant="outline"
      className="gap-1 border-amber-500/40 bg-amber-500/10 text-amber-600 text-xs font-medium dark:text-amber-400"
    >
      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
      Desabilitado
    </Badge>
  )
}

// ---------------------------------------------------------------------------
// Pagina principal
// ---------------------------------------------------------------------------

export default function IntegrationsPage() {
  const { data, isLoading, isError, refetch } = useIntegrations()
  const updateIntegration = useUpdateIntegration()
  const testConnection = useTestConnection()

  // Estado dos dialogs abertos
  const [openDialog, setOpenDialog] = useState<IntegrationName | null>(null)

  // Estado local dos formularios
  const [driveForm, setDriveForm] = useState<DriveFormState>({
    service_account_json: '',
    drive_type: 'my_drive',
    shared_drive_id: '',
    root_folder_id: '',
    enabled: false,
    templates: [],
  })

  const [whatsappForm, setWhatsappForm] = useState<WhatsAppFormState>({
    instance_url: '',
    instance_name: '',
    api_key: '',
    provider: 'evolution',
    enabled: false,
  })

  const [n8nForm, setN8nForm] = useState<N8nFormState>({
    job_approved: '',
    margin_alert: '',
    status_change: '',
    enabled: false,
  })

  // Abre dialog e pre-popula form com dados atuais
  function openDriveDialog() {
    const cfg = data?.google_drive
    setDriveForm({
      service_account_json: '',
      drive_type: cfg?.drive_type ?? 'my_drive',
      shared_drive_id: cfg?.shared_drive_id ?? '',
      root_folder_id: cfg?.root_folder_id ?? '',
      enabled: cfg?.enabled ?? false,
      templates: (cfg as GoogleDriveConfigWithTemplates)?.templates ?? [],
    })
    setOpenDialog('google_drive')
  }

  function openWhatsAppDialog() {
    const cfg = data?.whatsapp
    setWhatsappForm({
      instance_url: cfg?.instance_url ?? '',
      instance_name: cfg?.instance_name ?? '',
      api_key: '',
      provider: cfg?.provider ?? 'evolution',
      enabled: cfg?.enabled ?? false,
    })
    setOpenDialog('whatsapp')
  }

  function openN8nDialog() {
    const cfg = data?.n8n
    setN8nForm({
      job_approved: cfg?.webhooks?.job_approved ?? '',
      margin_alert: cfg?.webhooks?.margin_alert ?? '',
      status_change: cfg?.webhooks?.status_change ?? '',
      enabled: cfg?.enabled ?? false,
    })
    setOpenDialog('n8n')
  }

  // Toggle enable rapido (sem abrir dialog)
  async function handleToggleEnabled(name: IntegrationName, enabled: boolean) {
    try {
      await updateIntegration.mutateAsync({ name, payload: { enabled } })
      toast.success(enabled ? 'Integracao habilitada' : 'Integracao desabilitada')
    } catch {
      toast.error('Erro ao atualizar integracao')
    }
  }

  // Teste de conexao
  async function handleTest(name: IntegrationName) {
    try {
      const result = await testConnection.mutateAsync({ name })
      if (result?.success) {
        toast.success(result.message ?? 'Conexao bem-sucedida')
      } else {
        toast.error(result?.message ?? 'Falha na conexao')
      }
    } catch {
      toast.error('Erro ao testar conexao')
    }
  }

  // Salvar Google Drive
  async function handleSaveDrive() {
    const payload: Record<string, unknown> = {
      enabled: driveForm.enabled,
      drive_type: driveForm.drive_type,
      root_folder_id: driveForm.root_folder_id || null,
      shared_drive_id:
        driveForm.drive_type === 'shared_drive'
          ? driveForm.shared_drive_id || null
          : null,
      templates: driveForm.templates.filter((t) => t.source_id.trim()),
    }
    if (driveForm.service_account_json.trim()) {
      payload.service_account_json = driveForm.service_account_json.trim()
    }
    try {
      await updateIntegration.mutateAsync({ name: 'google_drive', payload })
      toast.success('Google Drive configurado com sucesso')
      setOpenDialog(null)
    } catch {
      toast.error('Erro ao salvar configuracao do Google Drive')
    }
  }

  // Helpers para manipular lista de templates
  function addTemplate() {
    setDriveForm((prev) => ({
      ...prev,
      templates: [
        ...prev.templates,
        { source_id: '', name: '', target_folder_key: 'documentos' },
      ],
    }))
  }

  function removeTemplate(index: number) {
    setDriveForm((prev) => ({
      ...prev,
      templates: prev.templates.filter((_, i) => i !== index),
    }))
  }

  function updateTemplate(index: number, patch: Partial<DriveTemplate>) {
    setDriveForm((prev) => ({
      ...prev,
      templates: prev.templates.map((t, i) => (i === index ? { ...t, ...patch } : t)),
    }))
  }

  // Salvar WhatsApp
  async function handleSaveWhatsApp() {
    const payload: Record<string, unknown> = {
      enabled: whatsappForm.enabled,
      provider: whatsappForm.provider,
      instance_url: whatsappForm.instance_url || null,
      instance_name: whatsappForm.instance_name || null,
    }
    if (whatsappForm.api_key.trim()) {
      payload.api_key = whatsappForm.api_key.trim()
    }
    try {
      await updateIntegration.mutateAsync({ name: 'whatsapp', payload })
      toast.success('WhatsApp configurado com sucesso')
      setOpenDialog(null)
    } catch {
      toast.error('Erro ao salvar configuracao do WhatsApp')
    }
  }

  // Salvar n8n
  async function handleSaveN8n() {
    try {
      await updateIntegration.mutateAsync({
        name: 'n8n',
        payload: {
          enabled: n8nForm.enabled,
          webhooks: {
            job_approved: n8nForm.job_approved || null,
            margin_alert: n8nForm.margin_alert || null,
            status_change: n8nForm.status_change || null,
          },
        },
      })
      toast.success('n8n configurado com sucesso')
      setOpenDialog(null)
    } catch {
      toast.error('Erro ao salvar configuracao do n8n')
    }
  }

  // Variaveis de estado dos configs (com fallbacks para loading)
  const drive = data?.google_drive
  const whatsapp = data?.whatsapp
  const docuseal = data?.docuseal
  const n8n = data?.n8n

  const isSaving = updateIntegration.isPending
  const isTesting = testConnection.isPending
  const testingName = testConnection.variables?.name ?? null

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Descricao */}
      <p className="text-sm text-muted-foreground">
        Conecte o ELLAHOS aos servicos externos para automatizar fluxos de trabalho.
      </p>

      {/* Erro de carregamento */}
      {isError && !isLoading && (
        <div className="rounded-md border border-border py-10 flex flex-col items-center justify-center text-center gap-4">
          <X className="h-8 w-8 text-destructive" />
          <p className="text-sm text-muted-foreground">
            Erro ao carregar configuracoes de integracoes.
          </p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Tentar novamente
          </Button>
        </div>
      )}

      {/* Grid de cards */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* ----------------------------------------------------------------- */}
        {/* GOOGLE DRIVE */}
        {/* ----------------------------------------------------------------- */}
        {isLoading ? (
          <IntegrationCardSkeleton />
        ) : (
          <Card className="flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 ring-1 ring-blue-500/20">
                    <HardDrive className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-semibold">Google Drive</CardTitle>
                    <CardDescription className="text-xs">
                      Armazenamento de arquivos e estrutura de pastas por job
                    </CardDescription>
                  </div>
                </div>
                <StatusBadge
                  configured={drive?.configured ?? false}
                  enabled={drive?.enabled ?? false}
                />
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 pt-0">
              <Separator />
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="drive-enabled"
                  className="text-sm font-medium cursor-pointer"
                >
                  Habilitado
                </Label>
                <Switch
                  id="drive-enabled"
                  checked={drive?.enabled ?? false}
                  disabled={!drive?.configured || isSaving}
                  onCheckedChange={(checked) =>
                    handleToggleEnabled('google_drive', checked)
                  }
                />
              </div>
              {drive?.has_service_account && (
                <p className="text-xs text-muted-foreground">
                  Service Account configurada. Tipo:{' '}
                  <span className="font-medium text-foreground">
                    {drive.drive_type === 'shared_drive' ? 'Drive Compartilhado' : 'Meu Drive'}
                  </span>
                </p>
              )}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 gap-1.5"
                  onClick={openDriveDialog}
                >
                  <Settings2 className="h-3.5 w-3.5" />
                  Configurar
                </Button>
                {drive?.configured && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-1.5"
                    disabled={isTesting && testingName === 'google_drive'}
                    onClick={() => handleTest('google_drive')}
                  >
                    {isTesting && testingName === 'google_drive' ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Zap className="h-3.5 w-3.5" />
                    )}
                    Testar
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ----------------------------------------------------------------- */}
        {/* WHATSAPP */}
        {/* ----------------------------------------------------------------- */}
        {isLoading ? (
          <IntegrationCardSkeleton />
        ) : (
          <Card className="flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 ring-1 ring-emerald-500/20">
                    <MessageCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-semibold">WhatsApp</CardTitle>
                    <CardDescription className="text-xs">
                      Notificacoes e alertas via mensagens automaticas
                    </CardDescription>
                  </div>
                </div>
                <StatusBadge
                  configured={whatsapp?.configured ?? false}
                  enabled={whatsapp?.enabled ?? false}
                />
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 pt-0">
              <Separator />
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="whatsapp-enabled"
                  className="text-sm font-medium cursor-pointer"
                >
                  Habilitado
                </Label>
                <Switch
                  id="whatsapp-enabled"
                  checked={whatsapp?.enabled ?? false}
                  disabled={!whatsapp?.configured || isSaving}
                  onCheckedChange={(checked) =>
                    handleToggleEnabled('whatsapp', checked)
                  }
                />
              </div>
              {whatsapp?.instance_url && (
                <p className="text-xs text-muted-foreground truncate">
                  Instancia:{' '}
                  <span className="font-medium text-foreground">
                    {whatsapp.instance_url}
                  </span>
                </p>
              )}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 gap-1.5"
                  onClick={openWhatsAppDialog}
                >
                  <Settings2 className="h-3.5 w-3.5" />
                  Configurar
                </Button>
                {whatsapp?.configured && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-1.5"
                    disabled={isTesting && testingName === 'whatsapp'}
                    onClick={() => handleTest('whatsapp')}
                  >
                    {isTesting && testingName === 'whatsapp' ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Zap className="h-3.5 w-3.5" />
                    )}
                    Testar
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ----------------------------------------------------------------- */}
        {/* DOCUSEAL */}
        {/* ----------------------------------------------------------------- */}
        {isLoading ? (
          <IntegrationCardSkeleton />
        ) : (
          <Card className="flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/10 ring-1 ring-violet-500/20">
                    <FileSignature className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-semibold">DocuSeal</CardTitle>
                    <CardDescription className="text-xs">
                      Assinatura digital de contratos e aprovacoes
                    </CardDescription>
                  </div>
                </div>
                <Badge
                  variant={docuseal?.configured ? 'default' : 'secondary'}
                  className={cn(
                    'gap-1 text-xs font-medium shrink-0',
                    docuseal?.configured && 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
                  )}
                >
                  {docuseal?.configured ? (
                    <><Check className="h-3 w-3" /> Conectado</>
                  ) : (
                    <><X className="h-3 w-3" /> Nao configurado</>
                  )}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 pt-0">
              <Separator />
              <p className="text-sm text-muted-foreground py-1">
                Configuracao gerenciada via Vault (DOCUSEAL_URL, DOCUSEAL_TOKEN).
                Use a aba Contratos nos jobs para criar e gerenciar assinaturas.
              </p>
              <Button variant="outline" size="sm" className="gap-1.5" disabled>
                <Settings2 className="h-3.5 w-3.5" />
                Via Vault
              </Button>
            </CardContent>
          </Card>
        )}

        {/* ----------------------------------------------------------------- */}
        {/* N8N */}
        {/* ----------------------------------------------------------------- */}
        {isLoading ? (
          <IntegrationCardSkeleton />
        ) : (
          <Card className="flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-500/10 ring-1 ring-rose-500/20">
                    <Workflow className="h-5 w-5 text-rose-600 dark:text-rose-400" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-semibold">n8n</CardTitle>
                    <CardDescription className="text-xs">
                      Automacoes e webhooks para eventos do sistema
                    </CardDescription>
                  </div>
                </div>
                <StatusBadge
                  configured={n8n?.configured ?? false}
                  enabled={n8n?.enabled ?? false}
                />
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 pt-0">
              <Separator />
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="n8n-enabled"
                  className="text-sm font-medium cursor-pointer"
                >
                  Habilitado
                </Label>
                <Switch
                  id="n8n-enabled"
                  checked={n8n?.enabled ?? false}
                  disabled={!n8n?.configured || isSaving}
                  onCheckedChange={(checked) =>
                    handleToggleEnabled('n8n', checked)
                  }
                />
              </div>
              {n8n?.configured && (
                <p className="text-xs text-muted-foreground">
                  {[
                    n8n.webhooks?.job_approved && 'Job Aprovado',
                    n8n.webhooks?.margin_alert && 'Alerta Margem',
                    n8n.webhooks?.status_change && 'Mudanca Status',
                  ]
                    .filter(Boolean)
                    .join(', ') || 'Nenhum webhook configurado'}
                </p>
              )}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 gap-1.5"
                  onClick={openN8nDialog}
                >
                  <Settings2 className="h-3.5 w-3.5" />
                  Configurar
                </Button>
                {n8n?.configured && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-1.5"
                    disabled={isTesting && testingName === 'n8n'}
                    onClick={() => handleTest('n8n')}
                  >
                    {isTesting && testingName === 'n8n' ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Zap className="h-3.5 w-3.5" />
                    )}
                    Testar
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* =================================================================== */}
      {/* DIALOG: Google Drive                                                 */}
      {/* =================================================================== */}
      <Dialog
        open={openDialog === 'google_drive'}
        onOpenChange={(open) => { if (!open) setOpenDialog(null) }}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HardDrive className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              Configurar Google Drive
            </DialogTitle>
            <DialogDescription>
              Cole o JSON da Service Account com permissao ao Drive. Os segredos sao
              armazenados de forma segura e nunca exibidos novamente.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Service Account JSON */}
            <div className="space-y-1.5">
              <Label htmlFor="drive-json">
                Service Account JSON{' '}
                {drive?.has_service_account && (
                  <span className="text-xs font-normal text-emerald-600 dark:text-emerald-400">
                    (ja configurado — cole para substituir)
                  </span>
                )}
              </Label>
              <Textarea
                id="drive-json"
                placeholder='{ "type": "service_account", "project_id": "..." }'
                rows={5}
                className="font-mono text-xs resize-none"
                value={driveForm.service_account_json}
                onChange={(e) =>
                  setDriveForm((prev) => ({
                    ...prev,
                    service_account_json: e.target.value,
                  }))
                }
              />
            </div>

            {/* Tipo de Drive */}
            <div className="space-y-1.5">
              <Label htmlFor="drive-type">Tipo de Drive</Label>
              <Select
                value={driveForm.drive_type}
                onValueChange={(val) =>
                  setDriveForm((prev) => ({
                    ...prev,
                    drive_type: val as 'my_drive' | 'shared_drive',
                  }))
                }
              >
                <SelectTrigger id="drive-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="my_drive">Meu Drive</SelectItem>
                  <SelectItem value="shared_drive">Drive Compartilhado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* ID do Drive Compartilhado (condicional) */}
            {driveForm.drive_type === 'shared_drive' && (
              <div className="space-y-1.5">
                <Label htmlFor="shared-drive-id">ID do Drive Compartilhado</Label>
                <Input
                  id="shared-drive-id"
                  placeholder="Ex: 0AF1xxxxxxxxxxx"
                  value={driveForm.shared_drive_id}
                  onChange={(e) =>
                    setDriveForm((prev) => ({
                      ...prev,
                      shared_drive_id: e.target.value,
                    }))
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Encontre o ID na URL do Drive Compartilhado.
                </p>
              </div>
            )}

            {/* Pasta raiz */}
            <div className="space-y-1.5">
              <Label htmlFor="root-folder-id">ID da Pasta Raiz (opcional)</Label>
              <Input
                id="root-folder-id"
                placeholder="Ex: 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs"
                value={driveForm.root_folder_id}
                onChange={(e) =>
                  setDriveForm((prev) => ({
                    ...prev,
                    root_folder_id: e.target.value,
                  }))
                }
              />
              <p className="text-xs text-muted-foreground">
                Pasta onde os jobs serao organizados. Deixe vazio para usar a raiz do Drive.
              </p>
            </div>

            {/* Toggle habilitado */}
            <div className="flex items-center justify-between rounded-md border border-border p-3">
              <div>
                <p className="text-sm font-medium">Habilitar integracao</p>
                <p className="text-xs text-muted-foreground">
                  Ativa a criacao automatica de pastas nos jobs
                </p>
              </div>
              <Switch
                checked={driveForm.enabled}
                onCheckedChange={(checked) =>
                  setDriveForm((prev) => ({ ...prev, enabled: checked }))
                }
              />
            </div>

            {/* Separador */}
            <Separator />

            {/* Templates de Arquivos */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Templates de Arquivos</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Copiados automaticamente ao criar pastas no Drive para novos jobs.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5 shrink-0"
                  onClick={addTemplate}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Adicionar
                </Button>
              </div>

              {driveForm.templates.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2 text-center">
                  Nenhum template configurado.
                </p>
              ) : (
                <div className="space-y-2">
                  {driveForm.templates.map((tpl, idx) => (
                    <div
                      key={idx}
                      className="rounded-md border border-border bg-muted/30 p-3 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-medium text-muted-foreground">
                          Template {idx + 1}
                        </p>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-destructive"
                          onClick={() => removeTemplate(idx)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span className="sr-only">Remover template</span>
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {/* Source ID */}
                        <div className="space-y-1">
                          <Label className="text-xs">ID do Arquivo (Drive)</Label>
                          <Input
                            placeholder="Ex: 1BxiMVs0XRA5nFMdKvB..."
                            className="h-8 text-xs font-mono"
                            value={tpl.source_id}
                            onChange={(e) =>
                              updateTemplate(idx, { source_id: e.target.value })
                            }
                          />
                        </div>

                        {/* Pasta destino */}
                        <div className="space-y-1">
                          <Label className="text-xs">Pasta Destino</Label>
                          <Select
                            value={tpl.target_folder_key}
                            onValueChange={(val) =>
                              updateTemplate(idx, { target_folder_key: val })
                            }
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {DRIVE_FOLDER_KEYS.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value} className="text-xs">
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Nome do arquivo */}
                      <div className="space-y-1">
                        <Label className="text-xs">Nome do Arquivo</Label>
                        <Input
                          placeholder="Ex: {JOB_ABA} - Orcamento"
                          className="h-8 text-xs"
                          value={tpl.name}
                          onChange={(e) =>
                            updateTemplate(idx, { name: e.target.value })
                          }
                        />
                        <p className="text-xs text-muted-foreground">
                          Placeholders:{' '}
                          <code className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">
                            {'{JOB_ABA}'}
                          </code>{' '}
                          <code className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">
                            {'{JOB_CODE}'}
                          </code>{' '}
                          <code className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">
                            {'{CLIENT}'}
                          </code>
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpenDialog(null)}
              disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button onClick={handleSaveDrive} disabled={isSaving} className="gap-1.5">
              {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* =================================================================== */}
      {/* DIALOG: WhatsApp                                                     */}
      {/* =================================================================== */}
      <Dialog
        open={openDialog === 'whatsapp'}
        onOpenChange={(open) => { if (!open) setOpenDialog(null) }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              Configurar WhatsApp
            </DialogTitle>
            <DialogDescription>
              Configure a instancia do Evolution API ou Z-API para envio de
              notificacoes automaticas.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Provider */}
            <div className="space-y-1.5">
              <Label htmlFor="wa-provider">Provedor</Label>
              <Select
                value={whatsappForm.provider}
                onValueChange={(val) =>
                  setWhatsappForm((prev) => ({
                    ...prev,
                    provider: val as 'evolution' | 'zapi',
                  }))
                }
              >
                <SelectTrigger id="wa-provider">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="evolution">Evolution API</SelectItem>
                  <SelectItem value="zapi">Z-API</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* URL da instancia */}
            <div className="space-y-1.5">
              <Label htmlFor="wa-url">URL da Instancia</Label>
              <Input
                id="wa-url"
                type="url"
                placeholder="https://evolution.suaempresa.com"
                value={whatsappForm.instance_url}
                onChange={(e) =>
                  setWhatsappForm((prev) => ({
                    ...prev,
                    instance_url: e.target.value,
                  }))
                }
              />
            </div>

            {/* Nome da Instancia */}
            <div className="space-y-1.5">
              <Label htmlFor="wa-instance-name">Nome da Instancia</Label>
              <Input
                id="wa-instance-name"
                placeholder="Ex: ellah-prod"
                value={whatsappForm.instance_name}
                onChange={(e) =>
                  setWhatsappForm((prev) => ({
                    ...prev,
                    instance_name: e.target.value,
                  }))
                }
              />
              <p className="text-xs text-muted-foreground">
                Nome configurado na Evolution API (aparece no dashboard).
              </p>
            </div>

            {/* API Key */}
            <div className="space-y-1.5">
              <Label htmlFor="wa-key">
                API Key{' '}
                {whatsapp?.has_api_key && (
                  <span className="text-xs font-normal text-emerald-600 dark:text-emerald-400">
                    (ja configurada — cole para substituir)
                  </span>
                )}
              </Label>
              <Input
                id="wa-key"
                type="password"
                placeholder={whatsapp?.has_api_key ? '••••••••••••' : 'Cole a API Key aqui'}
                value={whatsappForm.api_key}
                onChange={(e) =>
                  setWhatsappForm((prev) => ({
                    ...prev,
                    api_key: e.target.value,
                  }))
                }
                autoComplete="new-password"
              />
            </div>

            {/* Toggle habilitado */}
            <div className="flex items-center justify-between rounded-md border border-border p-3">
              <div>
                <p className="text-sm font-medium">Habilitar integracao</p>
                <p className="text-xs text-muted-foreground">
                  Ativa o envio de notificacoes via WhatsApp
                </p>
              </div>
              <Switch
                checked={whatsappForm.enabled}
                onCheckedChange={(checked) =>
                  setWhatsappForm((prev) => ({ ...prev, enabled: checked }))
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpenDialog(null)}
              disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSaveWhatsApp}
              disabled={isSaving}
              className="gap-1.5"
            >
              {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* =================================================================== */}
      {/* DIALOG: n8n                                                          */}
      {/* =================================================================== */}
      <Dialog
        open={openDialog === 'n8n'}
        onOpenChange={(open) => { if (!open) setOpenDialog(null) }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Workflow className="h-4 w-4 text-rose-600 dark:text-rose-400" />
              Configurar n8n
            </DialogTitle>
            <DialogDescription>
              Configure os webhooks para que o n8n receba eventos do ELLAHOS e
              execute automacoes.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Webhook: Job Aprovado */}
            <div className="space-y-1.5">
              <Label htmlFor="n8n-job-approved">Webhook — Job Aprovado</Label>
              <Input
                id="n8n-job-approved"
                type="url"
                placeholder="https://n8n.suaempresa.com/webhook/..."
                value={n8nForm.job_approved}
                onChange={(e) =>
                  setN8nForm((prev) => ({
                    ...prev,
                    job_approved: e.target.value,
                  }))
                }
              />
            </div>

            {/* Webhook: Alerta de Margem */}
            <div className="space-y-1.5">
              <Label htmlFor="n8n-margin-alert">Webhook — Alerta de Margem</Label>
              <Input
                id="n8n-margin-alert"
                type="url"
                placeholder="https://n8n.suaempresa.com/webhook/..."
                value={n8nForm.margin_alert}
                onChange={(e) =>
                  setN8nForm((prev) => ({
                    ...prev,
                    margin_alert: e.target.value,
                  }))
                }
              />
            </div>

            {/* Webhook: Mudanca de Status */}
            <div className="space-y-1.5">
              <Label htmlFor="n8n-status-change">Webhook — Mudanca de Status</Label>
              <Input
                id="n8n-status-change"
                type="url"
                placeholder="https://n8n.suaempresa.com/webhook/..."
                value={n8nForm.status_change}
                onChange={(e) =>
                  setN8nForm((prev) => ({
                    ...prev,
                    status_change: e.target.value,
                  }))
                }
              />
            </div>

            {/* Toggle habilitado */}
            <div className="flex items-center justify-between rounded-md border border-border p-3">
              <div>
                <p className="text-sm font-medium">Habilitar integracao</p>
                <p className="text-xs text-muted-foreground">
                  Ativa o disparo de webhooks para o n8n
                </p>
              </div>
              <Switch
                checked={n8nForm.enabled}
                onCheckedChange={(checked) =>
                  setN8nForm((prev) => ({ ...prev, enabled: checked }))
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpenDialog(null)}
              disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button onClick={handleSaveN8n} disabled={isSaving} className="gap-1.5">
              {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
