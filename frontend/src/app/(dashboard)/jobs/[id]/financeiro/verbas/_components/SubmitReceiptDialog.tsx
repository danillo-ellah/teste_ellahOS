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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCreateReceipt } from '@/hooks/useCashAdvances'
import { safeErrorMessage } from '@/lib/api'
import type { ReceiptType } from '@/types/cost-management'

const RECEIPT_TYPE_OPTIONS: { value: ReceiptType; label: string }[] = [
  { value: 'nf', label: 'Nota Fiscal (NF)' },
  { value: 'recibo', label: 'Recibo' },
  { value: 'ticket', label: 'Ticket / Cupom' },
  { value: 'outros', label: 'Outros' },
]

interface SubmitReceiptDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  advanceId: string
}

export function SubmitReceiptDialog({ open, onOpenChange, advanceId }: SubmitReceiptDialogProps) {
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [receiptType, setReceiptType] = useState<ReceiptType>('recibo')
  const [documentUrl, setDocumentUrl] = useState('')
  const [expenseDate, setExpenseDate] = useState('')

  const { mutateAsync, isPending } = useCreateReceipt()

  function handleClose() {
    setAmount('')
    setDescription('')
    setReceiptType('recibo')
    setDocumentUrl('')
    setExpenseDate('')
    onOpenChange(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const parsedAmount = parseFloat(amount.replace(',', '.'))
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error('Informe um valor valido.')
      return
    }

    if (!description.trim()) {
      toast.error('Informe a descricao do gasto.')
      return
    }

    try {
      await mutateAsync({
        advanceId,
        amount: parsedAmount,
        description: description.trim(),
        receipt_type: receiptType,
        document_url: documentUrl.trim() || undefined,
        expense_date: expenseDate || undefined,
      })
      toast.success('Comprovante submetido com sucesso.')
      handleClose()
    } catch (err) {
      toast.error(safeErrorMessage(err))
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Submeter Comprovante</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Valor */}
          <div className="space-y-1.5">
            <Label htmlFor="receipt-amount">Valor (R$) *</Label>
            <Input
              id="receipt-amount"
              type="text"
              inputMode="decimal"
              placeholder="0,00"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              autoFocus
            />
          </div>

          {/* Descricao */}
          <div className="space-y-1.5">
            <Label htmlFor="receipt-description">Descricao *</Label>
            <Input
              id="receipt-description"
              placeholder="Ex: Almoco equipe, combustivel..."
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>

          {/* Tipo */}
          <div className="space-y-1.5">
            <Label htmlFor="receipt-type">Tipo de comprovante</Label>
            <Select
              value={receiptType}
              onValueChange={v => setReceiptType(v as ReceiptType)}
            >
              <SelectTrigger id="receipt-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RECEIPT_TYPE_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Data do gasto */}
          <div className="space-y-1.5">
            <Label htmlFor="receipt-date">Data do gasto (opcional)</Label>
            <Input
              id="receipt-date"
              type="date"
              value={expenseDate}
              onChange={e => setExpenseDate(e.target.value)}
            />
          </div>

          {/* Link do documento */}
          <div className="space-y-1.5">
            <Label htmlFor="receipt-url">Link do documento no Drive (opcional)</Label>
            <Input
              id="receipt-url"
              type="url"
              placeholder="https://drive.google.com/..."
              value={documentUrl}
              onChange={e => setDocumentUrl(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isPending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Salvando...' : 'Submeter'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
