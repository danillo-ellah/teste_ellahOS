'use client'

import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { MessageSquare, Plus, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { EmptyTabState } from '@/components/shared/EmptyTabState'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import {
  useCommunications,
  useCreateCommunication,
  useUpdateCommunication,
  useDeleteCommunication,
} from '@/hooks/useAttendance'
import { formatDate, formatRelativeDate } from '@/lib/format'
import {
  ENTRY_TYPE_LABELS,
  CHANNEL_LABELS,
  type ClientCommunication,
  type CommunicationEntryType,
  type CommunicationChannel,
} from '@/types/attendance'

// ============ Constantes de estilo ============

const ENTRY_TYPE_BADGE_CLASS: Record<CommunicationEntryType, string> = {
  decisao: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  alteracao: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  informacao: 'bg-slate-500/10 text-slate-600 dark:text-slate-400',
  aprovacao: 'bg-green-500/10 text-green-600 dark:text-green-400',
  satisfacao_automatica: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  registro_set: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
  outro: 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400',
}

// ============ Schema de validacao ============

const communicationSchema = z.object({
  entry_date: z.string().min(1, 'Data obrigatoria'),
  entry_type: z.enum([
    'decisao',
    'alteracao',
    'informacao',
    'aprovacao',
    'satisfacao_automatica',
    'registro_set',
    'outro',
  ] as const),
  channel: z.enum([
    'whatsapp',
    'email',
    'reuniao',
    'telefone',
    'presencial',
    'sistema',
  ] as const),
  description: z.string().min(1, 'Descricao obrigatoria').max(2000),
  shared_with_team: z.boolean(),
  team_note: z.string().max(2000).optional(),
})

type CommunicationFormValues = z.infer<typeof communicationSchema>

// ============ Utilitario de data ============

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

// ============ Dialog de formulario ============

interface CommunicationFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editing: ClientCommunication | null
  jobId: string
  onClose: () => void
}

