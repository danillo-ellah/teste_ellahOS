'use client'

import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { FormField } from '@/components/shared/FormField'
import { DELIVERABLE_STATUS_LABELS } from '@/lib/constants'
import { DELIVERABLE_STATUSES } from '@/types/jobs'
import type { JobDeliverable } from '@/types/jobs'

const schema = z.object({
  description: z.string().min(1, 'Descricao obrigatoria'),
  format: z.string().optional(),
  resolution: z.string().optional(),
  duration_seconds: z.string().refine(
    (v) => !v || parseInt(v, 10) > 0,
    'Duracao deve ser maior que zero',
  ).optional(),
  status: z.string(),
  delivery_date: z.string().optional(),
  parent_id: z.string().optional(),
  link: z.union([z.string().url('URL invalida'), z.literal('')]).optional(),
})

type FormValues = z.infer<typeof schema>

interface DeliverableDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  deliverable?: JobDeliverable
  /** Entregaveis existentes que podem ser selecionados como pai */
  parentOptions?: Array<{ id: string; description: string; duration_seconds: number | null }>
  onSubmit: (data: {
    description: string
    format: string | null
    resolution: string | null
    duration_seconds: number | null
    status: string
    delivery_date: string | null
    parent_id: string | null
    link: string | null
  }) => Promise<void>
  isPending: boolean
}

export function DeliverableDialog({
  open,
  onOpenChange,
  deliverable,
  parentOptions,
  onSubmit,
  isPending,
}: DeliverableDialogProps) {
  const isEdit = !!deliverable

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      description: '',
      format: '',
      resolution: '',
      duration_seconds: '',
      status: 'pendente',
      delivery_date: '',
      parent_id: '',
      link: '',
    },
  })

  useEffect(() => {
    if (open) {
      reset({
        description: deliverable?.description ?? '',
        format: deliverable?.format ?? '',
        resolution: deliverable?.resolution ?? '',
        duration_seconds: deliverable?.duration_seconds?.toString() ?? '',
        status: deliverable?.status ?? 'pendente',
        delivery_date: deliverable?.delivery_date ?? '',
        parent_id: deliverable?.parent_id ?? '',
        link: deliverable?.link ?? '',
      })
    }
  }, [open, deliverable, reset])

  async function handleFormSubmit(values: FormValues) {
    await onSubmit({
      description: values.description,
      format: values.format || null,
      resolution: values.resolution || null,
      duration_seconds: values.duration_seconds ? parseInt(values.duration_seconds, 10) : null,
      status: values.status,
      delivery_date: values.delivery_date || null,
      parent_id: values.parent_id || null,
      link: values.link || null,
    })
  }

  // Filtrar opcoes de pai: nao pode ser o proprio item, e nao pode ser filho de ninguem (so raiz)
  const availableParents = (parentOptions ?? []).filter((p) => {
    if (deliverable && p.id === deliverable.id) return false
    return true
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Editar entregavel' : 'Adicionar entregavel'}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Edite as informacoes deste entregavel.'
              : 'Adicione um novo entregavel ao job.'}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(handleFormSubmit)}
          className="flex flex-col gap-4"
        >
          <FormField
            label="Descricao"
            required
            error={errors.description?.message}
          >
            <Input
              placeholder="Ex: Filme 90&quot; institucional"
              aria-invalid={!!errors.description}
              {...register('description')}
            />
          </FormField>

          {/* Entregavel pai (copia/reducao) */}
          {availableParents.length > 0 && (
            <FormField label="Entregavel pai (copia de)" optional>
              <Controller
                name="parent_id"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value || '_none'}
                    onValueChange={(v) => field.onChange(v === '_none' ? '' : v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Nenhum (entregavel independente)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">Nenhum (independente)</SelectItem>
                      {availableParents.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.description}
                          {p.duration_seconds ? ` (${p.duration_seconds}")` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Formato" optional>
              <Input placeholder="Ex: MP4, MOV" {...register('format')} />
            </FormField>
            <FormField label="Resolucao" optional>
              <Input placeholder="Ex: 1920x1080" {...register('resolution')} />
            </FormField>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Duracao (segundos)" optional>
              <Input
                type="number"
                min="1"
                placeholder="Ex: 90"
                {...register('duration_seconds')}
              />
            </FormField>
            <FormField label="Status">
              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DELIVERABLE_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {DELIVERABLE_STATUS_LABELS[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
          </div>

          {/* Prazo de entrega */}
          <FormField label="Prazo de entrega" optional>
            <Input
              type="date"
              {...register('delivery_date')}
            />
          </FormField>

          <FormField label="Link (arquivo/review)" optional error={errors.link?.message}>
            <Input
              placeholder="https://..."
              aria-invalid={!!errors.link}
              {...register('link')}
            />
          </FormField>

          <DialogFooter className="mt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="animate-spin" />}
              {isPending
                ? isEdit ? 'Salvando...' : 'Adicionando...'
                : isEdit ? 'Salvar' : 'Adicionar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
