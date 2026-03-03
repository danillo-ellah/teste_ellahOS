'use client'

import { useState, useCallback, useEffect } from 'react'
import { toast } from 'sonner'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  FileCheck,
  ExternalLink,
  Loader2,
  CalendarDays,
  MapPin,
  Users,
  FileText,
  CheckSquare,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { apiMutate, safeErrorMessage } from '@/lib/api'
import { jobKeys } from '@/lib/query-keys'
import type { JobDetail } from '@/types/jobs'

// --- Tipos ---

type PpmStatus = 'rascunho' | 'agendado' | 'realizado' | 'cancelado'

interface PpmChecklist {
  roteiro: boolean
  locacoes: boolean
  equipe: boolean
  elenco: boolean
  cronograma: boolean
  orcamento: boolean
}

interface PpmData {
  status: PpmStatus
  document_url: string
  date: string
  location: string
  participants: string[]
  notes: string
  checklist: PpmChecklist
}

// --- Configuracoes ---

const PPM_STATUS_CONFIG: Record<
  PpmStatus,
  { label: string; badgeClass: string }
> = {
  rascunho: {
    label: 'Rascunho',
    badgeClass: 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-300 dark:border-zinc-700',
  },
  agendado: {
    label: 'Agendado',
    badgeClass: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-700',
  },
  realizado: {
    label: 'Realizado',
    badgeClass: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-300 dark:border-green-700',
  },
  cancelado: {
    label: 'Cancelado',
    badgeClass: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-300 dark:border-red-700',
  },
}

const CHECKLIST_ITEMS: Array<{ key: keyof PpmChecklist; label: string }> = [
  { key: 'roteiro', label: 'Roteiro/storyboard aprovado' },
  { key: 'locacoes', label: 'Locacoes confirmadas' },
  { key: 'equipe', label: 'Equipe tecnica confirmada' },
  { key: 'elenco', label: 'Elenco confirmado' },
  { key: 'cronograma', label: 'Cronograma de filmagem definido' },
  { key: 'orcamento', label: 'Orcamento aprovado' },
]

// --- Helpers ---

function getDefaultPpmData(job: JobDetail): PpmData {
  const saved = job.custom_fields?.ppm as Partial<PpmData> | undefined

  return {
    status: saved?.status ?? 'rascunho',
    // ppm_url do campo dedicado do job tem prioridade sobre custom_fields
    document_url: job.ppm_url ?? saved?.document_url ?? '',
    date: saved?.date ?? (job.kickoff_ppm_date ? job.kickoff_ppm_date.slice(0, 10) : ''),
    location: saved?.location ?? '',
    participants: saved?.participants ?? [],
    notes: saved?.notes ?? '',
    checklist: {
      roteiro: saved?.checklist?.roteiro ?? false,
      locacoes: saved?.checklist?.locacoes ?? false,
      equipe: saved?.checklist?.equipe ?? false,
      elenco: saved?.checklist?.elenco ?? false,
      cronograma: saved?.checklist?.cronograma ?? false,
      orcamento: saved?.checklist?.orcamento ?? false,
    },
  }
}

function countChecked(checklist: PpmChecklist): number {
  return Object.values(checklist).filter(Boolean).length
}

// --- Props ---

interface TabPPMProps {
  job: JobDetail
}

// --- Componente principal ---

