'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import {
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  TrendingUp,
  Shield,
  Lightbulb,
} from 'lucide-react'
import type {
  DailiesAnalysisResult,
  DailiesProgressStatus,
  DailiesRiskSeverity,
} from '@/types/ai'

// --- Configuracoes de status ---

const STATUS_CONFIG: Record<
  DailiesProgressStatus,
  { label: string; color: string; icon: React.ElementType }
> = {
  on_track: {
    label: 'No Prazo',
    color:
      'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
    icon: CheckCircle,
  },
  ahead: {
    label: 'Adiantado',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    icon: TrendingUp,
  },
  at_risk: {
    label: 'Em Risco',
    color:
      'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    icon: AlertTriangle,
  },
  behind: {
    label: 'Atrasado',
    color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    icon: AlertCircle,
  },
}

const SEVERITY_CONFIG: Record<
  DailiesRiskSeverity,
  { label: string; color: string }
> = {
  high: {
    label: 'Alto',
    color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  },
  medium: {
    label: 'Medio',
    color:
      'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  },
  low: {
    label: 'Baixo',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  },
}

// --- Props ---

interface DailiesAnalysisResultCardProps {
  result: DailiesAnalysisResult
}

// --- Componente ---

export function DailiesAnalysisResultCard({
  result,
}: DailiesAnalysisResultCardProps) {
  const statusConfig = STATUS_CONFIG[result.progress_assessment.status]
  const StatusIcon = statusConfig.icon

  return (
    <div className="space-y-4">
      {/* Status + Barra de progresso */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Progresso da Producao</CardTitle>
            <Badge
              className={cn('gap-1', statusConfig.color)}
              variant="secondary"
            >
              <StatusIcon className="h-3.5 w-3.5" />
              {statusConfig.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Conclusao</span>
              <span className="font-medium">
                {result.progress_assessment.completion_percentage}%
              </span>
            </div>
            <Progress
              value={result.progress_assessment.completion_percentage}
              className="h-2"
            />
          </div>
          <p className="text-sm text-muted-foreground">
            {result.progress_assessment.explanation}
          </p>
        </CardContent>
      </Card>

      {/* Resumo */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Resumo</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed">{result.summary}</p>
        </CardContent>
      </Card>

      {/* Riscos */}
      {result.risks.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="h-4 w-4" />
              Riscos Identificados ({result.risks.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {result.risks.map((risk, i) => {
                const sevConfig = SEVERITY_CONFIG[risk.severity]
                return (
                  <div
                    key={i}
                    className="space-y-1.5 rounded-lg border p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium">{risk.description}</p>
                      <Badge
                        className={cn('shrink-0', sevConfig.color)}
                        variant="secondary"
                      >
                        {sevConfig.label}
                      </Badge>
                    </div>
                    {risk.recommendation && (
                      <p className="text-xs text-muted-foreground">
                        Mitigacao: {risk.recommendation}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recomendacoes */}
      {result.recommendations.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Lightbulb className="h-4 w-4" />
              Recomendacoes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {result.recommendations.map((rec, i) => (
                <li key={i} className="flex gap-2 text-sm">
                  <span className="shrink-0 text-muted-foreground">{i + 1}.</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Tokens utilizados (discreto) */}
      <p className="text-right text-xs text-muted-foreground">
        Tokens: {result.tokens_used.input.toLocaleString('pt-BR')} in /{' '}
        {result.tokens_used.output.toLocaleString('pt-BR')} out
      </p>
    </div>
  )
}
