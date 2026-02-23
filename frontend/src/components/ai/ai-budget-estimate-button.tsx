'use client'

import { useState } from 'react'
import { Sparkles, RefreshCw, AlertTriangle, TrendingUp, Clock } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { useAiBudgetEstimate } from '@/hooks/use-ai-budget-estimate'
import { formatCurrency, formatPercentage } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { BudgetEstimateResult, EstimateConfidence } from '@/types/ai'

// --- Helpers ---

const BREAKDOWN_LABELS: Record<string, string> = {
  pre_production: 'Pre-producao',
  production: 'Producao',
  post_production: 'Pos-producao',
  talent: 'Elenco/Talentos',
  equipment: 'Equipamentos',
  locations: 'Locacoes',
  other: 'Outros',
}

const CONFIDENCE_CONFIG: Record<
  EstimateConfidence,
  { label: string; className: string }
> = {
  high: {
    label: 'Alta confianca',
    className:
      'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800',
  },
  medium: {
    label: 'Confianca media',
    className:
      'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800',
  },
  low: {
    label: 'Baixa confianca',
    className:
      'bg-red-100 text-red-800 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800',
  },
}

// --- Sub-componentes internos ---

function EstimateSkeleton() {
  return (
    <div className="flex flex-col gap-6 p-1">
      <div className="flex flex-col items-center gap-3 py-6">
        <div className="relative flex h-12 w-12 items-center justify-center">
          <Sparkles className="size-8 animate-pulse text-rose-500" />
        </div>
        <p className="text-muted-foreground text-center text-sm">
          Analisando historico e gerando estimativa...
        </p>
      </div>
      <Skeleton className="h-16 w-full rounded-xl" />
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-14 rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-24 w-full rounded-lg" />
    </div>
  )
}

function ConfidenceBadge({ confidence }: { confidence: EstimateConfidence }) {
  const config = CONFIDENCE_CONFIG[confidence]
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
        config.className,
      )}
    >
      {config.label}
    </span>
  )
}

interface EstimateResultProps {
  result: BudgetEstimateResult
  onRegenerate: () => void
  isRegenerating: boolean
}

