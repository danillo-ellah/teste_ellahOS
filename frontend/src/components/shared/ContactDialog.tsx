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
import { Switch } from '@/components/ui/switch'
import type { Contact } from '@/types/clients'

const formSchema = z.object({
  name: z.string().min(2, 'Minimo 2 caracteres').max(200),
  email: z.string().email('Email invalido').or(z.literal('')).optional(),
  phone: z.string().max(30).optional(),
  role: z.string().max(100).optional(),
  is_primary: z.boolean(),
})

type FormValues = z.infer<typeof formSchema>

interface ContactDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  contact?: Contact | null
  onSave: (data: FormValues) => Promise<void>
  isPending: boolean
}

export function ContactDialog({
  open,
  onOpenChange,
  contact,
  onSave,
  isPending,
}: ContactDialogProps) {
  const isEditing = !!contact

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      role: '',
      is_primary: false,
    },
  })

  useEffect(() => {
    if (open && contact) {
      reset({
        name: contact.name,
        email: contact.email ?? '',
        phone: contact.phone ?? '',
        role: contact.role ?? '',
        is_primary: contact.is_primary,
      })
    } else if (open) {
      reset({
        name: '',
        email: '',
        phone: '',
        role: '',
        is_primary: false,
      })
    }
  }, [open, contact, reset])

  async function onSubmit(values: FormValues) {
    await onSave(values)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Contato' : 'Novo Contato'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Atualize os dados do contato.' : 'Adicione um novo contato.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="contact-name" className="text-sm font-medium leading-none">
              Nome <span className="text-destructive">*</span>
            </label>
            <Input
              id="contact-name"
              placeholder="Nome do contato"
              aria-invalid={!!errors.name}
              {...register('name')}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="contact-email" className="text-sm font-medium leading-none">
              Email
            </label>
            <Input
              id="contact-email"
              type="email"
              placeholder="email@exemplo.com"
              {...register('email')}
            />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="contact-phone" className="text-sm font-medium leading-none">
                Telefone
              </label>
              <Input
                id="contact-phone"
                placeholder="(11) 99999-9999"
                {...register('phone')}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="contact-role" className="text-sm font-medium leading-none">
                Cargo
              </label>
              <Input
                id="contact-role"
                placeholder="Ex: Gerente de MKT"
                {...register('role')}
              />
            </div>
          </div>

          <label className="flex items-center gap-3 cursor-pointer select-none">
            <Switch
              checked={watch('is_primary')}
              onCheckedChange={(checked) => setValue('is_primary', !!checked)}
            />
            <span className="text-sm">Contato principal</span>
          </label>

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
              {isPending ? 'Salvando...' : isEditing ? 'Salvar' : 'Adicionar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
