'use client'

import { useState } from 'react'
import { KanbanSquare, LayoutList, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ApiRequestError } from '@/lib/api'
import { BulkActionsBar } from '@/components/jobs/BulkActionsBar'
import { CancelReasonDialog } from '@/components/jobs/CancelReasonDialog'
import { ConfirmDialog } from '@/components/jobs/ConfirmDialog'
import { CreateJobModal } from '@/components/jobs/CreateJobModal'
import { EmptyState } from '@/components/jobs/EmptyState'
import { JobFilters as JobFiltersBar } from '@/components/jobs/JobFilters'
import { JobsPagination } from '@/components/jobs/JobsPagination'
import { JobsTable } from '@/components/jobs/JobsTable'
import { JobsTableSkeleton } from '@/components/jobs/JobsTableSkeleton'
import { KanbanView } from '@/components/jobs/KanbanView'
import { useJobs } from '@/hooks/useJobs'
import { useUpdateJobStatus } from '@/hooks/useUpdateJobStatus'
import { useArchiveJob } from '@/hooks/useArchiveJob'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { cn } from '@/lib/utils'
import type { JobFilters, JobStatus } from '@/types/jobs'

const DEFAULT_FILTERS: JobFilters = {
  page: 1,
  per_page: 20,
  sort_by: 'created_at',
  sort_order: 'desc',
}

type ViewMode = 'table' | 'kanban'

interface ArchiveTarget {
  jobId: string
}

// Pendencia de cancelamento: guarda jobId(s) que o usuario quer cancelar
interface CancelTarget {
  jobIds: string[]
}

