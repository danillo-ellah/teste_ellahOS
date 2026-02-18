'use client'

import { DollarSign } from 'lucide-react'
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
