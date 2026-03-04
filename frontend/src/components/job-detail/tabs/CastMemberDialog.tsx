'use client'

import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { apiMutate, safeErrorMessage } from '@/lib/api'
import type { CastMember } from '@/types/cast'

// --- Zod schema ---

const castMemberSchema = z.object({
  name: z.string().min(1, 'Nome obrigatorio').max(300),
  cast_category: z.string().min(1, 'Categoria obrigatoria'),
  character_name: z.string().max(200).nullable().optional(),
  cpf: z.string().max(20).nullable().optional(),
  rg: z.string().max(30).nullable().optional(),
  birth_date: z.string().nullable().optional(),
  drt: z.string().max(30).nullable().optional(),
  profession: z.string().max(200).nullable().optional(),
  email: z.string().email('Email invalido').nullable().optional().or(z.literal('')),
  phone: z.string().max(30).nullable().optional(),
  address: z.string().max(400).nullable().optional(),
  city: z.string().max(100).nullable().optional(),
  state: z.string().max(2).nullable().optional(),
  zip_code: z.string().max(10).nullable().optional(),
  service_fee: z.number().min(0),
  image_rights_fee: z.number().min(0),
  agency_fee: z.number().min(0),
  num_days: z.number().int().min(1),
  scenes_description: z.string().max(2000).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  contract_status: z
    .enum(['pendente', 'enviado', 'assinado', 'cancelado'])
    .optional(),
})

type CastMemberFormValues = z.infer<typeof castMemberSchema>

// --- Constants ---

const CAST_CATEGORIES = [
  { value: 'ator_principal', label: 'Ator/Atriz Principal' },
  { value: 'ator_coadjuvante', label: 'Ator/Atriz Coadjuvante' },
  { value: 'figurante', label: 'Figurante' },
  { value: 'modelo', label: 'Modelo' },
  { value: 'crianca', label: 'Crianca' },
  { value: 'locutor', label: 'Locutor(a)' },
  { value: 'apresentador', label: 'Apresentador(a)' },
  { value: 'outro', label: 'Outro' },
]

const CONTRACT_STATUS_OPTIONS: { value: CastMember['contract_status']; label: string }[] = [
  { value: 'pendente', label: 'Pendente' },
  { value: 'enviado', label: 'Enviado' },
  { value: 'assinado', label: 'Assinado' },
  { value: 'cancelado', label: 'Cancelado' },
]

// --- Props ---

interface CastMemberDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  jobId: string
  member?: CastMember
}

// --- Helper: null out empty strings ---

function nullIfEmpty(v: string | null | undefined): string | null {
  if (!v || v.trim() === '') return null
  return v.trim()
}

