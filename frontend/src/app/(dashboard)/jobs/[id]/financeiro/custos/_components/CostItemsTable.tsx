'use client'

import React, { useState, useRef, useCallback, useEffect } from 'react'
import {
  Check,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  MoreHorizontal,
  Pencil,
  Trash2,
  CreditCard,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  Receipt,
  ExternalLink,
  X,
} from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { useDeleteCostItem, useUpdateCostItem } from '@/hooks/useCostItems'
import { useVendorSuggest } from '@/hooks/useVendors'
import { toast } from 'sonner'
import { formatCurrency, formatDate } from '@/lib/format'
import { PAYMENT_CONDITION_LABELS, PAYMENT_CONDITION_COLORS, NF_REQUEST_STATUS_CONFIG, ITEM_STATUS_LABELS, ITEM_STATUS_COLORS } from '@/types/cost-management'
import type { CostItem, NfRequestStatus, PaymentCondition, VendorSuggestion, ItemStatus } from '@/types/cost-management'
import { safeErrorMessage } from '@/lib/api'
import { cn } from '@/lib/utils'

interface CostItemsTableProps {
  items: CostItem[]
  selectedIds: Set<string>
  onToggleSelect: (id: string) => void
  onEdit: (item: CostItem) => void
  onPay: (item: CostItem) => void
  isLoading: boolean
}

function groupByCategoryNumber(items: CostItem[]): Map<number, CostItem[]> {
  const groups = new Map<number, CostItem[]>()
  for (const item of items) {
    const group = groups.get(item.item_number) ?? []
    group.push(item)
    groups.set(item.item_number, group)
  }
  return groups
}

function getCategorySubtotal(items: CostItem[]): number {
  return items.reduce((sum, item) => {
    if (item.is_category_header) return sum
    return sum + item.total_with_overtime
  }, 0)
}

// Converte string no formato BR (ex: "1.234,50" ou "1234,50" ou "1234.50") para number
function parseBRL(raw: string): number {
  // Remove pontos de milhar, troca virgula por ponto decimal
  const normalized = raw.replace(/\./g, '').replace(',', '.')
  return parseFloat(normalized)
}

// ---- DeleteConfirmDialog ----

interface DeleteConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  isPending: boolean
}

function DeleteConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  isPending,
}: DeleteConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir item de custo?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta acao nao pode ser desfeita. O item sera removido permanentemente.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isPending ? 'Excluindo...' : 'Excluir'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

// ---- InlineEditCell ----
// Gerencia o estado de edicao de uma unica celula.
// Suporta tipos: 'currency' | 'integer' | 'text'
// Tab navigation: usa data-attributes [data-row-id] e [data-field] na celula pai (TableCell).

type InlineFieldType = 'currency' | 'integer' | 'text'

const FIELD_LABELS: Record<string, string> = {
  service_description: 'Descricao do servico',
  unit_value: 'Valor unitario',
  quantity: 'Quantidade',
  overtime_value: 'Horas extras',
  notes: 'Notas',
  vendor: 'Fornecedor',
}

interface InlineEditCellProps {
  itemId: string
  field: string
  value: string | number | null | undefined
  fieldType: InlineFieldType
  /** Funcao de mutacao que recebe { id, [field]: newValue } */
  onSave: (payload: Record<string, unknown> & { id: string }) => Promise<unknown>
  /** Classe(s) adicionais para o span/input */
  className?: string
  /** Placeholder exibido quando vazio */
  placeholder?: string
  /** Alinhamento do texto (padrao: left) */
  align?: 'left' | 'right'
}

