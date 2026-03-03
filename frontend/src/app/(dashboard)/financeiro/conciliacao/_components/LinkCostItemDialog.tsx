'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Search, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { apiGet } from '@/lib/api'
import { formatCurrency } from '@/lib/format'
import type { BankTransaction } from '@/types/bank-reconciliation'

interface CostItemResult {
  id: string
  service_description: string
  unit_value: number | null
  total_with_overtime: number | null
  payment_due_date: string | null
  item_status: string
  vendor_name_snapshot: string | null
  job_id: string | null
  jobs?: {
    id: string
    title: string
    code: string | null
    job_aba: string | null
  } | null
}

interface LinkCostItemDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  transaction: BankTransaction | null
  onLink: (costItemId: string) => void
  isLinking: boolean
}

export function LinkCostItemDialog({
  open,
  onOpenChange,
  transaction,
  onLink,
  isLinking,
}: LinkCostItemDialogProps) {
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<CostItemResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)

  // Buscar cost_items quando o dialog abre ou search muda
  useEffect(() => {
    if (!open) {
      setSearch('')
      setResults([])
      setSelected(null)
      return
    }

    const search_term = search.trim()
    const controller = new AbortController()

    const fetchItems = async () => {
      setIsLoading(true)
      try {
        const params: Record<string, string> = {
          per_page: '20',
          sort_by: 'payment_due_date',
          sort_order: 'asc',
        }
        if (search_term) params.search = search_term

        // Filtrar por valor aproximado da transacao se disponivel
        if (transaction?.amount) {
          const abs = Math.abs(transaction.amount)
          // Busca por valor com margem de 10% em cada lado
          const margin = abs * 0.10
          params.amount_min = String(Math.floor(abs - margin))
          params.amount_max = String(Math.ceil(abs + margin))
        }

        const data = await apiGet<{ data: CostItemResult[] }>('cost-items', params)
        setResults(data.data ?? [])
      } catch {
        setResults([])
      } finally {
        setIsLoading(false)
      }
    }

    const timer = setTimeout(fetchItems, 300)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [open, search, transaction?.amount])

  const handleConfirm = () => {
    if (!selected) return
    onLink(selected)
  }

  const absAmount = transaction ? Math.abs(transaction.amount) : 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Vincular a Item de Custo</DialogTitle>
          <DialogDescription>
            Transacao: <strong>{transaction?.description}</strong>
            {transaction && (
              <span className="ml-2 font-semibold text-red-600 dark:text-red-400">
                {formatCurrency(absAmount)}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        {/* Busca */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <Input
            placeholder="Buscar por descricao do servico..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
        </div>

        {/* Resultados */}
        <ScrollArea className="h-72 rounded-md border">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
            </div>
          ) : results.length === 0 ? (
            <div className="flex items-center justify-center h-full text-sm text-zinc-500">
              Nenhum item de custo encontrado
            </div>
          ) : (
            <div className="p-1">
              {results.map((item) => {
                const itemAmount = item.total_with_overtime ?? item.unit_value ?? 0
                const isSelected = selected === item.id
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelected(item.id)}
                    className={cn(
                      'w-full text-left rounded-md px-3 py-2.5 text-sm transition-colors',
                      isSelected
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-zinc-50 dark:hover:bg-zinc-800',
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{item.service_description}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {item.vendor_name_snapshot && (
                            <span className={cn(
                              'text-xs',
                              isSelected ? 'text-primary-foreground/70' : 'text-zinc-500',
                            )}>
                              {item.vendor_name_snapshot}
                            </span>
                          )}
                          {item.jobs && (
                            <span className={cn(
                              'text-xs',
                              isSelected ? 'text-primary-foreground/70' : 'text-zinc-500',
                            )}>
                              {item.jobs.code}{item.jobs.job_aba && `-${item.jobs.job_aba}`}
                            </span>
                          )}
                          {item.payment_due_date && (
                            <span className={cn(
                              'text-xs',
                              isSelected ? 'text-primary-foreground/70' : 'text-zinc-400',
                            )}>
                              Venc: {new Date(item.payment_due_date).toLocaleDateString('pt-BR')}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className={cn(
                        'text-sm font-semibold shrink-0',
                        isSelected ? 'text-primary-foreground' : 'text-zinc-900 dark:text-zinc-100',
                      )}>
                        {formatCurrency(itemAmount)}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLinking}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={!selected || isLinking}>
            {isLinking ? 'Vinculando...' : 'Vincular'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
