'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Search } from 'lucide-react'
import { useVendors } from '@/hooks/useVendors'
import { VendorsTable } from './_components/VendorsTable'
import { VendorCreateDialog } from './_components/VendorCreateDialog'
import { VendorDetailSheet } from './_components/VendorDetailSheet'
import type { VendorFilters, EntityType } from '@/types/cost-management'

const DEFAULT_FILTERS: VendorFilters = {
  page: 1,
  per_page: 20,
  sort_by: 'full_name',
  sort_order: 'asc',
}

export default function VendorsPage() {
  const [filters, setFilters] = useState<VendorFilters>(DEFAULT_FILTERS)
  const [search, setSearch] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null)

  // Debounce search → filters
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((prev) => ({ ...prev, search: search || undefined, page: 1 }))
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  // Contagem total
  const { meta } = useVendors(filters)
  const total = meta?.total

  function handleEntityTypeChange(value: string) {
    setFilters((prev) => ({
      ...prev,
      entity_type: value === 'all' ? undefined : (value as EntityType),
      page: 1,
    }))
  }

  function handleActiveChange(value: string) {
    setFilters((prev) => ({
      ...prev,
      is_active: value === 'all' ? undefined : value === 'true',
      page: 1,
    }))
  }

  function handleSelectVendor(vendorId: string) {
    setSelectedVendorId(vendorId)
  }

  function handleDetailClose(open: boolean) {
    if (!open) setSelectedVendorId(null)
  }

  function handleVendorCreated(vendorId: string) {
    setSelectedVendorId(vendorId)
  }

  function handleUseExisting(vendorId: string) {
    setSelectedVendorId(vendorId)
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight shrink-0">Fornecedores</h1>
          {total !== undefined && (
            <span className="text-xs font-medium text-muted-foreground" aria-live="polite">
              {total} {total === 1 ? 'fornecedor' : 'fornecedores'}
            </span>
          )}
        </div>

        <Button
          size="default"
          className="h-9 px-4 shrink-0"
          onClick={() => setCreateOpen(true)}
        >
          <Plus className="size-4 mr-1.5" />
          Novo Fornecedor
        </Button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-2">
        {/* Busca */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Buscar por nome, email, CPF ou CNPJ..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Tipo */}
        <Select
          value={filters.entity_type ?? 'all'}
          onValueChange={handleEntityTypeChange}
        >
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            <SelectItem value="pf">Pessoa Fisica (PF)</SelectItem>
            <SelectItem value="pj">Pessoa Juridica (PJ)</SelectItem>
          </SelectContent>
        </Select>

        {/* Status */}
        <Select
          value={filters.is_active === undefined ? 'all' : String(filters.is_active)}
          onValueChange={handleActiveChange}
        >
          <SelectTrigger className="w-full sm:w-36">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="true">Ativos</SelectItem>
            <SelectItem value="false">Inativos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabela */}
      <VendorsTable
        filters={filters}
        onFiltersChange={setFilters}
        onSelectVendor={handleSelectVendor}
      />

      {/* Dialog de criacao */}
      <VendorCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onVendorCreated={handleVendorCreated}
        onUseExisting={handleUseExisting}
      />

      {/* Sheet de detalhe */}
      <VendorDetailSheet
        vendorId={selectedVendorId}
        open={!!selectedVendorId}
        onOpenChange={handleDetailClose}
        onDeleted={() => setSelectedVendorId(null)}
      />
    </div>
  )
}
