'use client'

import { XCircle, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import type { NfRequestRecord, NfRequestSupplierGroup } from '@/types/nf'

// --- Helpers ---

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

// --- Summary card para 1 fornecedor ---

interface SingleSupplierSummaryProps {
  group: NfRequestSupplierGroup
  records: NfRequestRecord[]
}

function SingleSupplierSummary({ group, records }: SingleSupplierSummaryProps) {
  const VISIBLE_ITEMS = 3
  const visibleRecords = records.slice(0, VISIBLE_ITEMS)
  const remainingCount = records.length - VISIBLE_ITEMS
  const remainingTotal = records
    .slice(VISIBLE_ITEMS)
    .reduce((sum, r) => sum + r.amount, 0)

  return (
    <div className="space-y-4">
      {/* Resumo */}
      <div className="rounded-md border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800">
        <div className="grid grid-cols-2 gap-y-2">
          <span className="text-xs text-zinc-500">Para:</span>
          <span className="text-sm font-medium truncate">
            {group.supplier_email ?? '—'}
          </span>

          <span className="text-xs text-zinc-500">Fornecedor:</span>
          <span className="text-sm font-medium">{group.supplier_name}</span>

          <span className="text-xs text-zinc-500">Itens:</span>
          <span className="text-sm font-medium">
            {records.length} {records.length === 1 ? 'lancamento' : 'lancamentos'}
          </span>

          <span className="text-xs text-zinc-500">Total:</span>
          <span className="font-mono text-sm font-semibold text-rose-600 dark:text-rose-400">
            {formatCurrency(group.total_amount)}
          </span>
        </div>
      </div>

      {/* Lista de itens */}
      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
          Itens incluidos
        </p>
        <ScrollArea className="max-h-[120px]">
          <ul className="space-y-1">
            {visibleRecords.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between gap-2 text-sm"
              >
                <span className="truncate text-zinc-700 dark:text-zinc-300">
                  · {r.description}
                </span>
                <span className="shrink-0 font-mono text-zinc-600 dark:text-zinc-400">
                  {formatCurrency(r.amount)}
                </span>
              </li>
            ))}
            {remainingCount > 0 && (
              <li className="flex items-center justify-between gap-2 text-sm">
                <span className="text-zinc-500">
                  · ... ({remainingCount} {remainingCount === 1 ? 'mais' : 'a mais'})
                </span>
                <span className="shrink-0 font-mono text-zinc-500">
                  {formatCurrency(remainingTotal)}
                </span>
              </li>
            )}
          </ul>
        </ScrollArea>
      </div>
    </div>
  )
}

// --- Summary card para multiplos fornecedores ---

interface MultipleSuppliersSummaryProps {
  groups: NfRequestSupplierGroup[]
  selectedIds: Set<string>
}

function MultipleSuppliersSummary({
  groups,
  selectedIds,
}: MultipleSuppliersSummaryProps) {
  return (
    <ScrollArea className="max-h-[320px]">
      <div className="space-y-4">
        {groups.map((group, index) => {
          const groupRecords = group.records.filter((r) => selectedIds.has(r.id))
          if (groupRecords.length === 0) return null

          return (
            <div
              key={group.supplier_name}
              className={cn(index > 0 && 'border-t border-zinc-200 pt-4 dark:border-zinc-700')}
            >
              <p className="mb-1.5 text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                {`EMAIL ${index + 1}: ${group.supplier_name} (${groupRecords.length} ${groupRecords.length === 1 ? 'item' : 'itens'})`}
              </p>
              <div className="space-y-1 pl-2">
                <p className="text-xs text-zinc-500">
                  Para:{' '}
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">
                    {group.supplier_email ?? '—'}
                  </span>
                </p>
                <p className="text-xs text-zinc-500">
                  Total:{' '}
                  <span className="font-mono font-semibold text-rose-600 dark:text-rose-400">
                    {formatCurrency(
                      groupRecords.reduce((sum, r) => sum + r.amount, 0),
                    )}
                  </span>
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </ScrollArea>
  )
}

// --- Componente principal ---

interface NfRequestConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  groups: NfRequestSupplierGroup[]
  selectedIds: Set<string>
  isLoading: boolean
  errorMessage: string | null
  onConfirm: () => void
}

export function NfRequestConfirmDialog({
  open,
  onOpenChange,
  groups,
  selectedIds,
  isLoading,
  errorMessage,
  onConfirm,
}: NfRequestConfirmDialogProps) {
  const selectedGroups = groups.filter((g) =>
    g.records.some((r) => selectedIds.has(r.id)),
  )
  const isMultiple = selectedGroups.length > 1

  const firstGroup = selectedGroups[0]
  const firstGroupRecords = firstGroup
    ? firstGroup.records.filter((r) => selectedIds.has(r.id))
    : []

  const totalSelected = Array.from(selectedIds).length

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-md"
        aria-labelledby="confirm-nf-title"
        role="dialog"
        aria-modal="true"
      >
        <DialogHeader>
          <DialogTitle id="confirm-nf-title">
            {isMultiple
              ? `Confirmar Envio de ${selectedGroups.length} Emails`
              : 'Confirmar Pedido de NF'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <p className="text-sm text-zinc-500">
            {isMultiple
              ? `Serao enviados ${selectedGroups.length} emails, um para cada fornecedor com seus respectivos itens.`
              : `Voce esta prestes a enviar um email de solicitacao de NF para ${totalSelected} ${totalSelected === 1 ? 'lancamento' : 'lancamentos'}.`}
          </p>

          {isMultiple ? (
            <MultipleSuppliersSummary
              groups={selectedGroups}
              selectedIds={selectedIds}
            />
          ) : firstGroup ? (
            <SingleSupplierSummary
              group={{ ...firstGroup, total_amount: firstGroupRecords.reduce((s, r) => s + r.amount, 0) }}
              records={firstGroupRecords}
            />
          ) : null}

          {/* Banner de erro inline */}
          {errorMessage && (
            <div className="flex items-start gap-3 rounded-md border border-red-200 bg-red-50 px-4 py-3 dark:border-red-800 dark:bg-red-950/30">
              <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
              <div>
                <p className="text-sm font-medium text-red-700 dark:text-red-400">
                  Falha ao enviar. Tente novamente.
                </p>
                <p className="mt-0.5 text-xs text-red-600 dark:text-red-500">
                  {errorMessage}
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isLoading}
            className="bg-rose-600 text-white hover:bg-rose-700"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : isMultiple ? (
              `Enviar ${selectedGroups.length} emails`
            ) : (
              'Confirmar e Enviar'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
