'use client'

import { useState } from 'react'
import { Copy, Check, Loader2, Globe } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { useCreateSession } from '@/hooks/use-portal'

const schema = z.object({
  label: z.string().min(1, 'Informe um nome para o link'),
  contact_id: z.string().optional(),
  expires_at: z.string().optional(),
  perm_timeline: z.boolean(),
  perm_documents: z.boolean(),
  perm_approvals: z.boolean(),
  perm_messages: z.boolean(),
})

type FormValues = z.infer<typeof schema>

interface CreateSessionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  jobId: string
}

export function CreateSessionDialog({
  open,
  onOpenChange,
  jobId,
}: CreateSessionDialogProps) {
  const [portalUrl, setPortalUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const { mutateAsync: createSession, isPending } = useCreateSession()

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      label: '',
      perm_timeline: true,
      perm_documents: true,
      perm_approvals: true,
      perm_messages: true,
    },
  })

  async function onSubmit(values: FormValues) {
    try {
      // Converter YYYY-MM-DD para ISO 8601 datetime (backend espera datetime completo)
      let expiresAt: string | null = values.expires_at || null
      if (expiresAt) {
        expiresAt = new Date(expiresAt + 'T23:59:59.000Z').toISOString()
      }

      const data = await createSession({
        job_id: jobId,
        label: values.label,
        contact_id: values.contact_id || null,
        expires_at: expiresAt,
        permissions: {
          timeline: values.perm_timeline,
          documents: values.perm_documents,
          approvals: values.perm_approvals,
          messages: values.perm_messages,
        },
      })

      setPortalUrl(data.portal_url)
      toast.success('Link do portal criado com sucesso!')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao criar link'
      toast.error(msg)
    }
  }

  async function handleCopy() {
    if (!portalUrl) return
    try {
      await navigator.clipboard.writeText(portalUrl)
      setCopied(true)
      toast.success('Link copiado para a area de transferencia!')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Nao foi possivel copiar o link')
    }
  }

  function handleClose() {
    // Resetar ao fechar
    onOpenChange(false)
    setTimeout(() => {
      form.reset()
      setPortalUrl(null)
      setCopied(false)
    }, 300)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" aria-hidden="true" />
            Criar link do portal
          </DialogTitle>
          <DialogDescription>
            Crie um link de acesso ao portal do cliente para este job.
          </DialogDescription>
        </DialogHeader>

        {/* Estado pos-criacao: exibe o URL */}
        {portalUrl ? (
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Link criado com sucesso! Compartilhe com o cliente:
            </p>
            <div className="flex items-center gap-2 p-3 rounded-lg border border-border bg-muted/30">
              <p className="text-sm font-mono text-foreground flex-1 truncate">
                {portalUrl}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                className="shrink-0 gap-2"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                {copied ? 'Copiado!' : 'Copiar'}
              </Button>
            </div>
            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={handleClose}>
                Fechar
              </Button>
              <Button
                onClick={() => {
                  form.reset()
                  setPortalUrl(null)
                }}
              >
                Criar outro link
              </Button>
            </DialogFooter>
          </div>
        ) : (
          /* Formulario de criacao */
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
            {/* Label */}
            <div className="space-y-1.5">
              <Label htmlFor="session-label">
                Nome do link <span className="text-destructive">*</span>
              </Label>
              <Input
                id="session-label"
                placeholder="Ex: Aprovacao do Cliente, Maria Costa, v1"
                {...form.register('label')}
                disabled={isPending}
              />
              {form.formState.errors.label && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.label.message}
                </p>
              )}
            </div>

            {/* Expiracao */}
            <div className="space-y-1.5">
              <Label htmlFor="session-expires">Expira em (opcional)</Label>
              <Input
                id="session-expires"
                type="date"
                {...form.register('expires_at')}
                disabled={isPending}
                min={new Date().toISOString().split('T')[0]}
              />
              <p className="text-xs text-muted-foreground">
                Deixe em branco para nao expirar.
              </p>
            </div>

            {/* Permissoes */}
            <div className="space-y-2">
              <Label>Permissoes do portal</Label>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    { key: 'perm_timeline', label: 'Timeline do projeto' },
                    { key: 'perm_documents', label: 'Documentos' },
                    { key: 'perm_approvals', label: 'Aprovacoes' },
                    { key: 'perm_messages', label: 'Mensagens' },
                  ] as const
                ).map(({ key, label }) => (
                  <label
                    key={key}
                    className={cn(
                      'flex items-center gap-2 rounded-md border border-border p-2.5 cursor-pointer',
                      'hover:bg-accent/50 transition-colors',
                    )}
                  >
                    <Checkbox
                      id={key}
                      checked={form.watch(key)}
                      onCheckedChange={(checked) => form.setValue(key, !!checked)}
                      disabled={isPending}
                    />
                    <span className="text-sm">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={handleClose}
                disabled={isPending}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending} className="gap-2">
                {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Criar link
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
