'use client'

import { useState, useCallback } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CalendarIcon, Loader2, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
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
import { PHASE_COLOR_PALETTE, PHASE_STATUS_CONFIG, PHASE_TEMPLATES } from '@/types/cronograma'
import { countWorkingDays } from '@/lib/cronograma-utils'
import { suggestEmojis } from '@/lib/groq-emoji'
import { EmojiPicker } from '@/components/cronograma/EmojiPicker'
import type { JobPhase, CreatePhasePayload, UpdatePhasePayload, PhaseStatus } from '@/types/cronograma'

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
  const watchedLabel = watch('phase_label')

  const workingDays =
    watchedStart && watchedEnd
      ? countWorkingDays(watchedStart, watchedEnd, watchedSkip)
      : null

  // --- Sugestao IA ---

  const [isSuggestingEmojis, setIsSuggestingEmojis] = useState(false)
  const [suggestedEmojis, setSuggestedEmojis] = useState<string[]>([])

  const handleSuggestEmojis = useCallback(async () => {
    const label = watchedLabel.trim()
    if (!label) {
      toast.error('Digite o nome da fase primeiro')
      return
    }

    setIsSuggestingEmojis(true)
    setSuggestedEmojis([])

    try {
      const emojis = await suggestEmojis(label)
      if (emojis.length === 0) {
        toast.error('Nao foi possivel sugerir emojis. Tente novamente.')
        return
      }
      setSuggestedEmojis(emojis)
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Erro ao sugerir emojis'
      toast.error(message)
    } finally {
      setIsSuggestingEmojis(false)
    }
  }, [watchedLabel])

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

  // --- Templates rapidos ---

  const [showAllTemplates, setShowAllTemplates] = useState(false)
  const visibleTemplates = showAllTemplates ? PHASE_TEMPLATES : PHASE_TEMPLATES.slice(0, 8)

  function applyTemplate(tpl: typeof PHASE_TEMPLATES[0]) {
    setValue('phase_label', tpl.phase_label)
    setValue('phase_emoji', tpl.phase_emoji)
    setValue('phase_color', tpl.phase_color)
    setSuggestedEmojis([])
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      {/* Templates rapidos — so no modo criacao */}
      {!isEditing && (
        <div className="flex flex-col gap-2">
          <Label className="text-xs text-muted-foreground">Fases comuns (clique para preencher)</Label>
          <div className="flex flex-wrap gap-1.5">
            {visibleTemplates.map((tpl) => (
              <button
                key={tpl.phase_key}
                type="button"
                onClick={() => applyTemplate(tpl)}
                className={cn(
                  'inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border transition-all',
                  'hover:scale-105 hover:shadow-sm',
                  watchedLabel === tpl.phase_label
                    ? 'ring-2 ring-ring ring-offset-1'
                    : 'border-input bg-background hover:bg-accent',
                )}
                style={{
                  backgroundColor: watchedLabel === tpl.phase_label ? `${tpl.phase_color}20` : undefined,
                  borderColor: watchedLabel === tpl.phase_label ? tpl.phase_color : undefined,
                }}
              >
                <span>{tpl.phase_emoji}</span>
                <span>{tpl.phase_label}</span>
              </button>
            ))}
            {PHASE_TEMPLATES.length > 8 && (
              <button
                type="button"
                onClick={() => setShowAllTemplates(!showAllTemplates)}
                className="inline-flex items-center px-2 py-1 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                {showAllTemplates ? 'Menos' : `+${PHASE_TEMPLATES.length - 8} mais`}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Preview da cor */}
      <div
        className="h-1 rounded-full"
        style={{ backgroundColor: watchedColor }}
      />

      {/* Emoji + Nome */}
      <div className="flex gap-3 items-start">
        {/* Coluna do emoji */}
        <div className="flex flex-col gap-1.5 shrink-0">
          <Label className="text-xs">Emoji</Label>

          {/* Picker + botao sugerir na mesma linha */}
          <div className="flex items-center gap-1.5">
            <Controller
              control={control}
              name="phase_emoji"
              render={({ field }) => (
                <EmojiPicker
                  value={field.value}
                  onChange={(emoji) => {
                    field.onChange(emoji)
                    setSuggestedEmojis([])
                  }}
                />
              )}
            />

            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-10 w-10 shrink-0"
              onClick={handleSuggestEmojis}
              disabled={isSuggestingEmojis}
              title="Sugerir emoji com IA"
              aria-label="Sugerir emoji com IA"
            >
              {isSuggestingEmojis ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Sparkles className="size-4" />
              )}
            </Button>
          </div>

          {/* Sugestoes da IA */}
          {suggestedEmojis.length > 0 && (
            <div className="flex flex-col gap-1">
              <p className="text-[10px] text-muted-foreground">Sugestoes IA:</p>
              <div className="flex gap-1">
                {suggestedEmojis.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    title={`Usar ${emoji}`}
                    onClick={() => {
                      setValue('phase_emoji', emoji)
                      setSuggestedEmojis([])
                    }}
                    className={cn(
                      'h-8 w-8 text-lg flex items-center justify-center rounded-md border border-input bg-background',
                      'hover:bg-accent transition-colors',
                      'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
                    )}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Nome da fase */}
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
