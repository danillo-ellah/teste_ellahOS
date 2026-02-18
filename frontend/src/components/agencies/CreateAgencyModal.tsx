'use client'

import { useForm } from 'react-hook-form'
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
import { useCreateAgency } from '@/hooks/useAgencies'

const formSchema = z.object({
  name: z.string().min(2, 'Minimo 2 caracteres').max(200),
  trading_name: z.string().max(200).optional(),
  cnpj: z.string().max(20).optional(),
  website: z.string().max(500).optional(),
})

type FormValues = z.infer<typeof formSchema>

interface CreateAgencyModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateAgencyModal({ open, onOpenChange }: CreateAgencyModalProps) {
  const { mutateAsync: createAgency, isPending } = useCreateAgency()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      trading_name: '',
      cnpj: '',
      website: '',
    },
  })

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) reset()
    onOpenChange(nextOpen)
  }

  async function onSubmit(values: FormValues) {
    try {
      await createAgency({
        name: values.name,
        ...(values.trading_name ? { trading_name: values.trading_name } : {}),
        ...(values.cnpj ? { cnpj: values.cnpj } : {}),
        ...(values.website ? { website: values.website } : {}),
      })
      toast.success('Agencia criada com sucesso')
      handleOpenChange(false)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao criar agencia'
      toast.error(message)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova Agencia</DialogTitle>
          <DialogDescription>Cadastre uma nova agencia.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="agency-name" className="text-sm font-medium leading-none">
              Razao Social <span className="text-destructive">*</span>
            </label>
            <Input
              id="agency-name"
              placeholder="Nome da agencia"
              aria-invalid={!!errors.name}
              {...register('name')}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="agency-trading" className="text-sm font-medium leading-none">
                Nome Fantasia
              </label>
              <Input
                id="agency-trading"
                placeholder="Nome fantasia"
                {...register('trading_name')}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="agency-cnpj" className="text-sm font-medium leading-none">
                CNPJ
              </label>
              <Input
                id="agency-cnpj"
                placeholder="00.000.000/0000-00"
                {...register('cnpj')}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="agency-website" className="text-sm font-medium leading-none">
              Website
            </label>
            <Input
              id="agency-website"
              placeholder="https://..."
              {...register('website')}
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
              {isPending ? 'Criando...' : 'Criar Agencia'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
