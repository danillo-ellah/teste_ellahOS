'use client'

import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
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
import { Switch } from '@/components/ui/switch'
import { useCreatePerson } from '@/hooks/usePeople'
import { safeErrorMessage } from '@/lib/api'
import { TEAM_ROLES } from '@/types/jobs'
import { TEAM_ROLE_LABELS } from '@/lib/constants'
import type { TeamRole } from '@/types/jobs'

const formSchema = z.object({
  full_name: z.string().min(2, 'Minimo 2 caracteres').max(200),
  email: z.string().email('Email invalido').or(z.literal('')).optional(),
  phone: z.string().max(30).optional(),
  default_role: z.string().optional(),
  is_internal: z.boolean(),
})

type FormValues = z.infer<typeof formSchema>

interface CreatePersonModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreatePersonModal({ open, onOpenChange }: CreatePersonModalProps) {
  const { mutateAsync: createPerson, isPending } = useCreatePerson()

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      full_name: '',
      email: '',
      phone: '',
      default_role: '',
      is_internal: false,
    },
  })

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) reset()
    onOpenChange(nextOpen)
  }

  async function onSubmit(values: FormValues) {
    try {
      await createPerson({
        full_name: values.full_name,
        is_internal: values.is_internal,
        ...(values.email ? { email: values.email } : {}),
        ...(values.phone ? { phone: values.phone } : {}),
        ...(values.default_role ? { default_role: values.default_role as TeamRole } : {}),
      })
      toast.success('Pessoa cadastrada com sucesso')
      handleOpenChange(false)
    } catch (err) {
      toast.error(safeErrorMessage(err))
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova Pessoa</DialogTitle>
          <DialogDescription>Cadastre um novo membro da equipe ou freelancer.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="person-name" className="text-sm font-medium leading-none">
              Nome completo <span className="text-destructive">*</span>
            </label>
            <Input
              id="person-name"
              placeholder="Nome da pessoa"
              aria-invalid={!!errors.full_name}
              {...register('full_name')}
            />
            {errors.full_name && (
              <p className="text-xs text-destructive">{errors.full_name.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="person-email" className="text-sm font-medium leading-none">
                Email
              </label>
              <Input
                id="person-email"
                type="email"
                placeholder="email@exemplo.com"
                {...register('email')}
              />
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="person-phone" className="text-sm font-medium leading-none">
                Telefone
              </label>
              <Input
                id="person-phone"
                placeholder="(11) 99999-9999"
                {...register('phone')}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="person-role" className="text-sm font-medium leading-none">
              Funcao padrao
            </label>
            <Controller
              name="default_role"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="person-role" className="w-full">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {TEAM_ROLES.map((role) => (
                      <SelectItem key={role} value={role}>
                        {TEAM_ROLE_LABELS[role]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <label className="flex items-center gap-3 cursor-pointer select-none">
            <Switch
              checked={watch('is_internal')}
              onCheckedChange={(checked) => setValue('is_internal', !!checked)}
            />
            <div className="flex flex-col">
              <span className="text-sm font-medium">Equipe interna</span>
              <span className="text-xs text-muted-foreground">
                {watch('is_internal') ? 'Membro fixo da equipe' : 'Freelancer / terceiro'}
              </span>
            </div>
          </label>

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
              {isPending ? 'Criando...' : 'Cadastrar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
