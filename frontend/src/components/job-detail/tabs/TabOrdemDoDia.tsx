'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ClipboardList, Eye, Pencil, Plus, Trash2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { EmptyTabState } from '@/components/shared/EmptyTabState'
import { ODDialog } from './ODDialog'
import { ODPreviewDialog } from './ODPreviewDialog'
import { apiGet, apiMutate, safeErrorMessage } from '@/lib/api'
import { cn } from '@/lib/utils'
import type { JobDetail } from '@/types/jobs'
import type { ShootingDayOrder, ODStatus } from '@/types/shooting-day-order'

// --- Status badge config ---

const OD_STATUS_CONFIG: Record<ODStatus, { label: string; className: string }> = {
  rascunho: {
    label: 'Rascunho',
    className: 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-transparent',
  },
  publicada: {
    label: 'Publicada',
    className: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-transparent',
  },
  compartilhada: {
    label: 'Compartilhada',
    className: 'bg-green-500/10 text-green-700 dark:text-green-400 border-transparent',
  },
}

// --- Helpers ---

function _formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function countScenes(od: ShootingDayOrder): number {
  return od.filming_blocks.reduce((acc, block) => acc + (block.scene_ids?.length ?? 0), 0)
}

// --- Loading skeleton ---

function ODSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-9 w-28" />
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-lg border border-border p-4">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
      ))}
    </div>
  )
}

// --- Props ---

interface TabOrdemDoDiaProps {
  job: JobDetail
}

// --- Main component ---

export function TabOrdemDoDia({ job }: TabOrdemDoDiaProps) {
  const queryClient = useQueryClient()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingOD, setEditingOD] = useState<ShootingDayOrder | undefined>()
  const [previewOD, setPreviewOD] = useState<ShootingDayOrder | null>(null)
  const [deletingOD, setDeletingOD] = useState<ShootingDayOrder | null>(null)

  // Fetch ordens do dia
  const {
    data: response,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['shooting-day-orders', job.id],
    queryFn: () =>
      apiGet<ShootingDayOrder[]>('shooting-day-order', { job_id: job.id }),
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (odId: string) =>
      apiMutate('shooting-day-order', 'DELETE', undefined, odId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shooting-day-orders', job.id] })
      toast.success('Ordem do dia removida')
      setDeletingOD(null)
    },
    onError: (err) => {
      toast.error(safeErrorMessage(err))
    },
  })

  // Handlers
  function handleOpenCreate() {
    setEditingOD(undefined)
    setDialogOpen(true)
  }

  function handleOpenEdit(od: ShootingDayOrder) {
    setEditingOD(od)
    setDialogOpen(true)
  }

  function handleDialogClose(open: boolean) {
    setDialogOpen(open)
    if (!open) setEditingOD(undefined)
  }

  function handleDeleteConfirm() {
    if (!deletingOD) return
    deleteMutation.mutate(deletingOD.id)
  }

  // Derived
  const orders: ShootingDayOrder[] = response?.data ?? []

  // --- Render states ---

  if (isLoading) {
    return <ODSkeleton />
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-border py-12 flex flex-col items-center justify-center text-center gap-3">
        <p className="text-sm text-muted-foreground">Erro ao carregar as ordens do dia.</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          Tentar novamente
        </Button>
      </div>
    )
  }

  if (orders.length === 0) {
    return (
      <>
        <EmptyTabState
          icon={ClipboardList}
          title="Nenhuma ordem do dia"
          description="Crie a primeira OD para organizar as diarias de filmagem."
          actionLabel="Nova OD"
          onAction={handleOpenCreate}
        />

        <ODDialog
          open={dialogOpen}
          onOpenChange={handleDialogClose}
          jobId={job.id}
        />
      </>
    )
  }

  return (
    <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">Ordem do Dia</h3>
          <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-xs font-medium">
            {orders.length} {orders.length === 1 ? 'OD' : 'ODs'}
          </span>
        </div>

        <Button size="sm" onClick={handleOpenCreate}>
          <Plus className="size-4" />
          Nova OD
        </Button>
      </div>

      {/* OD Cards */}
      <div className="flex flex-col gap-3">
        {orders.map((od) => {
          const statusConfig = OD_STATUS_CONFIG[od.status]
          const scenesCount = countScenes(od)

          return (
            <div
              key={od.id}
              className="rounded-lg border border-border p-4 hover:bg-muted/50 cursor-pointer transition-colors"
              onClick={() => handleOpenEdit(od)}
            >
              <div className="flex items-start justify-between gap-3">
                {/* Info principal */}
                <div className="flex flex-col gap-1.5 min-w-0 flex-1">
                  {/* Titulo + badges */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold truncate">{od.title}</span>
                    <Badge
                      variant="outline"
                      className={cn('text-xs shrink-0', statusConfig.className)}
                    >
                      {statusConfig.label}
                    </Badge>
                  </div>

                  {/* Data + Dia numero */}
                  {od.shooting_date_id && (
                    <div className="flex items-center gap-2">
                      {od.day_number !== null && (
                        <span className="text-xs font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                          Dia {od.day_number}
                        </span>
                      )}
                    </div>
                  )}
                  {od.day_number !== null && !od.shooting_date_id && (
                    <span className="text-xs text-muted-foreground">
                      Dia {od.day_number}
                    </span>
                  )}

                  {/* Localizacao geral */}
                  {od.general_location && (
                    <p className="text-xs text-muted-foreground truncate">
                      {od.general_location}
                    </p>
                  )}

                  {/* Metadados: chamada + cenas */}
                  <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                    {od.first_call && (
                      <span className="text-xs text-muted-foreground">
                        1a Chamada: <span className="font-medium text-foreground">{od.first_call}</span>
                      </span>
                    )}
                    {scenesCount > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {scenesCount} {scenesCount === 1 ? 'cena' : 'cenas'}
                      </span>
                    )}
                    {od.filming_blocks.length > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {od.filming_blocks.length} {od.filming_blocks.length === 1 ? 'bloco' : 'blocos'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Acoes */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    aria-label="Visualizar"
                    onClick={(e) => {
                      e.stopPropagation()
                      setPreviewOD(od)
                    }}
                    className="size-7 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    <Eye className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label="Editar"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleOpenEdit(od)
                    }}
                    className="size-7 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    <Pencil className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label="Remover"
                    onClick={(e) => {
                      e.stopPropagation()
                      setDeletingOD(od)
                    }}
                    className="size-7 rounded flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Create / Edit Dialog */}
      <ODDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        jobId={job.id}
        od={editingOD}
      />

      {/* Preview Dialog */}
      {previewOD && (
        <ODPreviewDialog
          open={!!previewOD}
          onOpenChange={(open) => { if (!open) setPreviewOD(null) }}
          od={previewOD}
          jobId={job.id}
        />
      )}

      {/* Delete confirmation */}
      <AlertDialog
        open={deletingOD !== null}
        onOpenChange={(open) => {
          if (!open) setDeletingOD(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover ordem do dia</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover{' '}
              <strong>{deletingOD?.title}</strong>? Esta acao nao pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending && (
                <Loader2 className="size-4 animate-spin" />
              )}
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
