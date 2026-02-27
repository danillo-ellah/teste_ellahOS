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
import { useDepositCashAdvance } from '@/hooks/useCashAdvances'
import { safeErrorMessage } from '@/lib/api'
import { formatCurrency } from '@/lib/format'
import type { CashAdvance } from '@/types/cost-management'

interface DepositDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  advance: CashAdvance
}

export function DepositDialog({ open, onOpenChange, advance }: DepositDialogProps) {
  const remaining = advance.amount_authorized - advance.amount_deposited
  const [amount, setAmount] = useState(() =>
    remaining > 0 ? remaining.toFixed(2).replace('.', ',') : '',
  )

  const { mutateAsync, isPending } = useDepositCashAdvance()

  function handleClose() {
    setAmount(remaining > 0 ? remaining.toFixed(2).replace('.', ',') : '')
    onOpenChange(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const parsedAmount = parseFloat(amount.replace(',', '.'))
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error('Informe um valor valido.')
      return
    }

    try {
      await mutateAsync({ id: advance.id, amount: parsedAmount })
      toast.success('Deposito registrado com sucesso.')
      handleClose()
    } catch (err) {
      toast.error(safeErrorMessage(err))
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Registrar Deposito</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Resumo do adiantamento */}
          <div className="rounded-md border bg-muted/40 px-3 py-2.5 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Autorizado</span>
              <span className="font-medium tabular-nums">
                {formatCurrency(advance.amount_authorized)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Ja depositado</span>
              <span className="font-medium tabular-nums">
                {formatCurrency(advance.amount_deposited)}
              </span>
            </div>
            <div className="flex justify-between border-t pt-1">
              <span className="text-muted-foreground font-medium">Faltam</span>
              <span
                className={
                  remaining > 0 ? 'font-semibold text-amber-700 tabular-nums' : 'font-semibold tabular-nums'
                }
              >
                {formatCurrency(remaining)}
              </span>
            </div>
          </div>

          {/* Campo de valor */}
          <div className="space-y-1.5">
            <Label htmlFor="deposit-amount">Valor a depositar (R$) *</Label>
            <Input
              id="deposit-amount"
              type="text"
              inputMode="decimal"
              placeholder="0,00"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              autoFocus
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isPending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Registrando...' : 'Registrar deposito'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
