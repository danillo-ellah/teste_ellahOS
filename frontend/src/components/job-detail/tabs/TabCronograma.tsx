'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import {
  GanttChart as GanttChartIcon,
  List,
  Plus,
  Download,
  Loader2,
  AlertTriangle,
  CalendarRange,
  CalendarDays,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
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
import { cn } from '@/lib/utils'
import { apiGet } from '@/lib/api'
import { useJobPhases } from '@/hooks/useJobPhases'
import { countWorkingDays } from '@/lib/cronograma-utils'
import { GanttChart } from '@/components/cronograma/GanttChart'
import { PhaseList } from '@/components/cronograma/PhaseList'
import { PhaseDialog } from '@/components/cronograma/PhaseDialog'
import { CalendarView } from '@/components/cronograma/CalendarView'
import { generateCronogramaPdf } from '@/components/cronograma/CronogramaPdf'
import type { JobDetail } from '@/types/jobs'
import type {
  JobPhase,
  CreatePhasePayload,
  UpdatePhasePayload,
} from '@/types/cronograma'

// --- Skeleton ---

function CronogramaSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-36" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-9 w-28" />
        </div>
      </div>
      <div className="rounded-lg border border-border overflow-hidden">
        <Skeleton className="h-10 w-full" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-2 p-3 border-t border-border">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-8 flex-1" style={{ width: `${30 + i * 10}%` }} />
          </div>
        ))}
      </div>
    </div>
  )
}

// --- Estado vazio ---

function EmptyCronograma({
  onCreateTemplate,
  onAddPhase,
  isCreating,
}: {
  onCreateTemplate: () => void
  onAddPhase: () => void
  isCreating: boolean
}) {
  return (
    <div className="rounded-lg border border-border border-dashed py-16 flex flex-col items-center justify-center text-center gap-4">
      <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
        <CalendarRange className="size-6 text-muted-foreground" />
      </div>
      <div>
        <h3 className="text-sm font-semibold">Cronograma ainda nao configurado</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Use o template padrao de 8 fases ou adicione fases manualmente.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button onClick={onCreateTemplate} disabled={isCreating}>
          {isCreating && <Loader2 className="size-4 animate-spin" />}
          Criar Cronograma (template)
        </Button>
        <Button variant="outline" onClick={onAddPhase} disabled={isCreating}>
          <Plus className="size-4" />
          Adicionar fase
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        O template inclui: Orcamento, Briefing, Pre-Producao, PPM, Filmagem, Pos-Producao, Color e Entrega.
      </p>
    </div>
  )
}

// --- Props ---

interface TabCronogramaProps {
  job: JobDetail
}

// --- Componente principal ---

