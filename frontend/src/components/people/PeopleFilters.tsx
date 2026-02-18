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
import { TEAM_ROLE_LABELS, PERSON_TYPE_LABELS } from '@/lib/constants'
import { TEAM_ROLES } from '@/types/jobs'
import type { PersonFilters as PersonFiltersType } from '@/types/people'
import type { TeamRole } from '@/types/jobs'

interface PeopleFiltersProps {
  filters: PersonFiltersType
  onFiltersChange: (filters: PersonFiltersType) => void
}

export function PeopleFilters({ filters, onFiltersChange }: PeopleFiltersProps) {
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

  function handleTypeChange(value: string) {
    let isInternal: boolean | undefined
    if (value === 'internal') isInternal = true
    else if (value === 'freelancer') isInternal = false
    onFiltersChange({ ...filters, is_internal: isInternal, page: 1 })
  }

  function handleRoleChange(value: string) {
    onFiltersChange({
      ...filters,
      default_role: value === '__clear__' ? undefined : (value as TeamRole),
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

  const typeValue = filters.is_internal === true
    ? 'internal'
    : filters.is_internal === false
      ? 'freelancer'
      : ''

  const hasActiveFilters =
    !!filters.search ||
    filters.is_internal !== undefined ||
    !!filters.default_role ||
    filters.is_active !== undefined

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input
            value={searchValue}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Buscar por nome ou email..."
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

        <Select value={typeValue} onValueChange={handleTypeChange}>
          <SelectTrigger className="h-9 w-auto gap-1.5 font-normal">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent align="start">
            <SelectItem value="__all__" className="text-muted-foreground italic">
              Todos
            </SelectItem>
            <SelectItem value="internal">{PERSON_TYPE_LABELS.internal}</SelectItem>
            <SelectItem value="freelancer">{PERSON_TYPE_LABELS.freelancer}</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.default_role ?? ''}
          onValueChange={handleRoleChange}
        >
          <SelectTrigger className="h-9 w-auto gap-1.5 font-normal">
            <SelectValue placeholder="Funcao" />
          </SelectTrigger>
          <SelectContent align="start">
            {filters.default_role && (
              <SelectItem value="__clear__" className="text-muted-foreground italic">
                Limpar selecao
              </SelectItem>
            )}
            {TEAM_ROLES.map((role) => (
              <SelectItem key={role} value={role}>
                {TEAM_ROLE_LABELS[role]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

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
          {filters.is_internal !== undefined && (
            <Badge variant="secondary" className="gap-1 pr-1 text-xs font-normal">
              <span>{filters.is_internal ? PERSON_TYPE_LABELS.internal : PERSON_TYPE_LABELS.freelancer}</span>
              <button
                type="button"
                onClick={() => onFiltersChange({ ...filters, is_internal: undefined, page: 1 })}
                className="ml-0.5 rounded-sm opacity-60 hover:opacity-100 transition-opacity"
                aria-label="Remover filtro de tipo"
              >
                <X className="size-3" />
              </button>
            </Badge>
          )}
          {filters.default_role && (
            <Badge variant="secondary" className="gap-1 pr-1 text-xs font-normal">
              <span>{TEAM_ROLE_LABELS[filters.default_role]}</span>
              <button
                type="button"
                onClick={() => onFiltersChange({ ...filters, default_role: undefined, page: 1 })}
                className="ml-0.5 rounded-sm opacity-60 hover:opacity-100 transition-opacity"
                aria-label="Remover filtro de funcao"
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
