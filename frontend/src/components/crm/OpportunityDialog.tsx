'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
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
import { toast } from 'sonner'
import {
  useCreateOpportunity,
  useUpdateOpportunity,
  type CreateOpportunityPayload,
  type UpdateOpportunityPayload,
  type OpportunityStage,
  type Opportunity,
} from '@/hooks/useCrm'
import { safeErrorMessage } from '@/lib/api'

const STAGE_OPTIONS: { value: OpportunityStage; label: string }[] = [
  { value: 'lead', label: 'Lead' },
  { value: 'qualificado', label: 'Qualificado' },
  { value: 'proposta', label: 'Proposta' },
  { value: 'negociacao', label: 'Negociacao' },
  { value: 'fechamento', label: 'Fechamento' },
  { value: 'ganho', label: 'Ganho' },
  { value: 'perdido', label: 'Perdido' },
]

const SOURCE_OPTIONS = [
  { value: 'indicacao', label: 'Indicacao' },
  { value: 'site', label: 'Site' },
  { value: 'redes_sociais', label: 'Redes sociais' },
  { value: 'evento', label: 'Evento' },
  { value: 'cold_outreach', label: 'Cold outreach' },
  { value: 'cliente_recorrente', label: 'Cliente recorrente' },
  { value: 'outro', label: 'Outro' },
]

interface FormValues {
  title: string
  stage: OpportunityStage
  estimated_value: string
  probability: string
  expected_close_date: string
  source: string
  project_type: string
  notes: string
  loss_reason: string
}

interface OpportunityDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'create' | 'edit'
  opportunity?: Opportunity
  defaultStage?: OpportunityStage
}

export function OpportunityDialog({
  open,
  onOpenChange,
  mode,
  opportunity,
  defaultStage,
}: OpportunityDialogProps) {
  const createMutation = useCreateOpportunity()
  const updateMutation = useUpdateOpportunity(opportunity?.id ?? '')

  const isPending = createMutation.isPending || updateMutation.isPending

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      title: opportunity?.title ?? '',
      stage: opportunity?.stage ?? defaultStage ?? 'lead',
      estimated_value: opportunity?.estimated_value != null ? String(opportunity.estimated_value) : '',
      probability: String(opportunity?.probability ?? 50),
      expected_close_date: opportunity?.expected_close_date ?? '',
      source: opportunity?.source ?? '',
      project_type: opportunity?.project_type ?? '',
      notes: opportunity?.notes ?? '',
      loss_reason: opportunity?.loss_reason ?? '',
    },
  })

  const watchedStage = watch('stage')

  // Reset form quando opportunity muda (modo edit) ou dialog abre com novo stage
  useEffect(() => {
    if (open) {
      reset({
        title: opportunity?.title ?? '',
        stage: opportunity?.stage ?? defaultStage ?? 'lead',
        estimated_value: opportunity?.estimated_value != null ? String(opportunity.estimated_value) : '',
        probability: String(opportunity?.probability ?? 50),
        expected_close_date: opportunity?.expected_close_date ?? '',
        source: opportunity?.source ?? '',
        project_type: opportunity?.project_type ?? '',
        notes: opportunity?.notes ?? '',
        loss_reason: opportunity?.loss_reason ?? '',
      })
    }
  }, [open, opportunity, defaultStage, reset])

  async function onSubmit(values: FormValues) {
    const payload: CreateOpportunityPayload & UpdateOpportunityPayload = {
      title: values.title.trim(),
      stage: values.stage,
      estimated_value: values.estimated_value ? parseFloat(values.estimated_value) : null,
      probability: parseInt(values.probability) || 50,
      expected_close_date: values.expected_close_date || null,
      source: values.source || null,
      project_type: values.project_type || null,
      notes: values.notes || null,
      loss_reason: values.loss_reason || null,
    }

    try {
      if (mode === 'create') {
        await createMutation.mutateAsync(payload)
        toast.success('Oportunidade criada com sucesso')
      } else {
        await updateMutation.mutateAsync(payload)
        toast.success('Oportunidade atualizada')
      }
      onOpenChange(false)
    } catch (err) {
      toast.error(safeErrorMessage(err as Error))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Nova Oportunidade' : 'Editar Oportunidade'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Titulo */}
          <div className="space-y-1.5">
            <Label htmlFor="title">Titulo *</Label>
            <Input
              id="title"
              placeholder="Ex: Campanha Produto X — Cliente Y"
              {...register('title', { required: 'Titulo e obrigatorio' })}
            />
            {errors.title && (
              <p className="text-xs text-destructive">{errors.title.message}</p>
            )}
          </div>

          {/* Stage + Probabilidade */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Stage</Label>
              <Select
                value={watchedStage}
                onValueChange={(v) => setValue('stage', v as OpportunityStage)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar..." />
                </SelectTrigger>
                <SelectContent>
                  {STAGE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="probability">Probabilidade (%)</Label>
              <Input
                id="probability"
                type="number"
                min={0}
                max={100}
                placeholder="50"
                {...register('probability')}
              />
            </div>
          </div>

          {/* Valor estimado + Data esperada */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="estimated_value">Valor Estimado (R$)</Label>
              <Input
                id="estimated_value"
                type="number"
                min={0}
                step="0.01"
                placeholder="0,00"
                {...register('estimated_value')}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="expected_close_date">Fechamento Previsto</Label>
              <Input
                id="expected_close_date"
                type="date"
                {...register('expected_close_date')}
              />
            </div>
          </div>

          {/* Origem + Tipo de projeto */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Origem</Label>
              <Select
                value={watch('source')}
                onValueChange={(v) => setValue('source', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar..." />
                </SelectTrigger>
                <SelectContent>
                  {SOURCE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="project_type">Tipo de Producao</Label>
              <Input
                id="project_type"
                placeholder="Ex: Comercial, Filme, Serie..."
                {...register('project_type')}
              />
            </div>
          </div>

          {/* Motivo de perda (apenas quando stage = perdido) */}
          {watchedStage === 'perdido' && (
            <div className="space-y-1.5">
              <Label htmlFor="loss_reason">Motivo da Perda *</Label>
              <Input
                id="loss_reason"
                placeholder="Ex: Preco, prazo, concorrente..."
                {...register('loss_reason', {
                  validate: (v) =>
                    watchedStage === 'perdido'
                      ? v.trim().length > 0 || 'Informe o motivo da perda'
                      : true,
                })}
              />
              {errors.loss_reason && (
                <p className="text-xs text-destructive">{errors.loss_reason.message}</p>
              )}
            </div>
          )}

          {/* Notas */}
          <div className="space-y-1.5">
            <Label htmlFor="notes">Notas</Label>
            <Textarea
              id="notes"
              rows={3}
              placeholder="Informacoes relevantes sobre a oportunidade..."
              {...register('notes')}
            />
          </div>

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
              {isPending
                ? mode === 'create'
                  ? 'Criando...'
                  : 'Salvando...'
                : mode === 'create'
                  ? 'Criar Oportunidade'
                  : 'Salvar Alteracoes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
