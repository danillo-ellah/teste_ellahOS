'use client'

import { useState, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Download, FileText, Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useMonthlyReport } from '@/hooks/useCrm'
import { formatCurrency } from '@/lib/format'
import { AREA_CONFIG } from '@/lib/constants'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getPreviousMonth(): string {
  const d = new Date()
  d.setDate(1)
  d.setMonth(d.getMonth() - 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function parseMonth(yyyyMm: string): Date {
  const [year, month] = yyyyMm.split('-').map(Number)
  return new Date(year, month - 1, 1)
}

function addMonths(yyyyMm: string, delta: number): string {
  const d = parseMonth(yyyyMm)
  d.setMonth(d.getMonth() + delta)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function formatMonthLabel(yyyyMm: string): string {
  const d = parseMonth(yyyyMm)
  const label = d.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

function isCurrentOrFutureMonth(yyyyMm: string): boolean {
  const now = new Date()
  const current = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  return yyyyMm >= current
}

// ---------------------------------------------------------------------------
// Summary cards
// ---------------------------------------------------------------------------

interface SummaryCardsProps {
  created: number
  won: number
  lost: number
  pipelineValue: number
  totalWonValue: number
}

function SummaryCards({ created, won, lost, pipelineValue, totalWonValue }: SummaryCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
      <Card>
        <CardContent className="p-4 text-center">
          <p className="text-2xl font-bold">{created}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Criadas</p>
        </CardContent>
      </Card>
      <Card className="border-emerald-400/40 bg-emerald-500/5">
        <CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{won}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Ganhas</p>
        </CardContent>
      </Card>
      <Card className="border-red-400/40 bg-red-500/5">
        <CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-red-600 dark:text-red-400">{lost}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Perdidas</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4 text-center">
          <p className="text-lg font-bold tabular-nums">{formatCurrency(pipelineValue)}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Pipeline</p>
        </CardContent>
      </Card>
      <Card className="border-emerald-400/40 bg-emerald-500/5">
        <CardContent className="p-4 text-center">
          <p className="text-lg font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
            {formatCurrency(totalWonValue)}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">Receita Ganha</p>
        </CardContent>
      </Card>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function ReportSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-[600px] rounded-lg" />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Pagina principal
// ---------------------------------------------------------------------------

export default function CrmReportPage() {
  const [selectedMonth, setSelectedMonth] = useState<string>(getPreviousMonth)

  const { data, isLoading, isError } = useMonthlyReport(selectedMonth)

  const area = AREA_CONFIG.comercial

  const handlePrev = useCallback(() => {
    setSelectedMonth((m) => addMonths(m, -1))
  }, [])

  const handleNext = useCallback(() => {
    setSelectedMonth((m) => addMonths(m, 1))
  }, [])

  const handlePrint = useCallback(() => {
    window.print()
  }, [])

  const handleDownload = useCallback(() => {
    if (!data?.html) return
    const blob = new Blob([data.html], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `relatorio-crm-${selectedMonth}.html`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [data?.html, selectedMonth])

  const canGoNext = !isCurrentOrFutureMonth(selectedMonth)

  return (
    <div className="flex flex-col gap-6">
      {/* ------------------------------------------------------------------ */}
      {/* Header                                                               */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <FileText className={`size-6 ${area.textClass}`} />
          <div>
            <h1 className="text-xl font-semibold">Relatorio Mensal CRM</h1>
            <p className="text-sm text-muted-foreground">Analise detalhada do pipeline comercial</p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            disabled={!data?.html}
            className="gap-1.5"
          >
            <Printer className="size-3.5" />
            Imprimir
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            disabled={!data?.html}
            className="gap-1.5"
          >
            <Download className="size-3.5" />
            Baixar HTML
          </Button>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Navegacao de mes                                                     */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex items-center justify-center gap-3">
        <Button variant="ghost" size="icon" onClick={handlePrev} className="size-8">
          <ChevronLeft className="size-4" />
          <span className="sr-only">Mes anterior</span>
        </Button>
        <span className="min-w-[180px] text-center text-base font-semibold">
          {formatMonthLabel(selectedMonth)}
        </span>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleNext}
          disabled={canGoNext}
          className="size-8"
        >
          <ChevronRight className="size-4" />
          <span className="sr-only">Proximo mes</span>
        </Button>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Conteudo                                                             */}
      {/* ------------------------------------------------------------------ */}
      {isLoading ? (
        <ReportSkeleton />
      ) : isError ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <FileText className="size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Nao foi possivel carregar o relatorio para este mes.
            </p>
            <p className="text-xs text-muted-foreground">
              Verifique se ha dados disponiveis para {formatMonthLabel(selectedMonth)}.
            </p>
          </CardContent>
        </Card>
      ) : !data ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <FileText className="size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Nenhum dado encontrado para {formatMonthLabel(selectedMonth)}.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Summary cards */}
          <SummaryCards
            created={data.summary.created}
            won={data.summary.won}
            lost={data.summary.lost}
            pipelineValue={data.summary.pipeline_value}
            totalWonValue={data.summary.total_won_value}
          />

          {/* HTML do relatorio em iframe */}
          {data.html && (
            <Card className="overflow-hidden">
              <iframe
                srcDoc={data.html}
                title={`Relatorio CRM — ${formatMonthLabel(selectedMonth)}`}
                className="min-h-[600px] w-full border-0"
                sandbox="allow-same-origin"
              />
            </Card>
          )}
        </>
      )}
    </div>
  )
}
