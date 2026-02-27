'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { ChevronDown, ChevronRight } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
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
import { useVendorSuggest } from '@/hooks/useVendors'
import {
  PAYMENT_CONDITION_LABELS,
  PAYMENT_METHOD_LABELS,
  type CostItem,
  type PaymentCondition,
  type PaymentMethod,
  type VendorSuggestion,
} from '@/types/cost-management'
import { parseBRNumber, formatBRNumber } from '@/lib/format'
import { safeErrorMessage } from '@/lib/api'
import { cn } from '@/lib/utils'

// Categorias fixas do sistema (item_number 1-20, conforme planilha)
const COST_CATEGORIES: { value: number; label: string }[] = [
  { value: 1, label: '01 - Equipe de Producao' },
  { value: 2, label: '02 - Diretoria / Criacao' },
  { value: 3, label: '03 - Elenco / Atores' },
  { value: 4, label: '04 - Equipe Tecnica' },
  { value: 5, label: '05 - Locacoes' },
  { value: 6, label: '06 - Arte / Cenografia' },
  { value: 7, label: '07 - Guarda-Roupa' },
  { value: 8, label: '08 - Maquiagem / Cabelo' },
  { value: 9, label: '09 - Equipamento de Camera' },
  { value: 10, label: '10 - Equipamento de Luz' },
  { value: 11, label: '11 - Equipamento de Som' },
  { value: 12, label: '12 - Transporte' },
  { value: 13, label: '13 - Alimentacao' },
  { value: 14, label: '14 - Hospedagem' },
  { value: 15, label: '15 - Viagens / Passagens' },
  { value: 16, label: '16 - Pos-Producao / Edicao' },
  { value: 17, label: '17 - Trilha Sonora / SFX' },
  { value: 18, label: '18 - Despesas Gerais' },
  { value: 19, label: '19 - Impostos / Taxas' },
  { value: 20, label: '20 - Outros' },
]

// ---- VendorAutocomplete ----

interface VendorAutocompleteProps {
  selectedName: string
  onSelect: (vendorId: string | undefined, name: string) => void
}

