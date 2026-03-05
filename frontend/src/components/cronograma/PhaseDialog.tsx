'use client'

import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CalendarIcon, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { PHASE_COLOR_PALETTE, PHASE_STATUS_CONFIG } from '@/types/cronograma'
import { countWorkingDays } from '@/lib/cronograma-utils'
import type { JobPhase, CreatePhasePayload, UpdatePhasePayload, PhaseStatus } from '@/types/cronograma'

// --- Emojis sugeridos ---

const SUGGESTED_EMOJIS = [
  '💰', '🗓️', '📋', '📅', '🎬', '✂️', '🎨', '🎵', '✅', '🤝', '🏁',
  '📌', '🚀', '🎯', '📝', '🔍', '📞', '🎤', '🏗️', '📦',
]

// --- Schema Zod ---

const phaseSchema = z.object({
  phase_label: z.string().min(1, 'Nome obrigatorio').max(200),
  phase_emoji: z.string().min(1, 'Emoji obrigatorio'),
  phase_color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Cor invalida'),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data invalida'),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data invalida'),
  complement: z.string().max(500).optional().nullable(),
  skip_weekends: z.boolean(),
  status: z.enum(['pending', 'in_progress', 'completed']),
})

type PhaseFormValues = z.infer<typeof phaseSchema>

// --- Props ---

interface PhaseDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  jobId: string
  phase?: JobPhase  // se passado, modo edicao
  onSave: (payload: CreatePhasePayload | (UpdatePhasePayload & { id: string })) => void
  isSaving?: boolean
  isMobile?: boolean
}

// --- DatePicker helper ---

function DatePickerField({
  label,
  value,
  onChange,
  ariaLabel,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  ariaLabel: string
}) {
  const [open, setOpen] = useState(false)
  const date = value ? parseISO(value) : undefined

  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs">{label}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className={cn(
              'w-full justify-start text-left font-normal text-sm',
              !date && 'text-muted-foreground',
            )}
            aria-label={ariaLabel}
          >
            <CalendarIcon className="size-4 mr-2 text-muted-foreground" />
            {date ? format(date, 'dd/MM/yyyy') : 'Selecionar'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={(d) => {
              if (d) {
                onChange(format(d, 'yyyy-MM-dd'))
                setOpen(false)
              }
            }}
            locale={ptBR}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}

// --- Form interno ---

