'use client'

import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Loader2, Plus, Trash2, Wand2 } from 'lucide-react'
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
import { cn } from '@/lib/utils'
import type {
  ShootingDayOrder,
  CrewCall,
  FilmingBlock,
  CastScheduleEntry,
  ODTemplate,
  AutoFillResult,
} from '@/types/shooting-day-order'

// --- Types ---

interface ODFormState {
  title: string
  shooting_date_id: string | null
  day_number: number | null
  general_location: string
  weather_summary: string
  // Timeline
  first_call: string
  production_call: string
  filming_start: string
  breakfast_time: string
  lunch_time: string
  camera_wrap: string
  deproduction: string
  // Structured
  crew_calls: CrewCall[]
  filming_blocks: FilmingBlock[]
  cast_schedule: CastScheduleEntry[]
  important_info: string
  pdf_template: ODTemplate
}

// --- Default values ---

function defaultForm(od?: ShootingDayOrder): ODFormState {
  return {
    title: od?.title ?? '',
    shooting_date_id: od?.shooting_date_id ?? null,
    day_number: od?.day_number ?? null,
    general_location: od?.general_location ?? '',
    weather_summary: od?.weather_summary ?? '',
    first_call: od?.first_call ?? '',
    production_call: od?.production_call ?? '',
    filming_start: od?.filming_start ?? '',
    breakfast_time: od?.breakfast_time ?? '',
    lunch_time: od?.lunch_time ?? '',
    camera_wrap: od?.camera_wrap ?? '',
    deproduction: od?.deproduction ?? '',
    crew_calls: od?.crew_calls ?? [],
    filming_blocks: od?.filming_blocks ?? [],
    cast_schedule: od?.cast_schedule ?? [],
    important_info: od?.important_info ?? '',
    pdf_template: od?.pdf_template ?? 'classico',
  }
}

function defaultBlock(): FilmingBlock {
  return {
    start_time: '',
    end_time: '',
    scene_ids: [],
    scenes_label: '',
    location: '',
    cast_names: '',
    notes: '',
    adjustment_minutes: 0,
  }
}

function defaultCrewCall(): CrewCall {
  return { department: '', call_time: '' }
}

function defaultCastEntry(): CastScheduleEntry {
  return {
    cast_id: null,
    name: '',
    character: '',
    call_time: '',
    makeup_time: '',
    on_set_time: '',
    wrap_time: '',
  }
}

// --- Section header ---

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
      {children}
    </h3>
  )
}

// --- Props ---

interface ODDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  jobId: string
  od?: ShootingDayOrder
}

// --- Main component ---

