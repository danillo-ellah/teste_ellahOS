'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import {
  Sparkles,
  Loader2,
  User,
  Calendar,
  DollarSign,
  Briefcase,
  CheckCircle,
  AlertTriangle,
  Star,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

import { useSuggestFreelancers } from '@/hooks/use-ai-freelancer-match'
import type { FreelancerSuggestion, FreelancerMatchResult } from '@/types/ai'

// --- Helpers ---

function getScoreColor(score: number): string {
  if (score >= 80) return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
  if (score >= 60) return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
  if (score >= 40) return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
  return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
}

function getScoreBorderColor(score: number): string {
  if (score >= 80) return 'border-emerald-300 dark:border-emerald-700'
  if (score >= 60) return 'border-amber-300 dark:border-amber-700'
  if (score >= 40) return 'border-orange-300 dark:border-orange-700'
  return 'border-red-300 dark:border-red-700'
}

function formatRate(rate: number | null): string {
  if (rate === null) return 'Taxa nao informada'
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(rate)
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

// --- Sub-componente: score badge circular ---

interface ScoreBadgeProps {
  score: number
}

function ScoreBadge({ score }: ScoreBadgeProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              'flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 font-bold text-sm',
              getScoreBorderColor(score),
              getScoreColor(score),
            )}
          >
            {score}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>Pontuacao de compatibilidade: {score}/100</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// --- Sub-componente: disponibilidade colapsavel ---

interface AvailabilityInfoProps {
  availability: FreelancerSuggestion['availability']
}

