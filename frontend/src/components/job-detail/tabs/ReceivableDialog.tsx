'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Receivable, ReceivableStatus, CreateReceivablePayload, UpdateReceivablePayload } from '@/types/receivables'

interface ReceivableDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  receivable: Receivable | null
  onSubmit: (data: CreateReceivablePayload | UpdateReceivablePayload) => Promise<void>
  isSubmitting: boolean
}

const STATUS_OPTIONS: { value: ReceivableStatus; label: string }[] = [
  { value: 'pendente', label: 'Pendente' },
  { value: 'faturado', label: 'Faturado' },
  { value: 'recebido', label: 'Recebido' },
  { value: 'atrasado', label: 'Atrasado' },
  { value: 'cancelado', label: 'Cancelado' },
]

export function ReceivableDialog({
  open,
  onOpenChange,
  receivable,
  onSubmit,
  isSubmitting,
}: ReceivableDialogProps) {
  const isEdit = !!receivable

  const [description, setDescription] = useState('')
  const [installmentNumber, setInstallmentNumber] = useState('1')
  const [amount, setAmount] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [status, setStatus] = useState<ReceivableStatus>('pendente')
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [notes, setNotes] = useState('')

  // Reset form when dialog opens/changes
  useEffect(() => {
    if (open && receivable) {
      setDescription(receivable.description)
      setInstallmentNumber(String(receivable.installment_number))
      setAmount(String(receivable.amount))
      setDueDate(receivable.due_date ?? '')
      setStatus(receivable.status as ReceivableStatus)
      setInvoiceNumber(receivable.invoice_number ?? '')
      setNotes(receivable.notes ?? '')
    } else if (open && !receivable) {
      setDescription('')
      setInstallmentNumber('1')
      setAmount('')
      setDueDate('')
      setStatus('pendente')
      setInvoiceNumber('')
      setNotes('')
    }
  }, [open, receivable])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const parsedAmount = parseFloat(amount.replace(',', '.'))
    if (isNaN(parsedAmount) || parsedAmount <= 0) return

    const parsedInstallment = parseInt(installmentNumber, 10)
    if (isNaN(parsedInstallment) || parsedInstallment < 1) return

    if (isEdit) {
      const payload: UpdateReceivablePayload = {
        description,
        installment_number: parsedInstallment,
        amount: parsedAmount,
        due_date: dueDate || null,
        status,
        invoice_number: invoiceNumber || null,
        notes: notes || null,
      }
      onSubmit(payload)
    } else {
      const payload: CreateReceivablePayload = {
        job_id: '', // will be overridden by parent
        description,
        installment_number: parsedInstallment,
        amount: parsedAmount,
        due_date: dueDate || null,
        status,
        invoice_number: invoiceNumber || null,
        notes: notes || null,
      }
      onSubmit(payload)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Editar Parcela' : 'Nova Parcela de Receita'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Descricao */}
          <div className="space-y-1.5">
            <Label htmlFor="receivable-description">Descricao *</Label>
            <Input
              id="receivable-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Parcela 1 - Aprovacao do roteiro"
              required
              maxLength={500}
            />
          </div>

          {/* Grid: Parcela + Valor */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="receivable-installment">Parcela # *</Label>
              <Input
                id="receivable-installment"
                type="number"
                min={1}
                value={installmentNumber}
                onChange={(e) => setInstallmentNumber(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="receivable-amount">Valor (R$) *</Label>
              <Input
                id="receivable-amount"
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0,00"
                required
              />
            </div>
          </div>

          {/* Grid: Vencimento + Status */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="receivable-due-date">Vencimento</Label>
              <Input
                id="receivable-due-date"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as ReceivableStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Numero NF */}
          <div className="space-y-1.5">
            <Label htmlFor="receivable-invoice">Numero da NF</Label>
            <Input
              id="receivable-invoice"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              placeholder="Opcional"
            />
          </div>

          {/* Observacoes */}
          <div className="space-y-1.5">
            <Label htmlFor="receivable-notes">Observacoes</Label>
            <Textarea
              id="receivable-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observacoes sobre esta parcela..."
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || !description || !amount}>
              {isSubmitting ? 'Salvando...' : isEdit ? 'Salvar' : 'Criar Parcela'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
