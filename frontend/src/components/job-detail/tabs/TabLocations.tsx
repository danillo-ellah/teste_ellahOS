'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import {
  Plus,
  MapPin,
  Phone,
  Mail,
  User,
  Calendar,
  DollarSign,
  MoreHorizontal,
  Pencil,
  Unlink,
  ExternalLink,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfirmDialog } from '@/components/jobs/ConfirmDialog'
import { EmptyTabState } from '@/components/shared/EmptyTabState'
import { LocationDialog } from './LocationDialog'
import {
  useJobLocations,
  useCreateLocation,
  useLinkJobLocation,
  useUpdateJobLocation,
  useUnlinkJobLocation,
} from '@/hooks/useJobLocations'
import { ApiRequestError } from '@/lib/api'
import { formatCurrency, formatDate } from '@/lib/format'
import { PERMIT_STATUS_LABELS } from '@/types/locations'
import type { JobDetail } from '@/types/jobs'
import type { JobLocation, PermitStatus, CreateLocationPayload } from '@/types/locations'
import { cn } from '@/lib/utils'

interface TabLocationsProps {
  job: JobDetail
}

// ---- Mapa de estilos por status de alvara ----

const PERMIT_STATUS_STYLES: Record<
  PermitStatus,
  { badgeClass: string; dotClass: string }
> = {
  nao_necessario: {
    badgeClass: 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400',
    dotClass: 'bg-zinc-400',
  },
  solicitado: {
    badgeClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    dotClass: 'bg-amber-400',
  },
  aprovado: {
    badgeClass: 'bg-green-500/10 text-green-600 dark:text-green-400',
    dotClass: 'bg-green-400',
  },
  reprovado: {
    badgeClass: 'bg-red-500/10 text-red-600 dark:text-red-400',
    dotClass: 'bg-red-400',
  },
  em_analise: {
    badgeClass: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    dotClass: 'bg-blue-400',
  },
}

// ---- Card de locacao ----

interface LocationCardProps {
  jobLocation: JobLocation
  onEdit: (jl: JobLocation) => void
  onUnlink: (jl: JobLocation) => void
}