export function TabPPM({ job }: TabPPMProps) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState<PpmData>(() => getDefaultPpmData(job))
  const [isDirty, setIsDirty] = useState(false)

  // Re-sincronizar form quando o job recarregar (ex: apos save)
  useEffect(() => {
    setForm(getDefaultPpmData(job))
    setIsDirty(false)
  }, [job.id, job.updated_at])

  const updateField = useCallback(
    <K extends keyof PpmData>(key: K, value: PpmData[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }))
      setIsDirty(true)
    },
    [],
  )

  const updateChecklist = useCallback(
    (key: keyof PpmChecklist, value: boolean) => {
      setForm((prev) => ({
        ...prev,
        checklist: { ...prev.checklist, [key]: value },
      }))
      setIsDirty(true)
    },
    [],
  )

  // Mutation: salvar PPM no job via PATCH
  const saveMutation = useMutation({
    mutationFn: async (data: PpmData) => {
      // Mesclar ppm no custom_fields existente para nao sobrescrever outras chaves
      const existingCustomFields =
        (job.custom_fields as Record<string, unknown>) ?? {}

      const payload: Record<string, unknown> = {
        custom_fields: {
          ...existingCustomFields,
          ppm: {
            status: data.status,
            document_url: data.document_url || null,
            date: data.date || null,
            location: data.location || null,
            participants: data.participants,
            notes: data.notes || null,
            checklist: data.checklist,
          },
        },
      }

      // Salvar ppm_url no campo dedicado do job quando preenchido
      if (data.document_url) {
        payload.ppm_url = data.document_url
      }

      // Salvar data no campo kickoff_ppm_date quando preenchida
      if (data.date) {
        payload.kickoff_ppm_date = data.date
      }

      await apiMutate('jobs', 'PATCH', payload, job.id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: jobKeys.detail(job.id) })
      toast.success('PPM salva com sucesso')
      setIsDirty(false)
    },
    onError: (err) => {
      toast.error(safeErrorMessage(err))
    },
  })

  const statusConfig = PPM_STATUS_CONFIG[form.status]
  const checkedCount = countChecked(form.checklist)
  const totalItems = CHECKLIST_ITEMS.length

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <FileCheck className="size-5 text-muted-foreground" />
            <h3 className="text-lg font-semibold">PPM - Pauta de Pre-Producao</h3>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Reuniao de alinhamento com toda a equipe antes da filmagem
          </p>
        </div>
        <Badge
          variant="outline"
          className={statusConfig.badgeClass}
        >
          {statusConfig.label}
        </Badge>
      </div>

      {/* Status */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Status da PPM
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Select
            value={form.status}
            onValueChange={(v) => updateField('status', v as PpmStatus)}
          >
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(PPM_STATUS_CONFIG) as PpmStatus[]).map((s) => (
                <SelectItem key={s} value={s}>
                  {PPM_STATUS_CONFIG[s].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Documento PPM */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground uppercase tracking-wide">
            <FileText className="size-4" />
            Documento PPM
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label htmlFor="ppm-url">URL do documento</Label>
            <div className="flex gap-2 mt-1.5">
              <Input
                id="ppm-url"
                type="url"
                placeholder="https://docs.google.com/..."
                value={form.document_url}
                onChange={(e) => updateField('document_url', e.target.value)}
                className="flex-1"
              />
              {form.document_url && (
                <Button
                  variant="outline"
                  size="icon"
                  asChild
                  title="Abrir documento"
                >
                  <a href={form.document_url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="size-4" />
                  </a>
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Link para o documento PPM no Google Drive, Notion ou outro servico
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Informacoes da PPM */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground uppercase tracking-wide">
            <CalendarDays className="size-4" />
            Informacoes da Reuniao
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Data */}
          <div>
            <Label htmlFor="ppm-date">Data da PPM</Label>
            <Input
              id="ppm-date"
              type="date"
              value={form.date}
              onChange={(e) => updateField('date', e.target.value)}
              className="mt-1.5 w-fit"
            />
          </div>

          {/* Local */}
          <div>
            <Label htmlFor="ppm-location">
              <MapPin className="size-3.5 inline mr-1 mb-0.5" />
              Local
            </Label>
            <Input
              id="ppm-location"
              placeholder="Ex: Escritorio da produtora, Sala de reuniao..."
              value={form.location}
              onChange={(e) => updateField('location', e.target.value)}
              className="mt-1.5"
            />
          </div>

          {/* Participantes */}
          <div>
            <Label htmlFor="ppm-participants">
              <Users className="size-3.5 inline mr-1 mb-0.5" />
              Participantes
            </Label>
            <div className="mt-1.5 space-y-2">
              {/* Lista de participantes como tags editaveis */}
              {form.participants.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {form.participants.map((p, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-muted border border-border"
                    >
                      {p}
                      <button
                        type="button"
                        onClick={() =>
                          updateField(
                            'participants',
                            form.participants.filter((_, idx) => idx !== i),
                          )
                        }
                        className="ml-0.5 text-muted-foreground hover:text-foreground leading-none"
                        aria-label={`Remover ${p}`}
                      >
                        &times;
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <ParticipantInput
                onAdd={(name) => {
                  if (name && !form.participants.includes(name)) {
                    updateField('participants', [...form.participants, name])
                  }
                }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Digite o nome e pressione Enter para adicionar
            </p>
          </div>

          {/* Observacoes */}
          <div>
            <Label htmlFor="ppm-notes">Observacoes</Label>
            <Textarea
              id="ppm-notes"
              placeholder="Anotacoes gerais sobre a PPM, pontos de atencao, decisoes tomadas..."
              value={form.notes}
              onChange={(e) => updateField('notes', e.target.value)}
              rows={4}
              className="mt-1.5 resize-none"
            />
          </div>
        </CardContent>
      </Card>

      {/* Checklist Pre-PPM */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground uppercase tracking-wide">
              <CheckSquare className="size-4" />
              Checklist Pre-PPM
            </CardTitle>
            <span className="text-xs text-muted-foreground">
              {checkedCount}/{totalItems} itens
            </span>
          </div>
          {/* Barra de progresso */}
          <div className="mt-2 h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${(checkedCount / totalItems) * 100}%` }}
            />
          </div>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {CHECKLIST_ITEMS.map(({ key, label }) => (
              <li key={key} className="flex items-center gap-3">
                <Checkbox
                  id={`ppm-check-${key}`}
                  checked={form.checklist[key]}
                  onCheckedChange={(checked) =>
                    updateChecklist(key, checked === true)
                  }
                />
                <label
                  htmlFor={`ppm-check-${key}`}
                  className={[
                    'text-sm cursor-pointer select-none',
                    form.checklist[key]
                      ? 'line-through text-muted-foreground'
                      : 'text-foreground',
                  ].join(' ')}
                >
                  {label}
                </label>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Botao salvar */}
      <div className="flex justify-end pb-4">
        <Button
          onClick={() => saveMutation.mutate(form)}
          disabled={saveMutation.isPending || !isDirty}
        >
          {saveMutation.isPending && (
            <Loader2 className="size-4 mr-2 animate-spin" />
          )}
          {isDirty ? 'Salvar' : 'Salvo'}
        </Button>
      </div>
    </div>
  )
}

// --- Sub-componente: input para adicionar participante ---

function ParticipantInput({ onAdd }: { onAdd: (name: string) => void }) {
  const [value, setValue] = useState('')

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      const trimmed = value.trim()
      if (trimmed) {
        onAdd(trimmed)
        setValue('')
      }
    }
  }

  return (
    <Input
      type="text"
      placeholder="Nome do participante..."
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={handleKeyDown}
      className="w-full"
    />
  )
}
