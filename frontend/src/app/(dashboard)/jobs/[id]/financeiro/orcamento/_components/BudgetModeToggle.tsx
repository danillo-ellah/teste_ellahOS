'use client'

import { cn } from '@/lib/utils'
import { useUpdateBudgetMode } from '@/hooks/useCostItems'
import { toast } from 'sonner'
import { safeErrorMessage } from '@/lib/api'
import type { BudgetMode } from '@/types/cost-management'

interface BudgetModeToggleProps {
  jobId: string
  currentMode: BudgetMode
}

const MODES: { value: BudgetMode; label: string; description: string }[] = [
  {
    value: 'bottom_up',
    label: 'Bottom-up',
    description: 'Soma dos itens define o orcamento',
  },
  {
    value: 'top_down',
    label: 'Top-down',
    description: 'Teto do cliente define o orcamento',
  },
]

export function BudgetModeToggle({ jobId, currentMode }: BudgetModeToggleProps) {
  const { mutate, isPending } = useUpdateBudgetMode()

  function handleSelect(mode: BudgetMode) {
    if (mode === currentMode || isPending) return
    mutate(
      { jobId, budget_mode: mode },
      {
        onSuccess: () => {
          toast.success('Modo de orcamento atualizado')
        },
        onError: err => {
          toast.error(safeErrorMessage(err) || 'Erro ao atualizar modo de orcamento')
        },
      },
    )
  }

  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        Modo de Orcamento
      </p>
      <div className="flex rounded-md border overflow-hidden w-full sm:w-fit">
        {MODES.map(mode => {
          const isActive = currentMode === mode.value
          return (
            <button
              key={mode.value}
              type="button"
              disabled={isPending}
              onClick={() => handleSelect(mode.value)}
              className={cn(
                'flex-1 sm:flex-none px-4 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-background text-muted-foreground hover:bg-muted hover:text-foreground',
                isPending && 'opacity-50 cursor-not-allowed',
              )}
            >
              <span className="block">{mode.label}</span>
              <span
                className={cn(
                  'block text-xs mt-0.5',
                  isActive ? 'text-primary-foreground/80' : 'text-muted-foreground',
                )}
              >
                {mode.description}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
