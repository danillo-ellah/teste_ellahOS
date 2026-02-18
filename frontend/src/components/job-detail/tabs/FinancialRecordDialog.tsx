'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
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
import { Textarea } from '@/components/ui/textarea'
import {
  FINANCIAL_RECORD_TYPES,
  FINANCIAL_RECORD_CATEGORIES,
  PAYMENT_METHODS,
} from '@/types/financial'
import type { FinancialRecord } from '@/types/financial'
import {
  FINANCIAL_RECORD_TYPE_LABELS,
  FINANCIAL_RECORD_CATEGORY_LABELS,
  PAYMENT_METHOD_LABELS,
} from '@/lib/constants'

const schema = z.object({
  type: z.string().min(1),
  category: z.string().min(1),
  description: z.string().min(2, 'Descricao obrigatoria'),
  amount: z.number().positive('Valor deve ser positivo'),
  due_date: z.string(),
  payment_method: z.string(),
  notes: z.string(),
})

type FormValues = z.infer<typeof schema>

interface FinancialRecordDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  record?: FinancialRecord | null
  onSubmit: (data: unknown) => Promise<void>
  isPending: boolean
}

export function FinancialRecordDialog({
  open,
  onOpenChange,
  record,
  onSubmit,
  isPending,
}: FinancialRecordDialogProps) {
  const isEditing = !!record

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: record?.type ?? 'despesa',
      category: record?.category ?? 'cache_equipe',
      description: record?.description ?? '',
      amount: record?.amount ?? 0,
      due_date: record?.due_date?.split('T')[0] ?? '',
      payment_method: record?.payment_method ?? '',
      notes: record?.notes ?? '',
    },
  })

  async function handleSubmit(data: FormValues) {
    const cleaned = {
      ...data,
      due_date: data.due_date || null,
      payment_method: data.payment_method || null,
      notes: data.notes || null,
    }
    await onSubmit(cleaned as FormValues)
    form.reset()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar lancamento' : 'Novo lancamento'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Tipo *</Label>
              <Select
                value={form.watch('type')}
                onValueChange={(v) =>
                  form.setValue('type', v as FormValues['type'])
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FINANCIAL_RECORD_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {FINANCIAL_RECORD_TYPE_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Categoria *</Label>
              <Select
                value={form.watch('category')}
                onValueChange={(v) =>
                  form.setValue('category', v as FormValues['category'])
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FINANCIAL_RECORD_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {FINANCIAL_RECORD_CATEGORY_LABELS[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Descricao *</Label>
            <Input {...form.register('description')} placeholder="Ex: Cache diretor" />
            {form.formState.errors.description && (
              <p className="text-xs text-destructive">
                {form.formState.errors.description.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Valor (R$) *</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                {...form.register('amount', { valueAsNumber: true })}
                placeholder="0,00"
              />
              {form.formState.errors.amount && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.amount.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Vencimento</Label>
              <Input type="date" {...form.register('due_date')} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Forma de pagamento</Label>
            <Select
              value={form.watch('payment_method') ?? ''}
              onValueChange={(v) =>
                form.setValue('payment_method', v as FormValues['payment_method'])
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((m) => (
                  <SelectItem key={m} value={m}>
                    {PAYMENT_METHOD_LABELS[m]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Observacoes</Label>
            <Textarea
              {...form.register('notes')}
              rows={2}
              placeholder="Opcional..."
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Salvando...' : isEditing ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
