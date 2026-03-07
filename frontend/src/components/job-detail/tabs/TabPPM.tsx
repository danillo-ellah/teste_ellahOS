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
  Lightbulb,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
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
import { useUserRole } from '@/hooks/useUserRole'
import {
  useResolveChecklistTemplate,
  templateToChecklistItems,
} from '@/hooks/usePreproductionTemplates'
import { DynamicChecklist } from './ppm/DynamicChecklist'
import { LegacyChecklistBanner } from './ppm/LegacyChecklistBanner'
import { PreProductionBadge } from './ppm/PreProductionBadge'
import { DocumentsPanel } from './ppm/DocumentsPanel'
import { PpmDecisionsList } from './ppm/PpmDecisionsList'
import { AddChecklistItemDialog } from './ppm/AddChecklistItemDialog'
import type { JobDetail } from '@/types/jobs'
import type {
  ChecklistItem,
  PpmDecision,
  PpmDataV2,
  PpmStatus,
} from '@/types/preproduction'
import {
  LEGACY_CHECKLIST_LABELS,
  DEFAULT_CHECKLIST_ITEMS,
} from '@/types/preproduction'

// --- Configuracoes ---

const PPM_STATUS_CONFIG: Record<
  PpmStatus,
  { label: string; badgeClass: string }
> = {
  rascunho: {
    label: 'Rascunho',
    badgeClass:
      'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-300 dark:border-zinc-700',
  },
  agendado: {
    label: 'Agendado',
    badgeClass:
      'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-700',
  },
  realizado: {
    label: 'Realizado',
    badgeClass:
      'bg-green-500/10 text-green-600 dark:text-green-400 border-green-300 dark:border-green-700',
  },
  cancelado: {
    label: 'Cancelado',
    badgeClass:
      'bg-red-500/10 text-red-600 dark:text-red-400 border-red-300 dark:border-red-700',
  },
}

// --- Helpers ---

function detectFormat(ppm: Partial<PpmDataV2> | undefined): 'v2' | 'legacy' | 'empty' {
  if (!ppm) return 'empty'
  if (ppm.checklist_items && ppm.checklist_items.length > 0) return 'v2'
  if (ppm.checklist && Object.keys(ppm.checklist).length > 0) return 'legacy'
  return 'empty'
}

function legacyToChecklistItems(
  checklist: Record<string, boolean>,
): ChecklistItem[] {
  return Object.entries(checklist).map(([key, checked], idx) => ({
    id: crypto.randomUUID(),
    label: LEGACY_CHECKLIST_LABELS[key] ?? key,
    checked,
    position: idx + 1,
    is_extra: false,
  }))
}

// --- Props ---

interface TabPPMProps {
  job: JobDetail
}

// --- Componente principal ---

