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
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { EmptyState } from '@/components/jobs/EmptyState'
import { usePeopleList, useUpdatePerson } from '@/hooks/usePeople'
import { safeErrorMessage } from '@/lib/api'
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
  const [archiveTarget, setArchiveTarget] = useState<{ id: string; isActive: boolean } | null>(null)

  const { data: people, meta, isLoading, isError, refetch } = usePeopleList(filters)
  const { mutateAsync: updatePerson, isPending: isArchiving } = useUpdatePerson()

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

  function handleArchiveRequest(id: string) {
    const person = people?.find((p) => p.id === id)
    if (!person) return
    setArchiveTarget({ id, isActive: person.is_active })
  }

  async function handleArchiveConfirm() {
    if (!archiveTarget) return
    try {
      await updatePerson({
        id: archiveTarget.id,
        payload: { is_active: !archiveTarget.isActive },
      })
      toast.success(archiveTarget.isActive ? 'Pessoa desativada' : 'Pessoa reativada')
      setArchiveTarget(null)
    } catch (err) {
      toast.error(safeErrorMessage(err))
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
            onArchive={handleArchiveRequest}
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

      <ConfirmDialog
        open={archiveTarget !== null}
        onOpenChange={(open) => { if (!open) setArchiveTarget(null) }}
        title={archiveTarget?.isActive ? 'Desativar pessoa' : 'Reativar pessoa'}
        description={
          archiveTarget?.isActive
            ? 'Esta pessoa sera desativada e nao aparecera em selecoes de equipe.'
            : 'Esta pessoa sera reativada e voltara a aparecer nas selecoes.'
        }
        confirmLabel={archiveTarget?.isActive ? 'Desativar' : 'Reativar'}
        variant={archiveTarget?.isActive ? 'destructive' : 'default'}
        onConfirm={handleArchiveConfirm}
        isPending={isArchiving}
      />
    </div>
  )
}