function AvailabilityInfo({ availability }: AvailabilityInfoProps) {
  const [open, setOpen] = useState(false)
  const conflictCount = availability.conflicts.length

  if (availability.is_available) {
    return (
      <div className="flex items-center gap-1.5">
        <CheckCircle className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
        <Badge
          variant="secondary"
          className="text-xs bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400"
        >
          Disponivel
        </Badge>
      </div>
    )
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-1.5 text-left"
          aria-expanded={open}
        >
          <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
          <Badge
            variant="secondary"
            className="text-xs bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
          >
            {conflictCount} conflito{conflictCount !== 1 ? 's' : ''}
          </Badge>
          {open ? (
            <ChevronUp className="h-3 w-3 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          )}
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <ul className="mt-2 space-y-1.5 pl-5">
          {availability.conflicts.map((conflict, idx) => (
            <li key={idx} className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{conflict.job_code}</span>
              {' — '}{conflict.job_title}
              <span className="ml-1 text-amber-600 dark:text-amber-400">
                ({formatDate(conflict.overlap_start)} ate {formatDate(conflict.overlap_end)})
              </span>
            </li>
          ))}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  )
}

// --- Sub-componente: card de sugestao ---

interface SuggestionCardProps {
  suggestion: FreelancerSuggestion
  onSelect?: (personId: string) => void
}

function SuggestionCard({ suggestion, onSelect }: SuggestionCardProps) {
  const perf = suggestion.past_performance

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Score badge circular */}
          <ScoreBadge score={suggestion.match_score} />

          {/* Conteudo principal */}
          <div className="min-w-0 flex-1 space-y-3">
            {/* Cabecalho: nome + badges */}
            <div className="flex flex-wrap items-start gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="font-semibold leading-tight">{suggestion.full_name}</h4>
                  {suggestion.is_internal && (
                    <Badge variant="secondary" className="text-xs">
                      Interno
                    </Badge>
                  )}
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <User className="h-3.5 w-3.5" />
                    {suggestion.default_role}
                  </span>
                  <span className="flex items-center gap-1">
                    <DollarSign className="h-3.5 w-3.5" />
                    {formatRate(suggestion.default_rate)}
                  </span>
                </div>
              </div>

              {/* Botao selecionar */}
              {onSelect && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="shrink-0 h-8 text-xs"
                  onClick={() => onSelect(suggestion.person_id)}
                >
                  Selecionar
                </Button>
              )}
            </div>

            <Separator />

            {/* Motivos do match */}
            {suggestion.match_reasons.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Motivos da compatibilidade
                </p>
                <ul className="space-y-0.5">
                  {suggestion.match_reasons.map((reason, idx) => (
                    <li key={idx} className="flex items-start gap-1.5 text-sm">
                      <CheckCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                      <span>{reason}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Disponibilidade */}
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Disponibilidade
              </p>
              <AvailabilityInfo availability={suggestion.availability} />
            </div>

            {/* Performance historica */}
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Historico
              </p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Briefcase className="h-3.5 w-3.5" />
                  {perf.total_jobs} job{perf.total_jobs !== 1 ? 's' : ''} no total
                </span>
                <span className="flex items-center gap-1">
                  <Briefcase className="h-3.5 w-3.5" />
                  {perf.jobs_with_same_type} do mesmo tipo
                </span>
                {perf.avg_job_health_score !== null && (
                  <span className="flex items-center gap-1">
                    <Star className="h-3.5 w-3.5" />
                    Health score medio: {perf.avg_job_health_score.toFixed(0)}
                  </span>
                )}
                {perf.last_job_date && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    Ultimo job: {formatDate(perf.last_job_date)}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// --- Componente principal ---

interface FreelancerSuggestionsProps {
  jobId: string
  onSelectPerson?: (personId: string) => void
}

export function FreelancerSuggestions({ jobId, onSelectPerson }: FreelancerSuggestionsProps) {
  const [formOpen, setFormOpen] = useState(true)

  // Campos do formulario
  const [role, setRole] = useState('')
  const [requirements, setRequirements] = useState('')
  const [maxRate, setMaxRate] = useState('')
  const [preferredStart, setPreferredStart] = useState('')
  const [preferredEnd, setPreferredEnd] = useState('')
  const [limit, setLimit] = useState('5')

  const [result, setResult] = useState<FreelancerMatchResult | null>(null)

  const suggest = useSuggestFreelancers()
  const isPending = suggest.isPending

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!role.trim()) {
      toast.error('Informe o cargo ou funcao para buscar.')
      return
    }

    try {
      const params = {
        job_id: jobId,
        role: role.trim(),
        ...(requirements.trim() ? { requirements: requirements.trim() } : {}),
        ...(maxRate ? { max_rate: Number(maxRate) } : {}),
        ...(preferredStart ? { preferred_start: preferredStart } : {}),
        ...(preferredEnd ? { preferred_end: preferredEnd } : {}),
        limit: Number(limit),
      }

      const data = await suggest.mutateAsync(params)
      setResult(data)
      setFormOpen(false)
      toast.success(`${data.suggestions.length} sugestao(oes) encontrada(s) pela IA.`)
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Erro ao buscar sugestoes. Tente novamente.'
      toast.error('Falha na busca de freelancers', { description: message })
    }
  }

  return (
    <div className="space-y-6">
      {/* Cabecalho */}
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border bg-rose-50 dark:bg-rose-950/30">
          <Sparkles className="h-4 w-4 text-rose-600 dark:text-rose-400" />
        </div>
        <div>
          <h3 className="font-semibold">Freelancer Match com IA</h3>
          <p className="text-sm text-muted-foreground">
            Encontre os melhores profissionais para o job com base em historico, disponibilidade e
            compatibilidade.
          </p>
        </div>
      </div>

      <Separator />

      {/* Formulario colapsavel */}
      <Collapsible open={formOpen} onOpenChange={setFormOpen}>
        <CollapsibleTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full justify-between gap-2 px-0 hover:bg-transparent"
          >
            <span className="text-sm font-medium">Parametros de busca</span>
            {formOpen ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            {/* Role */}
            <div className="space-y-1.5">
              <Label htmlFor="fm-role" className="text-sm">
                Cargo / Funcao <span className="text-destructive">*</span>
              </Label>
              <Input
                id="fm-role"
                placeholder="Ex: editor, diretor_fotografia"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                required
                disabled={isPending}
              />
            </div>

            {/* Requirements */}
            <div className="space-y-1.5">
              <Label htmlFor="fm-requirements" className="text-sm">
                Requisitos
              </Label>
              <Textarea
                id="fm-requirements"
                placeholder="Descricao dos requisitos..."
                rows={3}
                value={requirements}
                onChange={(e) => setRequirements(e.target.value)}
                disabled={isPending}
              />
            </div>

            {/* Max rate */}
            <div className="space-y-1.5">
              <Label htmlFor="fm-max-rate" className="text-sm">
                Taxa maxima
              </Label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted-foreground">
                  R$
                </span>
                <Input
                  id="fm-max-rate"
                  type="number"
                  min={0}
                  step={100}
                  placeholder="0"
                  className="pl-9"
                  value={maxRate}
                  onChange={(e) => setMaxRate(e.target.value)}
                  disabled={isPending}
                />
              </div>
            </div>

            {/* Periodo preferencial */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="fm-start" className="text-sm">
                  Inicio preferencial
                </Label>
                <Input
                  id="fm-start"
                  type="date"
                  value={preferredStart}
                  onChange={(e) => setPreferredStart(e.target.value)}
                  disabled={isPending}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="fm-end" className="text-sm">
                  Fim preferencial
                </Label>
                <Input
                  id="fm-end"
                  type="date"
                  value={preferredEnd}
                  onChange={(e) => setPreferredEnd(e.target.value)}
                  disabled={isPending}
                />
              </div>
            </div>

            {/* Limite */}
            <div className="space-y-1.5">
              <Label htmlFor="fm-limit" className="text-sm">
                Quantidade de sugestoes
              </Label>
              <Select value={limit} onValueChange={setLimit} disabled={isPending}>
                <SelectTrigger id="fm-limit">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3 sugestoes</SelectItem>
                  <SelectItem value="5">5 sugestoes</SelectItem>
                  <SelectItem value="10">10 sugestoes</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Botao de submit */}
            <Button
              type="submit"
              disabled={isPending}
              className={cn(
                'w-full gap-2',
                'bg-rose-600 hover:bg-rose-700 dark:bg-rose-600 dark:hover:bg-rose-500',
              )}
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Buscando sugestoes...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Buscar Sugestoes com IA
                </>
              )}
            </Button>
          </form>
        </CollapsibleContent>
      </Collapsible>

      {/* Resultados */}
      {result && (
        <>
          <Separator />

          {/* Reasoning geral da IA */}
          {result.reasoning && (
            <Card className="border-rose-200 bg-rose-50/50 dark:border-rose-900/50 dark:bg-rose-950/20">
              <CardHeader className="pb-2 pt-4">
                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                  <Sparkles className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                  Analise da IA
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-4">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {result.reasoning}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Lista de sugestoes ou empty state */}
          {result.suggestions.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center">
              <User className="mb-3 h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm font-medium text-muted-foreground">
                Nenhuma sugestao encontrada
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Tente ajustar os filtros ou ampliar o periodo de busca.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm font-medium text-muted-foreground">
                {result.suggestions.length} sugestao{result.suggestions.length !== 1 ? 'oes' : ''} encontrada{result.suggestions.length !== 1 ? 's' : ''}
              </p>
              {result.suggestions.map((suggestion) => (
                <SuggestionCard
                  key={suggestion.person_id}
                  suggestion={suggestion}
                  onSelect={onSelectPerson}
                />
              ))}
            </div>
          )}

          {/* Tokens usados — discreto */}
          <p className="text-right text-xs text-muted-foreground">
            Tokens: {result.tokens_used.input.toLocaleString('pt-BR')} in /{' '}
            {result.tokens_used.output.toLocaleString('pt-BR')} out
          </p>
        </>
      )}
    </div>
  )
}
