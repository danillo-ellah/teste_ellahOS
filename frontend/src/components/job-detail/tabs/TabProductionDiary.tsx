'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Plus,
  Loader2,
  Pencil,
  Trash2,
  Camera,
  Sun,
  Cloud,
  CloudRain,
  Moon,
  ChevronDown,
  ChevronUp,
  BookOpen,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { apiGet, apiMutate, safeErrorMessage } from '@/lib/api'
import type { JobDetail } from '@/types/jobs'

// --- Tipos ---

type WeatherCondition = 'sol' | 'nublado' | 'chuva' | 'noturna'
type PhotoType = 'referencia' | 'bts' | 'continuidade' | 'problema'

interface DiaryPhoto {
  id: string
  url: string
  thumbnail_url: string | null
  caption: string | null
  photo_type: PhotoType
  taken_at: string | null
  created_at: string
}

interface DiaryEntry {
  id: string
  job_id: string
  shooting_date: string
  day_number: number
  weather_condition: WeatherCondition
  call_time: string | null
  wrap_time: string | null
  planned_scenes: string | null
  filmed_scenes: string | null
  total_takes: number | null
  observations: string | null
  issues: string | null
  highlights: string | null
  created_at: string
  production_diary_photos: DiaryPhoto[]
}

interface DiaryEntryFormData {
  shooting_date: string
  day_number: string
  weather_condition: WeatherCondition
  call_time: string
  wrap_time: string
  planned_scenes: string
  filmed_scenes: string
  total_takes: string
  observations: string
  issues: string
  highlights: string
}

// --- Constantes de configuracao ---

const WEATHER_CONFIG: Record<WeatherCondition, { label: string; icon: typeof Sun; className: string }> = {
  sol: { label: 'Ensolarado', icon: Sun, className: 'text-amber-500' },
  nublado: { label: 'Nublado', icon: Cloud, className: 'text-zinc-400' },
  chuva: { label: 'Chuvoso', icon: CloudRain, className: 'text-blue-400' },
  noturna: { label: 'Noturna', icon: Moon, className: 'text-indigo-400' },
}

const PHOTO_TYPE_LABELS: Record<PhotoType, string> = {
  referencia: 'Referencia',
  bts: 'BTS',
  continuidade: 'Continuidade',
  problema: 'Problema',
}

const PHOTO_TYPE_BADGE_CLASSES: Record<PhotoType, string> = {
  referencia: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  bts: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  continuidade: 'bg-green-500/10 text-green-600 dark:text-green-400',
  problema: 'bg-red-500/10 text-red-600 dark:text-red-400',
}

// --- Helpers ---

function defaultForm(): DiaryEntryFormData {
  return {
    shooting_date: '',
    day_number: '',
    weather_condition: 'sol',
    call_time: '',
    wrap_time: '',
    planned_scenes: '',
    filmed_scenes: '',
    total_takes: '',
    observations: '',
    issues: '',
    highlights: '',
  }
}

function formFromEntry(entry: DiaryEntry): DiaryEntryFormData {
  return {
    shooting_date: entry.shooting_date,
    day_number: String(entry.day_number),
    weather_condition: entry.weather_condition,
    call_time: entry.call_time ?? '',
    wrap_time: entry.wrap_time ?? '',
    planned_scenes: entry.planned_scenes ?? '',
    filmed_scenes: entry.filmed_scenes ?? '',
    total_takes: entry.total_takes != null ? String(entry.total_takes) : '',
    observations: entry.observations ?? '',
    issues: entry.issues ?? '',
    highlights: entry.highlights ?? '',
  }
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-')
  return `${day}/${month}/${year}`
}

// --- Sub-componentes ---

interface PhotoGridProps {
  photos: DiaryPhoto[]
  onAdd: () => void
}

