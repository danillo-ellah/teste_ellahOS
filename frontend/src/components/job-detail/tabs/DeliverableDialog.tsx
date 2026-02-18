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
  file_url: z.union([z.string().url('URL invalida'), z.literal('')]).optional(),
  review_url: z.union([z.string().url('URL invalida'), z.literal('')]).optional(),
})

type FormValues = z.infer<typeof schema>

interface DeliverableDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  deliverable?: JobDeliverable
  onSubmit: (data: {
    description: string
    format: string | null
    resolution: string | null
    duration_seconds: number | null
    status: string
    file_url: string | null
    review_url: string | null
  }) => Promise<void>
  isPending: boolean
}

export function DeliverableDialog({
  open,
  onOpenChange,
  deliverable,
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
      file_url: '',
      review_url: '',
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
        file_url: deliverable?.file_url ?? '',
        review_url: deliverable?.review_url ?? '',
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
      file_url: values.file_url || null,
      review_url: values.review_url || null,
    })
  }

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
              placeholder="Ex: Video 30s para Instagram"
              aria-invalid={!!errors.description}
              {...register('description')}
            />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Formato" optional>
              <Input placeholder="Ex: MP4, MOV" {...register('format')} />
            </FormField>
            <FormField label="Resolucao" optional>
              <Input placeholder="Ex: 1920x1080" {...register('resolution')} />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Duracao (segundos)" optional>
              <Input
                type="number"
                min="1"
                placeholder="Ex: 30"
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

          <FormField label="URL do arquivo" optional error={errors.file_url?.message}>
            <Input
              placeholder="https://..."
              aria-invalid={!!errors.file_url}
              {...register('file_url')}
            />
          </FormField>

          <FormField label="URL de review" optional error={errors.review_url?.message}>
            <Input
              placeholder="https://..."
              aria-invalid={!!errors.review_url}
              {...register('review_url')}
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
