'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Link2, Copy, CheckCheck, ExternalLink } from 'lucide-react'
import { useCreateVendorInvite } from '@/hooks/useVendorPortal'
import { safeErrorMessage } from '@/lib/api'
import type { Vendor } from '@/types/cost-management'

interface SendInviteDialogProps {
  vendor: Vendor
  open: boolean
  onOpenChange: (open: boolean) => void
}

// Dialog para gerar e copiar o link de convite do portal do fornecedor
export function SendInviteDialog({ vendor, open, onOpenChange }: SendInviteDialogProps) {
  const [portalUrl, setPortalUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [expiresAt, setExpiresAt] = useState<string | null>(null)

  const { mutateAsync: createInvite, isPending } = useCreateVendorInvite()

  function handleClose(value: boolean) {
    if (!value) {
      // Resetar estado ao fechar
      setPortalUrl(null)
      setCopied(false)
      setExpiresAt(null)
    }
    onOpenChange(value)
  }

  async function handleGenerate() {
    try {
      const result = await createInvite({
        vendor_id: vendor.id,
        email: vendor.email ?? undefined,
        name: vendor.full_name,
        expires_days: 30,
      })

      if (result.data?.portal_url) {
        setPortalUrl(result.data.portal_url)
        setExpiresAt(result.data.expires_at ?? null)
        toast.success('Link de convite gerado!')
      }
    } catch (err) {
      toast.error(safeErrorMessage(err))
    }
  }

  async function handleCopy() {
    if (!portalUrl) return
    try {
      await navigator.clipboard.writeText(portalUrl)
      setCopied(true)
      toast.success('Link copiado para a area de transferencia!')
      setTimeout(() => setCopied(false), 3000)
    } catch {
      toast.error('Nao foi possivel copiar. Copie manualmente o link.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="size-4" />
            Enviar Convite de Cadastro
          </DialogTitle>
          <DialogDescription>
            Gere um link para que <strong>{vendor.full_name}</strong> preencha seus
            dados cadastrais diretamente (nome, CPF/CNPJ, endereco, dados bancarios).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {!portalUrl ? (
            // Estado inicial — antes de gerar o link
            <div className="space-y-3">
              <div className="rounded-md bg-zinc-50 border p-3 text-sm text-zinc-600 space-y-1">
                <p className="font-medium text-zinc-700">O que o fornecedor podara fazer:</p>
                <ul className="list-disc list-inside space-y-0.5 text-zinc-500">
                  <li>Informar CPF/CNPJ, RG, data de nascimento</li>
                  <li>Preencher endereco completo</li>
                  <li>Cadastrar dados bancarios e chave PIX</li>
                </ul>
              </div>
              <p className="text-xs text-zinc-400">
                O link expira em 30 dias. Voce pode gerar um novo link a qualquer momento.
              </p>
            </div>
          ) : (
            // Estado apos gerar — exibe o link
            <div className="space-y-3">
              <Label className="text-sm font-medium">Link de Cadastro</Label>

              <div className="flex gap-2">
                <Input
                  value={portalUrl}
                  readOnly
                  className="text-xs font-mono bg-zinc-50"
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleCopy}
                  className="shrink-0"
                  title="Copiar link"
                >
                  {copied ? (
                    <CheckCheck className="size-4 text-green-600" />
                  ) : (
                    <Copy className="size-4" />
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => window.open(portalUrl, '_blank')}
                  className="shrink-0"
                  title="Abrir link em nova aba"
                >
                  <ExternalLink className="size-4" />
                </Button>
              </div>

              {expiresAt && (
                <p className="text-xs text-zinc-400">
                  Expira em{' '}
                  {new Date(expiresAt).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              )}

              <div className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700">
                Envie este link por WhatsApp ou e-mail para o fornecedor.
                Nao compartilhe publicamente — o link da acesso direto ao cadastro.
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => handleClose(false)} disabled={isPending}>
            {portalUrl ? 'Fechar' : 'Cancelar'}
          </Button>
          {!portalUrl && (
            <Button onClick={handleGenerate} disabled={isPending}>
              {isPending ? 'Gerando...' : 'Gerar Link de Convite'}
            </Button>
          )}
          {portalUrl && (
            <Button variant="outline" onClick={handleGenerate} disabled={isPending}>
              {isPending ? 'Gerando...' : 'Gerar Novo Link'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
