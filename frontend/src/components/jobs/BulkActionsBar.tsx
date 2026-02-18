'use client'

import { Archive, ChevronDown, RefreshCw, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { JOB_STATUS_LABELS, JOB_STATUS_EMOJI } from '@/lib/constants'
import { JOB_STATUSES } from '@/types/jobs'
import type { JobStatus } from '@/types/jobs'

interface BulkActionsBarProps {
  selectedCount: number
  onClearSelection: () => void
  onBulkArchive: () => void
  onBulkStatusChange: (status: JobStatus) => void
  isArchiving?: boolean
}

export function BulkActionsBar({
  selectedCount,
  onClearSelection,
  onBulkArchive,
  onBulkStatusChange,
  isArchiving = false,
}: BulkActionsBarProps) {
  if (selectedCount === 0) return null

  const label = selectedCount === 1
    ? '1 job selecionado'
    : `${selectedCount} jobs selecionados`

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 h-16 bg-zinc-900 dark:bg-zinc-950 border-t border-zinc-700 px-6 flex items-center gap-4">
      {/* Esquerda: fechar + contador */}
      <button
        type="button"
        onClick={onClearSelection}
        className="h-8 w-8 flex items-center justify-center rounded text-zinc-400 hover:text-white transition-colors"
        aria-label="Cancelar selecao"
      >
        <X className="size-4" />
      </button>
      <span className="text-sm font-medium text-white">{label}</span>

      {/* Direita: acoes */}
      <div className="ml-auto flex items-center gap-2">
        {/* Mudar Status */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="default"
              className="border-zinc-600 text-zinc-200 hover:bg-zinc-800 hover:text-white bg-transparent"
            >
              <RefreshCw className="size-4" />
              Mudar Status
              <ChevronDown className="size-3 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {JOB_STATUSES.map((status) => (
              <DropdownMenuItem
                key={status}
                onClick={() => onBulkStatusChange(status)}
              >
                <span className="text-[11px] select-none shrink-0" aria-hidden="true">
                  {JOB_STATUS_EMOJI[status]}
                </span>
                {JOB_STATUS_LABELS[status]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Arquivar */}
        <Button
          variant="destructive"
          size="default"
          onClick={onBulkArchive}
          disabled={isArchiving}
        >
          <Archive className="size-4" />
          Arquivar
        </Button>
      </div>
    </div>
  )
}
