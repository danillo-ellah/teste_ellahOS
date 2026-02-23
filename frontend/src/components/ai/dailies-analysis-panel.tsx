'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import {
  Sparkles,
  Plus,
  Trash2,
  Loader2,
  ChevronDown,
  ChevronUp,
  History,
  ChevronsUpDown,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

import { useAiDailiesAnalysis } from '@/hooks/use-ai-dailies-analysis'
import { DailiesAnalysisResultCard } from '@/components/ai/dailies-analysis-result'
import type { DailyEntryInput, DailiesAnalysisResult, DailiesProgressStatus } from '@/types/ai'

// --- Helpers ---

function createEmptyEntry(): DailyEntryInput {
  return {
    shooting_date: new Date().toISOString().slice(0, 10),
    notes: '',
    scenes_planned: undefined,
    scenes_completed: undefined,
    weather_notes: '',
    equipment_issues: '',
    talent_notes: '',
    extra_costs: '',
    general_observations: '',
  }
}

const STATUS_LABEL: Record<DailiesProgressStatus, string> = {
  on_track: 'No Prazo',
  ahead: 'Adiantado',
  at_risk: 'Em Risco',
  behind: 'Atrasado',
}

const STATUS_COLOR: Record<DailiesProgressStatus, string> = {
  on_track: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  ahead: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  at_risk: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  behind: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
}

// --- Sub-componente: entrada de diaria ---

interface DailyEntryFormProps {
  index: number
  entry: DailyEntryInput
  canRemove: boolean
  onChange: (index: number, field: keyof DailyEntryInput, value: string | number | undefined) => void
  onRemove: (index: number) => void
}

