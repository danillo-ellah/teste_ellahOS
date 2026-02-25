'use client'

import { AlertTriangle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/format'

// --- Props ---

interface NfRequestSelectionToolbarProps {
  selectedCount: number
  selectedTotal: number
  supplierCount: number
  supplierName: string | null
  onCancel: () => void
  onConfirm: () => void
  isLoading: boolean
}

export function NfRequestSelectionToolbar({
  selectedCount,
  selectedTotal,
  supplierCount,
  supplierName,
  onCancel,
  onConfirm,
  isLoading,
}: NfRequestSelectionToolbarProps) {
  if (selectedCount === 0) return null

  const isMultiple = supplierCount > 1

  return (
    <div
      className={cn(
        'fixed bottom-6 z-50 animate-in slide-in-from-bottom-4 fade-in-0 duration-200',
        // Desktop: centralizado compensando a sidebar (256px) + metade da content area
        'left-1/2 -translate-x-1/2',
        // Mobile/tablet: full width com margem
        'max-md:bottom-[76px] max-md:left-4 max-md:right-4 max-md:translate-x-0',
      )}
      role="status"
      aria-live="polite"
      aria-label={`${selectedCount} ${selectedCount === 1 ? 'item selecionado' : 'itens selecionados'}, total ${formatCurrency(selectedTotal)}`}
    >
      <div
        className={cn(
          'flex flex-wrap items-center justify-between gap-4 rounded-xl border px-5 py-3 shadow-2xl',
          'border-zinc-700 bg-zinc-900 text-zinc-50 dark:border-zinc-300 dark:bg-zinc-100 dark:text-zinc-900',
          'min-w-[400px] max-md:min-w-0 max-md:w-full',
        )}
      >
        {/* Informacoes */}
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">
              {selectedCount} {selectedCount === 1 ? 'item' : 'itens'} selecionado{selectedCount !== 1 ? 's' : ''}
            </span>
            {!isMultiple && supplierName && (
              <span className="text-sm text-zinc-400 dark:text-zinc-500">
                · {supplierName}
              </span>
            )}
            <span className="font-mono text-sm font-semibold">
              · {formatCurrency(selectedTotal)}
            </span>
          </div>

          {isMultiple && (
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-400 dark:text-amber-600" />
              <span className="text-xs text-amber-300 dark:text-amber-600">
                {supplierCount} emails serao enviados (um por fornecedor)
              </span>
            </div>
          )}
        </div>

        {/* Botoes */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            disabled={isLoading}
            className="text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 dark:hover:bg-zinc-200 dark:hover:text-zinc-800"
          >
            Cancelar
          </Button>

          <Button
            size="sm"
            onClick={onConfirm}
            disabled={isLoading}
            className="bg-rose-600 text-white hover:bg-rose-700 dark:bg-rose-500 dark:hover:bg-rose-600"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : isMultiple ? (
              `Enviar ${supplierCount} emails`
            ) : (
              'Pedir NF'
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