function InlineEditCell({
  itemId,
  field,
  value,
  fieldType,
  onSave,
  className,
  placeholder = '-',
  align = 'left',
}: InlineEditCellProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  // Guarda o valor original para rollback em caso de erro ou Escape
  const originalRef = useRef<string | number | null | undefined>(value)

  // Sincroniza referencia se o item for atualizado externamente
  useEffect(() => {
    if (!isEditing) {
      originalRef.current = value
    }
  }, [value, isEditing])

  function formatDisplay(v: string | number | null | undefined): string {
    if (v == null || v === '') return ''
    if (fieldType === 'currency') {
      const n = typeof v === 'string' ? parseFloat(v) : v
      return isNaN(n) ? '' : formatCurrency(n)
    }
    return String(v)
  }

  function getInitialDraft(v: string | number | null | undefined): string {
    if (v == null || v === '') return ''
    if (fieldType === 'currency') {
      const n = typeof v === 'string' ? parseFloat(v) : v
      // Usa virgula como separador decimal para facilitar digitacao em pt-BR
      return isNaN(n) ? '' : String(n).replace('.', ',')
    }
    return String(v)
  }

  function startEditing() {
    originalRef.current = value
    setDraft(getInitialDraft(value))
    setIsEditing(true)
  }

  // Garante foco e selecao quando entra no modo edicao
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const isSavingRef = useRef(false)

  const commitSave = useCallback(async () => {
    if (!isEditing || isSavingRef.current) return
    isSavingRef.current = true

    let parsedValue: string | number | null
    if (fieldType === 'currency') {
      parsedValue = isNaN(parseBRL(draft)) ? (originalRef.current as number) : parseBRL(draft)
    } else if (fieldType === 'integer') {
      const n = parseInt(draft, 10)
      parsedValue = isNaN(n) || n < 0 ? (originalRef.current as number) : n
      if (field === 'quantity' && parsedValue === 0) {
        toast.warning('Quantidade 0 zera o valor total deste item')
      }
    } else {
      parsedValue = draft.trim() === '' ? null : draft.trim()
    }

    // Nao faz request se o valor nao mudou
    const originalStr = getInitialDraft(originalRef.current)
    const draftStr = fieldType === 'text' ? (parsedValue ?? '') : getInitialDraft(parsedValue)
    if (String(draftStr) === String(originalStr)) {
      setIsEditing(false)
      return
    }

    setIsSaving(true)
    try {
      await onSave({ id: itemId, [field]: parsedValue })
    } catch (err) {
      toast.error(safeErrorMessage(err))
      // Reverte o draft para o valor original
      setDraft(getInitialDraft(originalRef.current))
    } finally {
      setIsSaving(false)
      setIsEditing(false)
      isSavingRef.current = false
    }
  }, [isEditing, draft, fieldType, itemId, field, onSave]) // eslint-disable-line react-hooks/exhaustive-deps

  function cancelEdit() {
    setDraft(getInitialDraft(originalRef.current))
    setIsEditing(false)
  }

  // Navega para a proxima celula editavel da mesma linha usando data-attributes
  function focusNextCell(direction: 'next' | 'prev' = 'next') {
    if (!inputRef.current) return
    // Sobe ate o TableCell (td) que tem data-field
    const td = inputRef.current.closest('[data-field]') as HTMLElement | null
    if (!td) return
    const rowId = td.dataset.rowId
    if (!rowId) return

    // Todas as celulas editaveis da linha, em ordem DOM
    const allCells = Array.from(
      document.querySelectorAll<HTMLElement>(`[data-row-id="${rowId}"][data-field]`)
    )
    const currentIndex = allCells.indexOf(td)
    const targetIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1
    const targetCell = allCells[targetIndex]
    if (!targetCell) return

    // Dispara clique para ativar edicao na celula alvo
    targetCell.click()
  }

  async function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') {
      e.preventDefault()
      cancelEdit()
      return
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      await commitSave()
      return
    }
    if (e.key === 'Tab') {
      e.preventDefault()
      await commitSave()
      focusNextCell(e.shiftKey ? 'prev' : 'next')
      return
    }
  }

  const displayText = formatDisplay(value)

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={commitSave}
        inputMode={fieldType === 'text' ? 'text' : 'decimal'}
        className={cn(
          'w-full bg-transparent outline-none border-0 p-0 m-0 text-inherit font-inherit',
          'ring-1 ring-inset rounded-sm px-1',
          isSaving ? 'ring-blue-400 animate-pulse' : 'ring-primary',
          align === 'right' && 'text-right',
          className,
        )}
        aria-label={FIELD_LABELS[field] ?? field}
      />
    )
  }

  return (
    <span
      role="button"
      tabIndex={0}
      onClick={startEditing}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); startEditing() } }}
      className={cn(
        'block w-full cursor-pointer rounded-sm px-1',
        'hover:bg-muted/60 transition-colors duration-100',
        align === 'right' && 'text-right',
        !displayText && 'text-muted-foreground',
        className,
      )}
    >
      {displayText || placeholder}
    </span>
  )
}

// ---- InlineVendorAutocomplete ----
// Autocomplete de fornecedor inline na tabela, identico ao do drawer.
// Clique abre input + dropdown com sugestoes da API.