function CommunicationFormDialog({
  open,
  onOpenChange,
  editing,
  jobId,
  onClose,
}: CommunicationFormDialogProps) {
  const createMutation = useCreateCommunication()
  const updateMutation = useUpdateCommunication(jobId)

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors },
  } = useForm<CommunicationFormValues>({
    resolver: zodResolver(communicationSchema),
    defaultValues: editing
      ? {
          entry_date: editing.entry_date,
          entry_type: editing.entry_type,
          channel: editing.channel,
          description: editing.description,
          shared_with_team: editing.shared_with_team ?? false,
          team_note: editing.team_note ?? '',
        }
      : {
          entry_date: todayISO(),
          entry_type: 'informacao',
          channel: 'whatsapp',
          description: '',
          shared_with_team: false,
          team_note: '',
        },
  })

  const sharedWithTeam = watch('shared_with_team')

  // Resetar form quando o editing mudar
  const [lastEditingId, setLastEditingId] = useState<string | null>(null)
  if ((editing?.id ?? null) !== lastEditingId) {
    setLastEditingId(editing?.id ?? null)
    reset(
      editing
        ? {
            entry_date: editing.entry_date,
            entry_type: editing.entry_type,
            channel: editing.channel,
            description: editing.description,
            shared_with_team: editing.shared_with_team ?? false,
            team_note: editing.team_note ?? '',
          }
        : {
            entry_date: todayISO(),
            entry_type: 'informacao',
            channel: 'whatsapp',
            description: '',
            shared_with_team: false,
            team_note: '',
          },
    )
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  async function onSubmit(values: CommunicationFormValues) {
    try {
      const payload = {
        ...values,
        shared_with_team: values.shared_with_team,
        team_note: values.shared_with_team ? (values.team_note ?? null) : null,
      }
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, ...payload })
        toast.success('Comunicacao atualizada')
      } else {
        await createMutation.mutateAsync({ job_id: jobId, ...payload })
        toast.success('Comunicacao registrada')
      }
      onClose()
    } catch {
      toast.error('Erro ao salvar comunicacao')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {editing ? 'Editar comunicacao' : 'Nova comunicacao'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-1">
          {/* Data */}
          <div className="space-y-1.5">
            <Label htmlFor="entry_date">Data</Label>
            <Input
              id="entry_date"
              type="date"
              {...register('entry_date')}
              className="w-full"
            />
            {errors.entry_date && (
              <p className="text-xs text-destructive">{errors.entry_date.message}</p>
            )}
          </div>

          {/* Tipo + Canal — linha dupla em telas maiores */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Tipo */}
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Controller
                name="entry_type"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(v) => field.onChange(v as CommunicationEntryType)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(ENTRY_TYPE_LABELS) as CommunicationEntryType[]).map(
                        (key) => (
                          <SelectItem key={key} value={key}>
                            {ENTRY_TYPE_LABELS[key]}
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.entry_type && (
                <p className="text-xs text-destructive">{errors.entry_type.message}</p>
              )}
            </div>

            {/* Canal */}
            <div className="space-y-1.5">
              <Label>Canal</Label>
              <Controller
                name="channel"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(v) => field.onChange(v as CommunicationChannel)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o canal" />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(CHANNEL_LABELS) as CommunicationChannel[]).map(
                        (key) => (
                          <SelectItem key={key} value={key}>
                            {CHANNEL_LABELS[key]}
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.channel && (
                <p className="text-xs text-destructive">{errors.channel.message}</p>
              )}
            </div>
          </div>

          {/* Descricao */}
          <div className="space-y-1.5">
            <Label htmlFor="description">Descricao</Label>
            <Textarea
              id="description"
              rows={4}
              placeholder="Descreva o conteudo da comunicacao..."
              {...register('description')}
            />
            {errors.description && (
              <p className="text-xs text-destructive">{errors.description.message}</p>
            )}
          </div>

          {/* Repassado a equipe */}
          <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
            <Label htmlFor="shared_with_team" className="cursor-pointer">
              Repassado a equipe
            </Label>
            <Controller
              name="shared_with_team"
              control={control}
              render={({ field }) => (
                <Switch
                  id="shared_with_team"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              )}
            />
          </div>

          {/* Nota de repasse — visivel somente quando shared_with_team = true */}
          {sharedWithTeam && (
            <div className="space-y-1.5">
              <Label htmlFor="team_note">Nota de repasse</Label>
              <Textarea
                id="team_note"
                rows={3}
                placeholder="O que e como foi repassado a equipe..."
                {...register('team_note')}
              />
              {errors.team_note && (
                <p className="text-xs text-destructive">{errors.team_note.message}</p>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Salvando...' : editing ? 'Salvar alteracoes' : 'Registrar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ============ Card de entrada ============

interface CommunicationCardProps {
  entry: ClientCommunication
  onEdit: (entry: ClientCommunication) => void
  onDelete: (id: string) => void
}

function CommunicationCard({ entry, onEdit, onDelete }: CommunicationCardProps) {
  const typeBadgeClass =
    ENTRY_TYPE_BADGE_CLASS[entry.entry_type] ?? ENTRY_TYPE_BADGE_CLASS.outro

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-2">
      {/* Cabecalho: data + badges + acoes */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
          <span className="text-xs font-medium text-muted-foreground shrink-0">
            {formatDate(entry.entry_date)}
          </span>
          <Badge variant="secondary" className={typeBadgeClass}>
            {ENTRY_TYPE_LABELS[entry.entry_type]}
          </Badge>
          <Badge
            variant="secondary"
            className="bg-zinc-500/10 text-zinc-600 dark:text-zinc-400"
          >
            {CHANNEL_LABELS[entry.channel]}
          </Badge>
          {entry.shared_with_team && (
            <Badge
              variant="secondary"
              className="bg-green-500/10 text-green-600 dark:text-green-400"
            >
              Repassado
            </Badge>
          )}
        </div>

        {/* Acoes */}
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={() => onEdit(entry)}
            title="Editar"
          >
            <Pencil className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-7 text-destructive hover:text-destructive"
            onClick={() => onDelete(entry.id)}
            title="Remover"
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* Descricao */}
      <p className="text-sm whitespace-pre-line leading-relaxed">
        {entry.description}
      </p>

      {/* Nota de repasse */}
      {entry.team_note && (
        <p className="text-xs italic text-muted-foreground whitespace-pre-line leading-relaxed">
          {entry.team_note}
        </p>
      )}

      {/* Rodape: autor + timestamp relativo */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground pt-0.5">
        {entry.created_by_name && (
          <span className="font-medium">{entry.created_by_name}</span>
        )}
        <span>{formatRelativeDate(entry.created_at)}</span>
      </div>
    </div>
  )
}

// ============ Skeletons ============

function CommunicationCardSkeleton() {
  return (
    <div className="rounded-lg border border-border p-4 space-y-2">
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-32" />
    </div>
  )
}

// ============ Componente principal ============

interface CommunicationLogSectionProps {
  jobId: string
}

export function CommunicationLogSection({ jobId }: CommunicationLogSectionProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<ClientCommunication | null>(null)
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)

  const { data: response, isLoading } = useCommunications(jobId)
  const deleteMutation = useDeleteCommunication(jobId)

  function openCreate() {
    setEditing(null)
    setDialogOpen(true)
  }

  function openEdit(entry: ClientCommunication) {
    setEditing(entry)
    setDialogOpen(true)
  }

  function handleDialogClose() {
    setDialogOpen(false)
    setEditing(null)
  }

  async function handleConfirmDelete() {
    if (!deleteTargetId) return
    try {
      await deleteMutation.mutateAsync(deleteTargetId)
      toast.success('Comunicacao removida')
      setDeleteTargetId(null)
    } catch {
      toast.error('Erro ao remover comunicacao')
    }
  }

  const list: ClientCommunication[] = response?.data ?? []

  return (
    <section className="space-y-4">
      {/* Cabecalho da secao */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">Comunicacoes com Cliente</h3>
          {!isLoading && list.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {list.length}
            </Badge>
          )}
        </div>
        <Button size="sm" variant="outline" onClick={openCreate}>
          <Plus className="mr-1.5 size-3.5" />
          Adicionar
        </Button>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-3">
          <CommunicationCardSkeleton />
          <CommunicationCardSkeleton />
          <CommunicationCardSkeleton />
        </div>
      )}

      {/* Lista vazia */}
      {!isLoading && list.length === 0 && (
        <EmptyTabState
          icon={MessageSquare}
          title="Nenhuma comunicacao registrada"
          description="Registre decisoes, alteracoes, aprovacoes e outros contatos com o cliente."
          actionLabel="Adicionar comunicacao"
          onAction={openCreate}
        />
      )}

      {/* Lista de entradas */}
      {!isLoading && list.length > 0 && (
        <div className="space-y-3">
          {list.map((entry) => (
            <CommunicationCard
              key={entry.id}
              entry={entry}
              onEdit={openEdit}
              onDelete={setDeleteTargetId}
            />
          ))}
        </div>
      )}

      {/* Dialog de criacao/edicao */}
      <CommunicationFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        jobId={jobId}
        onClose={handleDialogClose}
      />

      {/* Dialog de confirmacao de exclusao */}
      <ConfirmDialog
        open={!!deleteTargetId}
        onOpenChange={(open) => {
          if (!open) setDeleteTargetId(null)
        }}
        title="Remover comunicacao"
        description="Tem certeza que deseja remover este registro de comunicacao? Esta acao nao pode ser desfeita."
        confirmLabel="Remover"
        onConfirm={handleConfirmDelete}
        isPending={deleteMutation.isPending}
      />
    </section>
  )
}