function PhotoGrid({ photos, onAdd }: PhotoGridProps) {
  const [expanded, setExpanded] = useState(false)

  if (photos.length === 0) {
    return (
      <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={onAdd}>
        <Camera className="size-3.5 mr-1.5" />
        Adicionar foto
      </Button>
    )
  }

  const visible = expanded ? photos : photos.slice(0, 4)

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
        {visible.map((photo) => (
          <div key={photo.id} className="group relative aspect-square">
            <img
              src={photo.thumbnail_url ?? photo.url}
              alt={photo.caption ?? 'Foto do diario'}
              className="w-full h-full object-cover rounded-md border border-border"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-black/60 rounded-md opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 p-1">
              {photo.caption && (
                <span className="text-white text-[9px] text-center leading-tight line-clamp-2">
                  {photo.caption}
                </span>
              )}
              <span
                className={`text-[8px] px-1 py-0.5 rounded font-medium ${PHOTO_TYPE_BADGE_CLASSES[photo.photo_type]}`}
              >
                {PHOTO_TYPE_LABELS[photo.photo_type]}
              </span>
            </div>
          </div>
        ))}

        {/* Botao de adicionar */}
        <button
          onClick={onAdd}
          className="aspect-square rounded-md border border-dashed border-border flex items-center justify-center hover:border-primary hover:bg-muted/50 transition-colors"
          title="Adicionar foto"
        >
          <Plus className="size-4 text-muted-foreground" />
        </button>
      </div>

      {photos.length > 4 && (
        <Button
          variant="ghost"
          size="sm"
          className="text-xs text-muted-foreground h-6 px-2"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? (
            <><ChevronUp className="size-3 mr-1" />Recolher</>
          ) : (
            <><ChevronDown className="size-3 mr-1" />Ver todas ({photos.length} fotos)</>
          )}
        </Button>
      )}
    </div>
  )
}

// --- Componente principal ---

interface TabProductionDiaryProps {
  job: JobDetail
}

