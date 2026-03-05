'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { safeErrorMessage } from '@/lib/api'
import { usePostponePayment } from '@/hooks/usePaymentCalendar'

// Data minima: hoje (formato YYYY-MM-DD)
function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

export interface PostponeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** IDs dos cost_items a prorrogar */
  costItemIds: string[]
  onSuccess?: () => void
}

export function PostponeDialog({
  open,
  onOpenChange,
  costItemIds,
  onSuccess,
}: PostponeDialogProps) {
  const [newDate, setNewDate] = useState('')
  const [reason, setReason] = useState('')

  // Erros de validacao inline
  const [dateError, setDateError] = useState<string | null>(null)
  const [reasonError, setReasonError] = useState<string | null>(null)

  const { mutateAsync: postpone, isPending } = usePostponePayment()

  function validate(): boolean {
    let valid = true

    if (!newDate) {
      setDateError('Informe a nova data de vencimento')
      valid = false
    } else if (newDate < todayISO()) {
      setDateError('A data deve ser igual ou posterior a hoje')
      valid = false
    } else {
      setDateError(null)
    }

    if (!reason.trim()) {
      setReasonError('O motivo e obrigatorio')
      valid = false
    } else if (reason.trim().length < 5) {
      setReasonError('Informe um motivo mais detalhado (minimo 5 caracteres)')
      valid = false
    } else {
      setReasonError(null)
    }

    return valid
  }

  async function handleConfirm() {
    if (!validate()) return

    try {
      const result = await postpone({
        cost_item_ids: costItemIds,
        new_due_date: newDate,
        reason: reason.trim(),
      })

      toast.success(
        `${result.data?.items_updated ?? costItemIds.length} item(s) prorrogado(s) com sucesso`,
      )
      handleClose()
      onSuccess?.()
    } catch (err) {
      toast.error(safeErrorMessage(err))
    }
  }

  function handleClose() {
    onOpenChange(false)
    // Limpar estado apos fechar
    setTimeout(() => {
      setNewDate('')
      setReason('')
      setDateError(null)
      setReasonError(null)
    }, 200)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Prorrogar Vencimento</DialogTitle>
          <DialogDescription>
            {costItemIds.length} item(s) selecionado(s). A nova data sera aplicada a todos.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Nova data de vencimento */}
          <div className="space-y-1.5">
            <Label htmlFor="pd-new-date">Nova Data de Vencimento</Label>
            <Input
              id="pd-new-date"
              type="date"
              min={todayISO()}
              value={newDate}
              onChange={e => {
                setNewDate(e.target.value)
                if (dateError) setDateError(null)
              }}
              aria-invalid={!!dateError}
            />
            {dateError && (
              <p className="text-xs text-destructive">{dateError}</p>
            )}
          </div>

          {/* Motivo */}
          <div className="space-y-1.5">
            <Label htmlFor="pd-reason">
              Motivo{' '}
              <span className="text-muted-foreground font-normal">(obrigatorio)</span>
            </Label>
            <Textarea
              id="pd-reason"
              placeholder="Ex: Aguardando NF do fornecedor"
              rows={3}
              value={reason}
              onChange={e => {
                setReason(e.target.value)
                if (reasonError) setReasonError(null)
              }}
              aria-invalid={!!reasonError}
            />
            {reasonError && (
              <p className="text-xs text-destructive">{reasonError}</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isPending}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={isPending || costItemIds.length === 0}>
            {isPending ? 'Prorrogando...' : 'Confirmar Prorrogacao'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
