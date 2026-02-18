'use client'

import { useEffect, useRef, useState } from 'react'
import { FilterX, Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { CLIENT_SEGMENT_LABELS } from '@/lib/constants'
import { CLIENT_SEGMENTS } from '@/types/clients'
import type { ClientFilters as ClientFiltersType } from '@/types/clients'

interface ClientFiltersProps {
  filters: ClientFiltersType
  onFiltersChange: (filters: ClientFiltersType) => void
}

export function ClientFilters({ filters, onFiltersChange }: ClientFiltersProps) {
  const [searchValue, setSearchValue] = useState(filters.search ?? '')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  useEffect(() => {
    setSearchValue(filters.search ?? '')
  }, [filters.search])

  function handleSearchChange(value: string) {
    setSearchValue(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      onFiltersChange({ ...filters, search: value || undefined, page: 1 })
    }, 400)
  }

  function handleSearchClear() {
    setSearchValue('')
    if (debounceRef.current) clearTimeout(debounceRef.current)
    onFiltersChange({ ...filters, search: undefined, page: 1 })
  }

  function handleSegmentChange(value: string) {
    onFiltersChange({
      ...filters,
      segment: value === '__clear__' ? undefined : value as ClientFiltersType['segment'],
      page: 1,
    })
  }

  function handleInactiveToggle(checked: boolean) {
    onFiltersChange({
      ...filters,
      is_active: checked ? false : undefined,
      page: 1,
    })
  }

  function handleClearAll() {
    setSearchValue('')
    onFiltersChange({
      sort_by: filters.sort_by,
      sort_order: filters.sort_order,
      page: 1,
      per_page: filters.per_page,
    })
  }

  const hasActiveFilters =
    !!filters.search ||
    !!filters.segment ||
    filters.is_active !== undefined

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input
            value={searchValue}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Buscar por nome, CNPJ..."
            className="pl-9 pr-8 h-9"
          />
          {searchValue && (
            <button
              type="button"
              onClick={handleSearchClear}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Limpar busca"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        <Select
          value={filters.segment ?? ''}
          onValueChange={handleSegmentChange}
        >
          <SelectTrigger className="h-9 w-auto gap-1.5 font-normal">
            <SelectValue placeholder="Segmento" />
          </SelectTrigger>
          <SelectContent align="start">
            {filters.segment && (
              <SelectItem value="__clear__" className="text-muted-foreground italic">
                Limpar selecao
              </SelectItem>
            )}
            {CLIENT_SEGMENTS.map((seg) => (
              <SelectItem key={seg} value={seg}>
                {CLIENT_SEGMENT_LABELS[seg]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <label className="flex items-center gap-2 cursor-pointer select-none h-9 px-1">
          <Switch
            size="sm"
            checked={filters.is_active === false}
            onCheckedChange={handleInactiveToggle}
            aria-label="Mostrar inativos"
          />
          <span className="text-sm text-muted-foreground whitespace-nowrap">Inativos</span>
        </label>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearAll}
            className="h-9 gap-1.5 text-muted-foreground hover:text-foreground"
          >
            <FilterX className="size-4" />
            Limpar
          </Button>
        )}
      </div>

      {hasActiveFilters && (
        <div className="flex flex-wrap gap-1.5">
          {filters.search && (
            <Badge variant="secondary" className="gap-1 pr-1 text-xs font-normal">
              <span>Busca: {filters.search}</span>
              <button
                type="button"
                onClick={handleSearchClear}
                className="ml-0.5 rounded-sm opacity-60 hover:opacity-100 transition-opacity"
                aria-label="Remover filtro de busca"
              >
                <X className="size-3" />
              </button>
            </Badge>
          )}
          {filters.segment && (
            <Badge variant="secondary" className="gap-1 pr-1 text-xs font-normal">
              <span>{CLIENT_SEGMENT_LABELS[filters.segment]}</span>
              <button
                type="button"
                onClick={() => onFiltersChange({ ...filters, segment: undefined, page: 1 })}
                className="ml-0.5 rounded-sm opacity-60 hover:opacity-100 transition-opacity"
                aria-label="Remover filtro de segmento"
              >
                <X className="size-3" />
              </button>
            </Badge>
          )}
          {filters.is_active === false && (
            <Badge variant="secondary" className="gap-1 pr-1 text-xs font-normal">
              <span>Mostrando inativos</span>
              <button
                type="button"
                onClick={() => onFiltersChange({ ...filters, is_active: undefined, page: 1 })}
                className="ml-0.5 rounded-sm opacity-60 hover:opacity-100 transition-opacity"
                aria-label="Remover filtro de inativos"
              >
                <X className="size-3" />
              </button>
            </Badge>
          )}
        </div>
      )}
    </div>
  )
}
