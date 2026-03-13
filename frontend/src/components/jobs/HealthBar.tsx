'use client'

import { CircleCheck, CircleAlert, Info } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import type { Job } from '@/types/jobs'

type HealthScoreDetails = NonNullable<Job['health_score_details']>

export interface HealthBarProps {
  score: number | null
  details?: HealthScoreDetails | null
  className?: string
}

// --- Utilitarios de cor (exportados para uso externo) ---

export function getScoreColor(score: number): string {
  if (score >= 70) return 'text-green-500 dark:text-green-400'
  if (score >= 40) return 'text-yellow-500 dark:text-yellow-400'
  return 'text-red-500 dark:text-red-400'
}

export function getFillColor(score: number): string {
  if (score >= 70) return 'bg-green-500'
  if (score >= 40) return 'bg-yellow-500'
  return 'bg-red-500'
}

function getScoreBg(score: number): string {
  if (score >= 70) return 'bg-green-500/10 dark:bg-green-500/15'
  if (score >= 40) return 'bg-yellow-500/10 dark:bg-yellow-500/15'
  return 'bg-red-500/10 dark:bg-red-500/15'
}

function getPillarBarColor(score: number, max: number): string {
  if (max === 0) return 'bg-muted'
  const pct = (score / max) * 100
  if (pct >= 80) return 'bg-green-500'
  if (pct >= 50) return 'bg-yellow-500'
  return 'bg-red-500'
}

function getScoreLabel(score: number): string {
  if (score >= 80) return 'Excelente'
  if (score >= 70) return 'Bom'
  if (score >= 50) return 'Regular'
  if (score >= 30) return 'Precisa atencao'
  return 'Critico'
}

// --- Config dos pilares ---

const PILLAR_CONFIG: Array<{
  key: keyof HealthScoreDetails
  label: string
  icon: string
}> = [
  { key: 'setup', label: 'Setup', icon: 'S' },
  { key: 'team', label: 'Equipe', icon: 'E' },
  { key: 'financial', label: 'Financeiro', icon: 'F' },
  { key: 'timeline', label: 'Timeline', icon: 'T' },
]

// Labels dos itens — chaves batem com JSONB do trigger calculate_health_score
const ITEM_LABELS: Record<string, Record<string, string>> = {
  setup: {
    project_type: 'Tipo de projeto definido',
    delivery_date: 'Data de entrega',
    closed_value: 'Valor fechado',
    briefing: 'Briefing preenchido',
    status_progress: 'Status alem de briefing',
  },
  team: {
    director: 'Diretor alocado',
    executive_producer: 'Produtor Executivo alocado',
    team_size_3: '3+ membros na equipe',
  },
  financial: {
    production_cost: 'Custo de producao definido',
    positive_margin: 'Margem positiva',
    tax_percentage: 'Imposto configurado',
  },
  timeline: {
    not_overdue: 'Dentro do prazo',
    recent_activity: 'Atividade nos ultimos 30 dias',
    has_docs: 'Documentos/links anexados',
  },
}

// --- Sub-componente: pilar compacto ---