export function CastMemberDialog({
  open,
  onOpenChange,
  jobId,
  member,
}: CastMemberDialogProps) {
  const queryClient = useQueryClient()
  const isEditing = !!member

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors },
  } = useForm<CastMemberFormValues>({
    resolver: zodResolver(castMemberSchema),
    defaultValues: {
      name: member?.name ?? '',
      cast_category: member?.cast_category ?? '',
      character_name: member?.character_name ?? null,
      cpf: member?.cpf ?? null,
      rg: member?.rg ?? null,
      birth_date: member?.birth_date ?? null,
      drt: member?.drt ?? null,
      profession: member?.profession ?? null,
      email: member?.email ?? null,
      phone: member?.phone ?? null,
      address: member?.address ?? null,
      city: member?.city ?? null,
      state: member?.state ?? null,
      zip_code: member?.zip_code ?? null,
      service_fee: member?.service_fee ?? 0,
      image_rights_fee: member?.image_rights_fee ?? 0,
      agency_fee: member?.agency_fee ?? 0,
      num_days: member?.num_days ?? 1,
      scenes_description: member?.scenes_description ?? null,
      notes: member?.notes ?? null,
      contract_status: member?.contract_status ?? 'pendente',
    },
  })

  // Reset form when dialog opens or member changes
  useEffect(() => {
    if (open) {
      reset({
        name: member?.name ?? '',
        cast_category: member?.cast_category ?? '',
        character_name: member?.character_name ?? null,
        cpf: member?.cpf ?? null,
        rg: member?.rg ?? null,
        birth_date: member?.birth_date ?? null,
        drt: member?.drt ?? null,
        profession: member?.profession ?? null,
        email: member?.email ?? null,
        phone: member?.phone ?? null,
        address: member?.address ?? null,
        city: member?.city ?? null,
        state: member?.state ?? null,
        zip_code: member?.zip_code ?? null,
        service_fee: member?.service_fee ?? 0,
        image_rights_fee: member?.image_rights_fee ?? 0,
        agency_fee: member?.agency_fee ?? 0,
        num_days: member?.num_days ?? 1,
        scenes_description: member?.scenes_description ?? null,
        notes: member?.notes ?? null,
        contract_status: member?.contract_status ?? 'pendente',
      })
    }
  }, [open, member, reset])

  const mutation = useMutation({
    mutationFn: async (values: CastMemberFormValues) => {
      const payload = {
        name: values.name.trim(),
        cast_category: values.cast_category,
        character_name: nullIfEmpty(values.character_name),
        cpf: nullIfEmpty(values.cpf),
        rg: nullIfEmpty(values.rg),
        birth_date: nullIfEmpty(values.birth_date),
        drt: nullIfEmpty(values.drt),
        profession: nullIfEmpty(values.profession),
        email: nullIfEmpty(values.email),
        phone: nullIfEmpty(values.phone),
        address: nullIfEmpty(values.address),
        city: nullIfEmpty(values.city),
        state: nullIfEmpty(values.state),
        zip_code: nullIfEmpty(values.zip_code),
        service_fee: values.service_fee,
        image_rights_fee: values.image_rights_fee,
        agency_fee: values.agency_fee,
        total_fee: values.service_fee + values.image_rights_fee + values.agency_fee,
        num_days: values.num_days,
        scenes_description: nullIfEmpty(values.scenes_description),
        notes: nullIfEmpty(values.notes),
        contract_status: values.contract_status,
      }

      if (isEditing) {
        return apiMutate('job-cast', 'PATCH', payload, member.id)
      } else {
        return apiMutate('job-cast', 'POST', { job_id: jobId, ...payload })
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-cast', jobId] })
      toast.success(isEditing ? 'Membro atualizado' : 'Membro adicionado')
      onOpenChange(false)
    },
    onError: (err) => {
      toast.error(safeErrorMessage(err))
    },
  })

  function onSubmit(values: CastMemberFormValues) {
    mutation.mutate(values)
  }

  // Computed total fee
  const watchedServiceFee = watch('service_fee') || 0
  const watchedImageRightsFee = watch('image_rights_fee') || 0
  const watchedAgencyFee = watch('agency_fee') || 0
  const computedTotalFee = watchedServiceFee + watchedImageRightsFee + watchedAgencyFee

  const isLoading = mutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Membro do Elenco' : 'Novo Membro do Elenco'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5 mt-2">
          {/* Secao: Dados Pessoais */}
          <div className="flex flex-col gap-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Dados Pessoais
            </p>

            {/* Nome + Categoria */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="name">
                  Nome <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  placeholder="Nome completo"
                  {...register('name')}
                  disabled={isLoading}
                />
                {errors.name && (
                  <p className="text-xs text-destructive">{errors.name.message}</p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>
                  Categoria <span className="text-destructive">*</span>
                </Label>
                <Controller
                  name="cast_category"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value ?? ''}
                      onValueChange={field.onChange}
                      disabled={isLoading}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecionar..." />
                      </SelectTrigger>
                      <SelectContent>
                        {CAST_CATEGORIES.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.cast_category && (
                  <p className="text-xs text-destructive">{errors.cast_category.message}</p>
                )}
              </div>
            </div>

            {/* Personagem + Profissao */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="character_name">Nome do Personagem</Label>
                <Input
                  id="character_name"
                  placeholder="Ex: Pai da familia"
                  {...register('character_name')}
                  disabled={isLoading}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="profession">Profissao</Label>
                <Input
                  id="profession"
                  placeholder="Ex: Ator, Modelo..."
                  {...register('profession')}
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* CPF + RG */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cpf">CPF</Label>
                <Input
                  id="cpf"
                  placeholder="000.000.000-00"
                  {...register('cpf')}
                  disabled={isLoading}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="rg">RG</Label>
                <Input
                  id="rg"
                  placeholder="0.000.000"
                  {...register('rg')}
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Data de Nascimento + DRT */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="birth_date">Data de Nascimento</Label>
                <Input
                  id="birth_date"
                  type="date"
                  {...register('birth_date')}
                  disabled={isLoading}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="drt">DRT</Label>
                <Input
                  id="drt"
                  placeholder="Registro profissional"
                  {...register('drt')}
                  disabled={isLoading}
                />
              </div>
            </div>
          </div>

          {/* Secao: Contato */}
          <div className="flex flex-col gap-3 pt-2 border-t border-border">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Contato
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="email@exemplo.com"
                  {...register('email')}
                  disabled={isLoading}
                />
                {errors.email && (
                  <p className="text-xs text-destructive">{errors.email.message}</p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  placeholder="(11) 99999-9999"
                  {...register('phone')}
                  disabled={isLoading}
                />
              </div>
            </div>
          </div>

          {/* Secao: Endereco */}
          <div className="flex flex-col gap-3 pt-2 border-t border-border">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Endereco
            </p>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="address">Logradouro</Label>
              <Input
                id="address"
                placeholder="Rua, numero, complemento"
                {...register('address')}
                disabled={isLoading}
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="col-span-2 sm:col-span-1 flex flex-col gap-1.5">
                <Label htmlFor="city">Cidade</Label>
                <Input
                  id="city"
                  placeholder="Sao Paulo"
                  {...register('city')}
                  disabled={isLoading}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="state">UF</Label>
                <Input
                  id="state"
                  placeholder="SP"
                  maxLength={2}
                  {...register('state')}
                  disabled={isLoading}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="zip_code">CEP</Label>
                <Input
                  id="zip_code"
                  placeholder="00000-000"
                  {...register('zip_code')}
                  disabled={isLoading}
                />
              </div>
            </div>
          </div>

          {/* Secao: Financeiro */}
          <div className="flex flex-col gap-3 pt-2 border-t border-border">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Financeiro
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="service_fee">Cache (R$)</Label>
                <Input
                  id="service_fee"
                  type="number"
                  min={0}
                  step={0.01}
                  placeholder="0,00"
                  {...register('service_fee', { valueAsNumber: true })}
                  disabled={isLoading}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="image_rights_fee">Dir. Imagem (R$)</Label>
                <Input
                  id="image_rights_fee"
                  type="number"
                  min={0}
                  step={0.01}
                  placeholder="0,00"
                  {...register('image_rights_fee', { valueAsNumber: true })}
                  disabled={isLoading}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="agency_fee">Ag. Casting (R$)</Label>
                <Input
                  id="agency_fee"
                  type="number"
                  min={0}
                  step={0.01}
                  placeholder="0,00"
                  {...register('agency_fee', { valueAsNumber: true })}
                  disabled={isLoading}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="num_days">Diarias</Label>
                <Input
                  id="num_days"
                  type="number"
                  min={1}
                  {...register('num_days', { valueAsNumber: true })}
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Valor Total computado */}
            <div className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-2.5">
              <span className="text-sm font-medium text-muted-foreground">Valor Total</span>
              <span className="text-sm font-semibold font-mono">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(computedTotalFee)}
              </span>
            </div>
          </div>

          {/* Secao: Atuacao e Observacoes */}
          <div className="flex flex-col gap-3 pt-2 border-t border-border">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Atuacao
            </p>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="scenes_description">Cenas / Descricao</Label>
              <Textarea
                id="scenes_description"
                placeholder="Descreva as cenas em que o membro participa..."
                rows={2}
                {...register('scenes_description')}
                disabled={isLoading}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="notes">Observacoes</Label>
              <Textarea
                id="notes"
                placeholder="Restricoes, preferencias, notas gerais..."
                rows={2}
                {...register('notes')}
                disabled={isLoading}
              />
            </div>

            {/* Status do contrato — apenas em edicao */}
            {isEditing && (
              <div className="flex flex-col gap-1.5">
                <Label>Status do Contrato</Label>
                <Controller
                  name="contract_status"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value ?? 'pendente'}
                      onValueChange={field.onChange}
                      disabled={isLoading}
                    >
                      <SelectTrigger className="w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CONTRACT_STATUS_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="size-4 animate-spin" />}
              {isEditing ? 'Salvar' : 'Adicionar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