export function TabCronograma({ job }: TabCronogramaProps) {
  const [viewMode, setViewMode] = useState<'list' | 'gantt' | 'calendar'>('list')
  const [phaseDialogOpen, setPhaseDialogOpen] = useState(false)
  const [editingPhase, setEditingPhase] = useState<JobPhase | undefined>()
  const [deletingPhase, setDeletingPhase] = useState<JobPhase | null>(null)
  const [isExportingPdf, setIsExportingPdf] = useState(false)

  const {
    phases,
    isLoading,
    isError,
    refetch,
    createPhase,
    updatePhase,
    deletePhase,
    reorderPhases,
    bulkCreate,
    isCreating,
    isUpdating,
    isDeleting,
    isBulkCreating,
  } = useJobPhases(job.id)

  // --- Handlers ---

  // date: YYYY-MM-DD do click na celula do calendario (reservado para pre-preencher no dialog)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function handleOpenCreate(_date?: string) {
    setEditingPhase(undefined)
    setPhaseDialogOpen(true)
  }

  function handleOpenEdit(phase: JobPhase) {
    setEditingPhase(phase)
    setPhaseDialogOpen(true)
  }

  function handlePhaseDialogClose(open: boolean) {
    setPhaseDialogOpen(open)
    if (!open) {
      setEditingPhase(undefined)
    }
  }

  function handleSavePhase(
    payload: CreatePhasePayload | (UpdatePhasePayload & { id: string }),
  ) {
    if ('id' in payload) {
      const { id, ...rest } = payload
      updatePhase(
        { id, payload: rest },
        {
          onSuccess: () => setPhaseDialogOpen(false),
        },
      )
    } else {
      createPhase(payload as CreatePhasePayload, {
        onSuccess: () => setPhaseDialogOpen(false),
      })
    }
  }

  function handleDeleteConfirm() {
    if (!deletingPhase) return
    deletePhase(deletingPhase.id, {
      onSuccess: () => setDeletingPhase(null),
    })
  }

  function handleCreateTemplate() {
    bulkCreate({ job_id: job.id })
  }

  async function handleExportPdf() {
    if (phases.length === 0) {
      toast.error('Nenhuma fase para exportar.')
      return
    }

    setIsExportingPdf(true)
    try {
      // Buscar dados do tenant
      const tenantRes = await apiGet<{
        company_name: string
        logo_url?: string | null
        brand_color?: string | null
      }>('tenant-management', {}, 'settings')

      const tenant = tenantRes.data ?? {
        company_name: 'Produtora',
        logo_url: null,
        brand_color: null,
      }

      await generateCronogramaPdf({
        job: {
          code: job.job_code ?? '',
          title: job.title,
          client_name: job.clients?.name ?? '',
          client_logo_url: null, // logo_url ainda nao esta na tabela clients
          agency_name: job.agencies?.name ?? null,
          agency_logo_url: null,
        },
        phases,
        tenant,
        generated_at: new Date().toISOString(),
      })

      toast.success('PDF exportado com sucesso')
    } catch (err) {
      console.error('[CronogramaPdf]', err)
      toast.error('Nao foi possivel gerar o PDF. Tente novamente.')
    } finally {
      setIsExportingPdf(false)
    }
  }

  // --- Render states ---

  if (isLoading) return <CronogramaSkeleton />

  if (isError) {
    return (
      <div className="rounded-lg border border-border py-12 flex flex-col items-center justify-center text-center gap-3">
        <AlertTriangle className="size-8 text-amber-500" />
        <p className="text-sm text-muted-foreground">Nao foi possivel carregar o cronograma.</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          Tentar novamente
        </Button>
      </div>
    )
  }

  if (phases.length === 0) {
    return (
      <>
        <EmptyCronograma
          onCreateTemplate={handleCreateTemplate}
          onAddPhase={handleOpenCreate}
          isCreating={isBulkCreating}
        />
        <PhaseDialog
          open={phaseDialogOpen}
          onOpenChange={handlePhaseDialogClose}
          jobId={job.id}
          phase={editingPhase}
          onSave={handleSavePhase}
          isSaving={isCreating || isUpdating}
        />
      </>
    )
  }

  const totalWorkingDays = phases.reduce((acc, p) => {
    return acc + countWorkingDays(p.start_date, p.end_date, p.skip_weekends)
  }, 0)

  return (
    <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">Cronograma</h3>
          <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-xs font-medium">
            {phases.length} {phases.length === 1 ? 'fase' : 'fases'}
          </span>
          <span className="text-xs text-muted-foreground hidden sm:inline">
            · {totalWorkingDays} dias
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Toggle lista / gantt / calendario */}
          <div className="hidden sm:flex items-center rounded-lg border border-border overflow-hidden">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors',
                viewMode === 'list'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted',
              )}
            >
              <List className="size-3.5" />
              Lista
            </button>
            <button
              type="button"
              onClick={() => setViewMode('gantt')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors border-x border-border',
                viewMode === 'gantt'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted',
              )}
            >
              <GanttChartIcon className="size-3.5" />
              Gantt
            </button>
            <button
              type="button"
              onClick={() => setViewMode('calendar')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors',
                viewMode === 'calendar'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted',
              )}
            >
              <CalendarDays className="size-3.5" />
              Calendario
            </button>
          </div>

          {/* Exportar PDF */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportPdf}
            disabled={isExportingPdf}
          >
            {isExportingPdf ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Download className="size-4" />
            )}
            <span className="hidden sm:inline">
              {isExportingPdf ? 'Gerando...' : 'Exportar PDF'}
            </span>
          </Button>

          {/* Adicionar fase */}
          <Button size="sm" onClick={() => handleOpenCreate()}>
            <Plus className="size-4" />
            <span className="hidden sm:inline">Nova fase</span>
          </Button>
        </div>
      </div>

      {/* Vista Gantt — somente desktop, somente quando selecionado */}
      {viewMode === 'gantt' && (
        <div className="hidden sm:block mb-4">
          <GanttChart
            phases={phases}
            onPhaseClick={handleOpenEdit}
          />
        </div>
      )}

      {/* Vista Lista — desktop em modo lista */}
      {viewMode === 'list' && (
        <div className="hidden sm:block">
          <PhaseList
            phases={phases}
            onEdit={handleOpenEdit}
            onDelete={setDeletingPhase}
            onReorder={reorderPhases}
            jobId={job.id}
          />
        </div>
      )}

      {/* Vista Calendario — desktop e tablet */}
      {viewMode === 'calendar' && (
        <div className="hidden sm:block">
          <CalendarView
            phases={phases}
            onPhaseClick={handleOpenEdit}
            onAddPhase={handleOpenCreate}
          />
        </div>
      )}

      {/* Mobile: sempre mostra lista (independente de viewMode) */}
      <div className="sm:hidden">
        <PhaseList
          phases={phases}
          onEdit={handleOpenEdit}
          onDelete={setDeletingPhase}
          onReorder={reorderPhases}
          jobId={job.id}
          isMobile
        />
        <p className="text-xs text-muted-foreground text-center mt-3">
          Visualizacoes Gantt e Calendario disponiveis na versao desktop.
        </p>
      </div>

      {/* Dialog de criar/editar fase */}
      <PhaseDialog
        open={phaseDialogOpen}
        onOpenChange={handlePhaseDialogClose}
        jobId={job.id}
        phase={editingPhase}
        onSave={handleSavePhase}
        isSaving={isCreating || isUpdating}
      />

      {/* Confirmacao de exclusao */}
      <AlertDialog
        open={deletingPhase !== null}
        onOpenChange={(open) => { if (!open) setDeletingPhase(null) }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover fase do cronograma</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover a fase{' '}
              <strong>
                {deletingPhase?.phase_emoji} {deletingPhase?.phase_label}
              </strong>
              ? Esta acao nao pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting && <Loader2 className="size-4 animate-spin" />}
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
