'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ClientsTable } from '@/components/clients/ClientsTable'
import { ClientsTableSkeleton } from '@/components/clients/ClientsTableSkeleton'
import { ClientFilters as ClientFiltersBar } from '@/components/clients/ClientFilters'
import { CreateClientModal } from '@/components/clients/CreateClientModal'
import { Pagination } from '@/components/shared/Pagination'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { EmptyState } from '@/components/jobs/EmptyState'
import { useClientsList, useUpdateClient } from '@/hooks/useClients'
import { safeErrorMessage } from '@/lib/api'
import type { ClientFilters } from '@/types/clients'

const DEFAULT_FILTERS: ClientFilters = {
  page: 1,
  per_page: 20,
  sort_by: 'name',
  sort_order: 'asc',
}

export default function ClientsPage() {
  const [filters, setFilters] = useState<ClientFilters>(DEFAULT_FILTERS)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [archiveTarget, setArchiveTarget] = useState<{ id: string; isActive: boolean } | null>(null)

  const { data: clients, meta, isLoading, isError, refetch } = useClientsList(filters)
  const { mutateAsync: updateClient, isPending: isArchiving } = useUpdateClient()

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
    const client = clients?.find((c) => c.id === id)
    if (!client) return
    setArchiveTarget({ id, isActive: client.is_active })
  }

  async function handleArchiveConfirm() {
    if (!archiveTarget) return
    try {
      await updateClient({
        id: archiveTarget.id,
        payload: { is_active: !archiveTarget.isActive },
      })
      toast.success(archiveTarget.isActive ? 'Cliente desativado' : 'Cliente reativado')
      setArchiveTarget(null)
    } catch (err) {
      toast.error(safeErrorMessage(err))
    }
  }

  const hasActiveFilters = !!filters.search || !!filters.segment || filters.is_active !== undefined
  const isEmpty = !isLoading && !isError && (!clients || clients.length === 0)

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight shrink-0">Clientes</h1>
          {!isLoading && !isError && (
            <span className="text-xs font-medium text-muted-foreground" aria-live="polite">
              {meta ? `${meta.total} cliente${meta.total !== 1 ? 's' : ''}` : ''}
            </span>
          )}
        </div>

        <Button size="default" className="h-9 px-4" onClick={() => setCreateModalOpen(true)}>
          <Plus />
          Novo Cliente
        </Button>
      </div>

      <ClientFiltersBar
        filters={filters}
        onFiltersChange={(newFilters) => setFilters({ ...newFilters, page: 1 })}
      />

      {isLoading && <ClientsTableSkeleton />}

      {isError && !isLoading && (
        <div className="rounded-md border border-border py-16 flex flex-col items-center justify-center text-center gap-4">
          <p className="text-sm text-muted-foreground">
            Erro ao carregar clientes. Tente novamente.
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
              description="Nenhum cliente corresponde aos filtros aplicados."
              action={{
                label: 'Limpar filtros',
                onClick: () => setFilters(DEFAULT_FILTERS),
                variant: 'outline',
              }}
            />
          ) : (
            <EmptyState
              emoji="\uD83C\uDFE2"
              title="Nenhum cliente cadastrado"
              description="Cadastre o primeiro cliente para comecar."
              action={{
                label: 'Cadastrar cliente',
                onClick: () => setCreateModalOpen(true),
              }}
            />
          )}
        </div>
      )}

      {!isLoading && !isError && !isEmpty && clients && (
        <>
          <ClientsTable
            clients={clients}
            sortBy={filters.sort_by ?? 'name'}
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
              itemLabel="cliente"
            />
          )}
        </>
      )}

      <CreateClientModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
      />

      <ConfirmDialog
        open={archiveTarget !== null}
        onOpenChange={(open) => { if (!open) setArchiveTarget(null) }}
        title={archiveTarget?.isActive ? 'Desativar cliente' : 'Reativar cliente'}
        description={
          archiveTarget?.isActive
            ? 'Este cliente sera desativado e nao aparecera em selecoes de novos jobs.'
            : 'Este cliente sera reativado e voltara a aparecer nas selecoes.'
        }
        confirmLabel={archiveTarget?.isActive ? 'Desativar' : 'Reativar'}
        variant={archiveTarget?.isActive ? 'destructive' : 'default'}
        onConfirm={handleArchiveConfirm}
        isPending={isArchiving}
      />
    </div>
  )
}
