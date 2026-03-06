'use client'

import { useState, useMemo } from 'react'
import { startOfDay, addDays, format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { TrendingUp, TrendingDown, Wallet, AlertTriangle, BarChart3 } from 'lucide-react'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { formatCurrency, formatDate } from '@/lib/format'
import { useCashflowProjection } from '@/hooks/useCashflowProjection'
import type { CashflowGranularity, CashflowKpis } from '@/types/cashflow'
import { CashflowChart } from './_components/CashflowChart'
import { CashflowTable } from './_components/CashflowTable'

// ---------------------------------------------------------------------------
// Tipos locais
// ---------------------------------------------------------------------------

type RangeDays = 30 | 60 | 90 | 180

interface RangeOption {
  label: string
  days: RangeDays
}

const RANGE_OPTIONS: RangeOption[] = [
  { label: '30 dias', days: 30 },
  { label: '60 dias', days: 60 },
  { label: '90 dias', days: 90 },
  { label: '180 dias', days: 180 },
]

const GRANULARITY_LABELS: Record<CashflowGranularity, string> = {
  daily: 'Diario',
  weekly: 'Semanal',
  monthly: 'Mensal',
}

// ---------------------------------------------------------------------------
// KPI Card
// ---------------------------------------------------------------------------

interface KpiCardSkeletonProps {
  className?: string
}

function KpiCardSkeleton({ className }: KpiCardSkeletonProps) {
  return (
    <Card className={className}>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-8 w-8 rounded-lg" />
        </div>
        <Skeleton className="h-7 w-36 mb-1" />
        <Skeleton className="h-3 w-24" />
      </CardContent>
    </Card>
  )
}

interface KpiCardProps {
  label: string
  value: number | undefined
  subtitle?: string
  icon: ReactNode
  iconBg: string
  valueColor?: string
}

function KpiCard({ label, value, subtitle, icon, iconBg, valueColor }: KpiCardProps) {
  return (
    <Card>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide leading-tight">
            {label}
          </span>
          <div className={cn('p-1.5 rounded-lg shrink-0', iconBg)}>
            {icon}
          </div>
        </div>
        <p className={cn('text-2xl font-bold tabular-nums', valueColor)}>
          {value !== undefined ? formatCurrency(value) : '-'}
        </p>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// KPI Grid
// ---------------------------------------------------------------------------

interface CashflowKpisGridProps {
  kpis: CashflowKpis | undefined
  isLoading: boolean
}

function CashflowKpisGrid({ kpis, isLoading }: CashflowKpisGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCardSkeleton />
        <KpiCardSkeleton />
        <KpiCardSkeleton />
        <KpiCardSkeleton />
      </div>
    )
  }

  const netPositive = (kpis?.net_cashflow ?? 0) >= 0
  const minBalancePositive = (kpis?.min_balance ?? 0) >= 0

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {/* Entradas Previstas */}
      <KpiCard
        label="Entradas Previstas"
        value={kpis?.total_inflows}
        icon={<TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />}
        iconBg="bg-emerald-100 dark:bg-emerald-900/30"
        valueColor="text-emerald-600 dark:text-emerald-400"
      />

      {/* Saidas Previstas */}
      <KpiCard
        label="Saidas Previstas"
        value={kpis?.total_outflows}
        icon={<TrendingDown className="h-4 w-4 text-amber-600 dark:text-amber-400" />}
        iconBg="bg-amber-100 dark:bg-amber-900/30"
        valueColor="text-amber-600 dark:text-amber-400"
      />

      {/* Saldo Liquido */}
      <KpiCard
        label="Saldo Liquido"
        value={kpis?.net_cashflow}
        icon={
          netPositive
            ? <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            : <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
        }
        iconBg={
          netPositive
            ? 'bg-blue-100 dark:bg-blue-900/30'
            : 'bg-red-100 dark:bg-red-900/30'
        }
        valueColor={
          netPositive
            ? 'text-blue-600 dark:text-blue-400'
            : 'text-red-600 dark:text-red-400'
        }
      />

      {/* Saldo Minimo Projetado */}
      <KpiCard
        label="Saldo Minimo Projetado"
        value={kpis?.min_balance}
        subtitle={
          kpis?.min_balance_date
            ? `em ${formatDate(kpis.min_balance_date)}`
            : undefined
        }
        icon={
          <Wallet className={cn(
            'h-4 w-4',
            minBalancePositive
              ? 'text-emerald-600 dark:text-emerald-400'
              : 'text-red-600 dark:text-red-400',
          )} />
        }
        iconBg={
          minBalancePositive
            ? 'bg-emerald-100 dark:bg-emerald-900/30'
            : 'bg-red-100 dark:bg-red-900/30'
        }
        valueColor={
          minBalancePositive
            ? 'text-emerald-600 dark:text-emerald-400'
            : 'text-red-600 dark:text-red-400'
        }
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Banner de Alerta
// ---------------------------------------------------------------------------

interface DangerBannerProps {
  minBalanceDate: string | null
  daysUntilDanger: number | null
}

function DangerBanner({ minBalanceDate, daysUntilDanger }: DangerBannerProps) {
  const formattedDate = minBalanceDate
    ? format(parseISO(minBalanceDate), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
    : null

  return (
    <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 dark:border-red-900/50 dark:bg-red-950/30">
      <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
      <div className="text-sm">
        <p className="font-semibold text-red-700 dark:text-red-300">
          ALERTA: Saldo projetado fica negativo
          {formattedDate && ` em ${formattedDate}`}.
        </p>
        {daysUntilDanger != null && (
          <p className="text-red-600 dark:text-red-400 mt-0.5">
            Voce tem <span className="font-bold">{daysUntilDanger} dia(s)</span> para agir.
          </p>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Skeleton da pagina inteira
// ---------------------------------------------------------------------------

function PageSkeleton() {
  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCardSkeleton />
        <KpiCardSkeleton />
        <KpiCardSkeleton />
        <KpiCardSkeleton />
      </div>

      {/* Grafico */}
      <Card className="p-4">
        <Skeleton className="h-4 w-48 mb-4" />
        <Skeleton className="h-[350px] w-full" />
      </Card>

      {/* Tabela */}
      <Card className="p-4 space-y-3">
        <Skeleton className="h-4 w-32" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </Card>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function FluxoCaixaPage() {
  const [rangeDays, setRangeDays] = useState<RangeDays>(90)
  const [granularity, setGranularity] = useState<CashflowGranularity>('weekly')

  // Calcula start e end date baseado no range selecionado
  const { startDate, endDate } = useMemo(() => {
    const today = startOfDay(new Date())
    return {
      startDate: format(today, 'yyyy-MM-dd'),
      endDate: format(addDays(today, rangeDays), 'yyyy-MM-dd'),
    }
  }, [rangeDays])

  const { data, isLoading, isError } = useCashflowProjection(startDate, endDate, granularity)

  const series = data?.data?.series ?? []
  const kpis = data?.data?.kpis

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/financeiro" className="hover:text-foreground transition-colors">
          Financeiro
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium">Fluxo de Caixa Projetado</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <BarChart3 className="h-5 w-5 text-muted-foreground shrink-0" />
          <h1 className="text-xl font-semibold">Fluxo de Caixa Projetado</h1>
        </div>

        {/* Controles: range + granularidade */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Botoes de range */}
          <div className="flex items-center border rounded-md overflow-hidden">
            {RANGE_OPTIONS.map(option => (
              <Button
                key={option.days}
                variant="ghost"
                size="sm"
                className={cn(
                  'rounded-none h-8 px-3 text-xs border-r last:border-r-0',
                  rangeDays === option.days && 'bg-muted font-semibold',
                )}
                onClick={() => setRangeDays(option.days)}
                aria-pressed={rangeDays === option.days}
              >
                {option.label}
              </Button>
            ))}
          </div>

          {/* Seletor de granularidade */}
          <Select
            value={granularity}
            onValueChange={(v) => setGranularity(v as CashflowGranularity)}
          >
            <SelectTrigger size="sm" className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Diario</SelectItem>
              <SelectItem value="weekly">Semanal</SelectItem>
              <SelectItem value="monthly">Mensal</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Banner de alerta — exibido quando kpis.is_danger === true */}
      {kpis?.is_danger && (
        <DangerBanner
          minBalanceDate={kpis.min_balance_date}
          daysUntilDanger={kpis.days_until_danger}
        />
      )}

      {/* Estado de loading */}
      {isLoading && <PageSkeleton />}

      {/* Estado de erro */}
      {isError && !isLoading && (
        <Card>
          <CardContent className="py-12 text-center">
            <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-3" />
            <p className="text-sm font-medium text-foreground mb-1">
              Erro ao carregar projecao de fluxo de caixa
            </p>
            <p className="text-xs text-muted-foreground">
              Verifique sua conexao e tente novamente.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Conteudo principal */}
      {!isLoading && !isError && (
        <>
          {/* KPI Cards */}
          <CashflowKpisGrid kpis={kpis} isLoading={false} />

          {/* Estado vazio */}
          {series.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <BarChart3 className="h-10 w-10 text-muted-foreground/40 mx-auto mb-4" />
                <p className="text-sm font-medium text-foreground mb-1">
                  Nenhum dado disponivel para o periodo
                </p>
                <p className="text-xs text-muted-foreground">
                  Tente ampliar o range de datas ou verifique se ha lancamentos financeiros cadastrados.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Grafico de area */}
              <CashflowChart data={series} />

              {/* Subtitulo da tabela */}
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Detalhes por Periodo
                </h2>
                <span className="text-xs text-muted-foreground">
                  ({series.length} {series.length === 1 ? 'periodo' : 'periodos'} — granularidade {GRANULARITY_LABELS[granularity].toLowerCase()})
                </span>
              </div>

              {/* Tabela detalhada */}
              <CashflowTable entries={series} />
            </>
          )}
        </>
      )}
    </div>
  )
}
