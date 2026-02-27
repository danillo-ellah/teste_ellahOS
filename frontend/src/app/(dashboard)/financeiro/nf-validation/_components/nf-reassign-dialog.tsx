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
import { useFinancialRecordMatches } from '@/hooks/useNf'
import type { FinancialRecordMatch } from '@/types/nf'

const NF_STATUS_LABEL: Record<FinancialRecordMatch['nf_status'], string> = {
  sem_nf: 'Sem NF',
  enviado: 'Enviado',
  confirmado: 'Confirmado',
}

const NF_STATUS_CLASS: Record<FinancialRecordMatch['nf_status'], string> = {
  sem_nf: 'text-amber-700 bg-amber-100 dark:text-amber-400 dark:bg-amber-500/10',
  enviado: 'text-blue-700 bg-blue-100 dark:text-blue-400 dark:bg-blue-500/10',
  confirmado: 'text-green-700 bg-green-100 dark:text-green-400 dark:bg-green-500/10',
}

// --- Item de resultado ---

interface RecordItemProps {
  record: FinancialRecordMatch
  isSelected: boolean
  onSelect: () => void
}

function RecordItem({ record, isSelected, onSelect }: RecordItemProps) {
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
              ? 'border-rose-600 bg-rose-600 dark:border-rose-400 dark:bg-rose-400'
              : 'border-zinc-300 dark:border-zinc-600',
          )}
        >
          {isSelected && (
            <div className="h-full w-full rounded-full bg-white scale-[0.4]" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">{record.description}</p>
          <p className="mt-0.5 text-xs text-zinc-500">
            {record.job_code && (
              <span className="font-mono">{record.job_code}</span>
            )}
            {record.job_code && ' · '}
            <span className="font-mono">{formatCurrency(record.amount)}</span>
            {record.due_date && ` · ${formatDate(record.due_date)}`}
          </p>
        </div>
        <span
          className={cn(
            'shrink-0 rounded-full px-2 py-0.5 text-xs font-medium',
            NF_STATUS_CLASS[record.nf_status],
          )}
        >
          {NF_STATUS_LABEL[record.nf_status]}
        </span>
      </div>
    </button>
  )
}

// --- Main ---

interface NfReassignDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (record: FinancialRecordMatch) => void
  currentJobId?: string | null
}

export function NfReassignDialog({
  open,
  onOpenChange,
  onSelect,
  currentJobId,
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

  const { data: records, isLoading } = useFinancialRecordMatches(
    debouncedSearch,
    currentJobId ?? undefined,
  )

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
          <DialogTitle id="nf-reassign-title">Buscar Lancamento</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {/* Campo de busca */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <Input
              ref={inputRef}
              placeholder="Buscar por descricao, valor ou job..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

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
                  Nenhum lancamento encontrado
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  Tente buscar por valor ou descricao diferente
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {records.map((record) => (
                  <RecordItem
                    key={record.id}
                    record={record}
                    isSelected={selectedId === record.id}
                    onSelect={() => setSelectedId(record.id)}
                  />
                ))}
              </div>
            )}
          </div>

          {debouncedSearch.trim().length < 2 && !currentJobId && (
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
            Selecionar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
