'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
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
import { Textarea } from '@/components/ui/textarea'
import { FormField } from '@/components/shared/FormField'
import type { JobShootingDate } from '@/types/jobs'

const schema = z.object({
  shooting_date: z.string().min(1, 'Data obrigatoria'),
  description: z.string().optional(),
  location: z.string().optional(),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface ShootingDateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  shootingDate?: JobShootingDate
  onSubmit: (data: {
    shooting_date: string
    description: string | null
    location: string | null
    start_time: string | null
    end_time: string | null
  }) => Promise<void>
  isPending: boolean
}

export function ShootingDateDialog({
  open,
  onOpenChange,
  shootingDate,
  onSubmit,
  isPending,
}: ShootingDateDialogProps) {
  const isEdit = !!shootingDate

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      shooting_date: '',
      description: '',
      location: '',
      start_time: '',
      end_time: '',
    },
  })

  useEffect(() => {
    if (open) {
      reset({
        shooting_date: shootingDate?.shooting_date ?? '',
        description: shootingDate?.description ?? '',
        location: shootingDate?.location ?? '',
        start_time: shootingDate?.start_time?.slice(0, 5) ?? '',
        end_time: shootingDate?.end_time?.slice(0, 5) ?? '',
      })
    }
  }, [open, shootingDate, reset])

  async function handleFormSubmit(values: FormValues) {
    await onSubmit({
      shooting_date: values.shooting_date,
      description: values.description || null,
      location: values.location || null,
      start_time: values.start_time ? `${values.start_time}:00` : null,
      end_time: values.end_time ? `${values.end_time}:00` : null,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Editar diaria' : 'Adicionar diaria'}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Edite as informacoes desta diaria de filmagem.'
              : 'Adicione uma nova diaria de filmagem.'}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(handleFormSubmit)}
          className="flex flex-col gap-4"
        >
          <FormField
            label="Data"
            required
            error={errors.shooting_date?.message}
          >
            <Input
              type="date"
              aria-invalid={!!errors.shooting_date}
              {...register('shooting_date')}
            />
          </FormField>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Inicio" optional>
              <Input type="time" {...register('start_time')} />
            </FormField>
            <FormField label="Fim" optional>
              <Input type="time" {...register('end_time')} />
            </FormField>
          </div>

          <FormField label="Local" optional>
            <Input
              placeholder="Ex: Studio Ellah, SP"
              {...register('location')}
            />
          </FormField>

          <FormField label="Descricao" optional>
            <Textarea
              rows={2}
              placeholder="Detalhes da diaria..."
              {...register('description')}
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