function LocationCard({ jobLocation, onEdit, onUnlink }: LocationCardProps) {
  const loc = jobLocation.locations
  if (!loc) return null

  // Foto de capa
  const coverPhoto = loc.location_photos?.find((p) => p.is_cover) ?? loc.location_photos?.[0]

  // Endereco formatado
  const addressParts = [
    loc.address_street,
    loc.address_number,
    loc.address_neighborhood,
    loc.address_city,
    loc.address_state,
  ].filter(Boolean)
  const address = addressParts.join(', ')

  // Custo efetivo (override tem prioridade sobre padrao da locacao)
  const effectiveRate = jobLocation.daily_rate_override ?? loc.daily_rate

  // Status do alvara
  const permitStyle = jobLocation.permit_status
    ? PERMIT_STATUS_STYLES[jobLocation.permit_status]
    : null

  return (
    <div className="rounded-lg border border-border overflow-hidden hover:shadow-sm transition-shadow">
      <div className="flex">
        {/* Foto ou placeholder */}
        <div className="w-24 sm:w-32 shrink-0 bg-muted flex items-center justify-center">
          {coverPhoto ? (
            <img
              src={coverPhoto.url}
              alt={coverPhoto.caption ?? loc.name}
              className="w-full h-full object-cover"
              style={{ minHeight: 96 }}
            />
          ) : (
            <MapPin className="size-8 text-muted-foreground/40" />
          )}
        </div>

        {/* Conteudo */}
        <div className="flex-1 min-w-0 p-3 sm:p-4 flex flex-col gap-1.5">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <h4 className="text-sm font-semibold leading-tight truncate">{loc.name}</h4>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 shrink-0 -mt-0.5"
                  aria-label={`Acoes para ${loc.name}`}
                >
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(jobLocation)}>
                  <Pencil className="size-4" />
                  Editar uso
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onUnlink(jobLocation)}
                  className="text-destructive focus:text-destructive"
                >
                  <Unlink className="size-4" />
                  Desvincular
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Endereco */}
          {address && (
            <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
              <MapPin className="size-3 shrink-0 mt-0.5" />
              <span className="line-clamp-2">{address}</span>
            </div>
          )}

          {/* Status do alvara */}
          {jobLocation.permit_status && permitStyle && (
            <div className="flex items-center gap-1.5">
              <span
                className={cn('inline-block size-2 rounded-full', permitStyle.dotClass)}
              />
              <Badge
                variant="outline"
                className={cn('text-[10px] px-1.5 py-0 border-0', permitStyle.badgeClass)}
              >
                Alvara: {PERMIT_STATUS_LABELS[jobLocation.permit_status]}
              </Badge>
            </div>
          )}

          {/* Datas de filmagem */}
          {jobLocation.filming_dates && jobLocation.filming_dates.length > 0 && (
            <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
              <Calendar className="size-3 shrink-0 mt-0.5" />
              <span className="flex flex-wrap gap-1">
                {jobLocation.filming_dates.slice(0, 5).map((d) => (
                  <span
                    key={d}
                    className="bg-muted rounded px-1 py-0.5 text-[10px] font-medium"
                  >
                    {formatDate(d)}
                  </span>
                ))}
                {jobLocation.filming_dates.length > 5 && (
                  <span className="text-[10px] text-muted-foreground self-center">
                    +{jobLocation.filming_dates.length - 5} mais
                  </span>
                )}
              </span>
            </div>
          )}

          {/* Custo diaria */}
          {effectiveRate != null && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <DollarSign className="size-3 shrink-0" />
              <span>
                {formatCurrency(effectiveRate)}/dia
                {jobLocation.daily_rate_override != null && loc.daily_rate != null && (
                  <span className="ml-1 opacity-60 line-through">
                    {formatCurrency(loc.daily_rate)}
                  </span>
                )}
              </span>
            </div>
          )}

          {/* Contato */}
          {(loc.contact_name || loc.contact_phone || loc.contact_email) && (
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-0.5">
              {loc.contact_name && (
                <span className="flex items-center gap-1">
                  <User className="size-3" />
                  {loc.contact_name}
                </span>
              )}
              {loc.contact_phone && (
                <a
                  href={`tel:${loc.contact_phone}`}
                  className="flex items-center gap-1 hover:text-foreground transition-colors"
                >
                  <Phone className="size-3" />
                  {loc.contact_phone}
                </a>
              )}
              {loc.contact_email && (
                <a
                  href={`mailto:${loc.contact_email}`}
                  className="flex items-center gap-1 hover:text-foreground transition-colors"
                >
                  <Mail className="size-3" />
                  <span className="truncate max-w-[160px]">{loc.contact_email}</span>
                </a>
              )}
            </div>
          )}

          {/* Notas do uso */}
          {jobLocation.notes && (
            <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
              {jobLocation.notes}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

// ---- TabLocations ----

export function TabLocations({ job }: TabLocationsProps) {
  const { data: jobLocations, isLoading, isError, refetch } = useJobLocations(job.id)
  const { mutateAsync: createLocation, isPending: isCreating } = useCreateLocation()
  const { mutateAsync: linkLocation, isPending: isLinking } = useLinkJobLocation()
  const { mutateAsync: updateJobLoc, isPending: isUpdating } = useUpdateJobLocation()
  const { mutateAsync: unlinkLocation, isPending: isUnlinking } = useUnlinkJobLocation()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<JobLocation | undefined>()
  const [unlinking, setUnlinking] = useState<JobLocation | null>(null)

  function handleOpenAdd() {
    setEditing(undefined)
    setDialogOpen(true)
  }

  function handleOpenEdit(jl: JobLocation) {
    setEditing(jl)
    setDialogOpen(true)
  }

  async function handleSubmitLink(data: {
    location_id?: string
    new_location?: CreateLocationPayload
    filming_dates: string[] | null
    permit_status: PermitStatus | null
    permit_notes: string | null
    daily_rate_override: number | null
    notes: string | null
  }) {
    try {
      if (editing) {
        // Atualizar vinculo existente
        await updateJobLoc({
          jobLocationId: editing.id,
          jobId: job.id,
          filming_dates: data.filming_dates,
          permit_status: data.permit_status,
          permit_notes: data.permit_notes,
          daily_rate_override: data.daily_rate_override,
          notes: data.notes,
        })
        toast.success('Locacao atualizada')
      } else if (data.new_location) {
        // Criar nova locacao e depois vincular
        const created = await createLocation(data.new_location)
        const newLoc = (created as unknown as { data: { id: string } }).data
        await linkLocation({
          job_id: job.id,
          location_id: newLoc.id,
          filming_dates: data.filming_dates,
          permit_status: data.permit_status,
          permit_notes: data.permit_notes,
          daily_rate_override: data.daily_rate_override,
          notes: data.notes,
        })
        toast.success('Locacao criada e vinculada')
      } else if (data.location_id) {
        // Vincular locacao existente
        await linkLocation({
          job_id: job.id,
          location_id: data.location_id,
          filming_dates: data.filming_dates,
          permit_status: data.permit_status,
          permit_notes: data.permit_notes,
          daily_rate_override: data.daily_rate_override,
          notes: data.notes,
        })
        toast.success('Locacao adicionada ao job')
      }
      setDialogOpen(false)
    } catch (err) {
      const msg = err instanceof ApiRequestError ? err.message : 'Erro ao salvar locacao'
      toast.error(msg)
    }
  }

  async function handleUnlink() {
    if (!unlinking) return
    try {
      await unlinkLocation({ jobLocationId: unlinking.id, jobId: job.id })
      toast.success('Locacao desvinculada')
      setUnlinking(null)
    } catch (err) {
      const msg = err instanceof ApiRequestError ? err.message : 'Erro ao desvincular locacao'
      toast.error(msg)
    }
  }

  const isPending = isCreating || isLinking || isUpdating

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full rounded-lg" />
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-border py-12 flex flex-col items-center justify-center text-center gap-3">
        <p className="text-sm text-muted-foreground">Erro ao carregar locacoes.</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          Tentar novamente
        </Button>
      </div>
    )
  }

  const list = jobLocations ?? []

  if (list.length === 0) {
    return (
      <>
        <EmptyTabState
          icon={MapPin}
          title="Nenhuma locacao registrada"
          description="Adicione locacoes de filmagem a este job."
          actionLabel="Adicionar locacao"
          onAction={handleOpenAdd}
        />
        <LocationDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          jobId={job.id}
          onSubmitLink={handleSubmitLink}
          isPending={isPending}
        />
      </>
    )
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold">Locacoes ({list.length})</h3>
        <Button size="sm" variant="outline" onClick={handleOpenAdd}>
          <Plus className="size-4" />
          Adicionar locacao
        </Button>
      </div>

      <div className="flex flex-col gap-3">
        {list.map((jl) => (
          <LocationCard
            key={jl.id}
            jobLocation={jl}
            onEdit={handleOpenEdit}
            onUnlink={setUnlinking}
          />
        ))}
      </div>

      <LocationDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        jobId={job.id}
        jobLocation={editing}
        onSubmitLink={handleSubmitLink}
        isPending={isPending}
      />

      <ConfirmDialog
        open={unlinking !== null}
        onOpenChange={(open) => { if (!open) setUnlinking(null) }}
        title="Desvincular locacao"
        description={`Tem certeza que deseja desvincular "${unlinking?.locations?.name ?? 'esta locacao'}" deste job?`}
        confirmLabel="Desvincular"
        cancelLabel="Cancelar"
        variant="destructive"
        isPending={isUnlinking}
        onConfirm={handleUnlink}
      />
    </>
  )
}