export function TabPPM({ job }: TabPPMProps) {
  const queryClient = useQueryClient()
  const { role, fullName } = useUserRole()
  const canEdit = ['ceo', 'admin', 'produtor_executivo', 'atendimento', 'coordenador_producao', 'diretor_producao'].includes(role ?? '')

  const saved = job.custom_fields?.ppm as Partial<PpmDataV2> | undefined
  const format = detectFormat(saved)

  // Form state
  const [status, setStatus] = useState<PpmStatus>(saved?.status ?? 'rascunho')
  const [documentUrl, setDocumentUrl] = useState(
    job.ppm_url ?? saved?.document_url ?? '',
  )
  const [date, setDate] = useState(
    saved?.date ?? (job.kickoff_ppm_date ? job.kickoff_ppm_date.slice(0, 10) : ''),
  )
  const [location, setLocation] = useState(saved?.location ?? '')
  const [participants, setParticipants] = useState<string[]>(
    saved?.participants ?? [],
  )
  const [notes, setNotes] = useState(saved?.notes ?? '')
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>(
    format === 'v2'
      ? saved!.checklist_items!
      : format === 'legacy'
        ? legacyToChecklistItems(saved!.checklist!)
        : [],
  )
  const [decisions, setDecisions] = useState<PpmDecision[]>(
    saved?.decisions ?? [],
  )
  const [isDirty, setIsDirty] = useState(false)
  const [addItemOpen, setAddItemOpen] = useState(false)
  const [suggestionDismissed, setSuggestionDismissed] = useState(
    saved?.suggestion_dismissed ?? false,
  )

  // Template resolution para primeiro acesso (checklist vazio)
  const needsTemplate = format === 'empty' && checklistItems.length === 0 && !suggestionDismissed
  const { template, isLoading: templateLoading } = useResolveChecklistTemplate(
    needsTemplate ? (job.job_type ?? null) : null,
  )

  // Re-sincronizar form quando o job recarregar
  useEffect(() => {
    const s = job.custom_fields?.ppm as Partial<PpmDataV2> | undefined
    const fmt = detectFormat(s)
    setStatus(s?.status ?? 'rascunho')
    setDocumentUrl(job.ppm_url ?? s?.document_url ?? '')
    setDate(s?.date ?? (job.kickoff_ppm_date ? job.kickoff_ppm_date.slice(0, 10) : ''))
    setLocation(s?.location ?? '')
    setParticipants(s?.participants ?? [])
    setNotes(s?.notes ?? '')
    setChecklistItems(
      fmt === 'v2'
        ? s!.checklist_items!
        : fmt === 'legacy'
          ? legacyToChecklistItems(s!.checklist!)
          : [],
    )
    setDecisions(s?.decisions ?? [])
    setSuggestionDismissed(s?.suggestion_dismissed ?? false)
    setIsDirty(false)
  }, [job.id, job.updated_at])

  const markDirty = useCallback(() => setIsDirty(true), [])

  function handleChecklistChange(items: ChecklistItem[]) {
    setChecklistItems(items)
    setIsDirty(true)
  }

  function handleDecisionsChange(d: PpmDecision[]) {
    setDecisions(d)
    setIsDirty(true)
  }

  function handleAddExtraItem(item: ChecklistItem) {
    setChecklistItems((prev) => [...prev, item])
    setIsDirty(true)
  }

  function handleUseSuggestion() {
    if (template) {
      setChecklistItems(templateToChecklistItems(template))
    } else {
      setChecklistItems([...DEFAULT_CHECKLIST_ITEMS])
    }
    setIsDirty(true)
  }

  function handleDismissSuggestion() {
    setSuggestionDismissed(true)
    setIsDirty(true)
  }

  // Save mutation (PATCH /jobs)
  const saveMutation = useMutation({
    mutationFn: async () => {
      const existingCustomFields =
        (job.custom_fields as Record<string, unknown>) ?? {}

      const preProductionComplete =
        checklistItems.length > 0 &&
        checklistItems.every((i) => i.checked)

      const payload: Record<string, unknown> = {
        custom_fields: {
          ...existingCustomFields,
          ppm: {
            status,
            document_url: documentUrl || null,
            date: date || null,
            location: location || null,
            participants,
            notes: notes || null,
            // Preservar checklist legado para historico
            ...(saved?.checklist ? { checklist: saved.checklist } : {}),
            checklist_items: checklistItems,
            pre_production_complete: preProductionComplete,
            decisions,
            suggestion_dismissed: suggestionDismissed,
          },
        },
      }

      if (documentUrl) payload.ppm_url = documentUrl
      if (date) payload.kickoff_ppm_date = date

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

  // Save de URL via DocumentsPanel
  function handleDocSave(fields: Record<string, unknown>) {
    const mutation = apiMutate('jobs', 'PATCH', fields, job.id)
    mutation
      .then(() => {
        queryClient.invalidateQueries({ queryKey: jobKeys.detail(job.id) })
        toast.success('Link atualizado')
      })
      .catch((err) => toast.error(safeErrorMessage(err)))
  }

  const statusConfig = PPM_STATUS_CONFIG[status]

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <FileCheck className="size-5 text-muted-foreground" />
            <h3 className="text-lg font-semibold">
              PPM - Pauta de Pre-Producao
            </h3>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Reuniao de alinhamento com toda a equipe antes da filmagem
          </p>
        </div>
        <div className="flex items-center gap-2">
          <PreProductionBadge items={checklistItems} />
          <Badge variant="outline" className={statusConfig.badgeClass}>
            {statusConfig.label}
          </Badge>
        </div>
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
            value={status}
            onValueChange={(v) => {
              setStatus(v as PpmStatus)
              markDirty()
            }}
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
                value={documentUrl}
                onChange={(e) => {
                  setDocumentUrl(e.target.value)
                  markDirty()
                }}
                className="flex-1"
              />
              {documentUrl && (
                <Button variant="outline" size="icon" asChild title="Abrir documento">
                  <a href={documentUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="size-4" />
                  </a>
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Informacoes da Reuniao */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground uppercase tracking-wide">
            <CalendarDays className="size-4" />
            Informacoes da Reuniao
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="ppm-date">Data da PPM</Label>
            <Input
              id="ppm-date"
              type="date"
              value={date}
              onChange={(e) => {
                setDate(e.target.value)
                markDirty()
              }}
              className="mt-1.5 w-fit"
            />
          </div>
          <div>
            <Label htmlFor="ppm-location">
              <MapPin className="size-3.5 inline mr-1 mb-0.5" />
              Local
            </Label>
            <Input
              id="ppm-location"
              placeholder="Ex: Escritorio da produtora, Sala de reuniao..."
              value={location}
              onChange={(e) => {
                setLocation(e.target.value)
                markDirty()
              }}
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="ppm-participants">
              <Users className="size-3.5 inline mr-1 mb-0.5" />
              Participantes
            </Label>
            <div className="mt-1.5 space-y-2">
              {participants.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {participants.map((p, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-muted border border-border"
                    >
                      {p}
                      <button
                        type="button"
                        onClick={() => {
                          setParticipants(participants.filter((_, idx) => idx !== i))
                          markDirty()
                        }}
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
                  if (name && !participants.includes(name)) {
                    setParticipants([...participants, name])
                    markDirty()
                  }
                }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Digite o nome e pressione Enter para adicionar
            </p>
          </div>
          <div>
            <Label htmlFor="ppm-notes">Observacoes</Label>
            <Textarea
              id="ppm-notes"
              placeholder="Anotacoes gerais sobre a PPM, pontos de atencao..."
              value={notes}
              onChange={(e) => {
                setNotes(e.target.value)
                markDirty()
              }}
              rows={4}
              className="mt-1.5 resize-none"
            />
          </div>
        </CardContent>
      </Card>

      {/* Legacy banner */}
      {format === 'legacy' && <LegacyChecklistBanner />}

      {/* Sugestao de template (primeiro acesso) */}
      {needsTemplate && checklistItems.length === 0 && !templateLoading && (
        <Card className="border-dashed">
          <CardContent className="py-6">
            <div className="flex flex-col items-center text-center gap-3">
              <Lightbulb className="size-8 text-amber-500" />
              <div>
                <p className="text-sm font-medium">
                  {template
                    ? `Template "${template.name}" disponivel`
                    : 'Checklist de pre-producao'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {template
                    ? `${template.items.length} itens configurados para este tipo de projeto`
                    : 'Use os 6 itens padrao como ponto de partida'}
                </p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleUseSuggestion}>
                  Usar como ponto de partida
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDismissSuggestion}
                >
                  Iniciar vazio
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Checklist dinamico */}
      {(checklistItems.length > 0 || suggestionDismissed) && (
        <DynamicChecklist
          items={checklistItems}
          onChange={handleChecklistChange}
          readOnly={format === 'legacy' && !isDirty}
          onAddExtraItem={() => setAddItemOpen(true)}
        />
      )}

      {/* Documentos e Links */}
      <DocumentsPanel job={job} canEdit={canEdit} onSave={handleDocSave} />

      {/* Decisoes da PPM */}
      <PpmDecisionsList
        decisions={decisions}
        currentUserName={fullName ?? ''}
        userRole={role ?? ''}
        onChange={handleDecisionsChange}
      />

      {/* Botao salvar */}
      <div className="flex justify-end pb-4">
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending || !isDirty}
        >
          {saveMutation.isPending && (
            <Loader2 className="size-4 mr-2 animate-spin" />
          )}
          {isDirty ? 'Salvar' : 'Salvo'}
        </Button>
      </div>

      {/* Dialogs */}
      <AddChecklistItemDialog
        open={addItemOpen}
        onOpenChange={setAddItemOpen}
        onAdd={handleAddExtraItem}
        nextPosition={checklistItems.length + 1}
      />
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
