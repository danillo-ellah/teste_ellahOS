'use client'

import { useMemo, useState, memo } from 'react'
import { useRouter } from 'next/navigation'
import {
  Building2,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  Shield,
  Target,
  User,
} from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { formatCurrency, formatDate } from '@/lib/format'
import type { Opportunity, OpportunityStage, PipelineData } from '@/hooks/useCrm'

// ---------------------------------------------------------------------------
// Configuracao de stages (labels produtora)
// ---------------------------------------------------------------------------

const STAGE_LABELS: Record<OpportunityStage, string> = {
  lead: 'Consulta',
  qualificado: 'Em Analise',
  proposta: 'Orc. Enviado',
  negociacao: 'Negociacao',
  fechamento: 'Aprovacao',
  ganho: 'Fechado',
  perdido: 'Perdido',
  pausado: 'Pausado',
}

const STAGE_COLORS: Record<OpportunityStage, string> = {
  lead: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  qualificado: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300',
  proposta: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  negociacao: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  fechamento: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  ganho: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  perdido: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  pausado: 'bg-slate-100 text-slate-600 dark:bg-slate-800/40 dark:text-slate-400',
}

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

type SortKey =
  | 'created_at'
  | 'title'
  | 'agency'
  | 'client'
  | 'estimated_value'
  | 'stage'
  | 'assigned'
  | 'response_deadline'

interface SortableColumn {
  label: string
  key: SortKey
  sortable: boolean
  headerClassName?: string
}

const COLUMNS: SortableColumn[] = [
  { label: 'CRIADO EM', key: 'created_at', sortable: true, headerClassName: 'w-24 hidden md:table-cell' },
  { label: 'TITULO', key: 'title', sortable: true, headerClassName: 'min-w-[200px]' },
  { label: 'AGENCIA', key: 'agency', sortable: true, headerClassName: 'w-36 hidden lg:table-cell' },
  { label: 'CLIENTE', key: 'client', sortable: true, headerClassName: 'w-36' },
  { label: 'VALOR', key: 'estimated_value', sortable: true, headerClassName: 'w-28 text-right' },
  { label: 'ETAPA', key: 'stage', sortable: true, headerClassName: 'w-32' },
  { label: 'PE', key: 'assigned', sortable: true, headerClassName: 'w-32 hidden lg:table-cell' },
  { label: 'RETORNO', key: 'response_deadline', sortable: true, headerClassName: 'w-28 hidden md:table-cell' },
]

// ---------------------------------------------------------------------------
// Helper: SortIcon
// ---------------------------------------------------------------------------

function SortIcon({
  column,
  sortBy,
  sortOrder,
}: {
  column: string
  sortBy: string
  sortOrder: 'asc' | 'desc'
}) {
  if (sortBy !== column) {
    return <ChevronsUpDown className="ml-1 inline size-3.5 shrink-0 text-muted-foreground/60" />
  }
  if (sortOrder === 'asc') {
    return <ChevronUp className="ml-1 inline size-3.5 shrink-0 text-foreground" />
  }
  return <ChevronDown className="ml-1 inline size-3.5 shrink-0 text-foreground" />
}

// ---------------------------------------------------------------------------
// Helper: deadline badge
// ---------------------------------------------------------------------------

const DeadlineBadge = memo(function DeadlineBadge({ deadline }: { deadline: string | null }) {
  const diffDays = useMemo(() => {
    if (!deadline) return null
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const deadlineDate = new Date(deadline + 'T00:00:00')
    const diffMs = deadlineDate.getTime() - today.getTime()
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24))
  }, [deadline])

  if (!deadline || diffDays === null) return <span className="text-muted-foreground">—</span>

  if (diffDays < 0) {
    return (
      <span className="text-destructive font-medium text-[13px]">
        {formatDate(deadline)} <span className="text-xs">(vencido)</span>
      </span>
    )
  }
  if (diffDays <= 3) {
    return (
      <span className="text-amber-600 dark:text-amber-400 font-medium text-[13px]">
        {formatDate(deadline)} <span className="text-xs">({diffDays}d)</span>
      </span>
    )
  }
  return <span className="text-[13px]">{formatDate(deadline)}</span>
})

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface CrmListViewProps {
  pipeline: PipelineData
  includeClosed: boolean
  onOpportunityClick?: (id: string) => void
}

