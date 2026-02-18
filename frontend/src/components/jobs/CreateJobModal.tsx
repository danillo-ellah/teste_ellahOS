'use client'

import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
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
import { SearchableSelect } from '@/components/shared/SearchableSelect'
import { useCreateJob } from '@/hooks/useCreateJob'
import { useClients } from '@/hooks/useClients'
import { useAgencies } from '@/hooks/useAgencies'
import { JOB_STATUSES, PROJECT_TYPES } from '@/types/jobs'
import { JOB_STATUS_LABELS, JOB_STATUS_COLORS, PROJECT_TYPE_LABELS } from '@/lib/constants'

// --- Schema ---

const formSchema = z.object({
  title: z
    .string()
    .min(3, 'Minimo 3 caracteres')
    .max(200, 'Maximo 200 caracteres'),
  client_id: z.string().min(1, 'Selecione um cliente'),
  agency_id: z.string().optional(),
  job_type: z.string().min(1, 'Selecione o tipo de projeto'),
  status: z.string().min(1),
  expected_delivery_date: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

// --- Props ---

interface CreateJobModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

// --- Modal principal ---

export function CreateJobModal({ open, onOpenChange }: CreateJobModalProps) {
  const router = useRouter()
  const { mutateAsync: createJob, isPending } = useCreateJob()

  const { data: clients = [], isLoading: loadingClients } = useClients()
  const { data: agencies = [], isLoading: loadingAgencies } = useAgencies()

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      client_id: '',
      agency_id: '',
      job_type: '',
      status: 'briefing_recebido',
      expected_delivery_date: '',
    },
  })

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      reset()
    }
    onOpenChange(nextOpen)
  }

  async function onSubmit(values: FormValues) {
    try {
      const payload = {
        title: values.title,
        client_id: values.client_id,
        job_type: values.job_type as (typeof PROJECT_TYPES)[number],
        status: values.status as (typeof JOB_STATUSES)[number],
        ...(values.agency_id && values.agency_id.length > 0
          ? { agency_id: values.agency_id }
          : {}),
        ...(values.expected_delivery_date &&
        values.expected_delivery_date.length > 0
          ? { expected_delivery_date: values.expected_delivery_date }
          : {}),
      }

      const result = await createJob(payload)
      toast.success('\u2705 Job criado com sucesso')
      handleOpenChange(false)
      router.push(`/jobs/${result.data.id}`)
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Erro ao criar job. Tente novamente.'
      toast.error(`\u274C ${message}`)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Novo Job</DialogTitle>
          <DialogDescription>Crie um novo job para comecar.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          {/* Titulo */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="job-title"
              className="text-sm font-medium leading-none"
            >
              Titulo do job <span className="text-destructive">*</span>
            </label>
            <Input
              id="job-title"
              placeholder="Ex: Campanha de Lancamento - Produto X"
              aria-invalid={!!errors.title}
              {...register('title')}
            />
            {errors.title && (
              <p className="text-xs text-destructive">{errors.title.message}</p>
            )}
          </div>

          {/* Cliente */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="job-client"
              className="text-sm font-medium leading-none"
            >
              Cliente <span className="text-destructive">*</span>
            </label>
            <Controller
              name="client_id"
              control={control}
              render={({ field }) => (
                <SearchableSelect
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Buscar cliente..."
                  options={clients}
                  isLoading={loadingClients}
                  error={errors.client_id?.message}
                />
              )}
            />
            {errors.client_id && (
              <p className="text-xs text-destructive">
                {errors.client_id.message}
              </p>
            )}
          </div>

          {/* Agencia */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="job-agency"
              className="text-sm font-medium leading-none"
            >
              Agencia
              <span className="text-muted-foreground font-normal ml-1">
                (opcional)
              </span>
            </label>
            <Controller
              name="agency_id"
              control={control}
              render={({ field }) => (
                <SearchableSelect
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  placeholder="Buscar agencia..."
                  options={agencies}
                  isLoading={loadingAgencies}
                />
              )}
            />
          </div>

          {/* Tipo de projeto */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="job-type"
              className="text-sm font-medium leading-none"
            >
              Tipo de projeto <span className="text-destructive">*</span>
            </label>
            <Controller
              name="job_type"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger
                    id="job-type"
                    className="w-full"
                    aria-invalid={!!errors.job_type}
                  >
                    <SelectValue placeholder="Selecione o tipo..." />
                  </SelectTrigger>
                  <SelectContent>
                    {PROJECT_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {PROJECT_TYPE_LABELS[type]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.job_type && (
              <p className="text-xs text-destructive">
                {errors.job_type.message}
              </p>
            )}
          </div>

          {/* Status inicial */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="job-status"
              className="text-sm font-medium leading-none"
            >
              Status inicial
            </label>
            <Controller
              name="status"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="job-status" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {JOB_STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>
                        <span className="flex items-center gap-2">
                          <span
                            className="inline-block size-2 rounded-full shrink-0"
                            style={{
                              backgroundColor: JOB_STATUS_COLORS[status],
                            }}
                          />
                          {JOB_STATUS_LABELS[status]}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <p className="text-xs text-muted-foreground">
              O status pode ser alterado a qualquer momento.
            </p>
          </div>

          {/* Data de entrega estimada */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="job-delivery-date"
              className="text-sm font-medium leading-none"
            >
              Data de entrega estimada
              <span className="text-muted-foreground font-normal ml-1">
                (opcional)
              </span>
            </label>
            <Input
              id="job-delivery-date"
              type="date"
              {...register('expected_delivery_date')}
            />
          </div>

          <DialogFooter className="mt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="animate-spin" />}
              {isPending ? 'Criando...' : 'Criar Job'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
