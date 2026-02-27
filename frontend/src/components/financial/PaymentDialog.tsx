'use client'

import { useState } from 'react'
import { toast } from 'sonner'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { usePayCostItems } from '@/hooks/useCostItems'
import { PAYMENT_METHOD_LABELS, type PaymentMethod } from '@/types/cost-management'
import { parseBRNumber } from '@/lib/format'
import { safeErrorMessage } from '@/lib/api'

export interface PaymentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedItemIds: string[]
  onSuccess?: () => void
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

export function PaymentDialog({
  open,
  onOpenChange,
  selectedItemIds,
  onSuccess,
}: PaymentDialogProps) {
  const [paymentDate, setPaymentDate] = useState(todayISO)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix')
  const [paymentProofUrl, setPaymentProofUrl] = useState('')
  const [actualPaidValueStr, setActualPaidValueStr] = useState('')

  const { mutateAsync: payCostItems, isPending } = usePayCostItems()

  async function handleConfirm() {
    if (!paymentDate) {
      toast.error('Informe a data de pagamento')
      return
    }
    if (selectedItemIds.length === 0) {
      toast.error('Nenhum item selecionado')
      return
    }

    const actualPaidValue = actualPaidValueStr.trim()
      ? (parseBRNumber(actualPaidValueStr) ?? undefined)
      : undefined

    try {
      const result = await payCostItems({
        cost_item_ids: selectedItemIds,
        payment_date: paymentDate,
        payment_method: paymentMethod,
        payment_proof_url: paymentProofUrl.trim() || undefined,
        actual_paid_value: actualPaidValue,
      })

      toast.success(
        `${result.data?.items_paid ?? selectedItemIds.length} item(s) marcado(s) como pago(s)`,
      )
      onOpenChange(false)
      onSuccess?.()
      setPaymentDate(todayISO())
      setPaymentMethod('pix')
      setPaymentProofUrl('')
      setActualPaidValueStr('')
    } catch (err) {
      toast.error(safeErrorMessage(err))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar Pagamento</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="text-sm text-muted-foreground">
            {selectedItemIds.length} item(s) selecionado(s)
          </div>

          <div className="space-y-2">
            <Label htmlFor="pd-payment-date">Data de Pagamento</Label>
            <Input
              id="pd-payment-date"
              type="date"
              value={paymentDate}
              onChange={e => setPaymentDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="pd-payment-method">Metodo de Pagamento</Label>
            <Select
              value={paymentMethod}
              onValueChange={v => setPaymentMethod(v as PaymentMethod)}
            >
              <SelectTrigger id="pd-payment-method">
                <SelectValue placeholder="Selecionar metodo" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PAYMENT_METHOD_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="pd-proof-url">
              URL do Comprovante{' '}
              <span className="text-muted-foreground font-normal">(opcional)</span>
            </Label>
            <Input
              id="pd-proof-url"
              type="url"
              placeholder="https://..."
              value={paymentProofUrl}
              onChange={e => setPaymentProofUrl(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="pd-actual-value">
              Valor Efetivo Pago{' '}
              <span className="text-muted-foreground font-normal">
                (opcional — se diferente do orcado)
              </span>
            </Label>
            <Input
              id="pd-actual-value"
              type="text"
              placeholder="Ex: 1.500,00"
              value={actualPaidValueStr}
              onChange={e => setActualPaidValueStr(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={isPending}>
            {isPending ? 'Confirmando...' : 'Confirmar Pagamento'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