function PillarRow({
  pillarKey,
  label,
  pillar,
}: {
  pillarKey: string
  label: string
  pillar: { score: number; max: number; items: Record<string, boolean> }
}) {
  const pct = pillar.max > 0 ? Math.round((pillar.score / pillar.max) * 100) : 0
  const barColor = getPillarBarColor(pillar.score, pillar.max)
  const entries = Object.entries(pillar.items)
  const missing = entries.filter(([, v]) => !v)
  const complete = entries.filter(([, v]) => v)
  const itemLabels = ITEM_LABELS[pillarKey] ?? {}

  return (
    <div className="space-y-1.5">
      {/* Header: nome + barra + score */}
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-medium text-foreground w-[72px] shrink-0">
          {label}
        </span>
        <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all', barColor)}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className={cn(
          'text-[11px] font-semibold tabular-nums w-[40px] text-right shrink-0',
          pct >= 80 ? 'text-green-600 dark:text-green-400' :
          pct >= 50 ? 'text-yellow-600 dark:text-yellow-400' :
          'text-red-600 dark:text-red-400',
        )}>
          {pillar.score}/{pillar.max}
        </span>
      </div>

      {/* Itens faltantes em destaque */}
      {missing.length > 0 && (
        <div className="ml-[72px] flex flex-col gap-0.5">
          {missing.map(([key]) => (
            <div key={key} className="flex items-center gap-1.5">
              <CircleAlert className="size-3 shrink-0 text-amber-500" />
              <span className="text-[10px] text-amber-700 dark:text-amber-400">
                {itemLabels[key] ?? key}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Itens completos (colapsados, mais discretos) */}
      {complete.length > 0 && (
        <div className="ml-[72px] flex flex-col gap-0.5">
          {complete.map(([key]) => (
            <div key={key} className="flex items-center gap-1.5 opacity-60">
              <CircleCheck className="size-3 shrink-0 text-green-500" />
              <span className="text-[10px] text-muted-foreground">
                {itemLabels[key] ?? key}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// --- Componente principal ---

export function HealthBar({ score, details, className }: HealthBarProps) {
  if (score === null) {
    return (
      <span className={cn('text-xs text-muted-foreground', className)}>-</span>
    )
  }

  const clampedScore = Math.min(100, Math.max(0, score))

  // Trigger compacto (numero + barra)
  const trigger = (
    <div className={cn('flex flex-col items-center gap-1', className)}>
      <span className={cn('text-sm font-semibold tabular-nums', getScoreColor(clampedScore))}>
        {clampedScore}
      </span>
      <div className="w-10 h-2 rounded-full bg-muted/60 overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all', getFillColor(clampedScore))}
          style={{ width: `${clampedScore}%` }}
        />
      </div>
    </div>
  )

  if (!details) {
    return trigger
  }

  // Contar itens faltantes total
  const totalMissing = PILLAR_CONFIG.reduce((sum, { key }) => {
    const items = details[key]?.items ?? {}
    return sum + Object.values(items).filter((v) => !v).length
  }, 0)

  return (
    <Popover>
      <PopoverTrigger
        asChild
        onClick={(e) => e.stopPropagation()}
        className="cursor-pointer"
      >
        {trigger}
      </PopoverTrigger>

      <PopoverContent
        className="w-[320px] p-0"
        side="left"
        align="center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header com score grande e label descritivo */}
        <div className={cn('px-4 py-3 rounded-t-md', getScoreBg(clampedScore))}>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                Saude do Job
              </div>
              <div className={cn('text-2xl font-bold tabular-nums leading-tight', getScoreColor(clampedScore))}>
                {clampedScore}<span className="text-sm font-normal text-muted-foreground">/100</span>
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                {getScoreLabel(clampedScore)}
              </div>
            </div>
            {totalMissing > 0 && (
              <div className="flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1">
                <CircleAlert className="size-3.5 text-amber-500" />
                <span className="text-[11px] font-medium text-amber-700 dark:text-amber-400">
                  {totalMissing} {totalMissing === 1 ? 'pendencia' : 'pendencias'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Pilares com breakdown */}
        <div className="px-4 py-3 flex flex-col gap-3">
          {PILLAR_CONFIG.map(({ key, label }) => (
            <PillarRow
              key={key}
              pillarKey={key}
              label={label}
              pillar={details[key]}
            />
          ))}
        </div>

        {/* Footer com explicacao */}
        <div className="px-4 py-2.5 border-t bg-muted/30 rounded-b-md">
          <div className="flex items-start gap-1.5">
            <Info className="size-3 shrink-0 text-muted-foreground mt-0.5" />
            <span className="text-[10px] text-muted-foreground leading-tight">
              Preencha os itens pendentes para aumentar a saude do job. Cada pilar vale 25 pontos.
            </span>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
