'use client'

import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { POS_STAGE_MAP } from '@/types/pos-producao'
import type { PosDashboardFilters as Filters } from '@/types/pos-producao'

interface PosDashboardFiltersProps {
  filters: Filters
  onFiltersChange: (filters: Filters) => void
}

const DEADLINE_OPTIONS = [
  { value: 'today', label: 'Hoje' },
  { value: 'week', label: 'Esta semana' },
  { value: 'overdue', label: 'Atrasados' },
] as const

export function PosDashboardFilters({ filters, onFiltersChange }: PosDashboardFiltersProps) {
  const hasActiveFilters =
    !!filters.stage || !!filters.assignee_id || !!filters.job_id || !!filters.deadline

  function handleStageChange(value: string) {
    onFiltersChange({ ...filters, stage: value === 'all' ? undefined : (value as Filters['stage']) })
  }

  function handleDeadlineChange(value: string) {
    onFiltersChange({ ...filters, deadline: value === 'all' ? undefined : (value as Filters['deadline']) })
  }

  function handleReset() {
    onFiltersChange({})
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Filtro por etapa */}
      <Select value={filters.stage ?? 'all'} onValueChange={handleStageChange}>
        <SelectTrigger className="h-8 w-[180px] text-xs">
          <SelectValue placeholder="Todas as etapas" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all" className="text-xs">Todas as etapas</SelectItem>
          {POS_STAGE_MAP.map((stage) => (
            <SelectItem key={stage.value} value={stage.value} className="text-xs">
              {stage.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Filtro por prazo */}
      <Select value={filters.deadline ?? 'all'} onValueChange={handleDeadlineChange}>
        <SelectTrigger className="h-8 w-[160px] text-xs">
          <SelectValue placeholder="Qualquer prazo" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all" className="text-xs">Qualquer prazo</SelectItem>
          {DEADLINE_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value} className="text-xs">
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Reset */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleReset}
          className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <X className="size-3.5" />
          Limpar filtros
        </Button>
      )}
    </div>
  )
}