export function TabProductionDiary({ job }: TabProductionDiaryProps) {
  const queryClient = useQueryClient()

  // Estado dos dialogs
  const [showForm, setShowForm] = useState(false)
  const [editingEntry, setEditingEntry] = useState<DiaryEntry | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [photoEntryId, setPhotoEntryId] = useState<string | null>(null)

  // Estado do formulario de entrada
  const [form, setForm] = useState<DiaryEntryFormData>(defaultForm)

  // Estado do formulario de foto
  const [photoForm, setPhotoForm] = useState({
    url: '',
    thumbnail_url: '',
    caption: '',
    photo_type: 'bts' as PhotoType,
  })

  // --- Queries ---

  const { data: entries, isLoading } = useQuery({
    queryKey: ['production-diary', job.id],
    queryFn: async () => {
      const res = await apiGet<DiaryEntry[]>('production-diary', { job_id: job.id })
      return res.data
    },
  })

  // --- Mutations ---

  const createMutation = useMutation({
    mutationFn: async (data: DiaryEntryFormData) => {
      const payload: Record<string, unknown> = {
        job_id: job.id,
        shooting_date: data.shooting_date,
        weather_condition: data.weather_condition,
        call_time: data.call_time || null,
        wrap_time: data.wrap_time || null,
        planned_scenes: data.planned_scenes || null,
        filmed_scenes: data.filmed_scenes || null,
        total_takes: data.total_takes ? Number(data.total_takes) : null,
        observations: data.observations || null,
        issues: data.issues || null,
        highlights: data.highlights || null,
      }
      // day_number manual (opcional — se vazio, o backend auto-calcula)
      if (data.day_number) {
        payload.day_number = Number(data.day_number)
      }
      const res = await apiMutate<DiaryEntry>('production-diary', 'POST', payload)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production-diary', job.id] })
      toast.success('Dia de producao registrado')
      setShowForm(false)
      setForm(defaultForm())
    },
    onError: (err) => toast.error(safeErrorMessage(err)),
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: DiaryEntryFormData }) => {
      const payload: Record<string, unknown> = {
        shooting_date: data.shooting_date,
        weather_condition: data.weather_condition,
        call_time: data.call_time || null,
        wrap_time: data.wrap_time || null,
        planned_scenes: data.planned_scenes || null,
        filmed_scenes: data.filmed_scenes || null,
        total_takes: data.total_takes ? Number(data.total_takes) : null,
        observations: data.observations || null,
        issues: data.issues || null,
        highlights: data.highlights || null,
      }
      if (data.day_number) {
        payload.day_number = Number(data.day_number)
      }
      const res = await apiMutate<DiaryEntry>('production-diary', 'PATCH', payload, id)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production-diary', job.id] })
      toast.success('Entrada atualizada')
      setEditingEntry(null)
      setForm(defaultForm())
    },
    onError: (err) => toast.error(safeErrorMessage(err)),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiMutate('production-diary', 'DELETE', undefined, id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production-diary', job.id] })
      toast.success('Entrada removida')
      setDeleteId(null)
    },
    onError: (err) => toast.error(safeErrorMessage(err)),
  })

  const addPhotoMutation = useMutation({
    mutationFn: async ({ entryId, data }: { entryId: string; data: typeof photoForm }) => {
      const res = await apiMutate<DiaryPhoto>(
        `production-diary/${entryId}/photos`,
        'POST',
        {
          url: data.url,
          thumbnail_url: data.thumbnail_url || null,
          caption: data.caption || null,
          photo_type: data.photo_type,
        },
      )
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production-diary', job.id] })
      toast.success('Foto adicionada')
      setPhotoEntryId(null)
      setPhotoForm({ url: '', thumbnail_url: '', caption: '', photo_type: 'bts' })
    },
    onError: (err) => toast.error(safeErrorMessage(err)),
  })

  // --- Handlers ---

  function openCreate() {
    setForm(defaultForm())
    setEditingEntry(null)
    setShowForm(true)
  }

  function openEdit(entry: DiaryEntry) {
    setForm(formFromEntry(entry))
    setEditingEntry(entry)
    setShowForm(true)
  }

  function handleSubmit() {
    if (editingEntry) {
      updateMutation.mutate({ id: editingEntry.id, data: form })
    } else {
      createMutation.mutate(form)
    }
  }

  function updateField<K extends keyof DiaryEntryFormData>(key: K, value: DiaryEntryFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const isPending = createMutation.isPending || updateMutation.isPending
  const isFormValid = !!form.shooting_date

  // --- Render ---

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Diario de Producao</h3>
          <p className="text-sm text-muted-foreground">
            Registro diario das filmagens — cenas, clima, horarios e ocorrencias
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="size-4 mr-2" />
          Novo Dia
        </Button>
      </div>

      {/* Lista de entradas */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : !entries?.length ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center gap-3">
            <BookOpen className="size-10 text-muted-foreground/40" />
            <div>
              <p className="font-medium text-muted-foreground">Nenhum dia registrado</p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                Registre o primeiro dia de filmagem para comecar o diario
              </p>
            </div>
            <Button variant="outline" onClick={openCreate}>
              <Plus className="size-4 mr-2" />
              Registrar primeiro dia
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {entries.map((entry) => {
            const weather = WEATHER_CONFIG[entry.weather_condition]
            const WeatherIcon = weather.icon

            return (
              <Card key={entry.id} className="overflow-hidden">
                <CardHeader className="pb-3 pt-4 px-5">
                  <div className="flex items-start justify-between gap-3">
                    {/* Titulo do dia */}
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="font-mono text-sm px-2.5 py-1">
                          Dia {entry.day_number}
                        </Badge>
                        <span className="text-base font-semibold text-foreground">
                          {formatDate(entry.shooting_date)}
                        </span>
                      </div>
                      <div className={`flex items-center gap-1 text-sm ${weather.className}`}>
                        <WeatherIcon className="size-4" />
                        <span>{weather.label}</span>
                      </div>
                      {entry.call_time && entry.wrap_time && (
                        <span className="text-xs text-muted-foreground">
                          {entry.call_time} - {entry.wrap_time}
                        </span>
                      )}
                      {entry.total_takes != null && (
                        <Badge variant="outline" className="text-xs">
                          {entry.total_takes} takes
                        </Badge>
                      )}
                    </div>

                    {/* Acoes */}
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(entry)}
                        className="h-8 w-8 p-0"
                        title="Editar"
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteId(entry.id)}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        title="Remover"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="px-5 pb-4 space-y-3">
                  {/* Grid de cenas */}
                  {(entry.planned_scenes || entry.filmed_scenes) && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {entry.planned_scenes && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">
                            Cenas planejadas
                          </p>
                          <p className="text-sm">{entry.planned_scenes}</p>
                        </div>
                      )}
                      {entry.filmed_scenes && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">
                            Cenas filmadas
                          </p>
                          <p className="text-sm">{entry.filmed_scenes}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Campos de texto livre */}
                  {entry.issues && (
                    <div className="rounded-md bg-red-500/5 border border-red-500/20 px-3 py-2">
                      <p className="text-xs font-medium text-red-600 dark:text-red-400 mb-1">
                        Problemas / Ocorrencias
                      </p>
                      <p className="text-sm text-foreground">{entry.issues}</p>
                    </div>
                  )}

                  {entry.highlights && (
                    <div className="rounded-md bg-green-500/5 border border-green-500/20 px-3 py-2">
                      <p className="text-xs font-medium text-green-600 dark:text-green-400 mb-1">
                        Destaques
                      </p>
                      <p className="text-sm text-foreground">{entry.highlights}</p>
                    </div>
                  )}

                  {entry.observations && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Observacoes</p>
                      <p className="text-sm text-foreground">{entry.observations}</p>
                    </div>
                  )}

                  {/* Fotos */}
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">
                      Fotos
                      {entry.production_diary_photos.length > 0 && (
                        <span className="ml-1 text-foreground">
                          ({entry.production_diary_photos.length})
                        </span>
                      )}
                    </p>
                    <PhotoGrid
                      photos={entry.production_diary_photos}
                      onAdd={() => setPhotoEntryId(entry.id)}
                    />
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Dialog de criacao / edicao */}
      <Dialog
        open={showForm}
        onOpenChange={(open) => {
          if (!open) {
            setShowForm(false)
            setEditingEntry(null)
            setForm(defaultForm())
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingEntry
                ? `Editar Dia ${editingEntry.day_number} — ${formatDate(editingEntry.shooting_date)}`
                : 'Registrar Novo Dia de Filmagem'}
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4 py-2">
            {/* Data de filmagem */}
            <div className="col-span-2 sm:col-span-1">
              <Label>Data de filmagem *</Label>
              <Input
                type="date"
                value={form.shooting_date}
                onChange={(e) => updateField('shooting_date', e.target.value)}
              />
            </div>

            {/* Dia numero */}
            <div className="col-span-2 sm:col-span-1">
              <Label>
                Numero do dia
                <span className="ml-1 text-xs text-muted-foreground">(auto-calculado se vazio)</span>
              </Label>
              <Input
                type="number"
                min={1}
                placeholder="Ex: 1"
                value={form.day_number}
                onChange={(e) => updateField('day_number', e.target.value)}
              />
            </div>

            {/* Condicao climatica */}
            <div className="col-span-2 sm:col-span-1">
              <Label>Condicao climatica</Label>
              <Select
                value={form.weather_condition}
                onValueChange={(v) => updateField('weather_condition', v as WeatherCondition)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.entries(WEATHER_CONFIG) as [WeatherCondition, typeof WEATHER_CONFIG['sol']][]).map(
                    ([key, cfg]) => {
                      const Icon = cfg.icon
                      return (
                        <SelectItem key={key} value={key}>
                          <span className="flex items-center gap-2">
                            <Icon className={`size-4 ${cfg.className}`} />
                            {cfg.label}
                          </span>
                        </SelectItem>
                      )
                    }
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Horario chamada */}
            <div>
              <Label>Chamada (call time)</Label>
              <Input
                type="time"
                value={form.call_time}
                onChange={(e) => updateField('call_time', e.target.value)}
              />
            </div>

            {/* Horario encerramento */}
            <div>
              <Label>Encerramento (wrap)</Label>
              <Input
                type="time"
                value={form.wrap_time}
                onChange={(e) => updateField('wrap_time', e.target.value)}
              />
            </div>

            {/* Cenas planejadas */}
            <div className="col-span-2">
              <Label>Cenas planejadas</Label>
              <Textarea
                rows={2}
                placeholder="Ex: 3, 4A, 5 — cena de abertura no parque"
                value={form.planned_scenes}
                onChange={(e) => updateField('planned_scenes', e.target.value)}
                className="resize-none"
              />
            </div>

            {/* Cenas filmadas */}
            <div className="col-span-2">
              <Label>Cenas filmadas</Label>
              <Textarea
                rows={2}
                placeholder="Ex: 3, 4A (cena 5 adiada — chuva)"
                value={form.filmed_scenes}
                onChange={(e) => updateField('filmed_scenes', e.target.value)}
                className="resize-none"
              />
            </div>

            {/* Numero de takes */}
            <div className="col-span-2 sm:col-span-1">
              <Label>Total de takes</Label>
              <Input
                type="number"
                min={0}
                placeholder="Ex: 47"
                value={form.total_takes}
                onChange={(e) => updateField('total_takes', e.target.value)}
              />
            </div>

            {/* Separador */}
            <div className="col-span-2 border-t pt-2">
              <p className="text-sm font-medium text-muted-foreground">Relatorio do dia</p>
            </div>

            {/* Problemas */}
            <div className="col-span-2">
              <Label>Problemas / Ocorrencias</Label>
              <Textarea
                rows={3}
                placeholder="Ex: Chuva inesperada as 14h, pausa de 2h. Equipamento de som com falha."
                value={form.issues}
                onChange={(e) => updateField('issues', e.target.value)}
                className="resize-none"
              />
            </div>

            {/* Destaques */}
            <div className="col-span-2">
              <Label>Destaques</Label>
              <Textarea
                rows={3}
                placeholder="Ex: Cena de abertura ficou excepcional. Elenco superou expectativas."
                value={form.highlights}
                onChange={(e) => updateField('highlights', e.target.value)}
                className="resize-none"
              />
            </div>

            {/* Observacoes gerais */}
            <div className="col-span-2">
              <Label>Observacoes gerais</Label>
              <Textarea
                rows={3}
                placeholder="Anotacoes adicionais para o diario..."
                value={form.observations}
                onChange={(e) => updateField('observations', e.target.value)}
                className="resize-none"
              />
            </div>
          </div>

          <DialogFooter className="mt-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowForm(false)
                setEditingEntry(null)
                setForm(defaultForm())
              }}
            >
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={isPending || !isFormValid}>
              {isPending && <Loader2 className="size-4 mr-2 animate-spin" />}
              {editingEntry ? 'Salvar alteracoes' : 'Registrar dia'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de adicionar foto */}
      <Dialog
        open={!!photoEntryId}
        onOpenChange={(open) => {
          if (!open) {
            setPhotoEntryId(null)
            setPhotoForm({ url: '', thumbnail_url: '', caption: '', photo_type: 'bts' })
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar Foto ao Diario</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label>URL da foto *</Label>
              <Input
                type="url"
                placeholder="https://..."
                value={photoForm.url}
                onChange={(e) => setPhotoForm((p) => ({ ...p, url: e.target.value }))}
              />
            </div>

            <div>
              <Label>
                URL do thumbnail
                <span className="ml-1 text-xs text-muted-foreground">(opcional)</span>
              </Label>
              <Input
                type="url"
                placeholder="https://..."
                value={photoForm.thumbnail_url}
                onChange={(e) => setPhotoForm((p) => ({ ...p, thumbnail_url: e.target.value }))}
              />
            </div>

            <div>
              <Label>Tipo de foto</Label>
              <Select
                value={photoForm.photo_type}
                onValueChange={(v) => setPhotoForm((p) => ({ ...p, photo_type: v as PhotoType }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.entries(PHOTO_TYPE_LABELS) as [PhotoType, string][]).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>
                Legenda
                <span className="ml-1 text-xs text-muted-foreground">(opcional)</span>
              </Label>
              <Input
                placeholder="Descricao da foto..."
                value={photoForm.caption}
                onChange={(e) => setPhotoForm((p) => ({ ...p, caption: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setPhotoEntryId(null)
                setPhotoForm({ url: '', thumbnail_url: '', caption: '', photo_type: 'bts' })
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={() =>
                photoEntryId &&
                addPhotoMutation.mutate({ entryId: photoEntryId, data: photoForm })
              }
              disabled={addPhotoMutation.isPending || !photoForm.url}
            >
              {addPhotoMutation.isPending && <Loader2 className="size-4 mr-2 animate-spin" />}
              Adicionar foto
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmacao de delete */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover entrada do diario?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acao nao pode ser desfeita. As fotos vinculadas a este dia tambem serao removidas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