export function ODDialog({ open, onOpenChange, jobId, od }: ODDialogProps) {
  const queryClient = useQueryClient()
  const isEditing = !!od

  const [form, setForm] = useState<ODFormState>(() => defaultForm(od))
  const [autoFilling, setAutoFilling] = useState(false)

  // Reset form when dialog opens or od changes
  useEffect(() => {
    if (open) {
      setForm(defaultForm(od))
    }
  }, [open, od])

  // --- Mutations ---

  const saveMutation = useMutation({
    mutationFn: async (values: ODFormState) => {
      const payload: Record<string, unknown> = {
        title: values.title.trim() || 'Ordem do Dia',
        shooting_date_id: values.shooting_date_id || null,
        day_number: values.day_number,
        general_location: values.general_location.trim() || null,
        weather_summary: values.weather_summary.trim() || null,
        first_call: values.first_call || null,
        production_call: values.production_call || null,
        filming_start: values.filming_start || null,
        breakfast_time: values.breakfast_time || null,
        lunch_time: values.lunch_time || null,
        camera_wrap: values.camera_wrap || null,
        deproduction: values.deproduction || null,
        crew_calls: values.crew_calls,
        filming_blocks: values.filming_blocks,
        cast_schedule: values.cast_schedule,
        important_info: values.important_info,
        pdf_template: values.pdf_template,
      }

      if (isEditing) {
        return apiMutate('shooting-day-order', 'PATCH', payload, od.id)
      } else {
        return apiMutate('shooting-day-order', 'POST', {
          job_id: jobId,
          ...payload,
        })
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shooting-day-orders', jobId] })
      toast.success(isEditing ? 'Ordem do dia atualizada' : 'Ordem do dia criada')
      onOpenChange(false)
    },
    onError: (err) => {
      toast.error(safeErrorMessage(err))
    },
  })

  // --- Auto-fill ---

  async function handleAutoFill() {
    if (!od) {
      toast.error('Salve a OD primeiro para usar o auto-preenchimento')
      return
    }
    setAutoFilling(true)
    try {
      const result = await apiMutate<AutoFillResult>(
        'shooting-day-order',
        'POST',
        {},
        `${od.id}/auto-fill`,
      )
      const data = result.data
      if (!data) return

      setForm((prev) => ({
        ...prev,
        general_location:
          data.shooting_date.location ?? prev.general_location,
        weather_summary: data.weather.summary ?? prev.weather_summary,
        important_info: data.important_info || prev.important_info,
        crew_calls:
          data.suggested_crew_calls.length > 0
            ? data.suggested_crew_calls
            : prev.crew_calls,
        cast_schedule:
          data.cast.length > 0
            ? data.cast.map((c) => ({
                cast_id: c.cast_id,
                name: c.name,
                character: c.character ?? '',
                call_time: '',
                makeup_time: '',
                on_set_time: '',
                wrap_time: '',
              }))
            : prev.cast_schedule,
        filming_blocks:
          data.scenes.length > 0
            ? [
                {
                  start_time: '',
                  end_time: '',
                  scene_ids: data.scenes.map((s) => s.id),
                  scenes_label: data.scenes
                    .map((s) => `Cena ${s.scene_number}`)
                    .join(', '),
                  location: data.scenes[0]?.location ?? '',
                  cast_names: '',
                  notes: '',
                  adjustment_minutes: 0,
                },
              ]
            : prev.filming_blocks,
      }))
      toast.success('Dados preenchidos com sucesso')
    } catch (err) {
      toast.error(safeErrorMessage(err))
    } finally {
      setAutoFilling(false)
    }
  }

  // --- Form helpers ---

  function setField<K extends keyof ODFormState>(key: K, value: ODFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  // Crew calls
  function addCrewCall() {
    setForm((prev) => ({ ...prev, crew_calls: [...prev.crew_calls, defaultCrewCall()] }))
  }

  function updateCrewCall(index: number, field: keyof CrewCall, value: string) {
    setForm((prev) => {
      const updated = prev.crew_calls.map((c, i) =>
        i === index ? { ...c, [field]: value } : c,
      )
      return { ...prev, crew_calls: updated }
    })
  }

  function removeCrewCall(index: number) {
    setForm((prev) => ({
      ...prev,
      crew_calls: prev.crew_calls.filter((_, i) => i !== index),
    }))
  }

  // Filming blocks
  function addBlock() {
    setForm((prev) => ({ ...prev, filming_blocks: [...prev.filming_blocks, defaultBlock()] }))
  }

  function updateBlock(index: number, field: keyof FilmingBlock, value: unknown) {
    setForm((prev) => {
      const updated = prev.filming_blocks.map((b, i) =>
        i === index ? { ...b, [field]: value } : b,
      )
      return { ...prev, filming_blocks: updated }
    })
  }

  function removeBlock(index: number) {
    setForm((prev) => ({
      ...prev,
      filming_blocks: prev.filming_blocks.filter((_, i) => i !== index),
    }))
  }

  // Cast schedule
  function addCastEntry() {
    setForm((prev) => ({
      ...prev,
      cast_schedule: [...prev.cast_schedule, defaultCastEntry()],
    }))
  }

  function updateCastEntry(index: number, field: keyof CastScheduleEntry, value: string | null) {
    setForm((prev) => {
      const updated = prev.cast_schedule.map((c, i) =>
        i === index ? { ...c, [field]: value } : c,
      )
      return { ...prev, cast_schedule: updated }
    })
  }

  function removeCastEntry(index: number) {
    setForm((prev) => ({
      ...prev,
      cast_schedule: prev.cast_schedule.filter((_, i) => i !== index),
    }))
  }

  const isSaving = saveMutation.isPending

  // --- Render ---

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Ordem do Dia' : 'Nova Ordem do Dia'}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-6 mt-2">

          {/* ========== Secao 1: Info Geral ========== */}
          <div className="flex flex-col gap-3">
            <SectionHeader>Info Geral</SectionHeader>

            {/* Titulo */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="od-title">
                Titulo <span className="text-destructive">*</span>
              </Label>
              <Input
                id="od-title"
                placeholder="Ex: OD Dia 1 — Estudio"
                value={form.title}
                onChange={(e) => setField('title', e.target.value)}
                disabled={isSaving}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Numero do dia */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="od-day-number">Numero do Dia</Label>
                <Input
                  id="od-day-number"
                  type="number"
                  min={1}
                  placeholder="1"
                  value={form.day_number ?? ''}
                  onChange={(e) =>
                    setField(
                      'day_number',
                      e.target.value ? parseInt(e.target.value, 10) : null,
                    )
                  }
                  disabled={isSaving}
                />
              </div>

              {/* Localizacao geral */}
              <div className="col-span-1 sm:col-span-2 flex flex-col gap-1.5">
                <Label htmlFor="od-location">Localizacao Geral</Label>
                <Input
                  id="od-location"
                  placeholder="Ex: Estudio Central, Sao Paulo"
                  value={form.general_location}
                  onChange={(e) => setField('general_location', e.target.value)}
                  disabled={isSaving}
                />
              </div>
            </div>

            {/* Clima */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="od-weather">Previsao do Tempo</Label>
              <Input
                id="od-weather"
                placeholder="Ex: Ensolarado, 28°C, baixa umidade"
                value={form.weather_summary}
                onChange={(e) => setField('weather_summary', e.target.value)}
                disabled={isSaving}
              />
            </div>

            {/* Auto-fill — so em modo edicao */}
            {isEditing && (
              <div className="flex items-center gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAutoFill}
                  disabled={autoFilling || isSaving}
                >
                  {autoFilling ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Wand2 className="size-4" />
                  )}
                  {autoFilling ? 'Preenchendo...' : 'Auto-preencher'}
                </Button>
                <p className="text-xs text-muted-foreground">
                  Preenche automaticamente com cenas, elenco e clima do dia
                </p>
              </div>
            )}
          </div>

          {/* ========== Secao 2: Timeline ========== */}
          <div className="flex flex-col gap-3 pt-4 border-t border-border">
            <SectionHeader>Timeline</SectionHeader>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="od-first-call">1a Chamada</Label>
                <Input
                  id="od-first-call"
                  type="time"
                  value={form.first_call}
                  onChange={(e) => setField('first_call', e.target.value)}
                  disabled={isSaving}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="od-prod-call">Chamada Producao</Label>
                <Input
                  id="od-prod-call"
                  type="time"
                  value={form.production_call}
                  onChange={(e) => setField('production_call', e.target.value)}
                  disabled={isSaving}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="od-film-start">Inicio Filmagem</Label>
                <Input
                  id="od-film-start"
                  type="time"
                  value={form.filming_start}
                  onChange={(e) => setField('filming_start', e.target.value)}
                  disabled={isSaving}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="od-breakfast">Cafe da Manha</Label>
                <Input
                  id="od-breakfast"
                  type="time"
                  value={form.breakfast_time}
                  onChange={(e) => setField('breakfast_time', e.target.value)}
                  disabled={isSaving}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="od-lunch">Almoco</Label>
                <Input
                  id="od-lunch"
                  type="time"
                  value={form.lunch_time}
                  onChange={(e) => setField('lunch_time', e.target.value)}
                  disabled={isSaving}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="od-cam-wrap">Camera Wrap</Label>
                <Input
                  id="od-cam-wrap"
                  type="time"
                  value={form.camera_wrap}
                  onChange={(e) => setField('camera_wrap', e.target.value)}
                  disabled={isSaving}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="od-deprod">Desproducao</Label>
                <Input
                  id="od-deprod"
                  type="time"
                  value={form.deproduction}
                  onChange={(e) => setField('deproduction', e.target.value)}
                  disabled={isSaving}
                />
              </div>
            </div>
          </div>

          {/* ========== Secao 3: Chamada Equipe ========== */}
          <div className="flex flex-col gap-3 pt-4 border-t border-border">
            <SectionHeader>Chamada Equipe</SectionHeader>

            {form.crew_calls.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Nenhum departamento adicionado. Clique em "Adicionar departamento" para comecar.
              </p>
            )}

            <div className="flex flex-col gap-2">
              {form.crew_calls.map((call, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    placeholder="Departamento (Ex: Camera, Arte, Maquiagem)"
                    value={call.department}
                    onChange={(e) => updateCrewCall(index, 'department', e.target.value)}
                    disabled={isSaving}
                    className="flex-1"
                  />
                  <Input
                    type="time"
                    value={call.call_time}
                    onChange={(e) => updateCrewCall(index, 'call_time', e.target.value)}
                    disabled={isSaving}
                    className="w-32 shrink-0"
                  />
                  <button
                    type="button"
                    aria-label="Remover"
                    onClick={() => removeCrewCall(index)}
                    disabled={isSaving}
                    className="size-8 rounded flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addCrewCall}
              disabled={isSaving}
              className="self-start"
            >
              <Plus className="size-4" />
              Adicionar departamento
            </Button>
          </div>

          {/* ========== Secao 4: Blocos de Filmagem ========== */}
          <div className="flex flex-col gap-3 pt-4 border-t border-border">
            <SectionHeader>Blocos de Filmagem</SectionHeader>

            {form.filming_blocks.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Nenhum bloco de filmagem. Clique em "Adicionar bloco" para organizar o dia por periodo.
              </p>
            )}

            <div className="flex flex-col gap-3">
              {form.filming_blocks.map((block, index) => (
                <div
                  key={index}
                  className="rounded-lg border border-border p-4 flex flex-col gap-3"
                >
                  {/* Header do bloco */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Bloco {index + 1}
                    </span>
                    <button
                      type="button"
                      aria-label="Remover bloco"
                      onClick={() => removeBlock(index)}
                      disabled={isSaving}
                      className="size-7 rounded flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>

                  {/* Horarios */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-xs">Inicio</Label>
                      <Input
                        type="time"
                        value={block.start_time}
                        onChange={(e) => updateBlock(index, 'start_time', e.target.value)}
                        disabled={isSaving}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-xs">Fim</Label>
                      <Input
                        type="time"
                        value={block.end_time}
                        onChange={(e) => updateBlock(index, 'end_time', e.target.value)}
                        disabled={isSaving}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-xs">Ajuste (min)</Label>
                      <Input
                        type="number"
                        min={0}
                        placeholder="0"
                        value={block.adjustment_minutes || ''}
                        onChange={(e) =>
                          updateBlock(
                            index,
                            'adjustment_minutes',
                            e.target.value ? parseInt(e.target.value, 10) : 0,
                          )
                        }
                        disabled={isSaving}
                      />
                    </div>
                  </div>

                  {/* Cenas + Localizacao */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-xs">Cenas</Label>
                      <Input
                        placeholder="Ex: Cenas 1, 3 e 5"
                        value={block.scenes_label}
                        onChange={(e) => updateBlock(index, 'scenes_label', e.target.value)}
                        disabled={isSaving}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-xs">Localizacao</Label>
                      <Input
                        placeholder="Ex: Studio A — Sala de estar"
                        value={block.location}
                        onChange={(e) => updateBlock(index, 'location', e.target.value)}
                        disabled={isSaving}
                      />
                    </div>
                  </div>

                  {/* Elenco do bloco */}
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs">Elenco</Label>
                    <Input
                      placeholder="Ex: Joao, Maria, figurantes"
                      value={block.cast_names}
                      onChange={(e) => updateBlock(index, 'cast_names', e.target.value)}
                      disabled={isSaving}
                    />
                  </div>

                  {/* Notas do bloco */}
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs">Notas</Label>
                    <Textarea
                      placeholder="Observacoes sobre este bloco..."
                      rows={2}
                      value={block.notes}
                      onChange={(e) => updateBlock(index, 'notes', e.target.value)}
                      disabled={isSaving}
                    />
                  </div>
                </div>
              ))}
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addBlock}
              disabled={isSaving}
              className="self-start"
            >
              <Plus className="size-4" />
              Adicionar bloco
            </Button>
          </div>

          {/* ========== Secao 5: Elenco do Dia ========== */}
          <div className="flex flex-col gap-3 pt-4 border-t border-border">
            <SectionHeader>Elenco do Dia</SectionHeader>

            {form.cast_schedule.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Nenhum ator adicionado. Clique em "Adicionar ator" ou use o auto-preenchimento.
              </p>
            )}

            {form.cast_schedule.length > 0 && (
              <div className="rounded-md border border-border overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">Nome</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">Personagem</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground w-28">Call</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground w-28">Maquiagem</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground w-28">Set</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground w-28">Wrap</th>
                      <th className="px-2 py-2 w-8" />
                    </tr>
                  </thead>
                  <tbody>
                    {form.cast_schedule.map((entry, index) => (
                      <tr
                        key={index}
                        className={cn(
                          'border-b border-border last:border-0',
                          index % 2 === 0 ? 'bg-background' : 'bg-muted/20',
                        )}
                      >
                        <td className="px-2 py-1.5">
                          <Input
                            placeholder="Nome"
                            value={entry.name}
                            onChange={(e) => updateCastEntry(index, 'name', e.target.value)}
                            disabled={isSaving}
                            className="h-7 text-xs"
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <Input
                            placeholder="Personagem"
                            value={entry.character}
                            onChange={(e) => updateCastEntry(index, 'character', e.target.value)}
                            disabled={isSaving}
                            className="h-7 text-xs"
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <Input
                            type="time"
                            value={entry.call_time}
                            onChange={(e) => updateCastEntry(index, 'call_time', e.target.value)}
                            disabled={isSaving}
                            className="h-7 text-xs"
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <Input
                            type="time"
                            value={entry.makeup_time}
                            onChange={(e) => updateCastEntry(index, 'makeup_time', e.target.value)}
                            disabled={isSaving}
                            className="h-7 text-xs"
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <Input
                            type="time"
                            value={entry.on_set_time}
                            onChange={(e) => updateCastEntry(index, 'on_set_time', e.target.value)}
                            disabled={isSaving}
                            className="h-7 text-xs"
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <Input
                            type="time"
                            value={entry.wrap_time}
                            onChange={(e) => updateCastEntry(index, 'wrap_time', e.target.value)}
                            disabled={isSaving}
                            className="h-7 text-xs"
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <button
                            type="button"
                            aria-label="Remover ator"
                            onClick={() => removeCastEntry(index)}
                            disabled={isSaving}
                            className="size-7 rounded flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                          >
                            <Trash2 className="size-3" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addCastEntry}
              disabled={isSaving}
              className="self-start"
            >
              <Plus className="size-4" />
              Adicionar ator
            </Button>
          </div>

          {/* ========== Secao 6: Informacoes Importantes ========== */}
          <div className="flex flex-col gap-3 pt-4 border-t border-border">
            <SectionHeader>Informacoes Importantes</SectionHeader>

            <Textarea
              placeholder="Regras do set, avisos de seguranca, notas da producao..."
              rows={4}
              value={form.important_info}
              onChange={(e) => setField('important_info', e.target.value)}
              disabled={isSaving}
            />
          </div>

          {/* ========== Secao 7: Template PDF ========== */}
          <div className="flex flex-col gap-3 pt-4 border-t border-border">
            <SectionHeader>Template PDF</SectionHeader>

            <div className="flex items-center gap-3">
              <Select
                value={form.pdf_template}
                onValueChange={(v) => setField('pdf_template', v as ODTemplate)}
                disabled={isSaving}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="classico">Classico</SelectItem>
                  <SelectItem value="moderno">Moderno</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Define a aparencia do PDF gerado para compartilhamento
              </p>
            </div>
          </div>

        </div>

        {/* Footer */}
        <DialogFooter className="pt-4 mt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={() => saveMutation.mutate(form)}
            disabled={isSaving}
          >
            {isSaving && <Loader2 className="size-4 animate-spin" />}
            {isEditing ? 'Salvar' : 'Criar OD'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
