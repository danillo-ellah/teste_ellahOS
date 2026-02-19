'use client'

import { useState, useEffect } from 'react'
import { Bell, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import {
  useNotificationPreferences,
  useUpdatePreferences,
} from '@/hooks/useNotifications'
import { NOTIFICATION_TYPE_LABELS } from '@/lib/constants'
import type { NotificationType } from '@/types/notifications'

// Todos os tipos de notificacao
const ALL_TYPES: NotificationType[] = [
  'job_approved',
  'status_changed',
  'team_added',
  'deadline_approaching',
  'margin_alert',
  'deliverable_overdue',
  'shooting_date_approaching',
  'integration_failed',
]

// Descricoes curtas para cada tipo
const TYPE_DESCRIPTIONS: Record<NotificationType, string> = {
  job_approved: 'Quando um job e aprovado (interna ou externamente)',
  status_changed: 'Quando o status de um job muda no pipeline',
  team_added: 'Quando voce e adicionado a equipe de um job',
  deadline_approaching: 'Quando um prazo de entrega esta proximo',
  margin_alert: 'Quando a margem de um job fica abaixo do limite',
  deliverable_overdue: 'Quando um entregavel esta atrasado',
  shooting_date_approaching: 'Quando uma diaria de filmagem esta proxima',
  integration_failed: 'Quando uma integracao falha (Drive, WhatsApp, etc)',
}

export default function NotificationSettingsPage() {
  const { data: prefsResponse, isLoading, isError } = useNotificationPreferences()
  const updatePrefs = useUpdatePreferences()

  // State local para toggles reactivos
  const [inApp, setInApp] = useState(true)
  const [whatsapp, setWhatsapp] = useState(false)
  const [mutedTypes, setMutedTypes] = useState<string[]>([])

  // Sync state local com dados do servidor
  const prefs = prefsResponse?.data
  useEffect(() => {
    if (prefs) {
      setInApp(prefs.preferences?.in_app ?? true)
      setWhatsapp(prefs.preferences?.whatsapp ?? false)
      setMutedTypes(prefs.muted_types ?? [])
    }
  }, [prefs])

  async function handleToggleChannel(channel: 'in_app' | 'whatsapp', checked: boolean) {
    if (channel === 'in_app') setInApp(checked)
    else setWhatsapp(checked)

    try {
      await updatePrefs.mutateAsync({
        preferences: {
          ...(channel === 'in_app' ? { in_app: checked } : {}),
          ...(channel === 'whatsapp' ? { whatsapp: checked } : {}),
        },
      })
      toast.success('Preferencias atualizadas')
    } catch {
      // Reverter
      if (channel === 'in_app') setInApp(!checked)
      else setWhatsapp(!checked)
      toast.error('Erro ao atualizar preferencias')
    }
  }

  async function handleToggleType(type: string, enabled: boolean) {
    const newMuted = enabled
      ? mutedTypes.filter((t) => t !== type)
      : [...mutedTypes, type]

    setMutedTypes(newMuted)

    try {
      await updatePrefs.mutateAsync({ muted_types: newMuted })
      toast.success('Preferencias atualizadas')
    } catch {
      setMutedTypes(mutedTypes) // Reverter
      toast.error('Erro ao atualizar preferencias')
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-4 w-64" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-60 w-full" />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="rounded-md border border-border py-16 flex flex-col items-center justify-center text-center gap-3">
        <Bell className="h-10 w-10 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">
          Erro ao carregar preferencias de notificacao.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Configure como e quando voce deseja receber notificacoes.
      </p>

      {/* Canais de notificacao */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Canais</CardTitle>
          <CardDescription>
            Escolha por onde deseja receber notificacoes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="ch-inapp" className="text-sm font-medium">
                In-app (plataforma)
              </Label>
              <p className="text-xs text-muted-foreground">
                Notificacoes dentro do ELLAHOS com badge e sino.
              </p>
            </div>
            <Switch
              id="ch-inapp"
              checked={inApp}
              onCheckedChange={(checked) => handleToggleChannel('in_app', checked)}
              disabled={updatePrefs.isPending}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Label htmlFor="ch-whatsapp" className="text-sm font-medium">
                  WhatsApp
                </Label>
                <Badge variant="secondary" className="text-[10px]">
                  Requer integracao
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Receba alertas criticos via WhatsApp (prazos, pagamentos).
              </p>
            </div>
            <Switch
              id="ch-whatsapp"
              checked={whatsapp}
              onCheckedChange={(checked) => handleToggleChannel('whatsapp', checked)}
              disabled={updatePrefs.isPending}
            />
          </div>
        </CardContent>
      </Card>

      {/* Tipos de notificacao */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tipos de notificacao</CardTitle>
          <CardDescription>
            Desative tipos especificos que nao deseja receber. Tipos desativados ficam silenciados.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {ALL_TYPES.map((type, index) => {
            const isEnabled = !mutedTypes.includes(type)
            return (
              <div key={type}>
                {index > 0 && <Separator className="mb-3" />}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor={`type-${type}`} className="text-sm font-medium">
                      {NOTIFICATION_TYPE_LABELS[type]}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {TYPE_DESCRIPTIONS[type]}
                    </p>
                  </div>
                  <Switch
                    id={`type-${type}`}
                    checked={isEnabled}
                    onCheckedChange={(checked) => handleToggleType(type, checked)}
                    disabled={updatePrefs.isPending}
                  />
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>

      {updatePrefs.isPending && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="size-3 animate-spin" />
          Salvando...
        </div>
      )}
    </div>
  )
}