function EstimateResult({ result, onRegenerate, isRegenerating }: EstimateResultProps) {
  const { suggested_budget, similar_jobs, reasoning, warnings, tokens_used, cached } =
    result

  const breakdownEntries = Object.entries(suggested_budget.breakdown) as [
    string,
    number,
  ][]

  return (
    <div className="flex flex-col gap-5">
      {/* Valor total em destaque */}
      <div className="bg-muted/40 flex flex-col items-center gap-2 rounded-xl border py-6">
        <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
          Orcamento sugerido
        </p>
        <p className="text-4xl font-bold tracking-tight text-rose-600 dark:text-rose-400">
          {formatCurrency(suggested_budget.total)}
        </p>
        <div className="flex items-center gap-2">
          <ConfidenceBadge confidence={suggested_budget.confidence} />
          {cached && (
            <Badge variant="outline" className="gap-1 text-xs">
              <Clock className="size-3" />
              Cache
            </Badge>
          )}
        </div>
      </div>

      {/* Explicacao de confianca */}
      <p className="text-muted-foreground text-sm leading-relaxed">
        {suggested_budget.confidence_explanation}
      </p>

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="flex flex-col gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/40">
          <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
            <AlertTriangle className="size-4 shrink-0" />
            <span className="text-sm font-medium">Avisos</span>
          </div>
          <ul className="flex flex-col gap-1">
            {warnings.map((warning, i) => (
              <li
                key={i}
                className="text-amber-700 text-sm leading-snug dark:text-amber-300"
              >
                {warning}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Breakdown por categoria */}
      <div>
        <p className="mb-3 text-sm font-medium">Distribuicao por categoria</p>
        <div className="grid grid-cols-2 gap-2">
          {breakdownEntries.map(([key, value]) => (
            <div
              key={key}
              className="bg-muted/30 flex flex-col gap-0.5 rounded-lg border p-3"
            >
              <span className="text-muted-foreground text-xs">
                {BREAKDOWN_LABELS[key] ?? key}
              </span>
              <span className="text-sm font-semibold">{formatCurrency(value)}</span>
            </div>
          ))}
        </div>
      </div>

      <Separator />

      {/* Raciocinio da IA */}
      {reasoning && (
        <div>
          <p className="mb-2 text-sm font-medium">Raciocinio da IA</p>
          <p className="text-muted-foreground text-sm leading-relaxed whitespace-pre-wrap">
            {reasoning}
          </p>
        </div>
      )}

      {/* Jobs similares */}
      {similar_jobs.length > 0 && (
        <div>
          <div className="mb-3 flex items-center gap-2">
            <TrendingUp className="text-muted-foreground size-4" />
            <p className="text-sm font-medium">
              Jobs similares utilizados ({similar_jobs.length})
            </p>
          </div>
          <div className="overflow-hidden rounded-lg border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/40 border-b">
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">
                    Codigo
                  </th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">
                    Valor
                  </th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">
                    Margem
                  </th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">
                    Sim.
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {similar_jobs.map((job) => (
                  <tr key={job.job_id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-3 py-2">
                      <span className="font-mono text-xs font-medium">{job.code}</span>
                    </td>
                    <td className="px-3 py-2 text-right text-xs tabular-nums">
                      {formatCurrency(job.closed_value)}
                    </td>
                    <td className="px-3 py-2 text-right text-xs tabular-nums">
                      {formatPercentage(job.margin_percentage)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <span
                        className={cn(
                          'inline-block rounded-full px-1.5 py-0.5 text-xs font-medium',
                          job.similarity_score >= 80
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                            : job.similarity_score >= 50
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                              : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
                        )}
                      >
                        {Math.round(job.similarity_score)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Footer: tokens usados */}
      <p className="text-muted-foreground/60 text-center text-xs">
        Tokens utilizados: {tokens_used.input.toLocaleString('pt-BR')} entrada /{' '}
        {tokens_used.output.toLocaleString('pt-BR')} saida
      </p>
    </div>
  )
}

// --- Componente principal ---

interface AiBudgetEstimateButtonProps {
  jobId: string
  /** Variante visual do botao de disparo */
  variant?: 'default' | 'outline' | 'ghost' | 'secondary'
  /** Tamanho do botao de disparo */
  size?: 'default' | 'sm' | 'lg'
  className?: string
}

export function AiBudgetEstimateButton({
  jobId,
  variant = 'outline',
  size = 'sm',
  className,
}: AiBudgetEstimateButtonProps) {
  const [open, setOpen] = useState(false)
  const [currentResult, setCurrentResult] = useState<BudgetEstimateResult | null>(null)

  const { generate } = useAiBudgetEstimate(jobId)

  const isGenerating = generate.isPending

  async function handleGenerate() {
    try {
      const result = await generate.mutateAsync(undefined)
      if (result) {
        setCurrentResult(result)
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Erro ao gerar estimativa. Tente novamente.'
      toast.error('Falha na estimativa de orcamento', { description: message })
    }
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen)
    // Ao abrir pela primeira vez sem resultado, gera automaticamente
    if (nextOpen && !currentResult && !isGenerating) {
      handleGenerate()
    }
  }

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={cn(
          'gap-1.5 border-rose-200 text-rose-700 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-800',
          'dark:border-rose-800 dark:text-rose-400 dark:hover:border-rose-700 dark:hover:bg-rose-950 dark:hover:text-rose-300',
          className,
        )}
        onClick={() => handleOpenChange(true)}
      >
        <Sparkles className="size-4" />
        Estimar com IA
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 p-0 sm:max-w-lg"
        >
          <SheetHeader className="border-b px-6 py-4">
            <div className="flex items-center gap-2">
              <Sparkles className="size-5 text-rose-500" />
              <SheetTitle>Estimativa de Orcamento com IA</SheetTitle>
            </div>
            <SheetDescription>
              Analise baseada em historico de jobs similares e parametros do projeto.
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 py-5">
            {isGenerating && <EstimateSkeleton />}

            {!isGenerating && generate.isError && !currentResult && (
              <div className="flex flex-col items-center gap-4 py-12 text-center">
                <AlertTriangle className="size-10 text-amber-500" />
                <div className="flex flex-col gap-1">
                  <p className="font-medium">Nao foi possivel gerar a estimativa</p>
                  <p className="text-muted-foreground text-sm">
                    {generate.error instanceof Error
                      ? generate.error.message
                      : 'Tente novamente em alguns instantes.'}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGenerate}
                  className="gap-2"
                >
                  <RefreshCw className="size-4" />
                  Tentar novamente
                </Button>
              </div>
            )}

            {!isGenerating && currentResult && (
              <EstimateResult
                result={currentResult}
                onRegenerate={handleGenerate}
                isRegenerating={isGenerating}
              />
            )}
          </div>

          {/* Footer com botao de regerar — so aparece quando tem resultado */}
          {currentResult && (
            <SheetFooter className="border-t px-6 py-4">
              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerate}
                disabled={isGenerating}
                className="w-full gap-2"
              >
                <RefreshCw className={cn('size-4', isGenerating && 'animate-spin')} />
                {isGenerating ? 'Gerando nova estimativa...' : 'Gerar nova estimativa'}
              </Button>
            </SheetFooter>
          )}
        </SheetContent>
      </Sheet>
    </>
  )
}