export default function JobsPage() {
  const [view, setView] = useLocalStorage<ViewMode>('jobs-view', 'table')
  const [filters, setFilters] = useState<JobFilters>(DEFAULT_FILTERS)
  const [selectedJobs, setSelectedJobs] = useState<Set<string>>(new Set())
  const [archiveTarget, setArchiveTarget] = useState<ArchiveTarget | null>(null)
  const [cancelTarget, setCancelTarget] = useState<CancelTarget | null>(null)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [isBulkArchiving, setIsBulkArchiving] = useState(false)

  // Kanban carrega mais jobs para preencher colunas (sem paginacao visual)
  const activeFilters = view === 'kanban'
    ? { ...filters, per_page: 200, page: 1 }
    : filters
  const { data: jobs, meta, isLoading, isError, refetch } = useJobs(activeFilters)
  const { mutateAsync: updateStatus, isPending: isUpdatingStatus } = useUpdateJobStatus()
  const { mutateAsync: archiveJob, isPending: isArchiving } = useArchiveJob()

  const hasActiveFilters =
    !!filters.search ||
    (filters.status && filters.status.length > 0) ||
    !!filters.client_id ||
    !!filters.agency_id ||
    !!filters.job_type ||
    !!filters.date_from ||
    !!filters.date_to

  function handleSortChange(column: string) {
    setFilters((prev) => {
      const isSameColumn = prev.sort_by === column
      return {
        ...prev,
        sort_by: column,
        sort_order: isSameColumn
          ? prev.sort_order === 'asc'
            ? 'desc'
            : 'asc'
          : 'desc',
        page: 1,
      }
    })
  }

  // Mudanca de status individual (tabela/kanban)
  // Se for "cancelado", abre dialog de motivo antes
  async function handleStatusChange(jobId: string, status: JobStatus) {
    if (status === 'cancelado') {
      setCancelTarget({ jobIds: [jobId] })
      return
    }
    try {
      await updateStatus({ jobId, status })
    } catch (err) {
      const msg = err instanceof ApiRequestError ? err.message : 'Erro ao atualizar status. Tente novamente.'
      toast.error(msg)
    }
  }

  // Confirmar cancelamento com motivo obrigatorio
  async function handleCancelConfirm(reason: string) {
    if (!cancelTarget) return
    try {
      await Promise.all(
        cancelTarget.jobIds.map((jobId) =>
          updateStatus({ jobId, status: 'cancelado', cancellation_reason: reason }),
        ),
      )
      toast.success(
        cancelTarget.jobIds.length === 1
          ? '\u2705 Job cancelado'
          : `\u2705 ${cancelTarget.jobIds.length} job(s) cancelado(s)`,
      )
      setCancelTarget(null)
      setSelectedJobs((prev) => {
        const next = new Set(prev)
        for (const id of cancelTarget.jobIds) {
          next.delete(id)
        }
        return next
      })
    } catch (err) {
      const msg = err instanceof ApiRequestError ? err.message : 'Erro ao cancelar. Tente novamente.'
      toast.error(msg)
    }
  }

  function handleArchiveRequest(jobId: string) {
    setArchiveTarget({ jobId })
  }

  async function handleArchiveConfirm() {
    if (!archiveTarget) return
    try {
      await archiveJob({ jobId: archiveTarget.jobId })
      toast.success('\u2705 Job arquivado')
      setArchiveTarget(null)
      setSelectedJobs((prev) => {
        const next = new Set(prev)
        next.delete(archiveTarget.jobId)
        return next
      })
    } catch {
      toast.error('\u274C Erro ao arquivar job. Tente novamente.')
    }
  }

  // Bulk: mudar status (se cancelado, pede motivo)
  async function handleBulkStatusChange(status: JobStatus) {
    const ids = Array.from(selectedJobs)
    if (status === 'cancelado') {
      setCancelTarget({ jobIds: ids })
      return
    }
    try {
      await Promise.all(ids.map((jobId) => updateStatus({ jobId, status })))
      toast.success(`\u2705 ${ids.length} job(s) atualizado(s)`)
      setSelectedJobs(new Set())
    } catch (err) {
      const msg = err instanceof ApiRequestError ? err.message : 'Erro ao atualizar status. Tente novamente.'
      toast.error(msg)
    }
  }

  // Bulk: arquivar
  async function handleBulkArchive() {
    const ids = Array.from(selectedJobs)
    setIsBulkArchiving(true)
    try {
      await Promise.all(ids.map((jobId) => archiveJob({ jobId })))
      toast.success(`\u2705 ${ids.length} job(s) arquivado(s)`)
      setSelectedJobs(new Set())
    } catch {
      toast.error('\u274C Erro ao arquivar jobs. Tente novamente.')
    } finally {
      setIsBulkArchiving(false)
    }
  }

  const isEmpty = !isLoading && !isError && (!jobs || jobs.length === 0)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight shrink-0">Jobs</h1>
          {!isLoading && !isError && (
            <span
              className="text-xs font-medium text-muted-foreground"
              aria-live="polite"
            >
              {jobs && jobs.length > 0
                ? `Mostrando ${jobs.length} de ${meta?.total ?? jobs.length} jobs`
                : 'Nenhum job encontrado'}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Toggle view */}
          <div className="flex border border-border rounded-md overflow-hidden">
            <button
              type="button"
              aria-label="Visualizacao em tabela"
              onClick={() => setView('table')}
              className={cn(
                'flex items-center justify-center h-9 w-9 transition-colors',
                view === 'table'
                  ? 'bg-secondary text-foreground'
                  : 'bg-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40',
              )}
            >
              <LayoutList className="size-4" />
            </button>
            <div className="w-px bg-border" />
            <button
              type="button"
              aria-label="Visualizacao em kanban"
              onClick={() => setView('kanban')}
              className={cn(
                'flex items-center justify-center h-9 w-9 transition-colors',
                view === 'kanban'
                  ? 'bg-secondary text-foreground'
                  : 'bg-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40',
              )}
            >
              <KanbanSquare className="size-4" />
            </button>
          </div>

          {/* Novo Job */}
          <Button
            size="default"
            className="h-9 px-4"
            onClick={() => setCreateModalOpen(true)}
          >
            <Plus />
            Novo Job
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <JobFiltersBar
        filters={filters}
        onFiltersChange={(newFilters) => setFilters({ ...newFilters, page: 1 })}
      />

      {/* Conteudo */}
      {isLoading && <JobsTableSkeleton />}

      {isError && !isLoading && (
        <div className="rounded-md border border-border py-16 flex flex-col items-center justify-center text-center gap-4">
          <p className="text-sm text-muted-foreground">
            Erro ao carregar jobs. Tente novamente.
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
              description="Nenhum job corresponde aos filtros aplicados. Tente ajustar sua busca."
              action={{
                label: 'Limpar filtros',
                onClick: () => setFilters(DEFAULT_FILTERS),
                variant: 'outline',
              }}
            />
          ) : (
            <EmptyState
              emoji="\uD83C\uDFAC"
              title="Nenhum job por aqui ainda"
              description="Crie o primeiro job da sua produtora para comecar a organizar sua producao."
              action={{
                label: 'Criar primeiro job',
                onClick: () => setCreateModalOpen(true),
              }}
            />
          )}
        </div>
      )}

      {!isLoading && !isError && !isEmpty && jobs && (
        <>
          {view === 'table' && (
            <JobsTable
              jobs={jobs}
              sortBy={filters.sort_by ?? 'created_at'}
              sortOrder={filters.sort_order ?? 'desc'}
              onSortChange={handleSortChange}
              selectedJobs={selectedJobs}
              onSelectionChange={setSelectedJobs}
              onStatusChange={handleStatusChange}
              onArchive={handleArchiveRequest}
            />
          )}

          {view === 'kanban' && (
            <KanbanView
              jobs={jobs}
              onStatusChange={handleStatusChange}
              onCancelRequest={(jobId) => setCancelTarget({ jobIds: [jobId] })}
            />
          )}

          {view === 'table' && meta && meta.total > 0 && (
            <JobsPagination
              page={filters.page ?? 1}
              totalPages={meta.total_pages}
              total={meta.total}
              perPage={filters.per_page ?? 20}
              onPageChange={(page) => setFilters((prev) => ({ ...prev, page }))}
              onPerPageChange={(per_page) => setFilters((prev) => ({ ...prev, per_page, page: 1 }))}
            />
          )}
        </>
      )}

      {/* Bulk Actions Bar */}
      <BulkActionsBar
        selectedCount={selectedJobs.size}
        onClearSelection={() => setSelectedJobs(new Set())}
        onBulkArchive={handleBulkArchive}
        onBulkStatusChange={handleBulkStatusChange}
        isArchiving={isBulkArchiving}
      />

      {/* Dialog de confirmacao de arquivamento individual */}
      <ConfirmDialog
        open={archiveTarget !== null}
        onOpenChange={(open) => {
          if (!open) setArchiveTarget(null)
        }}
        title="Arquivar job"
        description="Este job sera movido para o arquivo e nao aparecera na listagem principal. Voce pode restaura-lo a qualquer momento."
        confirmLabel="Arquivar"
        cancelLabel="Cancelar"
        variant="destructive"
        isPending={isArchiving}
        onConfirm={handleArchiveConfirm}
      />

      {/* Dialog de motivo de cancelamento */}
      <CancelReasonDialog
        open={cancelTarget !== null}
        onOpenChange={(open) => {
          if (!open) setCancelTarget(null)
        }}
        onConfirm={handleCancelConfirm}
        isPending={isUpdatingStatus}
      />

      {/* Modal de criacao */}
      <CreateJobModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
      />
    </div>
  )
}
