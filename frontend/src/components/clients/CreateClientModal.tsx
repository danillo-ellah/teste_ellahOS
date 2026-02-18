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
import { useCreateClient } from '@/hooks/useClients'
import { CLIENT_SEGMENTS } from '@/types/clients'
import { CLIENT_SEGMENT_LABELS } from '@/lib/constants'

const formSchema = z.object({
  name: z.string().min(2, 'Minimo 2 caracteres').max(200),
  trading_name: z.string().max(200).optional(),
  cnpj: z.string().max(20).optional(),
  segment: z.string().optional(),
  website: z.string().max(500).optional(),
})

type FormValues = z.infer<typeof formSchema>

interface CreateClientModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateClientModal({ open, onOpenChange }: CreateClientModalProps) {
  const { mutateAsync: createClient, isPending } = useCreateClient()

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      trading_name: '',
      cnpj: '',
      segment: '',
      website: '',
    },
  })

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) reset()
    onOpenChange(nextOpen)
  }

  async function onSubmit(values: FormValues) {
    try {
      await createClient({
        name: values.name,
        ...(values.trading_name ? { trading_name: values.trading_name } : {}),
        ...(values.cnpj ? { cnpj: values.cnpj } : {}),
        ...(values.segment ? { segment: values.segment as (typeof CLIENT_SEGMENTS)[number] } : {}),
        ...(values.website ? { website: values.website } : {}),
      })
      toast.success('Cliente criado com sucesso')
      handleOpenChange(false)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao criar cliente'
      toast.error(message)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Novo Cliente</DialogTitle>
          <DialogDescription>Cadastre um novo cliente.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="client-name" className="text-sm font-medium leading-none">
              Razao Social <span className="text-destructive">*</span>
            </label>
            <Input
              id="client-name"
              placeholder="Nome da empresa"
              aria-invalid={!!errors.name}
              {...register('name')}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="client-trading" className="text-sm font-medium leading-none">
                Nome Fantasia
              </label>
              <Input
                id="client-trading"
                placeholder="Nome fantasia"
                {...register('trading_name')}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="client-cnpj" className="text-sm font-medium leading-none">
                CNPJ
              </label>
              <Input
                id="client-cnpj"
                placeholder="00.000.000/0000-00"
                {...register('cnpj')}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="client-segment" className="text-sm font-medium leading-none">
                Segmento
              </label>
              <Controller
                name="segment"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="client-segment" className="w-full">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {CLIENT_SEGMENTS.map((seg) => (
                        <SelectItem key={seg} value={seg}>
                          {CLIENT_SEGMENT_LABELS[seg]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="client-website" className="text-sm font-medium leading-none">
                Website
              </label>
              <Input
                id="client-website"
                placeholder="https://..."
                {...register('website')}
              />
            </div>
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
              {isPending ? 'Criando...' : 'Criar Cliente'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
