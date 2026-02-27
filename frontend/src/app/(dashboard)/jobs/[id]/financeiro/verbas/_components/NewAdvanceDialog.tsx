'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { useCreateCashAdvance } from '@/hooks/useCashAdvances'
import { safeErrorMessage } from '@/lib/api'

interface NewAdvanceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  jobId: string
}

export function NewAdvanceDialog({ open, onOpenChange, jobId }: NewAdvanceDialogProps) {
  const [recipientName, setRecipientName] = useState('')
  const [description, setDescription] = useState('')
  const [amountAuthorized, setAmountAuthorized] = useState('')

  const { mutateAsync, isPending } = useCreateCashAdvance()

  function handleClose() {
    setRecipientName('')
    setDescription('')
    setAmountAuthorized('')
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

    const parsedAmount = parseFloat(amountAuthorized.replace(',', '.'))
    if (!amountAuthorized || isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error('Informe um valor autorizado valido.')
      return
    }

    try {
      await mutateAsync({
        job_id: jobId,
        recipient_name: recipientName.trim(),
        description: description.trim(),
        amount_authorized: parsedAmount,
      })
      toast.success('Adiantamento criado com sucesso.')
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
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isPending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Criando...' : 'Criar adiantamento'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
