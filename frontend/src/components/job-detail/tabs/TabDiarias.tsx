'use client'

import { useState, useMemo } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { toast } from 'sonner'
import {
  Plus,
  Calendar,
  MapPin,
  Clock,
  MoreHorizontal,
  Pencil,
  Trash2,
  CheckCircle2,
  Circle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfirmDialog } from '@/components/jobs/ConfirmDialog'
import { EmptyTabState } from '@/components/shared/EmptyTabState'
import { ShootingDateDialog } from './ShootingDateDialog'
import {
  useJobShootingDates,
  useAddShootingDate,
  useUpdateShootingDate,
  useRemoveShootingDate,
} from '@/hooks/useJobShootingDates'
import { useProductionDiaryList } from '@/hooks/useProductionDiary'
import { ApiRequestError } from '@/lib/api'
import { formatDate, formatTime } from '@/lib/format'
import type { JobDetail, JobShootingDate } from '@/types/jobs'

interface TabDiariasProps {
  job: JobDetail
}

export function TabDiarias({ job }: TabDiariasProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()

  const { data: dates, isLoading, isError, refetch } = useJobShootingDates(job.id)
  const { mutateAsync: addDate, isPending: isAdding } = useAddShootingDate()
  const { mutateAsync: updateDate, isPending: isUpdating } = useUpdateShootingDate()
  const { mutateAsync: removeDate, isPending: isRemoving } = useRemoveShootingDate()

  // Busca diarios para indicadores verde/cinza
  const { data: diaryEntries } = useProductionDiaryList(job.id)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<JobShootingDate | undefined>()
  const [deleting, setDeleting] = useState<JobShootingDate | null>(null)

  // Mapa de shooting_date -> tem diario
  const diaryDateSet = useMemo(() => {
    const set = new Set<string>()
    diaryEntries?.forEach((e) => set.add(e.shooting_date))
    return set
  }, [diaryEntries])

  const list = dates ?? []
  const totalDates = list.length
  const datesWithDiary = list.filter((d) => diaryDateSet.has(d.shooting_date)).length

  // Navega para tab diario (CA-07.2 / CA-07.3)
  function navigateToDiary() {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', 'diario')
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

  function handleOpenAdd() {
    setEditing(undefined)
    setDialogOpen(true)
  }

  function handleOpenEdit(d: JobShootingDate) {
    setEditing(d)
    setDialogOpen(true)
  }

  async function handleSubmit(data: {
    shooting_date: string
    description: string | null
    location: string | null
    start_time: string | null
    end_time: string | null
  }) {
    try {
      if (editing) {
        await updateDate({ jobId: job.id, dateId: editing.id, ...data })
        toast.success('Diaria atualizada')
      } else {
        await addDate({ jobId: job.id, ...data })
        toast.success('Diaria adicionada')
      }
      setDialogOpen(false)
    } catch (err) {
      const msg = err instanceof ApiRequestError ? err.message : 'Erro ao salvar diaria'
      toast.error(msg)
    }
  }

  async function handleDelete() {
    if (!deleting) return
    try {
      await removeDate({ jobId: job.id, dateId: deleting.id })
      toast.success('Diaria removida')
      setDeleting(null)
    } catch (err) {
      const msg = err instanceof ApiRequestError ? err.message : 'Erro ao remover diaria'
      toast.error(msg)
    }
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-border py-12 flex flex-col items-center justify-center text-center gap-3">
        <p className="text-sm text-muted-foreground">Erro ao carregar diarias.</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>Tentar novamente</Button>
      </div>
    )
  }

  if (list.length === 0) {
    return (
      <>
        <EmptyTabState
          icon={Calendar}
          title="Nenhuma diaria programada"
          description="Adicione as datas de filmagem deste job."
          actionLabel="Adicionar diaria"
          onAction={handleOpenAdd}
        />
        <ShootingDateDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSubmit={handleSubmit}
          isPending={isAdding}
        />
      </>
    )
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4 gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold">
            Diarias ({totalDates})
          </h3>
          {totalDates > 0 && (
            <p className="text-xs text-muted-foreground">
              {datesWithDiary} de {totalDates} com relatorio registrado
            </p>
          )}
        </div>
        <Button size="sm" variant="outline" onClick={handleOpenAdd} className="h-9 shrink-0">
          <Plus className="size-4" />
          <span className="hidden sm:inline ml-1.5">Adicionar diaria</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {list.map((d) => {
          const hasDiary = diaryDateSet.has(d.shooting_date)
          return (
            <div
              key={d.id}
              className="rounded-lg border border-border p-4 hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  {/* Data + indicador diario (clicavel: CA-07.2 / CA-07.3) */}
                  <div className="flex items-center gap-2 text-sm font-medium">
                    {hasDiary ? (
                      <button
                        type="button"
                        title="Ver relatorio de set"
                        className="hover:scale-110 transition-transform"
                        onClick={navigateToDiary}
                      >
                        <CheckCircle2 className="size-4 text-green-500 shrink-0" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        title="Criar relatorio para esta data"
                        className="hover:scale-110 transition-transform"
                        onClick={navigateToDiary}
                      >
                        <Circle className="size-4 text-muted-foreground/40 shrink-0" />
                      </button>
                    )}
                    <Calendar className="size-4 text-muted-foreground" />
                    {formatDate(d.shooting_date)}
                  </div>

                  {/* Horario */}
                  {(d.start_time || d.end_time) && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="size-3.5" />
                      {d.start_time && d.end_time
                        ? `${formatTime(d.start_time)} - ${formatTime(d.end_time)}`
                        : d.start_time
                          ? `A partir de ${formatTime(d.start_time)}`
                          : `Ate ${formatTime(d.end_time)}`}
                    </div>
                  )}

                  {/* Local */}
                  {d.location && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground min-w-0">
                      <MapPin className="size-3.5 shrink-0" />
                      <span className="truncate" title={d.location}>{d.location}</span>
                    </div>
                  )}

                  {/* Descricao */}
                  {d.description && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {d.description}
                    </p>
                  )}
                </div>

                {/* Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="size-8 shrink-0" aria-label={`Acoes para diaria de ${formatDate(d.shooting_date)}`}>
                      <MoreHorizontal className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleOpenEdit(d)}>
                      <Pencil className="size-4" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setDeleting(d)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="size-4" />
                      Remover
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          )
        })}
      </div>

      <ShootingDateDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        shootingDate={editing}
        onSubmit={handleSubmit}
        isPending={isAdding || isUpdating}
      />

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => { if (!open) setDeleting(null) }}
        title="Remover diaria"
        description={`Tem certeza que deseja remover a diaria de ${deleting ? formatDate(deleting.shooting_date) : ''}?`}
        confirmLabel="Remover"
        cancelLabel="Cancelar"
        variant="destructive"
        isPending={isRemoving}
        onConfirm={handleDelete}
      />
    </>
  )
}
