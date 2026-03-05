'use client'

import { useState, useEffect, useRef } from 'react'
import { Search } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { formatCurrency, formatDate } from '@/lib/format'
import { useCostItemMatches } from '@/hooks/useNf'
import type { CostItemMatch } from '@/types/nf'

const NF_STATUS_LABEL: Record<string, string> = {
  nao_aplicavel: 'N/A',
  pendente: 'Pendente',
  pedido: 'Pedido',
  enviado: 'Enviado',
  recebido: 'Recebido',
  aprovado: 'Aprovado',
  cancelado: 'Cancelado',
}

const NF_STATUS_CLASS: Record<string, string> = {
  nao_aplicavel: 'text-zinc-500 bg-zinc-100 dark:text-zinc-400 dark:bg-zinc-500/10',
  pendente: 'text-amber-700 bg-amber-100 dark:text-amber-400 dark:bg-amber-500/10',
  pedido: 'text-blue-700 bg-blue-100 dark:text-blue-400 dark:bg-blue-500/10',
  enviado: 'text-blue-700 bg-blue-100 dark:text-blue-400 dark:bg-blue-500/10',
  recebido: 'text-indigo-700 bg-indigo-100 dark:text-indigo-400 dark:bg-indigo-500/10',
  aprovado: 'text-green-700 bg-green-100 dark:text-green-400 dark:bg-green-500/10',
  cancelado: 'text-red-700 bg-red-100 dark:text-red-400 dark:bg-red-500/10',
}

// --- Item de resultado ---

interface CostItemRowProps {
  item: CostItemMatch
  isSelected: boolean
  onSelect: () => void
}

function CostItemRow({ item, isSelected, onSelect }: CostItemRowProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'w-full px-3 py-2.5 text-left transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800',
        isSelected && 'bg-zinc-50 dark:bg-zinc-800',
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'mt-1 h-4 w-4 shrink-0 rounded-full border-2 transition-colors',
            isSelected
              ? 'border-emerald-600 bg-emerald-600 dark:border-emerald-400 dark:bg-emerald-400'
              : 'border-zinc-300 dark:border-zinc-600',
          )}
        >
          {isSelected && (
            <div className="h-full w-full rounded-full bg-white scale-[0.4]" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-medium text-foreground">
              {item.vendor_name ?? 'Fornecedor desconhecido'}
            </p>
            {item.job_code && (
              <Badge variant="outline" className="text-[10px] font-mono shrink-0">
                {item.job_code}
              </Badge>
            )}
          </div>
          <p className="mt-0.5 text-xs text-zinc-500 line-clamp-1">
            {item.service_description}
          </p>
          <p className="mt-0.5 text-xs text-zinc-500">
            <span className="font-mono">{formatCurrency(item.total_value)}</span>
            {item.payment_due_date && ` · Venc. ${formatDate(item.payment_due_date)}`}
            {item.vendor_email && (
              <span className="ml-1 text-zinc-400">· {item.vendor_email}</span>
            )}
          </p>
        </div>
        <span
          className={cn(
            'shrink-0 rounded-full px-2 py-0.5 text-xs font-medium',
            NF_STATUS_CLASS[item.nf_request_status] ?? NF_STATUS_CLASS.pendente,
          )}
        >
          {NF_STATUS_LABEL[item.nf_request_status] ?? item.nf_request_status}
        </span>
      </div>
    </button>
  )
}

// --- Main ---

interface NfReassignDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (item: CostItemMatch) => void
  currentJobId?: string | null
  senderEmail?: string | null
  nfDocumentId?: string | null
}

export function NfReassignDialog({
  open,
  onOpenChange,
  onSelect,
  currentJobId,
  senderEmail,
  nfDocumentId,
}: NfReassignDialogProps) {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Debounce de 300ms
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(timer)
  }, [search])

  // Auto-focus ao abrir
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
      setSearch('')
      setDebouncedSearch('')
      setSelectedId(null)
    }
  }, [open])

  // Busca por texto quando usuario digita
  const { data: searchResults, isLoading: searchLoading } = useCostItemMatches(
    debouncedSearch,
    {
      jobId: currentJobId ?? undefined,
      linkedToNf: nfDocumentId ?? undefined,
    },
  )

  // Busca automatica por email do remetente (quando nao tem busca manual)
  const { data: emailResults, isLoading: emailLoading } = useCostItemMatches(
    '',
    {
      email: senderEmail && !debouncedSearch ? senderEmail : undefined,
      linkedToNf: nfDocumentId ?? undefined,
    },
  )

  // Mostrar resultados da busca manual ou sugestoes por email
  const records = debouncedSearch ? searchResults : emailResults
  const isLoading = debouncedSearch ? searchLoading : emailLoading

  const selectedRecord = records.find((r) => r.id === selectedId)

  function handleSelect() {
    if (!selectedRecord) return
    onSelect(selectedRecord)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-lg"
        aria-labelledby="nf-reassign-title"
        aria-modal="true"
      >
        <DialogHeader>
          <DialogTitle id="nf-reassign-title">Vincular ao Item de Custo</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {/* Campo de busca */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <Input
              ref={inputRef}
              placeholder="Buscar por fornecedor, descricao ou job..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Hint: sugestoes por email */}
          {!debouncedSearch && senderEmail && emailResults.length > 0 && (
            <p className="text-xs text-zinc-500 px-1">
              Sugestoes para <span className="font-mono font-medium">{senderEmail}</span>:
            </p>
          )}

          {/* Lista de resultados */}
          <div className="max-h-80 overflow-y-auto rounded-md border border-border">
            {isLoading ? (
              <div className="divide-y divide-border">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="px-3 py-2.5">
                    <Skeleton className="mb-1.5 h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                ))}
              </div>
            ) : records.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10">
                <Search className="h-8 w-8 text-zinc-300" />
                <p className="mt-2 text-sm font-medium text-foreground">
                  Nenhum item de custo encontrado
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  Tente buscar por nome do fornecedor ou descricao
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {records.map((item) => (
                  <CostItemRow
                    key={item.id}
                    item={item}
                    isSelected={selectedId === item.id}
                    onSelect={() => setSelectedId(item.id)}
                  />
                ))}
              </div>
            )}
          </div>

          {!debouncedSearch && !senderEmail && (
            <p className="text-center text-xs text-zinc-400">
              Digite ao menos 2 caracteres para buscar
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            disabled={!selectedId}
            onClick={handleSelect}
          >
            Vincular
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
