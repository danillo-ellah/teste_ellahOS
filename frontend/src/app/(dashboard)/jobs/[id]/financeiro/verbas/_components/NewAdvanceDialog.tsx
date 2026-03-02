'use client'

import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useCreateCashAdvance } from '@/hooks/useCashAdvances'
import { safeErrorMessage } from '@/lib/api'
import { formatCurrency } from '@/lib/format'

interface NewAdvanceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  jobId: string
  // Valor de threshold pre-calculado pela pagina mae (10% do closed_value)
  thresholdValue?: number | null
}

export function NewAdvanceDialog({
  open,
  onOpenChange,
  jobId,
  thresholdValue,
}: NewAdvanceDialogProps) {
  const [recipientName, setRecipientName] = useState('')
  const [description, setDescription] = useState('')
  const [amountAuthorized, setAmountAuthorized] = useState('')
  const [pixKey, setPixKey] = useState('')
  const [notes, setNotes] = useState('')

  const { mutateAsync, isPending } = useCreateCashAdvance()

  // Calcula em tempo real se o valor digitado excede o threshold
  const parsedAmount = parseFloat(amountAuthorized.replace(',', '.'))
  const amountIsValid = !isNaN(parsedAmount) && parsedAmount > 0
  const exceedsThreshold =
    amountIsValid && thresholdValue !== null && thresholdValue !== undefined
      ? parsedAmount > thresholdValue
      : false

  function handleClose() {
    setRecipientName('')
    setDescription('')
    setAmountAuthorized('')
    setPixKey('')
    setNotes('')
    onOpenChange(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!recipientName.trim()) {
      toast.error('Informe o nome do beneficiario.')
      return
    }

    if (!description.trim()) {
      toast.error('Informe a descricao da verba.')
      return
    }

    if (!amountAuthorized || isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error('Informe um valor autorizado valido.')
      return
    }

    try {
      const result = await mutateAsync({
        job_id: jobId,
        recipient_name: recipientName.trim(),
        description: description.trim(),
        amount_authorized: parsedAmount,
        pix_key_used: pixKey.trim() || undefined,
        notes: notes.trim() || undefined,
      })

      // Se a API retornou warnings (threshold excedido), mostra toast diferenciado
      const warnings = (result as { warnings?: { code: string; message: string }[] })?.warnings
      if (warnings?.some(w => w.code === 'THRESHOLD_EXCEEDED')) {
        toast.warning('Adiantamento criado. Requer aprovacao de CEO/CFO — valor acima de 10% do orcamento.', {
          duration: 8000,
        })
      } else {
        toast.success('Adiantamento criado com sucesso.')
      }

      handleClose()
    } catch (err) {
      toast.error(safeErrorMessage(err))
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Novo Adiantamento de Verba</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Beneficiario */}
          <div className="space-y-1.5">
            <Label htmlFor="advance-recipient">Beneficiario *</Label>
            <Input
              id="advance-recipient"
              placeholder="Nome de quem recebe a verba"
              value={recipientName}
              onChange={e => setRecipientName(e.target.value)}
              autoFocus
            />
          </div>

          {/* Descricao */}
          <div className="space-y-1.5">
            <Label htmlFor="advance-description">Descricao *</Label>
            <Input
              id="advance-description"
              placeholder="Ex: Verba de producao — Dia 1"
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>

          {/* Valor autorizado */}
          <div className="space-y-1.5">
            <Label htmlFor="advance-amount">Valor autorizado (R$) *</Label>
            <Input
              id="advance-amount"
              type="text"
              inputMode="decimal"
              placeholder="0,00"
              value={amountAuthorized}
              onChange={e => setAmountAuthorized(e.target.value)}
            />
            {thresholdValue !== null && thresholdValue !== undefined && (
              <p className="text-xs text-muted-foreground">
                Limite sem aprovacao adicional: {formatCurrency(thresholdValue)}
              </p>
            )}
          </div>

          {/* Alerta de threshold excedido — aparece em tempo real */}
          {exceedsThreshold && (
            <Alert className="border-amber-200 bg-amber-50 py-3 [&>svg]:text-amber-600">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-amber-800 text-sm">
                <strong>Valor acima de 10% do orcamento.</strong> Este adiantamento sera criado
                com flag de aprovacao pendente — CEO ou CFO devera aprovar antes de executar.
              </AlertDescription>
            </Alert>
          )}

          {/* Chave PIX (opcional) */}
          <div className="space-y-1.5">
            <Label htmlFor="advance-pix">Chave PIX do beneficiario (opcional)</Label>
            <Input
              id="advance-pix"
              type="text"
              placeholder="CPF, email, telefone ou chave aleatoria"
              value={pixKey}
              onChange={e => setPixKey(e.target.value)}
            />
          </div>

          {/* Observacoes */}
          <div className="space-y-1.5">
            <Label htmlFor="advance-notes">Observacoes (opcional)</Label>
            <Textarea
              id="advance-notes"
              placeholder="Informacoes adicionais sobre esta verba..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isPending}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              variant={exceedsThreshold ? 'destructive' : 'default'}
            >
              {isPending
                ? 'Criando...'
                : exceedsThreshold
                  ? 'Criar (requer aprovacao CEO/CFO)'
                  : 'Criar adiantamento'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