export function CrmListView({ pipeline, includeClosed, onOpportunityClick }: CrmListViewProps) {
  const router = useRouter()
  const [sortBy, setSortBy] = useState<SortKey>('created_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // Flatten pipeline stages into a list
  const allOpportunities = useMemo(() => {
    const _stageKeys = Object.keys(pipeline.stages) as OpportunityStage[]
    const activeStages: OpportunityStage[] = ['lead', 'qualificado', 'proposta', 'negociacao', 'fechamento']
    const closedStages: OpportunityStage[] = ['ganho', 'perdido', 'pausado']

    const allowedStages = includeClosed
      ? [...activeStages, ...closedStages]
      : activeStages

    const items: Opportunity[] = []
    for (const stage of allowedStages) {
      if (pipeline.stages[stage]) {
        items.push(...pipeline.stages[stage])
      }
    }
    return items
  }, [pipeline, includeClosed])

  // Sort
  const sorted = useMemo(() => {
    const list = [...allOpportunities]
    const dir = sortOrder === 'asc' ? 1 : -1

    list.sort((a, b) => {
      switch (sortBy) {
        case 'created_at':
          return dir * a.created_at.localeCompare(b.created_at)
        case 'title':
          return dir * a.title.localeCompare(b.title)
        case 'agency':
          return dir * (a.agencies?.name ?? '').localeCompare(b.agencies?.name ?? '')
        case 'client':
          return dir * (a.clients?.name ?? '').localeCompare(b.clients?.name ?? '')
        case 'estimated_value':
          return dir * ((a.estimated_value ?? 0) - (b.estimated_value ?? 0))
        case 'stage': {
          const stageOrder: Record<string, number> = {
            lead: 0, qualificado: 1, proposta: 2, negociacao: 3,
            fechamento: 4, ganho: 5, perdido: 6, pausado: 7,
          }
          return dir * ((stageOrder[a.stage] ?? 99) - (stageOrder[b.stage] ?? 99))
        }
        case 'assigned':
          return dir * (a.assigned_profile?.full_name ?? '').localeCompare(b.assigned_profile?.full_name ?? '')
        case 'response_deadline':
          return dir * (a.response_deadline ?? '9999').localeCompare(b.response_deadline ?? '9999')
        default:
          return 0
      }
    })

    return list
  }, [allOpportunities, sortBy, sortOrder])

  function handleSort(key: SortKey) {
    if (sortBy === key) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortBy(key)
      setSortOrder('desc')
    }
  }

  function handleRowClick(id: string) {
    if (onOpportunityClick) {
      onOpportunityClick(id)
    } else {
      router.push(`/crm/${id}`)
    }
  }

  if (sorted.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Target className="size-10 text-muted-foreground/30 mb-3" />
        <p className="text-sm font-medium text-muted-foreground">Nenhuma oportunidade encontrada</p>
        <p className="text-xs text-muted-foreground/70 mt-1">Tente ajustar os filtros ou crie uma nova oportunidade</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.2)]">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent bg-muted/20 border-b border-border/60">
            {COLUMNS.map((col) => (
              <TableHead
                key={col.key}
                className={cn(
                  col.headerClassName,
                  col.sortable && 'cursor-pointer select-none hover:text-foreground transition-colors',
                )}
                onClick={() => col.sortable && handleSort(col.key)}
              >
                <span className="inline-flex items-center text-xs font-medium uppercase tracking-wider">
                  {col.label}
                  {col.sortable && (
                    <SortIcon column={col.key} sortBy={sortBy} sortOrder={sortOrder} />
                  )}
                </span>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((opp) => (
            <TableRow
              key={opp.id}
              className="cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => handleRowClick(opp.id)}
            >
              {/* Data */}
              <TableCell className="text-[13px] text-muted-foreground whitespace-nowrap hidden md:table-cell">
                {formatDate(opp.created_at)}
              </TableCell>

              {/* Titulo */}
              <TableCell>
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-medium truncate max-w-[280px]" title={opp.title}>
                    {opp.title}
                  </span>
                  {opp.is_competitive_bid && (
                    <span title="Concorrencia">
                      <Shield className="size-3.5 text-amber-500 shrink-0" />
                    </span>
                  )}
                </div>
              </TableCell>

              {/* Agencia */}
              <TableCell className="hidden lg:table-cell">
                {opp.agencies?.name ? (
                  <span className="inline-flex items-center gap-1.5 text-[13px]">
                    <Building2 className="size-3.5 text-muted-foreground shrink-0" />
                    <span className="truncate max-w-[120px]" title={opp.agencies.name}>
                      {opp.agencies.name}
                    </span>
                  </span>
                ) : (
                  <span className="text-muted-foreground text-[13px]">—</span>
                )}
              </TableCell>

              {/* Cliente */}
              <TableCell>
                {opp.clients?.name ? (
                  <span className="text-[13px] truncate max-w-[120px]" title={opp.clients.name}>
                    {opp.clients.name}
                  </span>
                ) : (
                  <span className="text-muted-foreground text-[13px]">—</span>
                )}
              </TableCell>

              {/* Valor */}
              <TableCell className="text-right">
                {opp.estimated_value ? (
                  <span className="text-[13px] font-medium">
                    {formatCurrency(opp.estimated_value)}
                  </span>
                ) : (
                  <span className="text-muted-foreground text-[13px]">—</span>
                )}
              </TableCell>

              {/* Etapa */}
              <TableCell>
                <Badge
                  variant="secondary"
                  className={cn(
                    'text-xs font-medium',
                    STAGE_COLORS[opp.stage],
                  )}
                >
                  {STAGE_LABELS[opp.stage] ?? opp.stage}
                </Badge>
              </TableCell>

              {/* PE Responsavel */}
              <TableCell className="hidden lg:table-cell">
                {opp.assigned_profile?.full_name ? (
                  <span className="inline-flex items-center gap-1.5 text-[13px]">
                    <User className="size-3.5 text-muted-foreground shrink-0" />
                    <span className="truncate max-w-[100px]" title={opp.assigned_profile.full_name}>
                      {opp.assigned_profile.full_name.split(' ')[0]}
                    </span>
                  </span>
                ) : (
                  <span className="text-muted-foreground text-[13px]">—</span>
                )}
              </TableCell>

              {/* Retorno */}
              <TableCell className="hidden md:table-cell">
                <DeadlineBadge deadline={opp.response_deadline} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
