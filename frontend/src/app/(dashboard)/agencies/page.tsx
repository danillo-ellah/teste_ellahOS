'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { AgenciesTable } from '@/components/agencies/AgenciesTable'
import { AgenciesTableSkeleton } from '@/components/agencies/AgenciesTableSkeleton'
import { AgencyFilters as AgencyFiltersBar } from '@/components/agencies/AgencyFilters'
import { CreateAgencyModal } from '@/components/agencies/CreateAgencyModal'
import { Pagination } from '@/components/shared/Pagination'
import { EmptyState } from '@/components/jobs/EmptyState'
import { useAgenciesList, useUpdateAgency } from '@/hooks/useAgencies'
import type { AgencyFilters } from '@/types/clients'

const DEFAULT_FILTERS: AgencyFilters = {
  page: 1,
  per_page: 20,
  sort_by: 'name',
  sort_order: 'asc',
}

export default function AgenciesPage() {
  const [filters, setFilters] = useState<AgencyFilters>(DEFAULT_FILTERS)
  const [createModalOpen, setCreateModalOpen] = useState(false)

  const { data: agencies, meta, isLoading, isError, refetch } = useAgenciesList(filters)
  const { mutateAsync: updateAgency } = useUpdateAgency()

  function handleSortChange(column: string) {
    setFilters((prev) => ({
      ...prev,
      sort_by: column,
      sort_order: prev.sort_by === column
        ? prev.sort_order === 'asc' ? 'desc' : 'asc'
        : 'asc',
      page: 1,
    }))
  }

  async function handleArchive(id: string) {
    const agency = agencies?.find((a) => a.id === id)
    if (!agency) return
    try {
      await updateAgency({
        id,
        payload: { is_active: !agency.is_active },
      })
      toast.success(agency.is_active ? 'Agencia desativada' : 'Agencia reativada')
    } catch {
      toast.error('Erro ao atualizar agencia')
    }
  }

  const hasActiveFilters = !!filters.search || filters.is_active !== undefined
  const isEmpty = !isLoading && !isError && (!agencies || agencies.length === 0)

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight shrink-0">Agencias</h1>
          {!isLoading && !isError && (
            <span className="text-xs font-medium text-muted-foreground" aria-live="polite">
              {meta ? `${meta.total} agencia${meta.total !== 1 ? 's' : ''}` : ''}
            </span>
          )}
        </div>

        <Button size="default" className="h-9 px-4" onClick={() => setCreateModalOpen(true)}>
          <Plus />
          Nova Agencia
        </Button>
      </div>

      <AgencyFiltersBar
        filters={filters}
        onFiltersChange={(newFilters) => setFilters({ ...newFilters, page: 1 })}
      />

      {isLoading && <AgenciesTableSkeleton />}

      {isError && !isLoading && (
        <div className="rounded-md border border-border py-16 flex flex-col items-center justify-center text-center gap-4">
          <p className="text-sm text-muted-foreground">
            Erro ao carregar agencias. Tente novamente.
          </p>
          <Button variant="outline" onClick={() => refetch()}>
            Tentar novamente
          </Button>
        </div>
      )}

      {!isLoading && !isError && isEmpty && (
        <div className="rounded-md border border-border">
          {hasActiveFilters ? (
            <EmptyState
              emoji="\uD83D\uDD0D"
              title="Nenhum resultado para esta busca"
              description="Nenhuma agencia corresponde aos filtros aplicados."
              action={{
                label: 'Limpar filtros',
                onClick: () => setFilters(DEFAULT_FILTERS),
                variant: 'outline',
              }}
            />
          ) : (
            <EmptyState
              emoji="\uD83C\uDFAF"
              title="Nenhuma agencia cadastrada"
              description="Cadastre a primeira agencia para comecar."
              action={{
                label: 'Cadastrar agencia',
                onClick: () => setCreateModalOpen(true),
              }}
            />
          )}
        </div>
      )}

      {!isLoading && !isError && !isEmpty && agencies && (
        <>
          <AgenciesTable
            agencies={agencies}
            sortBy={filters.sort_by ?? 'name'}
            sortOrder={filters.sort_order ?? 'asc'}
            onSortChange={handleSortChange}
            onArchive={handleArchive}
          />

          {meta && meta.total > 0 && (
            <Pagination
              page={filters.page ?? 1}
              totalPages={meta.total_pages}
              total={meta.total}
              perPage={filters.per_page ?? 20}
              onPageChange={(page) => setFilters((prev) => ({ ...prev, page }))}
              onPerPageChange={(per_page) => setFilters((prev) => ({ ...prev, per_page, page: 1 }))}
              itemLabel="agencia"
            />
          )}
        </>
      )}

      <CreateAgencyModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
      />
    </div>
  )
}