function VendorAutocomplete({ selectedName, onSelect }: VendorAutocompleteProps) {
  const [search, setSearch] = useState(selectedName)
  const [open, setOpen] = useState(false)
  const { data: suggestions } = useVendorSuggest(search)

  // Sincronizar quando o item for trocado (modo editar)
  useEffect(() => {
    setSearch(selectedName)
  }, [selectedName])

  return (
    <div className="relative">
      <Input
        value={search}
        onChange={e => {
          setSearch(e.target.value)
          setOpen(true)
        }}
        onBlur={() => {
          // Pequeno delay para permitir clique nos itens
          setTimeout(() => setOpen(false), 150)
        }}
        onFocus={() => {
          if (search.length >= 2) setOpen(true)
        }}
        placeholder="Buscar fornecedor..."
        autoComplete="off"
      />
      {open && suggestions?.data && suggestions.data.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-popover border border-border rounded-md shadow-md max-h-48 overflow-y-auto">
          {suggestions.data.map((s: VendorSuggestion) => (
            <button
              key={s.id}
              type="button"
              className="w-full px-3 py-2 text-left text-sm hover:bg-accent flex items-center justify-between gap-2"
              onMouseDown={() => {
                onSelect(s.id, s.full_name)
                setSearch(s.full_name)
                setOpen(false)
              }}
            >
              <span>{s.full_name}</span>
              {s.email && (
                <span className="text-xs text-muted-foreground truncate">{s.email}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ---- CostItemDrawer ----

interface CostItemDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  jobId: string
  editingItem: CostItem | null
  defaultItemNumber?: number
}

interface FormState {
  item_number: number
  sub_item_number: string
  service_description: string
  unit_value: string
  quantity: string
  overtime_hours: string
  overtime_rate: string
  payment_condition: PaymentCondition | ''
  payment_due_date: string
  payment_method: PaymentMethod | ''
  vendor_id: string | undefined
  vendor_name: string
  notes: string
}

function defaultForm(jobId: string, editingItem: CostItem | null): FormState {
  if (editingItem) {
    return {
      item_number: editingItem.item_number,
      sub_item_number: String(editingItem.sub_item_number),
      service_description: editingItem.service_description,
      unit_value: editingItem.unit_value != null ? formatBRNumber(editingItem.unit_value) : '',
      quantity: String(editingItem.quantity),
      overtime_hours: editingItem.overtime_hours != null ? String(editingItem.overtime_hours) : '',
      overtime_rate: editingItem.overtime_rate != null ? formatBRNumber(editingItem.overtime_rate) : '',
      payment_condition: editingItem.payment_condition ?? '',
      payment_due_date: editingItem.payment_due_date ?? '',
      payment_method: editingItem.payment_method ?? '',
      vendor_id: editingItem.vendor_id ?? undefined,
      vendor_name: editingItem.vendor_name_snapshot ?? '',
      notes: editingItem.notes ?? '',
    }
  }
  return {
    item_number: 1,
    sub_item_number: '',
    service_description: '',
    unit_value: '',
    quantity: '1',
    overtime_hours: '',
    overtime_rate: '',
    payment_condition: '',
    payment_due_date: '',
    payment_method: '',
    vendor_id: undefined,
    vendor_name: '',
    notes: '',
  }
}

export function CostItemDrawer({
  open,
  onOpenChange,
  jobId,
  editingItem,
  defaultItemNumber,
}: CostItemDrawerProps) {
  const [form, setForm] = useState<FormState>(() => defaultForm(jobId, editingItem))
  const [overtimeExpanded, setOvertimeExpanded] = useState(false)

  const { mutateAsync: createItem, isPending: isCreating } = useCreateCostItem()
  const { mutateAsync: updateItem, isPending: isUpdating } = useUpdateCostItem()
  const isPending = isCreating || isUpdating

  // Resetar form quando o drawer abre/fecha ou o item muda
  useEffect(() => {
    if (open) {
      const f = defaultForm(jobId, editingItem)
      if (!editingItem && defaultItemNumber) {
        f.item_number = defaultItemNumber
      }
      setForm(f)
      setOvertimeExpanded(
        !!(editingItem?.overtime_hours || editingItem?.overtime_rate),
      )
    }
  }, [open, editingItem, jobId, defaultItemNumber])

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!form.service_description.trim()) {
      toast.error('Descricao do servico e obrigatoria')
      return
    }

    const unitValue = form.unit_value.trim() ? parseBRNumber(form.unit_value) ?? undefined : undefined
    const quantity = form.quantity.trim() ? parseFloat(form.quantity) : 1
    const overtimeHours = form.overtime_hours.trim() ? parseFloat(form.overtime_hours) : undefined
    const overtimeRate = form.overtime_rate.trim() ? parseBRNumber(form.overtime_rate) ?? undefined : undefined

    const payload = {
      job_id: jobId,
      item_number: form.item_number,
      sub_item_number: form.sub_item_number.trim() ? parseInt(form.sub_item_number) : undefined,
      service_description: form.service_description.trim(),
      unit_value: unitValue ?? undefined,
      quantity: isNaN(quantity) ? 1 : quantity,
      overtime_hours: overtimeHours,
      overtime_rate: overtimeRate,
      payment_condition: (form.payment_condition || undefined) as PaymentCondition | undefined,
      payment_due_date: form.payment_due_date || undefined,
      payment_method: (form.payment_method || undefined) as PaymentMethod | undefined,
      vendor_id: form.vendor_id || undefined,
      notes: form.notes.trim() || undefined,
    }

    try {
      if (editingItem) {
        await updateItem({ id: editingItem.id, ...payload })
        toast.success('Item atualizado com sucesso')
      } else {
        await createItem(payload)
        toast.success('Item criado com sucesso')
      }
      onOpenChange(false)
    } catch (err) {
      toast.error(safeErrorMessage(err))
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {editingItem ? 'Editar Item de Custo' : 'Novo Item de Custo'}
          </SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          {/* Categoria */}
          <div className="space-y-2">
            <Label htmlFor="item-number">Categoria</Label>
            <Select
              value={String(form.item_number)}
              onValueChange={v => setField('item_number', parseInt(v))}
            >
              <SelectTrigger id="item-number">
                <SelectValue placeholder="Selecionar categoria" />
              </SelectTrigger>
              <SelectContent>
                {COST_CATEGORIES.map(cat => (
                  <SelectItem key={cat.value} value={String(cat.value)}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Sub-item */}
          <div className="space-y-2">
            <Label htmlFor="sub-item-number">
              Sub-item{' '}
              <span className="text-muted-foreground font-normal">(auto se vazio)</span>
            </Label>
            <Input
              id="sub-item-number"
              type="number"
              min={1}
              placeholder="Ex: 1"
              value={form.sub_item_number}
              onChange={e => setField('sub_item_number', e.target.value)}
            />
          </div>

          {/* Descricao */}
          <div className="space-y-2">
            <Label htmlFor="service-description">Descricao do Servico</Label>
            <Input
              id="service-description"
              placeholder="Ex: Diretor de Fotografia"
              value={form.service_description}
              onChange={e => setField('service_description', e.target.value)}
              required
            />
          </div>

          {/* Valor e Quantidade */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="unit-value">Valor Unitario (R$)</Label>
              <Input
                id="unit-value"
                type="text"
                placeholder="Ex: 1.500,00"
                value={form.unit_value}
                onChange={e => setField('unit_value', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantidade</Label>
              <Input
                id="quantity"
                type="number"
                min={0}
                step="0.5"
                placeholder="1"
                value={form.quantity}
                onChange={e => setField('quantity', e.target.value)}
              />
            </div>
          </div>

          {/* Secao Hora Extra colapsavel */}
          <div className="border border-border rounded-md">
            <button
              type="button"
              className="flex w-full items-center justify-between px-3 py-2 text-sm font-medium hover:bg-accent/50 rounded-md"
              onClick={() => setOvertimeExpanded(v => !v)}
            >
              <span>Hora Extra</span>
              {overtimeExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
            {overtimeExpanded && (
              <div className="grid grid-cols-2 gap-3 px-3 pb-3">
                <div className="space-y-2">
                  <Label htmlFor="overtime-hours">Horas</Label>
                  <Input
                    id="overtime-hours"
                    type="number"
                    min={0}
                    step="0.5"
                    placeholder="0"
                    value={form.overtime_hours}
                    onChange={e => setField('overtime_hours', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="overtime-rate">Taxa por Hora (R$)</Label>
                  <Input
                    id="overtime-rate"
                    type="text"
                    placeholder="Ex: 200,00"
                    value={form.overtime_rate}
                    onChange={e => setField('overtime_rate', e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Condicao de Pagamento */}
          <div className="space-y-2">
            <Label htmlFor="payment-condition">Condicao de Pagamento</Label>
            <Select
              value={form.payment_condition || 'none'}
              onValueChange={v => setField('payment_condition', v === 'none' ? '' : (v as PaymentCondition))}
            >
              <SelectTrigger id="payment-condition">
                <SelectValue placeholder="Selecionar condicao" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem condicao</SelectItem>
                {Object.entries(PAYMENT_CONDITION_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Vencimento */}
          <div className="space-y-2">
            <Label htmlFor="payment-due-date">Data de Vencimento</Label>
            <Input
              id="payment-due-date"
              type="date"
              value={form.payment_due_date}
              onChange={e => setField('payment_due_date', e.target.value)}
            />
          </div>

          {/* Metodo de Pagamento */}
          <div className="space-y-2">
            <Label htmlFor="payment-method-form">Metodo de Pagamento</Label>
            <Select
              value={form.payment_method || 'none'}
              onValueChange={v => setField('payment_method', v === 'none' ? '' : (v as PaymentMethod))}
            >
              <SelectTrigger id="payment-method-form">
                <SelectValue placeholder="Selecionar metodo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem metodo</SelectItem>
                {Object.entries(PAYMENT_METHOD_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Fornecedor */}
          <div className="space-y-2">
            <Label>Fornecedor</Label>
            <VendorAutocomplete
              selectedName={form.vendor_name}
              onSelect={(vendorId, name) => {
                setField('vendor_id', vendorId)
                setField('vendor_name', name)
              }}
            />
          </div>

          {/* Notas */}
          <div className="space-y-2">
            <Label htmlFor="notes">Observacoes</Label>
            <Textarea
              id="notes"
              placeholder="Informacoes adicionais..."
              value={form.notes}
              onChange={e => setField('notes', e.target.value)}
              rows={3}
            />
          </div>

          {/* Acoes */}
          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={isPending}>
              {isPending ? 'Salvando...' : editingItem ? 'Salvar' : 'Adicionar'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
