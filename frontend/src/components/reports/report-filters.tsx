'use client'

import { Download, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

// --- Tipos ---

export type PeriodPreset =
  | 'this_month'
  | 'last_3_months'
  | 'last_6_months'
  | 'this_year'
  | 'custom'

export type PerformanceGroupBy = 'director' | 'project_type' | 'client' | 'segment'

export interface ReportFiltersValue {
  preset: PeriodPreset
  startDate: string
  endDate: string
  groupBy: PerformanceGroupBy
}

// --- Helpers de data ---

function toIso(date: Date): string {
  return date.toISOString().split('T')[0]
}

export function getPresetDates(preset: PeriodPreset): { start: string; end: string } {
  const today = new Date()
  const end = toIso(today)

  switch (preset) {
    case 'this_month': {
      const start = new Date(today.getFullYear(), today.getMonth(), 1)
      return { start: toIso(start), end }
    }
    case 'last_3_months': {
      const start = new Date(today)
      start.setMonth(start.getMonth() - 3)
      return { start: toIso(start), end }
    }
    case 'last_6_months': {
      const start = new Date(today)
      start.setMonth(start.getMonth() - 6)
      return { start: toIso(start), end }
    }
    case 'this_year': {
      const start = new Date(today.getFullYear(), 0, 1)
      return { start: toIso(start), end }
    }
    default:
      return { start: '', end: '' }
  }
}

// --- Opcoes de preset ---

const PRESET_OPTIONS: { value: PeriodPreset; label: string }[] = [
  { value: 'this_month', label: 'Este mes' },
  { value: 'last_3_months', label: 'Ultimos 3 meses' },
  { value: 'last_6_months', label: 'Ultimos 6 meses' },
  { value: 'this_year', label: 'Este ano' },
  { value: 'custom', label: 'Personalizado' },
]

const GROUP_BY_OPTIONS: { value: PerformanceGroupBy; label: string }[] = [
  { value: 'director', label: 'Diretor' },
  { value: 'project_type', label: 'Tipo de Projeto' },
  { value: 'client', label: 'Cliente' },
  { value: 'segment', label: 'Segmento' },
]

// --- Props ---

interface ReportFiltersProps {
  filters: ReportFiltersValue
  onChange: (filters: ReportFiltersValue) => void
  showGroupBy?: boolean
  onExport?: () => void
  isExporting?: boolean
  className?: string
}

export function ReportFilters({
  filters,
  onChange,
  showGroupBy = false,
  onExport,
  isExporting = false,
  className,
}: ReportFiltersProps) {
  // Ao trocar o preset, recalcula as datas automaticamente
  function handlePresetChange(preset: PeriodPreset) {
    if (preset === 'custom') {
      onChange({ ...filters, preset })
      return
    }
    const { start, end } = getPresetDates(preset)
    onChange({ ...filters, preset, startDate: start, endDate: end })
  }

  function handleStartDateChange(value: string) {
    onChange({ ...filters, preset: 'custom', startDate: value })
  }

  function handleEndDateChange(value: string) {
    onChange({ ...filters, preset: 'custom', endDate: value })
  }

  function handleGroupByChange(groupBy: PerformanceGroupBy) {
    onChange({ ...filters, groupBy })
  }

  return (
    <div
      className={cn(
        'flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end',
        className,
      )}
    >
      {/* Preset de periodo */}
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs text-muted-foreground">Periodo</Label>
        <Select value={filters.preset} onValueChange={handlePresetChange}>
          <SelectTrigger className="h-9 w-[180px]">
            <SelectValue placeholder="Selecione" />
          </SelectTrigger>
          <SelectContent>
            {PRESET_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Data inicio */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="report-start-date" className="text-xs text-muted-foreground">
          De
        </Label>
        <input
          id="report-start-date"
          type="date"
          value={filters.startDate}
          onChange={(e) => handleStartDateChange(e.target.value)}
          max={filters.endDate || undefined}
          className={cn(
            'h-9 rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background',
            'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
            'disabled:cursor-not-allowed disabled:opacity-50',
          )}
        />
      </div>

      {/* Data fim */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="report-end-date" className="text-xs text-muted-foreground">
          Ate
        </Label>
        <input
          id="report-end-date"
          type="date"
          value={filters.endDate}
          onChange={(e) => handleEndDateChange(e.target.value)}
          min={filters.startDate || undefined}
          className={cn(
            'h-9 rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background',
            'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
            'disabled:cursor-not-allowed disabled:opacity-50',
          )}
        />
      </div>

      {/* Agrupamento (apenas aba Performance) */}
      {showGroupBy && (
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground">Agrupar por</Label>
          <Select value={filters.groupBy} onValueChange={handleGroupByChange}>
            <SelectTrigger className="h-9 w-[180px]">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {GROUP_BY_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Spacer para empurrar o botao para a direita em telas grandes */}
      <div className="flex-1" />

      {/* Botao exportar CSV */}
      {onExport && (
        <Button
          variant="outline"
          size="sm"
          onClick={onExport}
          disabled={isExporting || !filters.startDate || !filters.endDate}
          className="h-9 shrink-0 gap-2"
        >
          {isExporting ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Download className="size-4" />
          )}
          Exportar CSV
        </Button>
      )}
    </div>
  )
}
