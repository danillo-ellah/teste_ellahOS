'use client'

import { DollarSign, Info } from 'lucide-react'
import { FinancialSummaryCards } from '@/components/financial/FinancialSummaryCards'
import { FinancialRecordsTable } from '@/components/financial/FinancialRecordsTable'
import { useFinancialSummary } from '@/hooks/useFinancialRecords'

export default function FinancialPage() {
  const { data: summary, isLoading: summaryLoading } = useFinancialSummary()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <DollarSign className="size-6 text-primary" />
        <div>
          <h1 className="text-xl font-semibold">Financeiro</h1>
          <p className="text-sm text-muted-foreground">
            Visao geral de receitas, despesas e lancamentos
          </p>
        </div>
      </div>

      {/* Orientacao para planilha de custos */}
      <div className="flex items-start gap-2 rounded-md border border-blue-500/30 bg-blue-500/5 p-3 text-sm text-blue-700 dark:text-blue-400">
        <Info className="h-4 w-4 mt-0.5 shrink-0" />
        <span>
          A <strong>planilha de custos detalhada</strong> de cada producao esta dentro de cada job:{' '}
          <strong>Jobs &rarr; [nome do job] &rarr; aba Financeiro &rarr; Custos do Job</strong>.
        </span>
      </div>

      {/* Summary cards */}
      <FinancialSummaryCards
        totalReceitas={summary?.total_receitas ?? 0}
        totalDespesas={summary?.total_despesas ?? 0}
        saldo={summary?.saldo ?? 0}
        isLoading={summaryLoading}
      />

      {/* Tabela completa */}
      <FinancialRecordsTable />
    </div>
  )
}
