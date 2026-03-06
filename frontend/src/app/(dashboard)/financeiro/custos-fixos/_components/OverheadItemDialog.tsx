'use client'

import { useState, useEffect } from 'react'
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
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCreateCostItem, useUpdateCostItem } from '@/hooks/useCostItems'
import { safeErrorMessage } from '@/lib/api'
import {
  ITEM_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  type CostItem,
  type ItemStatus,
  type PaymentMethod,
} from '@/types/cost-management'

interface OverheadItemDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: CostItem | null
  periodMonth: string // YYYY-MM
}

export function OverheadItemDialog({
  open,
  onOpenChange,
  item,
  periodMonth,
}: OverheadItemDialogProps) {
  const isEdit = !!item

  const [description, setDescription] = useState('')
  const [itemNumber, setItemNumber] = useState('1')
  const [unitValue, setUnitValue] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [dueDate, setDueDate] = useState('')
  const [status, setStatus] = useState<ItemStatus>('orcado')
  const [paymentMethod, setPaymentMethod] = useState<string>('')
  const [notes, setNotes] = useState('')

  const createMutation = useCreateCostItem()
  const updateMutation = useUpdateCostItem()

  // Reset form when dialog opens
  useEffect(() => {
    if (open && item) {
      setDescription(item.service_description)
      setItemNumber(String(item.item_number))
      setUnitValue(String(item.unit_value ?? ''))
      setQuantity(String(item.quantity ?? 1))
      setDueDate(item.payment_due_date ?? '')
      setStatus(item.item_status as ItemStatus)
      setPaymentMethod(item.payment_method ?? '')
      setNotes(item.notes ?? '')
    } else if (open && !item) {
      setDescription('')
      setItemNumber('1')
      setUnitValue('')
      setQuantity('1')
      setDueDate('')
      setStatus('orcado')
      setPaymentMethod('')
      setNotes('')
    }
  }, [open, item])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const parsedValue = parseFloat(unitValue.replace(',', '.'))
    if (isNaN(parsedValue) || parsedValue < 0) {
      toast.error('Valor unitario invalido')
      return
    }

    const parsedQty = parseInt(quantity, 10)
    if (isNaN(parsedQty) || parsedQty < 0) {
      toast.error('Quantidade invalida')
      return
    }

    const parsedNumber = parseInt(itemNumber, 10)
    if (isNaN(parsedNumber) || parsedNumber < 1) {
      toast.error('Numero do item invalido')
      return
    }

    try {
      if (isEdit) {
        await updateMutation.mutateAsync({
          id: item.id,
          service_description: description,
          item_number: parsedNumber,
          unit_value: parsedValue,
          quantity: parsedQty,
          payment_due_date: dueDate || null,
          item_status: status,
          payment_method: (paymentMethod || null) as PaymentMethod | null,
          notes: notes || null,
        })
        toast.success('Custo fixo atualizado')
      } else {
        await createMutation.mutateAsync({
          job_id: null,
          service_description: description,
          item_number: parsedNumber,
          sub_item_number: 0,
          unit_value: parsedValue,
          quantity: parsedQty,
          period_month: periodMonth,
          payment_due_date: dueDate || undefined,
          item_status: status,
          payment_method: (paymentMethod || undefined) as PaymentMethod | undefined,
          notes: notes || undefined,
        })
        toast.success('Custo fixo criado')
      }
      onOpenChange(false)
    } catch (err) {
      toast.error(safeErrorMessage(err as Error))
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Editar Custo Fixo' : 'Novo Custo Fixo'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Descricao */}
          <div className="space-y-1.5">
            <Label htmlFor="overhead-description">Descricao *</Label>
            <Input
              id="overhead-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Aluguel escritorio, Licenca Adobe, etc"
              required
              maxLength={500}
            />
          </div>

          {/* Grid: Item # + Valor + Quantidade */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="overhead-number">Item #</Label>
              <Input
                id="overhead-number"
                type="number"
                min={1}
                max={99}
                value={itemNumber}
                onChange={(e) => setItemNumber(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="overhead-value">Valor unit. (R$) *</Label>
              <Input
                id="overhead-value"
                type="text"
                inputMode="decimal"
                value={unitValue}
                onChange={(e) => setUnitValue(e.target.value)}
                placeholder="0,00"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="overhead-qty">Qtd</Label>
              <Input
                id="overhead-qty"
                type="number"
                min={0}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
          </div>

          {/* Grid: Vencimento + Status */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="overhead-due-date">Vencimento</Label>
              <Input
                id="overhead-due-date"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as ItemStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ITEM_STATUS_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Forma de pagamento */}
          <div className="space-y-1.5">
            <Label>Forma de pagamento</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Nenhuma</SelectItem>
                {Object.entries(PAYMENT_METHOD_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Observacoes */}
          <div className="space-y-1.5">
            <Label htmlFor="overhead-notes">Observacoes</Label>
            <Textarea
              id="overhead-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observacoes sobre este custo fixo..."
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending || !description || !unitValue}>
              {isPending ? 'Salvando...' : isEdit ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
