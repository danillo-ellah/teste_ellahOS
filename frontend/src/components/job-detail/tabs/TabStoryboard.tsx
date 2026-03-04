'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus, Film, Loader2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import { SceneCard } from './SceneCard'
import { SceneDialog } from './SceneDialog'
import { apiGet, apiMutate, safeErrorMessage } from '@/lib/api'
import type { JobDetail } from '@/types/jobs'
import type { StoryboardScene, SceneStatus } from '@/types/storyboard'

// --- Props ---

interface TabStoryboardProps {
  job: JobDetail
}

// --- Status filter options ---

const STATUS_FILTER_OPTIONS: { value: SceneStatus | 'todas'; label: string }[] = [
  { value: 'todas', label: 'Todas' },
  { value: 'pendente', label: 'Pendente' },
  { value: 'em_preparo', label: 'Em Preparo' },
  { value: 'filmada', label: 'Filmada' },
  { value: 'aprovada', label: 'Aprovada' },
]

// --- Loading skeleton ---

function StoryboardSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-lg border border-border overflow-hidden">
          <Skeleton className="w-full aspect-video" />
          <div className="p-3 flex flex-col gap-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  )
}

// --- Main component ---

export function TabStoryboard({ job }: TabStoryboardProps) {
  const queryClient = useQueryClient()

  // State
  const [statusFilter, setStatusFilter] = useState<SceneStatus | 'todas'>('todas')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingScene, setEditingScene] = useState<StoryboardScene | undefined>()
  const [deletingScene, setDeletingScene] = useState<StoryboardScene | null>(null)

  // Fetch scenes
  const {
    data: response,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['storyboard', job.id],
    queryFn: () => apiGet<StoryboardScene[]>('storyboard', { job_id: job.id }),
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (sceneId: string) => apiMutate('storyboard', 'DELETE', undefined, sceneId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['storyboard', job.id] })
      toast.success('Cena removida')
      setDeletingScene(null)
    },
    onError: (err) => {
      toast.error(safeErrorMessage(err))
    },
  })

  // Handlers
  function handleOpenCreate() {
    setEditingScene(undefined)
    setDialogOpen(true)
  }

  function handleOpenEdit(scene: StoryboardScene) {
    setEditingScene(scene)
    setDialogOpen(true)
  }

  function handleDialogClose(open: boolean) {
    setDialogOpen(open)
    if (!open) setEditingScene(undefined)
  }

  function handleDeleteConfirm() {
    if (!deletingScene) return
    deleteMutation.mutate(deletingScene.id)
  }

  // Derived data
  const scenes: StoryboardScene[] = response?.data ?? []
  const filteredScenes =
    statusFilter === 'todas'
      ? scenes
      : scenes.filter((s) => s.status === statusFilter)

  // --- Render states ---

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-9 w-28" />
        </div>
        <StoryboardSkeleton />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-border py-12 flex flex-col items-center justify-center text-center gap-3">
        <p className="text-sm text-muted-foreground">Erro ao carregar o storyboard.</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          Tentar novamente
        </Button>
      </div>
    )
  }

  if (scenes.length === 0) {
    return (
      <>
        <EmptyTabState
          icon={Film}
          title="Nenhuma cena cadastrada"
          description="Adicione cenas ao storyboard para organizar a producao visualmente."
          actionLabel="Nova Cena"
          onAction={handleOpenCreate}
        />

        <SceneDialog
          open={dialogOpen}
          onOpenChange={handleDialogClose}
          mode="create"
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
          <h3 className="text-sm font-semibold">Storyboard</h3>
          <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-xs font-medium">
            {scenes.length} {scenes.length === 1 ? 'cena' : 'cenas'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Status filter */}
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as SceneStatus | 'todas')}
          >
            <SelectTrigger className="h-8 text-xs w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_FILTER_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="text-xs">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Nova cena */}
          <Button size="sm" onClick={handleOpenCreate}>
            <Plus className="size-4" />
            Nova Cena
          </Button>
        </div>
      </div>

      {/* Grid of scene cards */}
      {filteredScenes.length === 0 ? (
        <div className="rounded-lg border border-border py-10 flex flex-col items-center justify-center text-center gap-2">
          <p className="text-sm text-muted-foreground">
            Nenhuma cena com status &ldquo;
            {STATUS_FILTER_OPTIONS.find((o) => o.value === statusFilter)?.label}
            &rdquo;.
          </p>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs"
            onClick={() => setStatusFilter('todas')}
          >
            Limpar filtro
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredScenes.map((scene) => (
            <div key={scene.id} className="relative group">
              <SceneCard scene={scene} onClick={handleOpenEdit} />

              {/* Delete button — visible on hover */}
              <button
                type="button"
                aria-label="Remover cena"
                onClick={(e) => {
                  e.stopPropagation()
                  setDeletingScene(scene)
                }}
                className="absolute top-2 right-10 size-6 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive z-10"
              >
                <Trash2 className="size-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <SceneDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        mode={editingScene ? 'edit' : 'create'}
        jobId={job.id}
        scene={editingScene}
      />

      {/* Delete confirmation */}
      <AlertDialog
        open={deletingScene !== null}
        onOpenChange={(open) => { if (!open) setDeletingScene(null) }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover cena</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover a cena{' '}
              <strong>#{deletingScene?.scene_number} — {deletingScene?.title}</strong>?
              Esta acao nao pode ser desfeita.
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
              {deleteMutation.isPending && <Loader2 className="size-4 animate-spin" />}
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
