'use client'

import { useState, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { ChevronDown, ChevronRight, ChevronsUpDown, Check, X, ExternalLink, Unlink, Link2 } from 'lucide-react'
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
import { useQueryClient } from '@tanstack/react-query'
import { nfKeys } from '@/lib/query-keys'
import { useVendorSuggest } from '@/hooks/useVendors'
import {
  PAYMENT_CONDITION_LABELS,
  PAYMENT_METHOD_LABELS,
  NF_REQUEST_STATUS_CONFIG,
  type CostItem,
  type PaymentCondition,
  type PaymentMethod,
  type NfRequestStatus,
  type VendorSuggestion,
} from '@/types/cost-management'
import { parseBRNumber, formatBRNumber, formatCurrency } from '@/lib/format'
import { safeErrorMessage } from '@/lib/api'
import { AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUserRole } from '@/hooks/useUserRole'
import { LinkNfDialog } from './LinkNfDialog'

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

// ---- VendorAutocomplete (combobox style — clica e abre lista, digita e filtra) ----

interface VendorAutocompleteProps {
  selectedName: string
  onSelect: (vendorId: string | undefined, name: string) => void
  disabled?: boolean
}

function VendorAutocomplete({ selectedName, onSelect, disabled }: VendorAutocompleteProps) {
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Busca fornecedores: quando aberto, busca com o termo digitado (ou vazio = lista todos)
  const { data: suggestions } = useVendorSuggest(search, open)

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open])

  const vendors = suggestions?.data ?? []

  function handleClear() {
    onSelect(undefined, '')
    setSearch('')
  }

  return (
    <div className="relative" ref={containerRef}>
      {/* Botao trigger (mostra nome selecionado ou placeholder) */}
      {!open ? (
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            setOpen(true)
            setSearch('')
            setTimeout(() => inputRef.current?.focus(), 50)
          }}
          className={cn(
            'flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors',
            'hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
            disabled && 'cursor-not-allowed opacity-50',
            selectedName ? 'text-foreground' : 'text-muted-foreground',
          )}
        >
          <span className="truncate">{selectedName || 'Selecionar fornecedor...'}</span>
          <div className="flex items-center gap-1 shrink-0">
            {selectedName && !disabled && (
              <span
                role="button"
                onClick={e => { e.stopPropagation(); handleClear() }}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </span>
            )}
            <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
        </button>
      ) : (
        /* Input de busca quando aberto */
        <Input
          ref={inputRef}
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Digitar para filtrar..."
          autoComplete="off"
          className="pr-8"
        />
      )}

      {/* Dropdown com lista de fornecedores */}
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-popover border border-border rounded-md shadow-md max-h-60 overflow-y-auto">
          {vendors.length === 0 ? (
            <div className="px-3 py-6 text-center text-sm text-muted-foreground">
              Nenhum fornecedor encontrado
            </div>
          ) : (
            vendors.map((s: VendorSuggestion) => {
              const isSelected = s.full_name === selectedName
              return (
                <button
                  key={s.id}
                  type="button"
                  className={cn(
                    'w-full px-3 py-2 text-left text-sm hover:bg-accent flex items-center gap-2',
                    isSelected && 'bg-accent/50',
                  )}
                  onMouseDown={() => {
                    onSelect(s.id, s.full_name)
                    setOpen(false)
                    setSearch('')
                  }}
                >
                  <Check className={cn('h-3.5 w-3.5 shrink-0', isSelected ? 'opacity-100' : 'opacity-0')} />
                  <span className="flex-1 truncate">{s.full_name}</span>
                  {s.email && (
                    <span className="text-xs text-muted-foreground truncate max-w-[140px]">{s.email}</span>
                  )}
                </button>
              )
            })
          )}
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
  const [nfExpanded, setNfExpanded] = useState(false)
  const [linkNfOpen, setLinkNfOpen] = useState(false)

  const { mutateAsync: createItem, isPending: isCreating } = useCreateCostItem()
  const { mutateAsync: updateItem, isPending: isUpdating } = useUpdateCostItem()
  const isPending = isCreating || isUpdating
  const queryClient = useQueryClient()

  const { role } = useUserRole()

  // Item pago = campos financeiros read-only (backend tambem bloqueia)
  const isPaid = editingItem?.payment_status === 'pago'
  const canManageNf = !!role && ['admin', 'ceo', 'financeiro'].includes(role) && !isPaid
  const hasLinkedNf = !!editingItem?.nf_document_id

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
      setNfExpanded(false)
      setLinkNfOpen(false)
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
          {/* Alerta item pago */}
          {isPaid && (
            <div className="flex items-start gap-2 rounded-md border border-amber-500/50 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-400">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>
                Este item ja foi pago. Apenas observacoes podem ser editadas. Para alterar valores, cancele o pagamento primeiro.
              </span>
            </div>
          )}

          {/* Categoria */}
          <div className="space-y-2">
            <Label htmlFor="item-number">Categoria</Label>
            <Select
              value={String(form.item_number)}
              onValueChange={v => setField('item_number', parseInt(v))}
              disabled={isPaid}
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
              disabled={isPaid}
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
              disabled={isPaid}
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
                disabled={isPaid}
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
                disabled={isPaid}
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
                    disabled={isPaid}
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
                    disabled={isPaid}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Secao Nota Fiscal colapsavel (so no modo edicao) */}
          {editingItem && (
            <div className="border border-border rounded-md">
              <button
                type="button"
                className="flex w-full items-center justify-between px-3 py-2 text-sm font-medium hover:bg-accent/50 rounded-md"
                onClick={() => setNfExpanded(v => !v)}
              >
                <span className="flex items-center gap-2">
                  Nota Fiscal
                  {hasLinkedNf && (() => {
                    const nfStatus = editingItem.nf_request_status
                    const cfg = NF_REQUEST_STATUS_CONFIG[nfStatus]
                    return cfg ? <span className={cn('h-2 w-2 rounded-full', cfg.dotClass)} /> : null
                  })()}
                </span>
                {nfExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
              {nfExpanded && (
                <div className="px-3 pb-3 space-y-3">
                  {hasLinkedNf ? (
                    <>
                      {/* NF vinculada — mostrar detalhes */}
                      <div className="space-y-2 text-sm">
                        {editingItem.nf_filename && (
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">Arquivo:</span>
                            {editingItem.nf_drive_url ? (
                              <a
                                href={editingItem.nf_drive_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline flex items-center gap-1"
                              >
                                {editingItem.nf_filename}
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            ) : (
                              <span>{editingItem.nf_filename}</span>
                            )}
                          </div>
                        )}
                        {editingItem.nf_extracted_value != null && (
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">Valor NF:</span>
                            <span>{formatCurrency(editingItem.nf_extracted_value)}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">Status NF:</span>
                          {(() => {
                            const nfStatus = editingItem.nf_request_status
                            const cfg = NF_REQUEST_STATUS_CONFIG[nfStatus]
                            if (!cfg) return <span className="text-muted-foreground">{nfStatus}</span>
                            return (
                              <span className={cn('flex items-center gap-1.5', cfg.textClass)}>
                                <span className={cn('h-2.5 w-2.5 rounded-full', cfg.dotClass)} />
                                {cfg.label}
                              </span>
                            )
                          })()}
                        </div>
                        {editingItem.nf_validation_ok != null && (
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">Validacao:</span>
                            <span className={editingItem.nf_validation_ok ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}>
                              {editingItem.nf_validation_ok ? 'OK' : 'Divergente'}
                            </span>
                          </div>
                        )}
                      </div>
                      {canManageNf && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={async () => {
                            try {
                              await updateItem({
                                id: editingItem.id,
                                nf_document_id: null,
                                nf_drive_url: null,
                                nf_filename: null,
                                nf_extracted_value: null,
                                nf_validation_ok: null,
                                nf_request_status: 'nao_aplicavel',
                              } as Record<string, unknown> & { id: string })
                              queryClient.invalidateQueries({ queryKey: nfKeys.lists() })
                              toast.success('NF desvinculada do item')
                            } catch (err) {
                              toast.error(safeErrorMessage(err))
                            }
                          }}
                        >
                          <Unlink className="h-3.5 w-3.5 mr-1.5" />
                          Desvincular NF
                        </Button>
                      )}
                    </>
                  ) : (
                    <>
                      {/* Sem NF vinculada */}
                      <p className="text-sm text-muted-foreground">
                        Nenhuma NF vinculada a este item.
                      </p>
                      {canManageNf && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setLinkNfOpen(true)}
                        >
                          <Link2 className="h-3.5 w-3.5 mr-1.5" />
                          Vincular NF
                        </Button>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Condicao de Pagamento */}
          <div className="space-y-2">
            <Label htmlFor="payment-condition">Condicao de Pagamento</Label>
            <Select
              value={form.payment_condition || 'none'}
              onValueChange={v => setField('payment_condition', v === 'none' ? '' : (v as PaymentCondition))}
              disabled={isPaid}
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
              disabled={isPaid}
            />
          </div>

          {/* Metodo de Pagamento */}
          <div className="space-y-2">
            <Label htmlFor="payment-method-form">Metodo de Pagamento</Label>
            <Select
              value={form.payment_method || 'none'}
              onValueChange={v => setField('payment_method', v === 'none' ? '' : (v as PaymentMethod))}
              disabled={isPaid}
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
              disabled={isPaid}
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

      {linkNfOpen && editingItem && (
        <LinkNfDialog
          open={linkNfOpen}
          onOpenChange={setLinkNfOpen}
          jobId={jobId}
          costItemId={editingItem.id}
        />
      )}
    </Sheet>
  )
}
