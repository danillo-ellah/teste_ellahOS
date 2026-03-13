'use client'

import { useState, useMemo, useCallback } from 'react'
import {
  TrendingDown,
  Download,
  AlertTriangle,
  Trophy,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { useLossAnalytics } from '@/hooks/useCrmBudget'
import type { LossAnalyticsFilters } from '@/hooks/useCrmBudget'
import { formatCurrency, formatDate } from '@/lib/format'
import { AREA_CONFIG } from '@/lib/constants'

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

const PERIOD_OPTIONS = [
  { value: '30', label: 'Ultimos 30 dias' },
  { value: '90', label: 'Ultimos 90 dias' },
  { value: '180', label: 'Ultimos 180 dias' },
  { value: '365', label: 'Ultimo ano' },
]

const CATEGORY_OPTIONS = [
  { value: 'todas', label: 'Todas as categorias' },
  { value: 'preco', label: 'Preco' },
  { value: 'diretor', label: 'Diretor' },
  { value: 'prazo', label: 'Prazo' },
  { value: 'escopo', label: 'Escopo' },
  { value: 'relacionamento', label: 'Relacionamento' },
  { value: 'concorrencia', label: 'Concorrencia' },
  { value: 'outro', label: 'Outro' },
]

const CATEGORY_LABELS: Record<string, string> = {
  preco: 'Preco',
  diretor: 'Diretor',
  prazo: 'Prazo',
  escopo: 'Escopo',
  relacionamento: 'Relacionamento',
  concorrencia: 'Concorrencia',
  outro: 'Outro',
}

// Cor da area comercial (violet)
const CHART_COLOR = '#8B5CF6'

// ---------------------------------------------------------------------------
// Tipos internos
// ---------------------------------------------------------------------------

type SortKey = 'title' | 'client_name' | 'actual_close_date' | 'estimated_value' | 'loss_category' | 'winner_competitor' | 'assigned_name'
type SortDir = 'asc' | 'desc'

// ---------------------------------------------------------------------------
// Tooltip customizado do grafico
// ---------------------------------------------------------------------------

interface ChartTooltipProps {
  active?: boolean
  payload?: Array<{ name: string; value: number; payload: { total_value: number } }>
  label?: string
}

function ChartTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload?.length) return null

  return (
    <div className="rounded-md border border-border bg-background p-3 shadow-md text-sm min-w-[180px]">
      <p className="font-semibold mb-2 text-foreground">
        {CATEGORY_LABELS[label ?? ''] ?? label}
      </p>
      <p className="tabular-nums text-muted-foreground py-0.5">
        {payload[0].value} {payload[0].value === 1 ? 'oportunidade' : 'oportunidades'}
      </p>
      <p className="tabular-nums text-violet-600 dark:text-violet-400 py-0.5">
        {formatCurrency(payload[0].payload.total_value)}
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// KPI Card
// ---------------------------------------------------------------------------

interface KpiCardProps {
  label: string
  value: string
  sub?: string
  highlight?: boolean
}

function KpiCard({ label, value, sub, highlight }: KpiCardProps) {
  return (
    <Card className={`rounded-xl ${highlight ? 'border-red-400/40 bg-red-500/5' : ''}`}>
      <CardContent className="p-4">
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">{label}</p>
        <p
          className={`text-xl sm:text-2xl font-bold tabular-nums truncate ${
            highlight ? 'text-red-600 dark:text-red-400' : ''
          }`}
        >
          {value}
        </p>
        {sub && <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Skeleton de carregamento
// ---------------------------------------------------------------------------

function PageSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      {/* header */}
      <div className="flex items-center gap-3">
        <Skeleton className="size-6 rounded" />
        <div className="space-y-1">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-3.5 w-64" />
        </div>
      </div>
      {/* filtros */}
      <div className="flex gap-2">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-9 w-32 ml-auto" />
      </div>
      {/* kpis */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-lg" />
        ))}
      </div>
      {/* grafico */}
      <Skeleton className="h-64 rounded-lg" />
      {/* tabela */}
      <Skeleton className="h-80 rounded-lg" />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Cabecalho de coluna ordenavel
// ---------------------------------------------------------------------------

interface SortableHeaderProps {
  label: string
  sortKey: SortKey
  currentKey: SortKey
  currentDir: SortDir
  onSort: (key: SortKey) => void
}

function SortableHeader({ label, sortKey, currentKey, currentDir, onSort }: SortableHeaderProps) {
  const isActive = currentKey === sortKey

  return (
    <button
      onClick={() => onSort(sortKey)}
      className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap"
    >
      {label}
      {isActive ? (
        currentDir === 'asc' ? (
          <ChevronUp className="size-3" />
        ) : (
          <ChevronDown className="size-3" />
        )
      ) : (
        <ChevronsUpDown className="size-3 opacity-40" />
      )}
    </button>
  )
}

// ---------------------------------------------------------------------------
// Pagina principal
// ---------------------------------------------------------------------------

export default function CrmPerdasPage() {
  const area = AREA_CONFIG.comercial

  // Estado dos filtros
  const [period, setPeriod] = useState<string>('90')
  const [category, setCategory] = useState<string>('todas')

  // Estado de ordenacao da tabela
  const [sortKey, setSortKey] = useState<SortKey>('actual_close_date')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  // Filtros para o hook
  const filters = useMemo<LossAnalyticsFilters>(() => {
    const f: LossAnalyticsFilters = { period_days: Number(period) }
    if (category !== 'todas') f.loss_category = category
    return f
  }, [period, category])

  const { data, isLoading, isError } = useLossAnalytics(filters)

  // Ordenacao da tabela
  const handleSort = useCallback((key: SortKey) => {
    setSortKey((prev) => {
      if (prev === key) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
        return prev
      }
      setSortDir('asc')
      return key
    })
  }, [])

  const sortedOpportunities = useMemo(() => {
    if (!data?.opportunities) return []
    return [...data.opportunities].sort((a, b) => {
      const aVal = a[sortKey] ?? ''
      const bVal = b[sortKey] ?? ''
      const cmp =
        typeof aVal === 'number' && typeof bVal === 'number'
          ? aVal - bVal
          : String(aVal).localeCompare(String(bVal), 'pt-BR')
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [data?.opportunities, sortKey, sortDir])

  // Dados do grafico com label formatado
  const chartData = useMemo(
    () =>
      (data?.by_category ?? []).map((row) => ({
        ...row,
        label: CATEGORY_LABELS[row.category] ?? row.category,
      })),
    [data?.by_category],
  )

  // Export CSV client-side
  const handleExportCsv = useCallback(() => {
    if (!data?.opportunities?.length) return

    const now = new Date()
    const dateStr = now.toISOString().slice(0, 10)
    const filename = `perdas_${period}d_${dateStr}.csv`

    const header = ['Titulo', 'Cliente', 'Data', 'Valor Estimado', 'Categoria', 'Concorrente', 'PE']
    const rows = data.opportunities.map((opp) => [
      opp.title,
      opp.client_name ?? '',
      opp.actual_close_date ? formatDate(opp.actual_close_date) : '',
      opp.estimated_value != null ? opp.estimated_value.toFixed(2) : '',
      opp.loss_category ? (CATEGORY_LABELS[opp.loss_category] ?? opp.loss_category) : '',
      opp.winner_competitor ?? '',
      opp.assigned_name ?? '',
    ])

    const csvContent = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n')

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [data?.opportunities, period])

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (isLoading) return <PageSkeleton />

  return (
    <div className="flex flex-col gap-6">
      {/* ---------------------------------------------------------------------- */}
      {/* Header                                                                   */}
      {/* ---------------------------------------------------------------------- */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <TrendingDown className={`size-6 ${area.textClass}`} />
          <div>
            <h1 className="text-xl font-semibold">Analise de Perdas</h1>
            <p className="text-sm text-muted-foreground">
              Entenda os padroes de perda de oportunidades
            </p>
          </div>
        </div>

        {/* Botao exportar — escondido no mobile ate ter dados */}
        {data && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            disabled={!data.opportunities?.length}
            className="gap-1.5 self-start sm:self-auto min-h-[44px] sm:min-h-0"
          >
            <Download className="size-3.5" />
            Exportar CSV
          </Button>
        )}
      </div>

      {/* ---------------------------------------------------------------------- */}
      {/* Filtros                                                                  */}
      {/* ---------------------------------------------------------------------- */}
      <div className="flex flex-wrap gap-2">
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[180px] min-h-[44px] sm:min-h-9">
            <SelectValue placeholder="Periodo" />
          </SelectTrigger>
          <SelectContent>
            {PERIOD_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-[210px] min-h-[44px] sm:min-h-9">
            <SelectValue placeholder="Categoria de perda" />
          </SelectTrigger>
          <SelectContent>
            {CATEGORY_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* ---------------------------------------------------------------------- */}
      {/* Estado de erro                                                           */}
      {/* ---------------------------------------------------------------------- */}
      {isError && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <TrendingDown className="size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Nao foi possivel carregar os dados de analise de perdas.
            </p>
          </CardContent>
        </Card>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* Conteudo principal                                                       */}
      {/* ---------------------------------------------------------------------- */}
      {data && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3">
            <KpiCard
              label="Total Perdidas"
              value={String(data.kpis.total_lost)}
              highlight={data.kpis.total_lost > 0}
            />
            <KpiCard
              label="Valor Perdido"
              value={formatCurrency(data.kpis.total_lost_value)}
            />
            <KpiCard
              label="Taxa de Perda"
              value={`${data.kpis.loss_rate.toFixed(1)}%`}
              sub="do total fechadas"
            />
            <KpiCard
              label="Top Concorrente"
              value={data.kpis.top_competitor ?? '—'}
            />
          </div>

          {/* Grafico de barras por categoria */}
          {chartData.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Perdas por Categoria
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart
                    data={chartData}
                    margin={{ top: 4, right: 16, left: 0, bottom: 4 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                      axisLine={false}
                      tickLine={false}
                      width={28}
                    />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: 'hsl(var(--accent))' }} />
                    <Bar dataKey="count" fill={CHART_COLOR} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Alerta: Clientes Recorrentes */}
          {data.recurring_clients.length > 0 && (
            <Card className="border-amber-400/40 bg-amber-500/5">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium text-amber-700 dark:text-amber-400">
                  <AlertTriangle className="size-4" />
                  Clientes com Perdas Recorrentes
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-xs text-muted-foreground mb-3">
                  Clientes perdidos 2 ou mais vezes no periodo — oportunidade de relacionamento.
                </p>
                <ul className="space-y-1.5">
                  {data.recurring_clients.map((client) => (
                    <li
                      key={client.client_id}
                      className="flex items-center justify-between gap-2 text-sm"
                    >
                      <span className="font-medium truncate">{client.client_name}</span>
                      <span className="flex items-center gap-2 shrink-0">
                        <Badge variant="outline" className="text-amber-700 dark:text-amber-400 border-amber-400/60">
                          {client.loss_count} {client.loss_count === 1 ? 'perda' : 'perdas'}
                        </Badge>
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {formatCurrency(client.total_value)}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Top Concorrentes */}
          {data.top_competitors.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Trophy className="size-4" />
                  Top Concorrentes
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <ol className="space-y-2">
                  {data.top_competitors.map((comp, idx) => (
                    <li key={comp.competitor} className="flex items-center gap-3 text-sm">
                      <span className="shrink-0 w-5 text-center text-muted-foreground font-medium">
                        {idx + 1}.
                      </span>
                      <span className="flex-1 font-medium truncate">{comp.competitor}</span>
                      <span className="shrink-0 flex items-center gap-2">
                        <Badge variant="secondary">
                          {comp.count}x
                        </Badge>
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {formatCurrency(comp.total_value)}
                        </span>
                      </span>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          )}

          {/* Tabela de oportunidades perdidas */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Oportunidades Perdidas
                {data.opportunities.length > 0 && (
                  <span className="ml-2 font-normal">({data.opportunities.length})</span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {data.opportunities.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Nenhuma oportunidade perdida no periodo selecionado.
                </p>
              ) : (
                <div className="overflow-x-auto -mx-6 px-6">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="pb-2 pr-4 text-left">
                          <SortableHeader
                            label="Titulo"
                            sortKey="title"
                            currentKey={sortKey}
                            currentDir={sortDir}
                            onSort={handleSort}
                          />
                        </th>
                        <th className="pb-2 pr-4 text-left hidden sm:table-cell">
                          <SortableHeader
                            label="Cliente"
                            sortKey="client_name"
                            currentKey={sortKey}
                            currentDir={sortDir}
                            onSort={handleSort}
                          />
                        </th>
                        <th className="pb-2 pr-4 text-left hidden md:table-cell">
                          <SortableHeader
                            label="Data"
                            sortKey="actual_close_date"
                            currentKey={sortKey}
                            currentDir={sortDir}
                            onSort={handleSort}
                          />
                        </th>
                        <th className="pb-2 pr-4 text-right">
                          <SortableHeader
                            label="Valor"
                            sortKey="estimated_value"
                            currentKey={sortKey}
                            currentDir={sortDir}
                            onSort={handleSort}
                          />
                        </th>
                        <th className="pb-2 pr-4 text-left hidden lg:table-cell">
                          <SortableHeader
                            label="Categoria"
                            sortKey="loss_category"
                            currentKey={sortKey}
                            currentDir={sortDir}
                            onSort={handleSort}
                          />
                        </th>
                        <th className="pb-2 pr-4 text-left hidden lg:table-cell">
                          <SortableHeader
                            label="Concorrente"
                            sortKey="winner_competitor"
                            currentKey={sortKey}
                            currentDir={sortDir}
                            onSort={handleSort}
                          />
                        </th>
                        <th className="pb-2 text-left hidden xl:table-cell">
                          <SortableHeader
                            label="PE"
                            sortKey="assigned_name"
                            currentKey={sortKey}
                            currentDir={sortDir}
                            onSort={handleSort}
                          />
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedOpportunities.map((opp) => (
                        <tr
                          key={opp.id}
                          className="border-b border-border/50 hover:bg-accent/40 transition-colors"
                        >
                          <td className="py-2.5 pr-4">
                            <span className="font-medium text-foreground line-clamp-1">
                              {opp.title}
                            </span>
                          </td>
                          <td className="py-2.5 pr-4 text-muted-foreground hidden sm:table-cell">
                            <span className="line-clamp-1">{opp.client_name ?? '—'}</span>
                          </td>
                          <td className="py-2.5 pr-4 text-muted-foreground hidden md:table-cell whitespace-nowrap">
                            {opp.actual_close_date ? formatDate(opp.actual_close_date) : '—'}
                          </td>
                          <td className="py-2.5 pr-4 text-right tabular-nums whitespace-nowrap">
                            {opp.estimated_value != null
                              ? formatCurrency(opp.estimated_value)
                              : '—'}
                          </td>
                          <td className="py-2.5 pr-4 hidden lg:table-cell">
                            {opp.loss_category ? (
                              <Badge variant="outline" className="text-xs">
                                {CATEGORY_LABELS[opp.loss_category] ?? opp.loss_category}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="py-2.5 pr-4 text-muted-foreground hidden lg:table-cell">
                            <span className="line-clamp-1">
                              {opp.winner_competitor ?? '—'}
                            </span>
                          </td>
                          <td className="py-2.5 text-muted-foreground hidden xl:table-cell">
                            <span className="line-clamp-1">{opp.assigned_name ?? '—'}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
