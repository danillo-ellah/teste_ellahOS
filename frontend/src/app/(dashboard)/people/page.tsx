'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { PeopleTable } from '@/components/people/PeopleTable'
import { PeopleTableSkeleton } from '@/components/people/PeopleTableSkeleton'
import { PeopleFilters as PeopleFiltersBar } from '@/components/people/PeopleFilters'
import { CreatePersonModal } from '@/components/people/CreatePersonModal'
import { Pagination } from '@/components/shared/Pagination'
import { EmptyState } from '@/components/jobs/EmptyState'
import { usePeopleList, useUpdatePerson } from '@/hooks/usePeople'
import type { PersonFilters } from '@/types/people'

const DEFAULT_FILTERS: PersonFilters = {
  page: 1,
  per_page: 20,
  sort_by: 'full_name',
  sort_order: 'asc',
}

export default function PeoplePage() {
  const [filters, setFilters] = useState<PersonFilters>(DEFAULT_FILTERS)
  const [createModalOpen, setCreateModalOpen] = useState(false)

  const { data: people, meta, isLoading, isError, refetch } = usePeopleList(filters)
  const { mutateAsync: updatePerson } = useUpdatePerson()

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
    const person = people?.find((p) => p.id === id)
    if (!person) return
    try {
      await updatePerson({
        id,
        payload: { is_active: !person.is_active },
      })
      toast.success(person.is_active ? 'Pessoa desativada' : 'Pessoa reativada')
    } catch {
      toast.error('Erro ao atualizar pessoa')
    }
  }

  const hasActiveFilters =
    !!filters.search ||
    filters.is_internal !== undefined ||
    !!filters.default_role ||
    filters.is_active !== undefined
  const isEmpty = !isLoading && !isError && (!people || people.length === 0)

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight shrink-0">Equipe</h1>
          {!isLoading && !isError && (
            <span className="text-xs font-medium text-muted-foreground" aria-live="polite">
              {meta ? `${meta.total} pessoa${meta.total !== 1 ? 's' : ''}` : ''}
            </span>
          )}
        </div>

        <Button size="default" className="h-9 px-4" onClick={() => setCreateModalOpen(true)}>
          <Plus />
          Nova Pessoa
        </Button>
      </div>

      <PeopleFiltersBar
        filters={filters}
        onFiltersChange={(newFilters) => setFilters({ ...newFilters, page: 1 })}
      />

      {isLoading && <PeopleTableSkeleton />}

      {isError && !isLoading && (
        <div className="rounded-md border border-border py-16 flex flex-col items-center justify-center text-center gap-4">
          <p className="text-sm text-muted-foreground">
            Erro ao carregar equipe. Tente novamente.
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
              description="Nenhuma pessoa corresponde aos filtros aplicados."
              action={{
                label: 'Limpar filtros',
                onClick: () => setFilters(DEFAULT_FILTERS),
                variant: 'outline',
              }}
            />
          ) : (
            <EmptyState
              emoji="\uD83C\uDFA5"
              title="Nenhuma pessoa cadastrada"
              description="Cadastre membros da equipe e freelancers."
              action={{
                label: 'Cadastrar pessoa',
                onClick: () => setCreateModalOpen(true),
              }}
            />
          )}
        </div>
      )}

      {!isLoading && !isError && !isEmpty && people && (
        <>
          <PeopleTable
            people={people}
            sortBy={filters.sort_by ?? 'full_name'}
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
              itemLabel="pessoa"
            />
          )}
        </>
      )}

      <CreatePersonModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
      />
    </div>
  )
}
