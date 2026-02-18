'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronDown, FilterX, Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useClients } from '@/hooks/useClients'
import { JOB_STATUS_COLORS, JOB_STATUS_LABELS, PROJECT_TYPE_LABELS } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { JOB_STATUSES, PROJECT_TYPES } from '@/types/jobs'
import type { JobFilters, JobStatus, ProjectType } from '@/types/jobs'

interface JobFiltersProps {
  filters: JobFilters
  onFiltersChange: (filters: JobFilters) => void
}

export function JobFilters({ filters, onFiltersChange }: JobFiltersProps) {
  // Estado local do campo de busca para o debounce
  const [searchValue, setSearchValue] = useState(filters.search ?? '')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Estado de busca de clientes no dropdown
  const [clientSearch, setClientSearch] = useState('')
  const { data: clients } = useClients(clientSearch)
  // Query separada sem busca para garantir que o cliente selecionado sempre apareca no chip
  const { data: allClients } = useClients()

  // Popover open states
  const [statusOpen, setStatusOpen] = useState(false)
  const [clientOpen, setClientOpen] = useState(false)

  // Cleanup debounce ao desmontar
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  // Sincroniza searchValue quando filtros sao resetados externamente
  useEffect(() => {
    setSearchValue(filters.search ?? '')
  }, [filters.search])

  // Debounce da busca textual
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

  // Toggle de status no multi-select
  function handleStatusToggle(status: JobStatus) {
    const current = filters.status ?? []
    const next = current.includes(status)
      ? current.filter((s) => s !== status)
      : [...current, status]
    onFiltersChange({ ...filters, status: next.length > 0 ? next : undefined, page: 1 })
  }

  function handleClientSelect(clientId: string) {
    const isSame = filters.client_id === clientId
    onFiltersChange({ ...filters, client_id: isSame ? undefined : clientId, page: 1 })
    setClientOpen(false)
  }

  function handleJobTypeChange(value: string) {
    onFiltersChange({
      ...filters,
      job_type: value === '__clear__' ? undefined : (value as ProjectType),
      page: 1,
    })
  }

  function handleArchivedToggle(checked: boolean) {
    onFiltersChange({ ...filters, is_archived: checked || undefined, page: 1 })
  }

  function handleClearAll() {
    setSearchValue('')
    setClientSearch('')
    onFiltersChange({
      sort_by: filters.sort_by,
      sort_order: filters.sort_order,
      page: 1,
      per_page: filters.per_page,
    })
  }

  // Verifica se algum filtro ativo
  const selectedStatuses = filters.status ?? []
  const hasActiveFilters =
    !!filters.search ||
    selectedStatuses.length > 0 ||
    !!filters.client_id ||
    !!filters.job_type ||
    !!filters.is_archived

  // Nome do cliente selecionado - busca na lista completa (sem filtro de busca)
  const selectedClient = allClients?.find((c) => c.id === filters.client_id)

  return (
    <div className="space-y-2">
      {/* Barra principal */}
      <div className="flex flex-wrap items-center gap-2">
        {/* 1. Busca textual */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input
            value={searchValue}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Buscar por titulo, codigo..."
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

        {/* 2. Multi-select Status */}
        <Popover open={statusOpen} onOpenChange={setStatusOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="h-9 gap-1.5 font-normal">
              {selectedStatuses.length > 0
                ? `Status (${selectedStatuses.length})`
                : 'Status'}
              <ChevronDown className="size-4 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-0" align="start">
            <Command>
              <CommandInput placeholder="Buscar status..." />
              <CommandList>
                <CommandEmpty>Nenhum status encontrado.</CommandEmpty>
                <CommandGroup>
                  {JOB_STATUSES.map((status) => {
                    const isSelected = selectedStatuses.includes(status)
                    return (
                      <CommandItem
                        key={status}
                        value={JOB_STATUS_LABELS[status]}
                        onSelect={() => handleStatusToggle(status)}
                        className="gap-2"
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => handleStatusToggle(status)}
                          aria-hidden
                          tabIndex={-1}
                        />
                        <span
                          className="size-2 rounded-full shrink-0"
                          style={{ backgroundColor: JOB_STATUS_COLORS[status] }}
                        />
                        <span className="truncate">{JOB_STATUS_LABELS[status]}</span>
                      </CommandItem>
                    )
                  })}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {/* 3. Dropdown Cliente (searchable) */}
        <Popover open={clientOpen} onOpenChange={setClientOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn('h-9 gap-1.5 font-normal max-w-[200px]', selectedClient && 'text-foreground')}
            >
              <span className="truncate">
                {selectedClient ? selectedClient.name : 'Cliente'}
              </span>
              <ChevronDown className="size-4 opacity-50 shrink-0" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-0" align="start">
            <Command>
              <CommandInput
                placeholder="Buscar cliente..."
                value={clientSearch}
                onValueChange={setClientSearch}
              />
              <CommandList>
                <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
                <CommandGroup>
                  {filters.client_id && (
                    <CommandItem
                      value="__limpar__"
                      onSelect={() => {
                        onFiltersChange({ ...filters, client_id: undefined, page: 1 })
                        setClientOpen(false)
                      }}
                      className="text-muted-foreground italic"
                    >
                      Limpar selecao
                    </CommandItem>
                  )}
                  {(clients ?? []).map((client) => (
                    <CommandItem
                      key={client.id}
                      value={client.name}
                      onSelect={() => handleClientSelect(client.id)}
                    >
                      <span className="truncate">{client.name}</span>
                      {filters.client_id === client.id && (
                        <span className="ml-auto size-2 rounded-full bg-primary shrink-0" />
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {/* 4. Dropdown Tipo de Projeto */}
        <Select
          value={filters.job_type ?? ''}
          onValueChange={handleJobTypeChange}
        >
          <SelectTrigger className="h-9 w-auto gap-1.5 font-normal">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent align="start">
            {filters.job_type && (
              <SelectItem value="__clear__" className="text-muted-foreground italic">
                Limpar selecao
              </SelectItem>
            )}
            {PROJECT_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {PROJECT_TYPE_LABELS[type]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* 5. Switch Arquivados */}
        <label className="flex items-center gap-2 cursor-pointer select-none h-9 px-1">
          <Switch
            size="sm"
            checked={!!filters.is_archived}
            onCheckedChange={handleArchivedToggle}
            aria-label="Mostrar arquivados"
          />
          <span className="text-sm text-muted-foreground whitespace-nowrap">Arquivados</span>
        </label>

        {/* 6. Botao Limpar */}
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

      {/* 7. Chips de filtros ativos */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-1.5">
          {filters.search && (
            <Badge
              variant="secondary"
              className="gap-1 pr-1 text-xs font-normal"
            >
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

          {selectedStatuses.map((status) => (
            <Badge
              key={status}
              variant="secondary"
              className="gap-1 pr-1 text-xs font-normal"
            >
              <span
                className="size-1.5 rounded-full shrink-0"
                style={{ backgroundColor: JOB_STATUS_COLORS[status] }}
              />
              <span>{JOB_STATUS_LABELS[status]}</span>
              <button
                type="button"
                onClick={() => handleStatusToggle(status)}
                className="ml-0.5 rounded-sm opacity-60 hover:opacity-100 transition-opacity"
                aria-label={`Remover filtro ${JOB_STATUS_LABELS[status]}`}
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}

          {filters.client_id && selectedClient && (
            <Badge
              variant="secondary"
              className="gap-1 pr-1 text-xs font-normal"
            >
              <span>{selectedClient.name}</span>
              <button
                type="button"
                onClick={() => onFiltersChange({ ...filters, client_id: undefined, page: 1 })}
                className="ml-0.5 rounded-sm opacity-60 hover:opacity-100 transition-opacity"
                aria-label="Remover filtro de cliente"
              >
                <X className="size-3" />
              </button>
            </Badge>
          )}

          {filters.job_type && (
            <Badge
              variant="secondary"
              className="gap-1 pr-1 text-xs font-normal"
            >
              <span>{PROJECT_TYPE_LABELS[filters.job_type]}</span>
              <button
                type="button"
                onClick={() => onFiltersChange({ ...filters, job_type: undefined, page: 1 })}
                className="ml-0.5 rounded-sm opacity-60 hover:opacity-100 transition-opacity"
                aria-label="Remover filtro de tipo"
              >
                <X className="size-3" />
              </button>
            </Badge>
          )}

          {filters.is_archived && (
            <Badge
              variant="secondary"
              className="gap-1 pr-1 text-xs font-normal"
            >
              <span>Mostrando arquivados</span>
              <button
                type="button"
                onClick={() => onFiltersChange({ ...filters, is_archived: undefined, page: 1 })}
                className="ml-0.5 rounded-sm opacity-60 hover:opacity-100 transition-opacity"
                aria-label="Remover filtro de arquivados"
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