function PhaseForm({
  phase,
  jobId,
  onSave,
  isSaving,
  onCancel,
}: {
  phase?: JobPhase
  jobId: string
  onSave: (payload: CreatePhasePayload | (UpdatePhasePayload & { id: string })) => void
  isSaving?: boolean
  onCancel: () => void
}) {
  const isEditing = Boolean(phase)

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<PhaseFormValues>({
    resolver: zodResolver(phaseSchema),
    defaultValues: {
      phase_label: phase?.phase_label ?? '',
      phase_emoji: phase?.phase_emoji ?? '📋',
      phase_color: phase?.phase_color ?? '#3B82F6',
      start_date: phase?.start_date ?? '',
      end_date: phase?.end_date ?? '',
      complement: phase?.complement ?? '',
      skip_weekends: phase?.skip_weekends ?? true,
      status: phase?.status ?? 'pending',
    },
  })

  const watchedStart = watch('start_date')
  const watchedEnd = watch('end_date')
  const watchedSkip = watch('skip_weekends')
  const watchedColor = watch('phase_color')
  const watchedEmoji = watch('phase_emoji')

  const workingDays =
    watchedStart && watchedEnd
      ? countWorkingDays(watchedStart, watchedEnd, watchedSkip)
      : null

  function onSubmit(values: PhaseFormValues) {
    if (isEditing && phase) {
      onSave({
        id: phase.id,
        ...values,
        complement: values.complement || null,
      })
    } else {
      onSave({
        job_id: jobId,
        phase_key: `fase_${Date.now()}`,
        ...values,
        complement: values.complement || null,
      } as CreatePhasePayload)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      {/* Preview da cor */}
      <div
        className="h-1 rounded-full"
        style={{ backgroundColor: watchedColor }}
      />

      {/* Emoji + Nome */}
      <div className="flex gap-3">
        <div className="flex flex-col gap-1.5 w-28 shrink-0">
          <Label htmlFor="phase_emoji" className="text-xs">Emoji</Label>
          <Controller
            control={control}
            name="phase_emoji"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="phase_emoji" className="text-base">
                  <SelectValue placeholder="Emoji" />
                </SelectTrigger>
                <SelectContent>
                  {SUGGESTED_EMOJIS.map((e) => (
                    <SelectItem key={e} value={e}>
                      {e}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {/* Campo customizado para emoji digitado */}
          <Input
            placeholder="Ou digitar"
            value={watchedEmoji}
            onChange={(e) => setValue('phase_emoji', e.target.value)}
            className="text-base h-8 text-center"
            maxLength={4}
          />
        </div>

        <div className="flex flex-col gap-1.5 flex-1">
          <Label htmlFor="phase_label" className="text-xs">Nome da fase</Label>
          <Input
            id="phase_label"
            placeholder="Ex: Pre-Producao"
            {...register('phase_label')}
            className={cn(errors.phase_label && 'border-destructive')}
          />
          {errors.phase_label && (
            <p className="text-xs text-destructive">{errors.phase_label.message}</p>
          )}
        </div>
      </div>

      {/* Complemento */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="complement" className="text-xs">
          Complemento <span className="text-muted-foreground font-normal">(opcional)</span>
        </Label>
        <Input
          id="complement"
          placeholder='Ex: "Aprovacao 10hrs", "Agencia - 10:30"'
          {...register('complement')}
        />
      </div>

      {/* Datas */}
      <div className="grid grid-cols-2 gap-3">
        <Controller
          control={control}
          name="start_date"
          render={({ field }) => (
            <DatePickerField
              label="Data de inicio"
              value={field.value}
              onChange={field.onChange}
              ariaLabel={`Data de inicio de ${watch('phase_label')}`}
            />
          )}
        />
        <Controller
          control={control}
          name="end_date"
          render={({ field }) => (
            <DatePickerField
              label="Data de fim"
              value={field.value}
              onChange={field.onChange}
              ariaLabel={`Data de fim de ${watch('phase_label')}`}
            />
          )}
        />
      </div>

      {/* Dias calculados */}
      {workingDays !== null && (
        <p className="text-xs text-muted-foreground bg-muted/50 rounded px-3 py-2">
          {workingDays} {workingDays === 1 ? 'dia' : 'dias'}
          {watchedSkip ? ' uteis' : ' corridos'} calculados automaticamente
        </p>
      )}

      {/* Pular finais de semana */}
      <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
        <div>
          <p className="text-sm font-medium">Pular finais de semana</p>
          <p className="text-xs text-muted-foreground">
            Sabados e domingos nao contam como dias uteis
          </p>
        </div>
        <Controller
          control={control}
          name="skip_weekends"
          render={({ field }) => (
            <Switch
              checked={field.value}
              onCheckedChange={field.onChange}
              role="switch"
              aria-checked={field.value}
            />
          )}
        />
      </div>

      {/* Cor */}
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs">Cor da fase</Label>
        <div className="flex flex-wrap gap-2">
          {PHASE_COLOR_PALETTE.map((c) => (
            <button
              key={c.value}
              type="button"
              title={c.label}
              onClick={() => setValue('phase_color', c.value)}
              className={cn(
                'h-7 w-7 rounded-full border-2 transition-transform hover:scale-110',
                watchedColor === c.value
                  ? 'border-foreground scale-110'
                  : 'border-transparent',
              )}
              style={{ backgroundColor: c.value }}
            />
          ))}
        </div>
        {/* Input hex customizado */}
        <div className="flex items-center gap-2 mt-1">
          <div
            className="h-6 w-6 rounded-full border border-border shrink-0"
            style={{ backgroundColor: watchedColor }}
          />
          <Input
            placeholder="#3B82F6"
            {...register('phase_color')}
            className="h-8 font-mono text-xs w-28"
          />
          {errors.phase_color && (
            <p className="text-xs text-destructive">{errors.phase_color.message}</p>
          )}
        </div>
      </div>

      {/* Status (so mostra em edicao) */}
      {isEditing && (
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Status</Label>
          <Controller
            control={control}
            name="status"
            render={({ field }) => (
              <Select value={field.value} onValueChange={(v) => field.onChange(v as PhaseStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.entries(PHASE_STATUS_CONFIG) as [PhaseStatus, typeof PHASE_STATUS_CONFIG[PhaseStatus]][]).map(
                    ([key, cfg]) => (
                      <SelectItem key={key} value={key}>
                        {cfg.label}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            )}
          />
        </div>
      )}

      {/* Botoes */}
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSaving}>
          {isSaving && <Loader2 className="size-4 animate-spin" />}
          {isEditing ? 'Salvar alteracoes' : 'Criar fase'}
        </Button>
      </div>
    </form>
  )
}

// --- Componente raiz ---

export function PhaseDialog({
  open,
  onOpenChange,
  jobId,
  phase,
  onSave,
  isSaving,
  isMobile = false,
}: PhaseDialogProps) {
  const title = phase ? `Editar fase: ${phase.phase_emoji} ${phase.phase_label}` : 'Nova fase'

  function handleClose() {
    onOpenChange(false)
  }

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{title}</SheetTitle>
          </SheetHeader>
          <div className="mt-4 pb-6">
            <PhaseForm
              phase={phase}
              jobId={jobId}
              onSave={(payload) => {
                onSave(payload)
              }}
              isSaving={isSaving}
              onCancel={handleClose}
            />
          </div>
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <PhaseForm
          phase={phase}
          jobId={jobId}
          onSave={(payload) => {
            onSave(payload)
          }}
          isSaving={isSaving}
          onCancel={handleClose}
        />
      </DialogContent>
    </Dialog>
  )
}