function DailyEntryForm({ index, entry, canRemove, onChange, onRemove }: DailyEntryFormProps) {
  const [advancedOpen, setAdvancedOpen] = useState(false)

  return (
    <Card className="relative">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Diaria {index + 1}
          </CardTitle>
          {canRemove && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              onClick={() => onRemove(index)}
              aria-label="Remover diaria"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Campos principais */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor={`date-${index}`} className="text-xs">
              Data da Diaria <span className="text-destructive">*</span>
            </Label>
            <Input
              id={`date-${index}`}
              type="date"
              value={entry.shooting_date}
              onChange={(e) => onChange(index, 'shooting_date', e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`planned-${index}`} className="text-xs">
              Cenas Planejadas
            </Label>
            <Input
              id={`planned-${index}`}
              type="number"
              min={0}
              placeholder="0"
              value={entry.scenes_planned ?? ''}
              onChange={(e) =>
                onChange(
                  index,
                  'scenes_planned',
                  e.target.value === '' ? undefined : Number(e.target.value),
                )
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`completed-${index}`} className="text-xs">
              Cenas Realizadas
            </Label>
            <Input
              id={`completed-${index}`}
              type="number"
              min={0}
              placeholder="0"
              value={entry.scenes_completed ?? ''}
              onChange={(e) =>
                onChange(
                  index,
                  'scenes_completed',
                  e.target.value === '' ? undefined : Number(e.target.value),
                )
              }
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`notes-${index}`} className="text-xs">
            Observacoes da Diaria
          </Label>
          <Textarea
            id={`notes-${index}`}
            placeholder="Resumo do que aconteceu nesta diaria..."
            rows={2}
            value={entry.notes ?? ''}
            onChange={(e) => onChange(index, 'notes', e.target.value)}
          />
        </div>

        {/* Campos avancados colapsaveis */}
        <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
          <CollapsibleTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground"
            >
              <ChevronsUpDown className="h-3.5 w-3.5" />
              {advancedOpen ? 'Ocultar campos avancados' : 'Mostrar campos avancados'}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-3 space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor={`weather-${index}`} className="text-xs">
                  Condicoes Climaticas
                </Label>
                <Input
                  id={`weather-${index}`}
                  placeholder="Ex: Chuva no periodo da tarde, filmagem adiada 2h"
                  value={entry.weather_notes ?? ''}
                  onChange={(e) => onChange(index, 'weather_notes', e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`equipment-${index}`} className="text-xs">
                  Problemas de Equipamento
                </Label>
                <Input
                  id={`equipment-${index}`}
                  placeholder="Ex: Camera principal com defeito, substituida"
                  value={entry.equipment_issues ?? ''}
                  onChange={(e) => onChange(index, 'equipment_issues', e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`talent-${index}`} className="text-xs">
                  Observacoes de Elenco
                </Label>
                <Input
                  id={`talent-${index}`}
                  placeholder="Ex: Ator principal chegou 1h atrasado"
                  value={entry.talent_notes ?? ''}
                  onChange={(e) => onChange(index, 'talent_notes', e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`costs-${index}`} className="text-xs">
                  Custos Extras
                </Label>
                <Input
                  id={`costs-${index}`}
                  placeholder="Ex: Locacao adicional R$ 800, refeicao extra R$ 200"
                  value={entry.extra_costs ?? ''}
                  onChange={(e) => onChange(index, 'extra_costs', e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`general-${index}`} className="text-xs">
                  Observacoes Gerais
                </Label>
                <Textarea
                  id={`general-${index}`}
                  placeholder="Qualquer outra informacao relevante..."
                  rows={2}
                  value={entry.general_observations ?? ''}
                  onChange={(e) => onChange(index, 'general_observations', e.target.value)}
                />
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  )
}

// --- Componente principal ---

interface DailiesAnalysisPanelProps {
  jobId: string
}

export function DailiesAnalysisPanel({ jobId }: DailiesAnalysisPanelProps) {
  const [entries, setEntries] = useState<DailyEntryInput[]>([createEmptyEntry()])
  const [includeDeliverables, setIncludeDeliverables] = useState(false)
  const [currentResult, setCurrentResult] = useState<DailiesAnalysisResult | null>(null)
  const [historyOpen, setHistoryOpen] = useState(false)

  const { history, analyze } = useAiDailiesAnalysis(jobId)

  const isAnalyzing = analyze.isPending

  // --- Handlers de formulario ---

  function handleEntryChange(
    index: number,
    field: keyof DailyEntryInput,
    value: string | number | undefined,
  ) {
    setEntries((prev) => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
  }

  function handleAddEntry() {
    setEntries((prev) => [...prev, createEmptyEntry()])
  }

  function handleRemoveEntry(index: number) {
    setEntries((prev) => prev.filter((_, i) => i !== index))
  }

  // --- Submit ---

  async function handleAnalyze() {
    // Validacao basica: toda entrada precisa de data
    const invalid = entries.some((e) => !e.shooting_date)
    if (invalid) {
      toast.error('Preencha a data em todas as diarias antes de analisar.')
      return
    }

    try {
      const result = await analyze.mutateAsync({
        dailies_data: entries,
        deliverables_status: includeDeliverables,
      })
      setCurrentResult(result)
      toast.success('Analise concluida com sucesso.')
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Erro ao analisar as dailies. Tente novamente.'
      toast.error('Falha na analise de dailies', { description: message })
    }
  }

  // --- Render ---

  return (
    <div className="space-y-6">
      {/* Cabecalho */}
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border bg-rose-50 dark:bg-rose-950/30">
          <Sparkles className="h-4 w-4 text-rose-600 dark:text-rose-400" />
        </div>
        <div>
          <h3 className="font-semibold">Analise de Dailies com IA</h3>
          <p className="text-sm text-muted-foreground">
            Envie os dados das diarias de filmagem para receber uma analise detalhada de progresso,
            riscos e recomendacoes.
          </p>
        </div>
      </div>

      <Separator />

      {/* Formulario de entradas */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium">
            Diarias ({entries.length})
          </h4>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={handleAddEntry}
          >
            <Plus className="h-3.5 w-3.5" />
            Adicionar Diaria
          </Button>
        </div>

        <div className="space-y-3">
          {entries.map((entry, index) => (
            <DailyEntryForm
              key={index}
              index={index}
              entry={entry}
              canRemove={entries.length > 1}
              onChange={handleEntryChange}
              onRemove={handleRemoveEntry}
            />
          ))}
        </div>
      </div>

      {/* Opcoes adicionais */}
      <div className="flex items-center gap-2">
        <Checkbox
          id="include-deliverables"
          checked={includeDeliverables}
          onCheckedChange={(checked) => setIncludeDeliverables(!!checked)}
        />
        <Label
          htmlFor="include-deliverables"
          className="cursor-pointer text-sm font-normal"
        >
          Incluir status dos entregaveis na analise
        </Label>
      </div>

      {/* Botao de analise */}
      <Button
        onClick={handleAnalyze}
        disabled={isAnalyzing}
        className={cn(
          'w-full gap-2',
          'bg-rose-600 hover:bg-rose-700 dark:bg-rose-600 dark:hover:bg-rose-500',
        )}
      >
        {isAnalyzing ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Analisando dailies...
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" />
            Analisar com IA
          </>
        )}
      </Button>

      {/* Resultado atual */}
      {currentResult && (
        <>
          <Separator />
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Resultado da Analise</h4>
            <DailiesAnalysisResultCard result={currentResult} />
          </div>
        </>
      )}

      {/* Historico de analises */}
      <Separator />

      <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
        <CollapsibleTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full justify-between gap-2 px-0 hover:bg-transparent"
          >
            <div className="flex items-center gap-2 text-sm font-medium">
              <History className="h-4 w-4 text-muted-foreground" />
              Historico de Analises
              {history.data && history.data.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {history.data.length}
                </Badge>
              )}
            </div>
            {historyOpen ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="mt-3 space-y-2">
            {history.isLoading && (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            )}

            {history.isError && (
              <p className="py-4 text-center text-sm text-muted-foreground">
                Nao foi possivel carregar o historico.
              </p>
            )}

            {history.data && history.data.length === 0 && (
              <p className="py-4 text-center text-sm text-muted-foreground">
                Nenhuma analise realizada ainda.
              </p>
            )}

            {history.data && history.data.length > 0 && (
              <div className="space-y-2">
                {history.data.map((item) => {
                  // Extrair status do metadata se disponivel
                  const status = item.metadata?.progress_status as DailiesProgressStatus | undefined

                  return (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-lg border px-3 py-2.5"
                    >
                      <div className="space-y-0.5">
                        <p className="text-sm font-medium">
                          {new Date(item.created_at).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Tokens: {item.tokens_used.input.toLocaleString('pt-BR')} in /{' '}
                          {item.tokens_used.output.toLocaleString('pt-BR')} out
                          {item.duration_ms > 0 && (
                            <span className="ml-2">
                              · {(item.duration_ms / 1000).toFixed(1)}s
                            </span>
                          )}
                        </p>
                      </div>
                      {status && (
                        <Badge
                          variant="secondary"
                          className={cn('text-xs', STATUS_COLOR[status])}
                        >
                          {STATUS_LABEL[status]}
                        </Badge>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}