interface InlineVendorAutocompleteProps {
  itemId: string
  currentName: string | null | undefined
  onSave: (payload: Record<string, unknown> & { id: string }) => Promise<unknown>
}

function InlineVendorAutocomplete({
  itemId,
  currentName,
  onSave,
}: InlineVendorAutocompleteProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)

  // Debounce de 300ms para evitar 1 request por keystroke
  useEffect(() => {
    debounceRef.current = setTimeout(() => setDebouncedSearch(search), 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [search])

  const { data: suggestions } = useVendorSuggest(debouncedSearch, open)
  const vendors = suggestions?.data ?? []

  // Fechar ao clicar fora
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

  // Foco no input quando abre
  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [open])

  async function handleSelect(vendor: VendorSuggestion) {
    if (vendor.full_name === currentName) {
      setOpen(false)
      return
    }
    setIsSaving(true)
    try {
      // So manda vendor_id — backend busca snapshots automaticamente via fetchVendorSnapshot
      await onSave({
        id: itemId,
        vendor_id: vendor.id,
      })
    } catch (err) {
      toast.error(safeErrorMessage(err))
    } finally {
      setIsSaving(false)
      setOpen(false)
      setSearch('')
    }
  }

  async function handleClear() {
    setIsSaving(true)
    try {
      // So manda vendor_id null — backend limpa snapshots automaticamente
      await onSave({
        id: itemId,
        vendor_id: null,
      })
    } catch (err) {
      toast.error(safeErrorMessage(err))
    } finally {
      setIsSaving(false)
      setOpen(false)
      setSearch('')
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') {
      e.preventDefault()
      setOpen(false)
      setSearch('')
    }
  }

  if (!open) {
    return (
      <span
        role="button"
        tabIndex={0}
        onClick={() => setOpen(true)}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(true) } }}
        className={cn(
          'block w-full cursor-pointer rounded-sm px-1 truncate max-w-[120px]',
          'hover:bg-muted/60 transition-colors duration-100',
          isSaving && 'ring-1 ring-blue-400 animate-pulse',
          !currentName && 'text-muted-foreground',
        )}
      >
        {currentName || '-'}
      </span>
    )
  }

  return (
    <div className="relative" ref={containerRef}>
      <div className="flex items-center gap-1">
        <input
          ref={inputRef}
          value={search}
          onChange={e => setSearch(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Buscar fornecedor..."
          autoComplete="off"
          className={cn(
            'w-full bg-transparent outline-none border-0 p-0 m-0 text-sm',
            'ring-1 ring-inset ring-primary rounded-sm px-1',
            isSaving && 'ring-blue-400 animate-pulse',
          )}
        />
        {currentName && (
          <button
            type="button"
            onMouseDown={e => { e.preventDefault(); handleClear() }}
            className="text-muted-foreground hover:text-foreground shrink-0"
            aria-label="Limpar fornecedor"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
      <div className="absolute z-50 mt-1 w-56 bg-popover border border-border rounded-md shadow-md max-h-48 overflow-y-auto">
        {vendors.length === 0 ? (
          <div className="px-3 py-4 text-center text-xs text-muted-foreground">
            Nenhum fornecedor encontrado
          </div>
        ) : (
          vendors.map((s: VendorSuggestion) => {
            const isSelected = s.full_name === currentName
            return (
              <button
                key={s.id}
                type="button"
                className={cn(
                  'w-full px-2 py-1.5 text-left text-sm hover:bg-accent flex items-center gap-1.5',
                  isSelected && 'bg-accent/50',
                )}
                onMouseDown={() => handleSelect(s)}
              >
                <Check className={cn('h-3 w-3 shrink-0', isSelected ? 'opacity-100' : 'opacity-0')} />
                <span className="flex-1 truncate">{s.full_name}</span>
                {s.email && (
                  <span className="text-xs text-muted-foreground truncate max-w-[100px]">{s.email}</span>
                )}
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}

// ---- VendorCell ----

function VendorCell({ item }: { item: CostItem }) {
  if (!item.vendor_name_snapshot) {
    return <span className="text-muted-foreground">-</span>
  }

  const hasDetails = item.vendor_email_snapshot || item.vendor_pix_snapshot

  if (!hasDetails) {
    return <span className="truncate max-w-[120px] block">{item.vendor_name_snapshot}</span>
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="truncate max-w-[120px] block underline decoration-dotted cursor-help">
            {item.vendor_name_snapshot}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs space-y-1">
          {item.vendor_email_snapshot && (
            <p>Email: {item.vendor_email_snapshot}</p>
          )}
          {item.vendor_pix_snapshot && (
            <p>PIX: {item.vendor_pix_snapshot}</p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// ---- StatusCell (inline editavel via dropdown) ----

// Ordem logica do fluxo de status do item de custo
const ITEM_STATUS_ORDER: ItemStatus[] = [
  'orcado',
  'aguardando_nf',
  'nf_pedida',
  'nf_recebida',
  'nf_aprovada',
  'pago',
  'cancelado',
]

function StatusCell({
  item,
  onSave,
}: {
  item: CostItem
  onSave: (payload: Record<string, unknown> & { id: string }) => Promise<unknown>
}) {
  const [saving, setSaving] = useState(false)
  const hasMismatch =
    item.suggested_status &&
    item.suggested_status !== item.item_status

  async function handleStatusChange(newStatus: ItemStatus) {
    if (newStatus === item.item_status) return
    setSaving(true)
    try {
      await onSave({ id: item.id, item_status: newStatus })
    } catch (err) {
      toast.error(safeErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex items-center gap-1">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={cn(
              'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium cursor-pointer',
              'hover:ring-1 hover:ring-border transition-all',
              saving && 'opacity-50 pointer-events-none',
              ITEM_STATUS_COLORS[item.item_status],
            )}
            disabled={saving}
          >
            {ITEM_STATUS_LABELS[item.item_status]}
            <ChevronDown className="size-3 opacity-50" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-[160px]">
          {ITEM_STATUS_ORDER.map((status) => (
            <DropdownMenuItem
              key={status}
              onClick={() => handleStatusChange(status)}
              className={cn(
                'text-xs gap-2',
                status === item.item_status && 'font-semibold',
              )}
            >
              <span className={cn(
                'inline-block size-2 rounded-full shrink-0',
                ITEM_STATUS_COLORS[status]?.replace(/text-\S+/g, ''),
              )} />
              {ITEM_STATUS_LABELS[status]}
              {status === item.item_status && (
                <Check className="size-3 ml-auto text-foreground" />
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      {hasMismatch && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs max-w-xs">
              Status sugerido: {item.suggested_status}
              {item.status_note && <p className="mt-1">{item.status_note}</p>}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  )
}

// ---- PaymentConditionCell (inline editavel via dropdown) ----

const PAYMENT_CONDITION_ORDER: PaymentCondition[] = [
  'a_vista',
  'cnf_30',
  'cnf_40',
  'cnf_45',
  'cnf_60',
  'cnf_90',
  'snf_30',
]

function PaymentConditionCell({
  item,
  onSave,
}: {
  item: CostItem
  onSave: (payload: Record<string, unknown> & { id: string }) => Promise<unknown>
}) {
  const [saving, setSaving] = useState(false)
  const current = item.payment_condition

  async function handleChange(value: PaymentCondition | null) {
    if (value === current) return
    setSaving(true)
    try {
      await onSave({ id: item.id, payment_condition: value })
    } catch (err) {
      toast.error(safeErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium cursor-pointer whitespace-nowrap',
            'hover:ring-1 hover:ring-border transition-all',
            saving && 'opacity-50 pointer-events-none',
            current ? PAYMENT_CONDITION_COLORS[current] : 'text-muted-foreground',
          )}
          disabled={saving}
        >
          {current ? PAYMENT_CONDITION_LABELS[current] : 'Definir'}
          <ChevronDown className="size-3 opacity-50" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[160px]">
        {PAYMENT_CONDITION_ORDER.map((cond) => (
          <DropdownMenuItem
            key={cond}
            onClick={() => handleChange(cond)}
            className={cn(
              'text-xs gap-2',
              cond === current && 'font-semibold',
            )}
          >
            <span className={cn(
              'inline-block size-2 rounded-full shrink-0',
              PAYMENT_CONDITION_COLORS[cond]?.replace(/text-\S+/g, ''),
            )} />
            {PAYMENT_CONDITION_LABELS[cond]}
            {cond === current && (
              <Check className="size-3 ml-auto text-foreground" />
            )}
          </DropdownMenuItem>
        ))}
        {current && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => handleChange(null)}
              className="text-xs text-muted-foreground"
            >
              Limpar
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// ---- DivergenceBadge ----
// Compara o valor orcado (total_with_overtime) com o valor real pago (actual_paid_value).
// So exibido quando o item esta pago e a divergencia e >= 1%.

interface DivergenceBadgeProps {
  budgeted: number
  actual: number
}

function DivergenceBadge({ budgeted, actual }: DivergenceBadgeProps) {
  if (!budgeted || !actual) return null

  const diff = ((actual - budgeted) / budgeted) * 100
  const absDiff = Math.abs(diff)

  if (absDiff < 1) return null

  const isOver = diff > 0
  const isHighDivergence = absDiff > 10

  const color = isOver
    ? isHighDivergence
      ? 'text-red-600 dark:text-red-400'
      : 'text-amber-600 dark:text-amber-400'
    : 'text-green-600 dark:text-green-400'

  const Icon = isOver ? TrendingUp : TrendingDown
  const sign = isOver ? '+' : ''

  const tooltipText = isOver
    ? `Valor real ${sign}${absDiff.toFixed(1)}% acima do orcado`
    : `Valor real ${absDiff.toFixed(1)}% abaixo do orcado`

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn('inline-flex items-center gap-0.5 text-xs font-medium', color)}>
            <Icon className="h-3 w-3" />
            {sign}{absDiff.toFixed(1)}%
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          {tooltipText}
          <br />
          <span className="text-muted-foreground">
            Orcado: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(budgeted)}
            {' / '}
            Pago: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(actual)}
          </span>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// ---- NfCell (inline editavel via dropdown) ----

const NF_STATUS_ORDER: NfRequestStatus[] = [
  'nao_aplicavel',
  'pendente',
  'pedido',
  'recebido',
  'rejeitado',
  'aprovado',
]

function NfCell({
  item,
  onSave,
}: {
  item: CostItem
  onSave: (payload: Record<string, unknown> & { id: string }) => Promise<unknown>
}) {
  const [saving, setSaving] = useState(false)
  const status = item.nf_request_status
  const config = NF_REQUEST_STATUS_CONFIG[status]

  if (!config) {
    return <span className="text-muted-foreground text-xs">{status}</span>
  }

  async function handleChange(newStatus: NfRequestStatus) {
    if (newStatus === status) return
    setSaving(true)
    try {
      await onSave({ id: item.id, nf_request_status: newStatus })
    } catch (err) {
      toast.error(safeErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex items-center gap-1">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs cursor-pointer whitespace-nowrap',
              'hover:ring-1 hover:ring-border transition-all',
              saving && 'opacity-50 pointer-events-none',
              config.textClass,
            )}
            disabled={saving}
          >
            <span className={cn('inline-block size-2 rounded-full shrink-0', config.dotClass)} />
            {config.label}
            <ChevronDown className="size-3 opacity-50" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-[140px]">
          {NF_STATUS_ORDER.map((s) => {
            const c = NF_REQUEST_STATUS_CONFIG[s]
            return (
              <DropdownMenuItem
                key={s}
                onClick={() => handleChange(s)}
                className={cn('text-xs gap-2', s === status && 'font-semibold')}
              >
                <span className={cn('inline-block size-2 rounded-full shrink-0', c.dotClass)} />
                {c.label}
                {s === status && <Check className="size-3 ml-auto text-foreground" />}
              </DropdownMenuItem>
            )
          })}
        </DropdownMenuContent>
      </DropdownMenu>
      {item.nf_drive_url && (
        <a
          href={item.nf_drive_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted-foreground hover:text-foreground transition-colors"
          onClick={e => e.stopPropagation()}
          aria-label="Abrir NF no Drive"
        >
          <ExternalLink className="size-3.5" />
        </a>
      )}
    </div>
  )
}

// ---- PaymentProofCell ----
// Exibe icone de check verde quando o item tem comprovante(s) vinculado(s),
// com tooltip indicando a quantidade. Usa os campos do proprio CostItem para
// evitar fetch extra por linha (payment_proof_url indica presenca de pelo menos 1).

function PaymentProofCell({ item }: { item: CostItem }) {
  if (!item.payment_proof_url) {
    return <span className="text-muted-foreground">-</span>
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className="inline-flex items-center justify-center h-8 w-8"
            aria-label="Comprovante vinculado"
          >
            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs space-y-0.5">
          <p className="flex items-center gap-1.5">
            <Receipt className="h-3 w-3" />
            Comprovante vinculado
          </p>
          {item.payment_proof_filename && (
            <p className="text-muted-foreground">{item.payment_proof_filename}</p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// ---- CategoryHeaderRow ----

interface CategoryHeaderRowProps {
  items: CostItem[]
  isExpanded: boolean
  onToggle: () => void
}

function CategoryHeaderRow({ items, isExpanded, onToggle }: CategoryHeaderRowProps) {
  const header = items.find(i => i.is_category_header)
  const label = header?.service_description ?? `Categoria ${items[0]?.item_number}`
  const subtotal = getCategorySubtotal(items)
  const nonHeaderCount = items.filter(i => !i.is_category_header).length

  return (
    <TableRow
      className="bg-muted/60 hover:bg-muted/80 cursor-pointer select-none"
      onClick={onToggle}
    >
      <TableCell className="w-8" />
      <TableCell colSpan={14}>
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="font-semibold text-sm">{label}</span>
          <span className="text-xs text-muted-foreground">({nonHeaderCount} itens)</span>
          <span className="ml-auto font-semibold text-sm tabular-nums">
            {formatCurrency(subtotal)}
          </span>
        </div>
      </TableCell>
      <TableCell />
    </TableRow>
  )
}

// ---- ItemRow ----

interface ItemRowProps {
  item: CostItem
  isSelected: boolean
  onToggleSelect: () => void
  onEdit: () => void
  onPay: () => void
  onDelete: (id: string) => void
  onSave: (payload: Record<string, unknown> & { id: string }) => Promise<unknown>
}

function ItemRow({
  item,
  isSelected,
  onToggleSelect,
  onEdit,
  onPay,
  onDelete,
  onSave,
}: ItemRowProps) {
  const isCancelled = item.item_status === 'cancelado' || item.payment_status === 'cancelado'
  const canSelect = !item.is_category_header && item.payment_status === 'pendente' && !isCancelled
  const canPay = item.payment_status === 'pendente' && !item.is_category_header && !isCancelled
  const isOverdue =
    item.payment_due_date &&
    item.payment_status === 'pendente' &&
    new Date(item.payment_due_date) < new Date()

  // Celulas inline so ficam ativas para itens nao-header
  const editable = !item.is_category_header

  return (
    <TableRow
      className={cn(
        item.is_category_header && 'bg-muted/30 font-medium',
        item.payment_status === 'cancelado' && 'opacity-50',
        isSelected && 'bg-primary/5',
      )}
    >
      {/* Checkbox */}
      <TableCell className="w-8">
        {canSelect && (
          <Checkbox
            checked={isSelected}
            onCheckedChange={onToggleSelect}
            aria-label="Selecionar item"
          />
        )}
      </TableCell>

      {/* Numero */}
      <TableCell className="text-xs text-muted-foreground tabular-nums w-14">
        {item.item_number}.{item.sub_item_number}
      </TableCell>

      {/* Descricao — editavel apenas para sub-items */}
      <TableCell
        className="max-w-[200px]"
        data-row-id={editable ? item.id : undefined}
        data-field={editable ? 'service_description' : undefined}
      >
        {editable ? (
          <>
            <InlineEditCell
              itemId={item.id}
              field="service_description"
              value={item.service_description}
              fieldType="text"
              onSave={onSave}
              className="text-sm truncate"
            />
            {/* notes — editavel inline abaixo da descricao */}
            <InlineEditCell
              itemId={item.id}
              field="notes"
              value={item.notes}
              fieldType="text"
              onSave={onSave}
              placeholder="Notas..."
              className="text-xs text-muted-foreground truncate mt-0.5"
            />
          </>
        ) : (
          <>
            <span className={cn('truncate block', item.is_category_header && 'font-semibold')}>
              {item.service_description}
            </span>
            {item.notes && (
              <span className="text-xs text-muted-foreground truncate block">{item.notes}</span>
            )}
          </>
        )}
      </TableCell>

      {/* Fornecedor — autocomplete inline */}
      <TableCell
        className="text-sm"
        data-row-id={editable ? item.id : undefined}
        data-field={editable ? 'vendor' : undefined}
      >
        {editable ? (
          <InlineVendorAutocomplete
            itemId={item.id}
            currentName={item.vendor_name_snapshot}
            onSave={onSave}
          />
        ) : null}
      </TableCell>

      {/* Valor Unit. — editavel inline */}
      <TableCell
        className="text-right tabular-nums text-sm"
        data-row-id={editable ? item.id : undefined}
        data-field={editable ? 'unit_value' : undefined}
      >
        {editable ? (
          <InlineEditCell
            itemId={item.id}
            field="unit_value"
            value={item.unit_value}
            fieldType="currency"
            onSave={onSave}
            align="right"
            className="tabular-nums text-sm"
          />
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
      </TableCell>

      {/* Qtd — editavel inline */}
      <TableCell
        className="text-right tabular-nums text-sm"
        data-row-id={editable ? item.id : undefined}
        data-field={editable ? 'quantity' : undefined}
      >
        {editable ? (
          <InlineEditCell
            itemId={item.id}
            field="quantity"
            value={item.quantity}
            fieldType="integer"
            onSave={onSave}
            align="right"
            className="tabular-nums text-sm"
          />
        ) : null}
      </TableCell>

      {/* Total — calculado (nao editavel) */}
      <TableCell className="text-right tabular-nums text-sm font-medium">
        {editable ? formatCurrency(item.total_value) : ''}
      </TableCell>

      {/* HE — editavel inline */}
      <TableCell
        className="text-right tabular-nums text-sm"
        data-row-id={editable ? item.id : undefined}
        data-field={editable ? 'overtime_value' : undefined}
      >
        {editable ? (
          <InlineEditCell
            itemId={item.id}
            field="overtime_value"
            value={item.overtime_value > 0 ? item.overtime_value : null}
            fieldType="currency"
            onSave={onSave}
            align="right"
            className="tabular-nums text-sm"
          />
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
      </TableCell>

      {/* Total+HE — calculado (nao editavel) */}
      <TableCell className="text-right tabular-nums text-sm font-semibold">
        {editable ? (
          <div className="flex flex-col items-end gap-0.5">
            {formatCurrency(item.total_with_overtime)}
            {item.payment_status === 'pago' && item.actual_paid_value != null && (
              <DivergenceBadge
                budgeted={item.total_with_overtime}
                actual={item.actual_paid_value}
              />
            )}
          </div>
        ) : ''}
      </TableCell>

      {/* Cond. Pgto */}
      <TableCell className="text-xs">
        {editable ? <PaymentConditionCell item={item} onSave={onSave} /> : null}
      </TableCell>

      {/* Vencimento */}
      <TableCell className={cn('text-xs tabular-nums', isOverdue && 'text-destructive font-medium')}>
        {editable ? formatDate(item.payment_due_date) : ''}
      </TableCell>

      {/* Status */}
      <TableCell>
        {editable && <StatusCell item={item} onSave={onSave} />}
      </TableCell>

      {/* NF */}
      <TableCell>
        {editable && <NfCell item={item} onSave={onSave} />}
      </TableCell>

      {/* Pgto */}
      <TableCell className="text-xs">
        {editable && (
          <span
            className={cn(
              'capitalize',
              item.payment_status === 'pago' && 'text-green-700 dark:text-green-400',
              item.payment_status === 'cancelado' && 'text-muted-foreground',
              item.payment_status === 'pendente' && 'text-amber-700 dark:text-amber-400',
            )}
          >
            {item.payment_status === 'pago'
              ? `Pago ${formatDate(item.payment_date)}`
              : item.payment_status === 'cancelado'
              ? 'Cancelado'
              : 'Pendente'}
          </span>
        )}
      </TableCell>

      {/* Comprovante */}
      <TableCell className="w-10 text-center">
        {editable && <PaymentProofCell item={item} />}
      </TableCell>

      {/* Acoes */}
      <TableCell className="w-10">
        {editable && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Acoes</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Pencil className="h-4 w-4 mr-2" />
                Editar
              </DropdownMenuItem>
              {canPay && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onPay}>
                    <CreditCard className="h-4 w-4 mr-2" />
                    Pagar
                  </DropdownMenuItem>
                </>
              )}
              {isCancelled && item.payment_status === 'pendente' && (
                <>
                  <DropdownMenuSeparator />
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="flex items-center gap-2 px-2 py-1.5 text-sm text-muted-foreground cursor-not-allowed select-none">
                          <CreditCard className="h-4 w-4 mr-2 opacity-40" />
                          Pagar
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="left" className="text-xs">
                        Item cancelado — nao pode ser pago
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => onDelete(item.id)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </TableCell>
    </TableRow>
  )
}

// ---- CostItemsTable (main) ----

export function CostItemsTable({
  items,
  selectedIds,
  onToggleSelect,
  onEdit,
  onPay,
  isLoading,
}: CostItemsTableProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(() => {
    // Todas as categorias inicialmente expandidas
    const s = new Set<number>()
    for (let i = 1; i <= 20; i++) s.add(i)
    return s
  })
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const { mutateAsync: deleteItem, isPending: isDeleting } = useDeleteCostItem()
  const { mutateAsync: updateItem } = useUpdateCostItem()

  const grouped = groupByCategoryNumber(items)
  const sortedKeys = Array.from(grouped.keys()).sort((a, b) => a - b)

  function toggleGroup(num: number) {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(num)) {
        next.delete(num)
      } else {
        next.add(num)
      }
      return next
    })
  }

  async function handleDelete() {
    if (!deleteId) return
    try {
      await deleteItem(deleteId)
      toast.success('Item excluido com sucesso')
      setDeleteId(null)
    } catch (err) {
      toast.error(safeErrorMessage(err))
    }
  }

  // Wrapper estavel para nao recriar closures por item
  // Intercepta overtime_value (GENERATED column) e converte para overtime_hours + overtime_rate
  const handleSave = useCallback(
    (payload: Record<string, unknown> & { id: string }) => {
      if ('overtime_value' in payload) {
        const val = payload.overtime_value as number | null
        const { overtime_value: _, ...rest } = payload
        // Preserva overtime_hours existente do item, senao usa 1 como padrao
        const item = items.find(i => i.id === payload.id)
        const existingHours = item?.overtime_hours && item.overtime_hours > 0 ? item.overtime_hours : 1
        return updateItem({
          ...rest,
          overtime_hours: val ? existingHours : 0,
          overtime_rate: val ? val / existingHours : 0,
        })
      }
      return updateItem(payload)
    },
    [updateItem, items],
  )

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="rounded-md border border-border py-16 flex flex-col items-center justify-center text-center gap-2">
        <p className="text-sm text-muted-foreground">Nenhum item de custo encontrado.</p>
        <p className="text-xs text-muted-foreground">
          Clique em &quot;Adicionar Item&quot; para comecar.
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="rounded-md border border-border overflow-auto max-h-[calc(100vh-260px)]">
        <Table>
          <TableHeader className="sticky top-0 z-20 bg-background shadow-[0_1px_0_0_hsl(var(--border))]">
            <TableRow className="text-xs">
              <TableHead className="w-8" />
              <TableHead className="w-14">#</TableHead>
              <TableHead className="min-w-[180px]">Descricao</TableHead>
              <TableHead className="min-w-[120px]">Fornecedor</TableHead>
              <TableHead className="text-right">Valor Unit.</TableHead>
              <TableHead className="text-right">Qtd</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">HE</TableHead>
              <TableHead className="text-right">Total+HE</TableHead>
              <TableHead>Cond. Pgto</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="cursor-help underline decoration-dotted">NF</span>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      Status da Nota Fiscal vinculada ao item
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </TableHead>
              <TableHead>Pgto</TableHead>
              <TableHead className="w-10 text-center">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="cursor-help underline decoration-dotted">Comp.</span>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      Comprovante de pagamento vinculado ao item
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedKeys.map(categoryNum => {
              const categoryItems = grouped.get(categoryNum)!
              const isExpanded = expandedGroups.has(categoryNum)

              return (
                <React.Fragment key={`group-${categoryNum}`}>
                  <CategoryHeaderRow
                    items={categoryItems}
                    isExpanded={isExpanded}
                    onToggle={() => toggleGroup(categoryNum)}
                  />
                  {isExpanded &&
                    categoryItems
                      .filter(i => !i.is_category_header)
                      .sort((a, b) => a.sub_item_number - b.sub_item_number)
                      .map(item => (
                        <ItemRow
                          key={item.id}
                          item={item}
                          isSelected={selectedIds.has(item.id)}
                          onToggleSelect={() => onToggleSelect(item.id)}
                          onEdit={() => onEdit(item)}
                          onPay={() => onPay(item)}
                          onDelete={id => setDeleteId(id)}
                          onSave={handleSave}
                        />
                      ))}
                </React.Fragment>
              )
            })}
          </TableBody>
        </Table>
      </div>

      <DeleteConfirmDialog
        open={!!deleteId}
        onOpenChange={open => { if (!open) setDeleteId(null) }}
        onConfirm={handleDelete}
        isPending={isDeleting}
      />
    </>
  )
}
